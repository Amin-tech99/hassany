import torchaudio
import sys

if __name__ == "__main__":
    try:
        waveform, sample_rate = torchaudio.load(sys.argv[1])
        print(f"Successfully loaded audio file: {sys.argv[1]}")
        print(f"Sample rate: {sample_rate}Hz, Channels: {waveform.shape[0]}, Duration: {waveform.shape[1]/sample_rate:.2f}s")
    except Exception as e:
        print(f"Error loading audio: {str(e)}")
        sys.exit(1)