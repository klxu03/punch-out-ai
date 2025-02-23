import streamlit as st
import websockets
import asyncio
import json
import requests
from io import BytesIO
from elevenlabs import stream
from tts import text_to_speech_stream

# Initialize session state
if "workout_active" not in st.session_state:
    st.session_state.workout_active = False
if "workout_started" not in st.session_state:
    st.session_state.workout_started = False
if "last_sequence" not in st.session_state:
    st.session_state.last_sequence = None

# Page config
st.set_page_config(page_title="Punch-Out AI Training", page_icon="🥊")
st.title("Punch-Out AI Training")

async def get_next_combo():
    """Fetch next combo from API and stream it through text-to-speech"""
    try:
        # Get new sequence from API
        response = requests.get("http://localhost:8000/generate-sequence")
        sequence_data = response.json()
        print(f"API Response: {sequence_data}")  # Debug log
        
        # Convert motivation message to speech
        feedback = sequence_data.get("motivational_message", "")
        print(f"Feedback to speak: {feedback}")  # Debug log
        
        if not feedback:
            st.error("No motivational message received from the coach")
            return
            
        audio_stream = text_to_speech_stream(feedback)
        
        # Stream the audio
        stream(audio_stream)
        
        # Display the trainer's feedback and sequence
        st.info(f"Cus says: {feedback}")
        st.info(f"Your combo: {sequence_data['description']}")
        st.session_state.last_sequence = sequence_data["sequence"]
        
    except Exception as e:
        print(f"Error in get_next_combo: {str(e)}")  # Debug log
        st.error(f"Error getting next combo: {str(e)}")

async def start_workout():
    """Connect to WebSocket endpoint and stream audio"""
    uri = "ws://localhost:8000/start"
    
    try:
        async with websockets.connect(uri) as websocket:
            st.toast("Connected to training session!")
            
            # Create a BytesIO buffer to collect audio chunks
            audio_buffer = BytesIO()
            
            while True:
                try:
                    message = await websocket.recv()
                    if isinstance(message, bytes):
                        # Add audio chunk to buffer
                        audio_buffer.write(message)
                    else:
                        # Parse JSON message
                        data = json.loads(message)
                        
                        # If we received the "ready" status, play the collected audio
                        if data.get("status") == "ready":
                            # Reset buffer position and stream the audio
                            audio_buffer.seek(0)
                            stream(audio_buffer)
                            st.session_state.workout_started = True
                            st.rerun()
                            break
                            
                except websockets.exceptions.ConnectionClosed:
                    break
                        
    except Exception as e:
        st.error(f"Error during workout: {str(e)}")
        st.session_state.workout_active = False
        st.session_state.workout_started = False

def main():
    # Center the buttons using columns
    col1, col2, col3 = st.columns([1, 2, 1])
    
    with col2:
        if not st.session_state.workout_active:
            if st.button("Start New Workout", type="primary", use_container_width=True):
                st.session_state.workout_active = True
                st.session_state.workout_started = False
                st.rerun()
        
        elif not st.session_state.workout_started:
            st.info("Starting workout... Get ready!", icon="🎯")
            asyncio.run(start_workout())
            
        else:
            st.success("Workout in progress! Choose your next move:", icon="🥊")
            
            # Add Get Next Combo button
            if st.button("Get Next Combo", type="primary", use_container_width=True):
                asyncio.run(get_next_combo())
            
            # Add End Workout button
            if st.button("End Workout", type="secondary", use_container_width=True):
                st.session_state.workout_active = False
                st.session_state.workout_started = False
                st.rerun()

if __name__ == "__main__":
    main()