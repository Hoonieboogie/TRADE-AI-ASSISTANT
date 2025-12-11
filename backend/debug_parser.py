
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
try:
    django.setup()
except Exception as e:
    print(f"Django setup failed: {e}")

from agent_core.parsers import parse_document
import docx

def create_test_docx(filename):
    doc = docx.Document()
    doc.add_paragraph("Hello World")
    doc.save(filename)

def test_parser():
    filename = "test_debug.docx"
    try:
        print("Creating test docx...")
        create_test_docx(filename)
        
        print("Testing parse_document...")
        chunks = parse_document(filename, filename)
        
        print(f"Success! Chunks: {len(chunks)}")
        print(f"Content: {chunks[0]['text']}")
        
    except Exception as e:
        print(f"Parser failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if os.path.exists(filename):
            os.remove(filename)

if __name__ == "__main__":
    test_parser()
