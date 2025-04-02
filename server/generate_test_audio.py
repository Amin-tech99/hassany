import torchaudio
import torch
import numpy as np

# Generate a 1kHz sine wave for 5 seconds
sample_rate = 16000
duration = 5
t = torch.linspace(0, duration, int(sample_rate * duration))
audio_data = 0.5 * torch.sin(2 * np.pi * 1000 * t)

# Save as PCM WAV format
torchaudio.save(
    'server/test_audio/sample.wav',
    audio_data.unsqueeze(0),
    sample_rate,
    encoding='PCM_S',
    bits_per_sample=16
)
print('Successfully generated test audio file at server/test_audio/sample.wav')