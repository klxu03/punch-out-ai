import os
from tts import text_to_speech_stream
from elevenlabs import stream

def main():
    """
    Main function to demonstrate text-to-speech functionality
    """
    try:
        # Example text to convert to speech
        text = ("Alright everyone, gather round! I'm Cus, and I'm here to help you "
                "unleash your inner fighter. Whether you're here to learn self-defense, "
                "get in shape, or just punch out some stress – you're in the right place. "
                "Today we're going to work on technique, build some power, and most "
                "importantly, have a blast doing it. I want to see you giving 100% "
                "because that's exactly what I'm going to give you. Remember, every "
                "champion started as a beginner. Now, let's wrap those hands and get "
                "ready to move. Time to rock and roll!")
        # Convert text to speech and get audio stream
        audio_stream = text_to_speech_stream(text)
        
        # Stream the audio directly using ElevenLabs stream function
        stream(audio_stream)
        
    except ValueError as e:
        print(f"Error: {e}")
    except Exception as e:
        print(f"Error during text-to-speech conversion: {e}")

if __name__ == "__main__":
    main()
