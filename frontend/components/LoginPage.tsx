import { useState, useEffect, useRef } from 'react';
import { Lock, IdCard } from 'lucide-react';
import backgroundVideo from '../background.mp4';
import { api, User } from '../utils/api';

interface LoginPageProps {
  onLogin: (employeeId: string, user?: User) => void;
}

// 타이핑 효과 컴포넌트
function TypingEffect() {
  const lines = ['당신의 서류 작업,', '오늘도 똑똑하게'];
  const [displayedLines, setDisplayedLines] = useState<string[]>(['', '']);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) {
      const pauseTimer = setTimeout(() => {
        setIsPaused(false);
        if (!isDeleting && currentLineIndex === lines.length - 1 && currentCharIndex === lines[currentLineIndex].length) {
          setIsDeleting(true);
          setCurrentLineIndex(lines.length - 1);
          setCurrentCharIndex(lines[lines.length - 1].length);
        }
      }, 1500);
      return () => clearTimeout(pauseTimer);
    }

    const typingSpeed = isDeleting ? 50 : 80;

    const timer = setTimeout(() => {
      if (!isDeleting) {
        // 타이핑 중
        const currentLine = lines[currentLineIndex];
        if (currentCharIndex < currentLine.length) {
          setDisplayedLines(prev => {
            const newLines = [...prev];
            newLines[currentLineIndex] = currentLine.slice(0, currentCharIndex + 1);
            return newLines;
          });
          setCurrentCharIndex(prev => prev + 1);
        } else if (currentLineIndex < lines.length - 1) {
          // 다음 줄로 이동
          setCurrentLineIndex(prev => prev + 1);
          setCurrentCharIndex(0);
        } else {
          // 모든 타이핑 완료, 잠시 멈춤
          setIsPaused(true);
        }
      } else {
        // 삭제 중
        if (currentCharIndex > 0) {
          setDisplayedLines(prev => {
            const newLines = [...prev];
            newLines[currentLineIndex] = lines[currentLineIndex].slice(0, currentCharIndex - 1);
            return newLines;
          });
          setCurrentCharIndex(prev => prev - 1);
        } else if (currentLineIndex > 0) {
          // 이전 줄로 이동
          setCurrentLineIndex(prev => prev - 1);
          setCurrentCharIndex(lines[currentLineIndex - 1].length);
        } else {
          // 모든 삭제 완료, 다시 시작
          setIsDeleting(false);
          setCurrentLineIndex(0);
          setCurrentCharIndex(0);
          setIsPaused(true);
        }
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [currentLineIndex, currentCharIndex, isDeleting, isPaused, lines]);

  return (
    <div
      className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight"
      style={{ textShadow: '0 4px 20px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)' }}
    >
      {displayedLines.map((line, index) => (
        <div key={index} className="min-h-[1.2em]">
          {line}
          {currentLineIndex === index && !isPaused && (
            <span className="inline-block w-1 h-12 md:h-14 lg:h-16 bg-blue-400 ml-1 animate-pulse" />
          )}
        </div>
      ))}
    </div>
  );
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // 유효성 검사
    if (!employeeId || !password) {
      setError('사원번호와 비밀번호를 모두 입력해주세요.');
      setIsLoading(false);
      return;
    }

    try {
      // 백엔드 API 로그인
      const user = await api.login(employeeId, password);
      onLogin(user.emp_no, user);
    } catch (err) {
      // 에러 처리
      const message = err instanceof Error ? err.message : '로그인에 실패했습니다.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.8; // Slightly slower for elegance
    }
  }, []);

  return (
    <div className="min-h-screen relative bg-slate-900">
      {/* Full-screen Video Background */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        onLoadedData={() => setVideoLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
          videoLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <source src={backgroundVideo} type="video/mp4" />
      </video>

      {/* Dark Overlay for readability */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex">
        {/* Left: Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-12">
          <div className="w-full max-w-md">

            {/* Login Card */}
            <div
              className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 border border-white/50"
              style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
            >
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">로그인</h2> 
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Employee ID Input */}
            <div>
              <label htmlFor="employeeId" className="block text-gray-700 mb-2">
                사원번호
              </label>
              <div className="relative">
                <IdCard className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="employeeId"
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="사원번호를 입력하세요"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-gray-700 mb-2">
                비밀번호
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  로그인 중...
                </>
              ) : (
                '로그인'
              )}
            </button>
          </form>

          {/* Info Text */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-blue-900 text-sm">
              <strong>안내:</strong> 이 시스템은 회사 무역팀 전용입니다.
              초기 비밀번호는 관리자에게 문의하세요.
            </p>
          </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-6 text-white/70 text-sm">
              © 2025 Trade Document Management System. All rights reserved.
            </div>
          </div>
        </div>

        {/* Right: Typing Effect */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-start pl-8">
          <TypingEffect />
        </div>
      </div>
    </div>
  );
}