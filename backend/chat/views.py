import asyncio
import json
import re
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import StreamingHttpResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from agents import Runner
from agents.items import ToolCallItem
from agent_core import get_trade_agent, get_document_writing_agent
from .config import PROMPT_VERSION, PROMPT_LABEL
from .models import User, GenChat, GenMessage, Department
from .memory_service import get_memory_service

logger = logging.getLogger(__name__)


def get_or_create_user(user_id):
    """user_id(숫자) 또는 emp_no(사원번호)로 사용자 조회 또는 생성"""
    if user_id is None:
        return None
    try:
        # 먼저 emp_no로 조회 시도
        try:
            return User.objects.get(emp_no=str(user_id))
        except User.DoesNotExist:
            pass

        # emp_no로 못 찾으면 user_id(정수)로 조회
        if isinstance(user_id, int) or (isinstance(user_id, str) and user_id.isdigit()):
            try:
                return User.objects.get(user_id=int(user_id))
            except User.DoesNotExist:
                pass

        # 사용자가 없으면 자동 생성 (개발/테스트용)
        default_dept, _ = Department.objects.get_or_create(
            dept_name="Default",
            defaults={"dept_name": "Default"}
        )
        user = User.objects.create(
            emp_no=str(user_id),
            name=f"User_{user_id}",
            password="temp_password",
            dept=default_dept
        )
        logger.info(f"새 사용자 자동 생성: emp_no={user_id}, user_id={user.user_id}")
        return user

    except Exception as e:
        logger.error(f"사용자 조회/생성 실패: {e}")
        return None


# 툴 이름 → 표시 정보 매핑
TOOL_DISPLAY_INFO = {
    'search_user_document': {
        'name': '업로드 문서 검색',
        'icon': 'file-search',
        'description': '업로드한 문서에서 관련 내용을 검색했습니다.'
    },
    'search_trade_documents': {
        'name': '무역 지식 검색',
        'icon': 'document',
        'description': '무역 문서 데이터베이스에서 관련 정보를 검색했습니다.'
    },
    'search_web': {
        'name': '웹 검색',
        'icon': 'web',
        'description': '최신 정보를 위해 웹 검색을 수행했습니다.'
    }
}


def extract_tools_used(result) -> list:
    """
    Agent 실행 결과에서 사용된 툴 정보 추출
    """
    tools_used = []
    seen_tools = set()

    for item in result.new_items:
        if isinstance(item, ToolCallItem):
            try:
                tool_name = item.raw_item.name
            except AttributeError:
                try:
                    tool_name = item.tool_call.function.name
                except AttributeError:
                    print(f"ToolCallItem attributes: {dir(item)}")
                    print(f"ToolCallItem: {item}")
                    continue

            if tool_name not in seen_tools:
                seen_tools.add(tool_name)
                tool_info = TOOL_DISPLAY_INFO.get(tool_name, {
                    'name': tool_name,
                    'icon': 'tool',
                    'description': f'{tool_name} 도구를 사용했습니다.'
                })
                tools_used.append({
                    'id': tool_name,
                    **tool_info
                })

    return tools_used


def parse_edit_response(text: str) -> dict | None:
    """
    Agent 응답에서 편집 JSON을 파싱

    Returns:
        편집 정보 dict 또는 None (일반 텍스트인 경우)

    New format (fieldId/value based):
    {
        "type": "edit",
        "message": "수정 설명",
        "changes": [
            {"fieldId": "price", "value": "USD 50,000"}
        ]
    }
    """
    # JSON 블록 추출 시도 (```json ... ``` 형식)
    json_match = re.search(r'```json\s*([\s\S]*?)\s*```', text)
    if json_match:
        json_str = json_match.group(1)
    else:
        # 전체 텍스트가 JSON인지 확인
        json_str = text.strip()

    try:
        parsed = json.loads(json_str)
        if isinstance(parsed, dict) and parsed.get('type') == 'edit':
            # Normalize changes to new format (fieldId/value)
            changes = parsed.get('changes', [])
            normalized_changes = []
            for change in changes:
                if 'fieldId' in change and 'value' in change:
                    # New format
                    normalized_changes.append({
                        'fieldId': change['fieldId'],
                        'value': change['value']
                    })
                elif 'field' in change and 'after' in change:
                    # Legacy format (field/before/after) - convert to new format
                    normalized_changes.append({
                        'fieldId': change['field'],
                        'value': change['after']
                    })

            return {
                'type': 'edit',
                'message': parsed.get('message', ''),
                'changes': normalized_changes
            }
    except json.JSONDecodeError:
        pass

    return None


