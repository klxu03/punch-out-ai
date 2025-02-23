import asyncio
import websockets
import json
from io import BytesIO
from elevenlabs import stream

async def test_websocket():
    """
    Test the WebSocket /start endpoint by:
    1. Connecting to the WebSocket server
    2. Streaming audio chunks in real-time
    3. Displaying JSON messages received from the server
    """
    uri = "ws://localhost:8000/start"
    print(f"Connecting to {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected! Waiting for messages...")
            
            # Create a BytesIO buffer to collect audio chunks
            audio_buffer = BytesIO()
            
            while True:
                try:
                    message = await websocket.recv()
                    if isinstance(message, bytes):
                        # Add audio chunk to buffer
                        audio_buffer.write(message)
                        print("Received audio chunk")
                    else:
                        # Parse and display JSON message
                        data = json.loads(message)
                        print("\nReceived JSON message:")
                        print(json.dumps(data, indent=2))
                        
                        # If we received the "ready" status, play the collected audio
                        if data.get("status") == "ready":
                            print("\nTraining session initialized successfully!")
                            
                            # Reset buffer position and stream the audio
                            audio_buffer.seek(0)
                            print("\nPlaying audio...")
                            stream(audio_buffer)
                            break
                            
                except websockets.exceptions.ConnectionClosed:
                    print("\nConnection closed by server")
                    break
                        
    except Exception as e:
        print(f"\nError: {str(e)}")
        
    print("\nTest completed!")

if __name__ == "__main__":
    print("Starting WebSocket test...")
    asyncio.run(test_websocket())
