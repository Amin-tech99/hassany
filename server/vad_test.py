import os
from vad_processor import process_audio

# Test configuration
test_audio_path = os.path.join(os.path.dirname(__file__), 'test_audio', 'sample.wav')
output_dir = os.path.join(os.path.dirname(__file__), 'test_output')

try:
    print("Starting VAD processor test...")
    process_audio(test_audio_path, output_dir)
    print("\n✅ Test successful! No errors detected during VAD processing")
    print(f"Output files created in: {output_dir}")
except Exception as e:
    print("\n❌ Test failed! Encountered error:")
    print(f"ERROR: {str(e)}")
    raise
finally:
    # Cleanup test output
    if os.path.exists(output_dir):
        for f in os.listdir(output_dir):
            os.remove(os.path.join(output_dir, f))
        os.rmdir(output_dir)