class ChatView(APIView):
    """
    채팅 API 엔드포인트 (비스트리밍)

    POST /api/chat/
    {
        "message": "사용자 메시지",
        "document": "문서 내용 (선택)"
    }
    """

    def post(self, request):
        message = request.data.get('message')
        document = request.data.get('document', '')

        if not message:
            return Response(
                {'error': '메시지가 필요합니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # 문서가 있으면 document_writing_agent, 없으면 trade_agent
            if document:
                agent = get_document_writing_agent(
                    document_content=document,
                    prompt_version=PROMPT_VERSION,
                    prompt_label=PROMPT_LABEL
                )
                full_input = message  # 문서는 이미 프롬프트에 포함됨
            else:
                agent = get_trade_agent(
                    prompt_version=PROMPT_VERSION,
                    prompt_label=PROMPT_LABEL
                )
                full_input = message

            # Agent 실행
            result = asyncio.run(Runner.run(agent, input=full_input))

            # 사용된 툴 정보 추출
            tools_used = extract_tools_used(result)

            # 편집 응답인지 확인
            edit_response = parse_edit_response(result.final_output)

            if edit_response:
                return Response({
                    'type': 'edit',
                    'message': edit_response['message'],
                    'changes': edit_response['changes'],
                    'tools_used': tools_used
                })
            else:
                return Response({
                    'type': 'chat',
                    'message': result.final_output,
                    'tools_used': tools_used
                })

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'에이전트 실행 오류: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(csrf_exempt, name='dispatch')
class ChatStreamView(View):
    """
    스트리밍 채팅 API 엔드포인트 (Server-Sent Events) - Mem0 메모리 통합

    POST /api/chat/stream/
    {
        "message": "사용자 메시지",
        "document": "문서 내용 (선택)",
        "user_id": "emp001",     # 선택: 메모리 기능에 사용
        "gen_chat_id": 1         # 선택: 기존 채팅 세션 ID
    }

    문서가 있으면 document_writing_agent 사용 (수정 기능 포함)
    """

    def post(self, request):
        try:
            data = json.loads(request.body)
            message = data.get('message')
            document = data.get('document', '')
            user_id = data.get('user_id')
            gen_chat_id = data.get('gen_chat_id')
        except json.JSONDecodeError:
            return StreamingHttpResponse(
                f"data: {json.dumps({'type': 'error', 'error': 'Invalid JSON'})}\n\n",
                content_type='text/event-stream'
            )

        if not message:
            return StreamingHttpResponse(
                f"data: {json.dumps({'type': 'error', 'error': '메시지가 필요합니다.'})}\n\n",
                content_type='text/event-stream'
            )

        response = StreamingHttpResponse(
            self.stream_response(message, document, user_id, gen_chat_id),
            content_type='text/event-stream'
        )
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response

    def stream_response(self, message: str, document: str, user_id=None, gen_chat_id=None):
        """
        Agent 스트리밍 응답 생성기 (Mem0 메모리 통합)
        """
        # 1. 사용자 및 채팅 세션 관리
        user = None
        gen_chat = None
        user_msg = None
        is_first_message = False

        if user_id:
            user = get_or_create_user(user_id)
            if user:
                # 기존 채팅 세션 조회 또는 새로 생성
                if gen_chat_id:
                    try:
                        # gen_chat_id만으로 조회 (user 필터 제거 - 이미 프론트에서 관리)
                        gen_chat = GenChat.objects.get(gen_chat_id=gen_chat_id)
                        logger.info(f"✅ 기존 GenChat 조회 성공: gen_chat_id={gen_chat_id}")
                    except GenChat.DoesNotExist:
                        logger.warning(f"⚠️ GenChat 조회 실패, 새로 생성: gen_chat_id={gen_chat_id}")
                        gen_chat = GenChat.objects.create(user=user, title="일반 채팅")
                        is_first_message = True
                else:
                    # gen_chat_id가 없으면 새 채팅방 생성
                    gen_chat = GenChat.objects.create(user=user, title="일반 채팅")
                    is_first_message = True
                    logger.info(f"✅ 새 GenChat 생성: gen_chat_id={gen_chat.gen_chat_id}")

                # 사용자 메시지 저장
                user_msg = GenMessage.objects.create(
                    gen_chat=gen_chat,
                    sender_type='U',
                    content=message
                )
                logger.info(f"✅ GenMessage 저장: gen_chat_id={gen_chat.gen_chat_id}, user_msg_id={user_msg.gen_message_id}, first={is_first_message}")

        # 2. 이전 대화 히스토리 로드 (최근 10개) - RDS
        message_history = []
        if gen_chat and user_msg:
            prev_messages = GenMessage.objects.filter(gen_chat=gen_chat).exclude(
                gen_message_id=user_msg.gen_message_id
            ).order_by('created_at')
            message_count = prev_messages.count()
            start_index = max(0, message_count - 10)
            recent_messages = list(prev_messages[start_index:])

            message_history = [
                {"role": "user" if msg.sender_type == 'U' else "assistant", "content": msg.content}
                for msg in recent_messages
            ]
            logger.info(f"✅ 대화 히스토리 로드 (RDS): {len(message_history)}개 메시지 (총 {message_count}개 중)")
            if message_history:
                for i, msg in enumerate(message_history[-3:]):
                    logger.info(f"  └ 최근 {i+1}: [{msg['role']}] {msg['content'][:50]}...")

        # 3. Mem0 컨텍스트 로드 (선택적 - 실패해도 계속 진행)
        # 새 구조: 단기(상세) + 장기(요약) 분리, user_memories 제거
        mem0_context = None
        memory_context_str = ""
        if gen_chat:
            try:
                memory_service = get_memory_service()
                if memory_service:
                    mem0_context = memory_service.build_gen_chat_context(
                        gen_chat_id=gen_chat.gen_chat_id,
                        query=message
                    )

                    # Mem0 컨텍스트를 문자열로 변환 (단기 우선, 장기 보충)
                    context_parts = []

                    # 단기 메모리 (상세)
                    if mem0_context.get("short_memories"):
                        memories_text = "\n".join([
                            f"- {m.get('memory', m.get('content', ''))}"
                            for m in mem0_context["short_memories"]
                        ])
                        context_parts.append(f"[이전 대화 상세]\n{memories_text}")

                    # 장기 메모리 (요약)
                    if mem0_context.get("long_memories"):
                        summaries_text = "\n".join([
                            f"- {m.get('memory', m.get('content', ''))}"
                            for m in mem0_context["long_memories"]
                        ])
                        context_parts.append(f"[이전 대화 요약]\n{summaries_text}")

                    if context_parts:
                        memory_context_str = "\n\n".join(context_parts)
                        logger.info(f"✅ Mem0 컨텍스트 로드: {mem0_context.get('context_summary', '')}")
            except Exception as e:
                logger.warning(f"⚠️ Mem0 컨텍스트 로드 실패 (계속 진행): {e}")

        # gen_chat_id 전송 (프론트엔드에서 추적용)
        gen_chat_id_to_send = gen_chat.gen_chat_id if gen_chat else None

        # 응답 수집을 위한 container (동기 컨텍스트에서 DB 저장용)
        response_container = {"full_response": "", "tools_used": []}

        async def run_stream():
            tools_used = []
            seen_tools = set()
            full_response = ""  # 전체 응답 수집 (편집 JSON 파싱용)

            # gen_chat_id 전송
            if gen_chat_id_to_send:
                yield f"data: {json.dumps({'type': 'init', 'gen_chat_id': gen_chat_id_to_send})}\n\n"

            try:
                # 문서가 있으면 document_writing_agent, 없으면 trade_agent
                if document:
                    agent = get_document_writing_agent(
                        document_content=document,
                        prompt_version=PROMPT_VERSION,
                        prompt_label=PROMPT_LABEL
                    )
                else:
                    agent = get_trade_agent(
                        prompt_version=PROMPT_VERSION,
                        prompt_label=PROMPT_LABEL
                    )

                # 컨텍스트 추가된 입력 생성
                enhanced_input = message
                if memory_context_str:
                    enhanced_input = f"{memory_context_str}\n\n{message}"

                # Agent input 준비 (히스토리 포함)
                if message_history:
                    input_items = []
                    for msg in message_history:
                        input_items.append({"role": msg["role"], "content": msg["content"]})
                    input_items.append({"role": "user", "content": enhanced_input})
                    final_input = input_items
                else:
                    final_input = enhanced_input

                result = Runner.run_streamed(agent, input=final_input)

                async for event in result.stream_events():
                    # 텍스트 델타 이벤트 처리
                    if event.type == "raw_response_event":
                        data = event.data

                        if hasattr(data, 'type') and data.type == 'response.output_text.delta':
                            if hasattr(data, 'delta') and data.delta:
                                full_response += data.delta
                                yield f"data: {json.dumps({'type': 'text', 'content': data.delta})}\n\n"

                    # 툴 호출 이벤트
                    elif event.type == "run_item_stream_event":
                        item = event.item
                        if isinstance(item, ToolCallItem):
                            try:
                                tool_name = item.raw_item.name
                            except AttributeError:
                                try:
                                    tool_name = getattr(item, 'name', None)
                                except:
                                    continue

                            if tool_name and tool_name not in seen_tools:
                                seen_tools.add(tool_name)
                                tool_info = TOOL_DISPLAY_INFO.get(tool_name, {
                                    'name': tool_name,
                                    'icon': 'tool',
                                    'description': f'{tool_name} 도구를 사용했습니다.'
                                })
                                tool_data = {'id': tool_name, **tool_info}
                                tools_used.append(tool_data)
                                yield f"data: {json.dumps({'type': 'tool', 'tool': tool_data})}\n\n"

                # 응답을 container에 저장 (동기 컨텍스트에서 DB 저장용)
                response_container["full_response"] = full_response
                response_container["tools_used"] = tools_used

                # 스트리밍 완료 후 편집 응답인지 확인
                print(f"[DEBUG] full_response 길이: {len(full_response)}")
                print(f"[DEBUG] full_response 앞 500자: {full_response[:500]}")
                edit_response = parse_edit_response(full_response)
                print(f"[DEBUG] edit_response: {edit_response}")

                if edit_response:
                    # 편집 응답이면 edit 이벤트 전송 (fieldId/value format)
                    yield f"data: {json.dumps({'type': 'edit', 'message': edit_response['message'], 'changes': edit_response['changes']})}\n\n"

                # 완료 이벤트
                yield f"data: {json.dumps({'type': 'done', 'tools_used': tools_used})}\n\n"

            except Exception as e:
                import traceback
                traceback.print_exc()
                yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

        # 비동기 제너레이터를 동기로 변환
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            async_gen = run_stream()
            while True:
                try:
                    chunk = loop.run_until_complete(async_gen.__anext__())
                    yield chunk
                except StopAsyncIteration:
                    break
        finally:
            loop.close()

        # 스트리밍 완료 후 동기 컨텍스트에서 DB 저장
        full_response = response_container["full_response"]

        # AI 응답 저장 (GenMessage)
        if gen_chat and full_response:
            try:
                GenMessage.objects.create(
                    gen_chat=gen_chat,
                    sender_type='A',
                    content=full_response
                )
                logger.info(f"✅ AI 응답 GenMessage 저장 완료: {len(full_response)}자")
            except Exception as save_err:
                logger.error(f"❌ AI 응답 저장 실패: {save_err}")

        # Mem0에 메모리 추가 (단기: 매번, 장기: 10턴마다)
        if gen_chat and full_response:
            try:
                memory_service = get_memory_service()
                if memory_service:
                    messages = [
                        {"role": "user", "content": message},
                        {"role": "assistant", "content": full_response}
                    ]

                    # 단기 메모리 저장 (매번)
                    memory_service.add_gen_chat_short_memory(
                        gen_chat_id=gen_chat.gen_chat_id,
                        messages=messages
                    )

                    # 10턴마다 장기 메모리에 요약 저장
                    # 현재 총 메시지 수 계산
                    total_messages = GenMessage.objects.filter(gen_chat=gen_chat).count()
                    turn_count = total_messages // 2  # 1턴 = user + assistant

                    if turn_count > 0 and turn_count % 10 == 0:
                        # 최근 10턴(20개 메시지)을 가져와서 요약 저장
                        recent_for_summary = GenMessage.objects.filter(
                            gen_chat=gen_chat
                        ).order_by('-created_at')[:20]

                        summary_messages = [
                            {"role": "user" if m.sender_type == 'U' else "assistant", "content": m.content}
                            for m in reversed(recent_for_summary)
                        ]

                        turn_start = turn_count - 9
                        turn_end = turn_count
                        memory_service.add_gen_chat_long_memory(
                            gen_chat_id=gen_chat.gen_chat_id,
                            messages=summary_messages,
                            turn_range=f"{turn_start}-{turn_end}"
                        )
                        logger.info(f"✅ Mem0 장기 메모리 저장 (Turn {turn_start}-{turn_end})")

                    logger.info(f"✅ Mem0 단기 메모리 추가 완료 (Turn {turn_count})")
            except Exception as mem_err:
                logger.warning(f"⚠️ Mem0 메모리 추가 실패 (무시): {mem_err}")


class GenChatDeleteView(APIView):
    """
    일반 채팅 삭제 API (Mem0 메모리도 함께 삭제)

    DELETE /api/chat/general/<gen_chat_id>/
    """

    def delete(self, request, gen_chat_id):
        try:
            gen_chat = GenChat.objects.get(gen_chat_id=gen_chat_id)

            # Mem0 단기 메모리 삭제
            try:
                memory_service = get_memory_service()
                if memory_service:
                    memory_service.delete_gen_chat_memory(gen_chat_id)
                    logger.info(f"✅ Mem0 메모리 삭제 완료: gen_chat_id={gen_chat_id}")
            except Exception as mem_err:
                logger.warning(f"⚠️ Mem0 메모리 삭제 실패 (계속 진행): {mem_err}")

            # DB에서 채팅 삭제
            gen_chat.delete()
            logger.info(f"✅ GenChat 삭제 완료: gen_chat_id={gen_chat_id}")

            return Response({"message": "삭제 완료"}, status=status.HTTP_200_OK)

        except GenChat.DoesNotExist:
            return Response(
                {"error": "채팅을 찾을 수 없습니다."},
                status=status.HTTP_404_NOT_FOUND
            )
