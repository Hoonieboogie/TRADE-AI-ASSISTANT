"""
S3 버킷 CORS 설정 스크립트

사용법:
    cd backend
    python scripts/setup_s3_cors.py
"""

import os
import json
import boto3
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def setup_s3_cors():
    bucket_name = os.getenv('AWS_STORAGE_BUCKET_NAME')
    region = os.getenv('AWS_S3_REGION_NAME', 'us-west-1')

    if not bucket_name:
        print("ERROR: AWS_STORAGE_BUCKET_NAME not set in .env")
        return False

    print(f"Setting up CORS for bucket: {bucket_name}")

    # S3 클라이언트 생성
    s3_client = boto3.client(
        's3',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=region
    )

    # CORS 설정
    cors_configuration = {
        'CORSRules': [
            {
                'AllowedHeaders': ['*'],
                'AllowedMethods': ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
                'AllowedOrigins': [
                    'http://localhost:5173',
                    'http://localhost:5174',
                    'http://127.0.0.1:5173',
                    'http://127.0.0.1:5174',
                ],
                'ExposeHeaders': ['ETag', 'x-amz-request-id'],
                'MaxAgeSeconds': 3600
            }
        ]
    }

    try:
        # 현재 CORS 설정 확인
        try:
            current_cors = s3_client.get_bucket_cors(Bucket=bucket_name)
            print("Current CORS configuration:")
            print(json.dumps(current_cors['CORSRules'], indent=2))
        except s3_client.exceptions.ClientError as e:
            if 'NoSuchCORSConfiguration' in str(e):
                print("No existing CORS configuration found")
            else:
                raise

        # CORS 설정 적용
        s3_client.put_bucket_cors(
            Bucket=bucket_name,
            CORSConfiguration=cors_configuration
        )

        print("\n✅ CORS configuration applied successfully!")
        print("\nNew CORS rules:")
        print(json.dumps(cors_configuration['CORSRules'], indent=2))

        return True

    except Exception as e:
        print(f"\n❌ Error setting CORS: {e}")
        return False


if __name__ == '__main__':
    setup_s3_cors()
