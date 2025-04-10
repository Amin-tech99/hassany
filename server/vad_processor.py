import torch
import torchaudio
import sys
import json
import soundfile
import librosa
import os
from pathlib import Path

import argparse

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
        print(f"Python executable: {sys.executable}")
        print(f"Torch version: {torch.__version__}")
        print(f"Torch hub cache location: {torch.hub.get_dir()}")
        
        try:
            # Create cache directory if it doesn't exist
            cache_dir = torch.hub.get_dir()
            os.makedirs(cache_dir, exist_ok=True)
            print(f"Verified cache directory exists: {cache_dir}")
            
            vad_model, utils = torch.hub.load(repo_or_dir='snakers4/silero-vad',
                                            model='silero_vad',
                                            force_reload=False,
                                            trust_repo=True,
                                            verbose=True)
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
                print(f"Failed to load VAD model (both online and cache): {str(fallback_error)}")
                print("Attempting emergency fallback to direct download...")
                try:
                    import urllib.request
                    import zipfile
                    import tempfile
                    
                    # Create model directory
                    model_dir = os.path.join(torch.hub.get_dir(), 'snakers4_silero-vad_master')
                    os.makedirs(model_dir, exist_ok=True)
                    
                    # Download the model files directly
                    print("Downloading model files directly...")
                    with tempfile.NamedTemporaryFile(suffix='.zip') as temp_zip:
                        urllib.request.urlretrieve(
                            'https://github.com/snakers4/silero-vad/archive/refs/heads/master.zip', 
                            temp_zip.name
                        )
                        with zipfile.ZipFile(temp_zip.name, 'r') as zip_ref:
                            zip_ref.extractall(torch.hub.get_dir())
                    
                    print(f"Downloaded and extracted model files to {model_dir}")
                    vad_model, utils = torch.hub.load(repo_or_dir='snakers4/silero-vad',
                                                    model='silero_vad',
                                                    force_reload=True,
                                                    trust_repo=True)
                    print("Successfully loaded VAD model after direct download")
                except Exception as emergency_error:
                    raise Exception(f"All attempts to load VAD model failed: {str(emergency_error)}")
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

if __name__ == "__main__":
    import sys
    
    # Print debug information
    print(f"Python version: {sys.version}", file=sys.stderr)
    print(f"Arguments received: {sys.argv}", file=sys.stderr)
    
    if len(sys.argv) != 3:
        print(json.dumps({
            'status': 'error',
            'error': f'Expected 2 arguments, got {len(sys.argv)-1}. Usage: python vad_processor.py <input_file> <output_dir>'
        }))
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_dir = sys.argv[2]
    
    # Print the paths for debugging
    print(f"Input path: {input_path}", file=sys.stderr)
    print(f"Output directory: {output_dir}", file=sys.stderr)
    
    result = process_audio(input_path, output_dir)
    print(result)