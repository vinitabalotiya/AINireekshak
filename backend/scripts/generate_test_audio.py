"""Generate valid PCM WAV audio fixtures for headless Chrome fake media stream testing."""

import math
import os
import struct
import wave

AUDIO_DIR = os.path.join(os.path.dirname(__file__), "..", "tests", "fixtures", "audio")
os.makedirs(AUDIO_DIR, exist_ok=True)


def generate_speech_like_wav(filename: str, duration_sec: float = 10.0, base_freq: float = 220.0):
    """Generate a standard 16-bit 16kHz mono PCM WAV file simulating speech frequency modulations."""
    sample_rate = 16000
    total_samples = int(sample_rate * duration_sec)
    filepath = os.path.join(AUDIO_DIR, filename)

    with wave.open(filepath, "w") as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)

        # Formant frequencies for speech vowel modulation
        formants = [base_freq, base_freq * 2.2, base_freq * 3.5]

        frames = []
        for i in range(total_samples):
            t = i / sample_rate
            # Syllabic envelope modulation (approx 4Hz speech cadence)
            cadence = 0.5 * (1.0 + math.sin(2 * math.pi * 3.5 * t))

            # Multi-harmonic speech simulation
            sample_val = 0.0
            for idx, f in enumerate(formants):
                amp = 1.0 / (idx + 1)
                sample_val += amp * math.sin(2 * math.pi * f * t)

            sample_val *= cadence * 0.35  # Prevent clipping
            int_sample = int(sample_val * 32767.0)
            int_sample = max(-32768, min(32767, int_sample))
            frames.append(struct.pack("<h", int_sample))

        wav_file.writeframes(b"".join(frames))

    print(f"Generated {filepath} ({os.path.getsize(filepath)} bytes, {duration_sec}s)")
    return filepath


if __name__ == "__main__":
    generate_speech_like_wav("pitch_english.wav", duration_sec=8.0, base_freq=180.0)
    generate_speech_like_wav("pitch_hindi.wav", duration_sec=8.0, base_freq=220.0)
    generate_speech_like_wav("pitch_hinglish.wav", duration_sec=8.0, base_freq=200.0)
