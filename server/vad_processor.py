import torch
import torchaudio
import sys
import json
from pathlib import Path

def process_audio(input_path, output_dir):
    try:
        # Load the VAD model
        vad_model, utils = torch.hub.load(repo_or_dir='snakers4/silero-vad',
                                        model='silero_vad',
                                        force_reload=True)
        (get_speech_timestamps, save_audio, read_audio, _, _) = utils

        # Read the audio file
        audio = read_audio(input_path, sampling_rate=16000)

        # Get speech timestamps
        speech_timestamps = get_speech_timestamps(audio, vad_model, sampling_rate=16000)

        # Process and save segments
        segments_info = []
        for i, ts in enumerate(speech_timestamps):
            # Generate output path for this segment
            segment_path = Path(output_dir) / f"segment_{i+1}.wav"
            
            # Save the audio segment
            save_audio(str(segment_path),
                      audio[ts['start']:ts['end']],
                      sampling_rate=16000)
            
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
        return json.dumps({
            'status': 'error',
            'error': str(e)
        })

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(json.dumps({
            'status': 'error',
            'error': 'Required arguments: input_path output_dir'
        }))
        sys.exit(1)

    input_path = sys.argv[1]
    output_dir = sys.argv[2]
    print(process_audio(input_path, output_dir))