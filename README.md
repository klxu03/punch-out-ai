# punch-out-ai
Punch-out AI uses computer vision and voice generation to give you personal boxing trainer experience.

# Voice Chat AI

A Streamlit-based web application that enables voice conversations with an AI using ElevenLabs' conversational AI capabilities. Users can record voice messages and receive AI responses in both text and voice format.

## Features
- Voice recording interface
- Real-time AI responses
- Text and voice output
- Clean, intuitive UI
- Chat history

## Setup

1. Clone the repository
```bash
git clone <repository-url>
cd punch-out-ai
```

2. Create and activate a virtual environment (optional but recommended)
```bash
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
```

3. Install dependencies
```bash
pip install -r requirements.txt
```

4. Set up environment variables
- Copy `.env.template` to `.env`
- Add your ElevenLabs API key and agent ID to `.env`

5. Run the application
```bash
streamlit run app.py
```

The app will be available at http://localhost:8501
