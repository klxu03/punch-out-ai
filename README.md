# punch-out-ai
Punch-out AI uses computer vision and voice generation to give you personal boxing trainer experience.

# Voice Chat AI

A Next.js web application that enables voice conversations with an AI using ElevenLabs' React SDK for conversational AI capabilities. Users can have real-time voice conversations with an AI boxing trainer.

## Features
- Real-time voice conversations
- ElevenLabs' conversational AI integration
- Modern React-based UI with Next.js
- Clean and intuitive interface
- Instant AI responses

## Tech Stack
- Next.js (React Framework)
- TypeScript
- ElevenLabs React SDK (@11labs/react)

## Setup

1. Clone the repository
```bash
git clone <repository-url>
cd punch-out-ai/client
```

2. Install dependencies
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables
- Create `.env.local` in the client directory
- Add your ElevenLabs API key and agent ID:
```
ELEVENLABS_API_KEY=your_api_key
NEXT_PUBLIC_AGENT_ID=your_agent_id
```

4. Run the development server
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

The app will be available at http://localhost:3000

## Environment Variables

- `ELEVENLABS_API_KEY`: Your ElevenLabs API key
- `NEXT_PUBLIC_AGENT_ID`: Your ElevenLabs agent ID for the boxing trainer
