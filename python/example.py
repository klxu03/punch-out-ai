import os
import signal
import sys
from dotenv import load_dotenv

from elevenlabs.client import ElevenLabs
from elevenlabs.conversational_ai.conversation import Conversation
from elevenlabs.conversational_ai.default_audio_interface import DefaultAudioInterface

def main():
    load_dotenv()  # Load environment variables from .env file
    AGENT_ID=os.getenv("ELEVENLABS_AGENT_ID")
    API_KEY=os.getenv("ELEVENLABS_API_KEY")

    if not AGENT_ID:
        sys.stderr.write("AGENT_ID environment variable must be set\n")
        sys.exit(1)
    
    if not API_KEY:
        sys.stderr.write("ELEVENLABS_API_KEY not set, assuming the agent is public\n")

    client = ElevenLabs(api_key=API_KEY)
    conversation = Conversation(
        client,
        AGENT_ID,
        # Assume auth is required when API_KEY is set
        requires_auth=bool(API_KEY),
        audio_interface=DefaultAudioInterface(),
        callback_agent_response=lambda response: print(f"Agent: {response}"),
        callback_agent_response_correction=lambda original, corrected: print(f"Agent: {original} -> {corrected}"),
        callback_user_transcript=lambda transcript: print(f"User: {transcript}"),
        # callback_latency_measurement=lambda latency: print(f"Latency: {latency}ms"),
    )
    conversation.start_session()

    # Run until Ctrl+C is pressed.
    def signal_handler(sig, frame):
        print("\nEnding conversation...")
        conversation.end_session()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)

    conversation_id = conversation.wait_for_session_end()
    print(f"Conversation ID: {conversation_id}")

if __name__ == '__main__':
    main()