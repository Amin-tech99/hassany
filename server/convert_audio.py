import torchaudio
import sys

if __name__ == "__main__":
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    try:
        waveform, sample_rate = torchaudio.load(input_path)
        torchaudio.save(output_path, waveform, sample_rate, encoding="PCM_S", bits_per_sample=16)
        print(f"Successfully converted {input_path} to {output_path}")
    except Exception as e:
        print(f"Conversion error: {str(e)}")
        sys.exit(1)