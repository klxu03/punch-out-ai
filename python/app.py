import os
import streamlit as st
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs
from elevenlabs.conversational_ai.conversation import Conversation
from elevenlabs.conversational_ai.default_audio_interface import DefaultAudioInterface

# Load environment variables
load_dotenv()
AGENT_ID = os.getenv("ELEVENLABS_AGENT_ID")
API_KEY = os.getenv("ELEVENLABS_API_KEY")

# Initialize session state
if "conversation" not in st.session_state:
    st.session_state.conversation = None
if "messages" not in st.session_state:
    st.session_state.messages = []
if "conversation_active" not in st.session_state:
    st.session_state.conversation_active = False

# Page config
st.set_page_config(page_title="AI Conversation", page_icon="🎤")
st.title("AI Conversation")

def on_agent_response(response):
    """Callback for agent responses"""
    st.session_state.messages.append(("assistant", response))
    
def on_agent_correction(original, corrected):
    """Callback for agent response corrections"""
    # Find and update the last assistant message if it was the original
    if st.session_state.messages and st.session_state.messages[-1] == ("assistant", original):
        st.session_state.messages[-1] = ("assistant", corrected)
        
def on_user_transcript(transcript):
    """Callback for user transcripts"""
    st.session_state.messages.append(("user", transcript))

def initialize_conversation():
    """Initialize a new conversation"""
    if not AGENT_ID:
        st.error("AGENT_ID environment variable must be set")
        return None
    
    if not API_KEY:
        st.warning("ELEVENLABS_API_KEY not set, assuming the agent is public")

    client = ElevenLabs(api_key=API_KEY)
    
    conversation = Conversation(
        client,
        AGENT_ID,
        requires_auth=bool(API_KEY),
        audio_interface=DefaultAudioInterface(),
        callback_agent_response=on_agent_response,
        callback_agent_response_correction=on_agent_correction,
        callback_user_transcript=on_user_transcript
    )
    return conversation

# Control buttons
col1, col2 = st.columns(2)
with col1:
    if not st.session_state.conversation_active:
        if st.button("Start Conversation", type="primary"):
            st.session_state.conversation = initialize_conversation()
            if st.session_state.conversation:
                st.session_state.conversation.start_session()
                st.session_state.conversation_active = True
                st.query_params.active = "true"
    else:
        if st.button("End Conversation", type="secondary"):
            if st.session_state.conversation:
                st.session_state.conversation.end_session()
            st.session_state.conversation = None
            st.session_state.conversation_active = False
            st.query_params.active = "false"
            st.rerun()

# Display chat messages
for role, content in st.session_state.messages:
    with st.chat_message(role):
        st.write(content)

# Display recording status and maintain conversation
if st.session_state.conversation_active and st.session_state.conversation:
    st.info("🎤 Recording... Press 'End Conversation' when done.")
    # This call blocks and keeps the conversation going
    st.session_state.conversation.wait_for_session_end()