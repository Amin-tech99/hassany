import torch
import torchaudio
import sys
import json
import soundfile
import librosa
from pathlib import Path

import argparse
import sys

def process_audio(input_path, output_dir):
    try:
        # Verify input file exists
        if not Path(input_path).is_file():
            raise FileNotFoundError(f"Input audio file not found: {input_path}")

        # Ensure output directory exists
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        # Load the VAD model with caching enabled
        print("Loading VAD model...")
        try:
            vad_model, utils = torch.hub.load(repo_or_dir='snakers4/silero-vad',
                                            model='silero_vad',
                                            force_reload=False,
                                            trust_repo=True,
                                            verbose=False)
            print("Successfully loaded VAD model from online repository")
        except Exception as model_error:
            print(f"Error loading model from online repository: {str(model_error)}")
            print("Attempting to load from local cache...")
            try:
                vad_model, utils = torch.hub.load(repo_or_dir='snakers4/silero-vad',
                                                model='silero_vad',
                                                force_reload=False,
                                                trust_repo=True)
                print("Successfully loaded VAD model from local cache")
            except Exception as fallback_error:
                raise Exception(f"Failed to load VAD model (both online and cache): {str(fallback_error)}")
        (get_speech_timestamps, _, _, _, _) = utils

        # Read audio with torchaudio
        try:
            # Load audio with torchaudio
            waveform, original_sr = torchaudio.load(input_path)
            audio = waveform.numpy()[0]
        except Exception as e:
            raise RuntimeError(f"Failed to read audio file: {str(e)}")
        
        # Resample to 16kHz if needed
        if original_sr != 16000:
            audio = librosa.resample(audio, orig_sr=original_sr, target_sr=16000)
        
        # Convert to torch tensor
        audio = torch.from_numpy(audio).float()

        # Get speech timestamps
        speech_timestamps = get_speech_timestamps(audio, vad_model, sampling_rate=16000)

        # Process and save segments
        segments_info = []
        for i, ts in enumerate(speech_timestamps):
            # Generate output path for this segment
            segment_path = Path(output_dir) / f"segment_{i+1}.wav"
            
            # Save the audio segment
            segment_audio = audio[ts['start']:ts['end']].numpy()
            soundfile.write(
                str(segment_path),
                segment_audio,
                16000,
                subtype='PCM_16'
            )
            
            # Calculate duration in milliseconds
            duration = (ts['end'] - ts['start']) / 16  # Convert samples to ms
            
            # Store segment information
            segments_info.append({
                'index': i + 1,
                'path': str(segment_path),
                'start_time': ts['start'] / 16,  # Convert to ms
                'end_time': ts['end'] / 16,      # Convert to ms
                'duration': duration
            })

        # Return the segments information as JSON
        return json.dumps({
            'status': 'success',
            'segments': segments_info
        })

    except Exception as e:
        error_message = str(e)
        print(f"Error in process_audio: {error_message}")
        return json.dumps({
            'status': 'error',
            'error': error_message
        })

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='VAD Processor')
    parser.add_argument('--input', required=True, help='Input audio file path')
    parser.add_argument('--output', required=True, help='Output directory path')
    args = parser.parse_args()
    
    result = process_audio(args.input, args.output)
    print(result)