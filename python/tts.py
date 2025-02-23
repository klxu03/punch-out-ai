import os
from dotenv import load_dotenv
from typing import IO
from io import BytesIO
from elevenlabs import VoiceSettings
from elevenlabs.client import ElevenLabs

def text_to_speech_stream(text: str) -> IO[bytes]:

    load_dotenv()  # Load environment variables from .env file
    API_KEY=os.getenv("ELEVENLABS_API_KEY")
    
    if not API_KEY:
        sys.stderr.write("ELEVENLABS_API_KEY not set\n")

    client = ElevenLabs(api_key=API_KEY)
    
    # Perform the text-to-speech conversion
    response = client.text_to_speech.convert(
        voice_id="DTKMou8ccj1ZaWGBiotd", # Using Jamahal's voice - a friendly, energetic male voice perfect for workout instructions
        output_format="mp3_22050_32",
        text=text,
        model_id="eleven_flash_v2_5",
        voice_settings=VoiceSettings(
            stability=0.0,
            similarity_boost=1.0,
            style=0.0,
            use_speaker_boost=True,
        ),
    )

    # Create a BytesIO object to hold the audio data in memory
    audio_stream = BytesIO()

    # Write each chunk of audio data to the stream
    for chunk in response:
        if chunk:
            audio_stream.write(chunk)

    # Reset stream position to the beginning
    audio_stream.seek(0)

    # Return the stream for further use
    return audio_stream