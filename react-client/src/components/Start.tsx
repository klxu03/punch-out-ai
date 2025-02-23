import React, { useState } from 'react';
import { useConversation } from '@11labs/react';

// Initialize ElevenLabs client with API key
// const client = new ElevenLabsClient({
//   apiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY,
// });

// Using Jamahal's voice - a friendly, energetic male voice perfect for workout instructions
const VOICE_ID = "DTKMou8ccj1ZaWGBiotd";

/**
 * Start component handles the initiation of a new workout session.
 * It connects to the FastAPI WebSocket endpoint and uses ElevenLabs
 * for text-to-speech streaming of the trainer's instructions.
 */
const Start: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { speak } = useConversation({
    apiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY,
    voiceId: VOICE_ID,
  });

  const handleStartWorkout = async () => {
    setIsLoading(true);

    try {
      const ws = new WebSocket('ws://localhost:8000/start');
      
      ws.onopen = () => {
        console.log('Connected to workout session');
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received message:', data);

          if (data.status === 'ready') {
            // Play welcome message using ElevenLabs
            await speak('Get ready for your workout! Let\'s begin.');
            setIsLoading(false);
          }
        } catch (error) {
          // If it's not JSON, it might be the welcome script
          if (typeof event.data === 'string') {
            await speak(event.data);
          } else {
            console.error('Error handling message:', error);
          }
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsLoading(false);
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed');
        setIsLoading(false);
      };
    } catch (error) {
      console.error('Error starting workout:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={handleStartWorkout}
        disabled={isLoading}
        className={`
          px-6 py-3 rounded-lg text-lg font-semibold
          ${isLoading 
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white transform hover:scale-105 transition-all'
          }
        `}
      >
        {isLoading ? 'Starting Workout...' : 'Start New Workout'}
      </button>
      
      {isLoading && (
        <div className="text-gray-600">
          Get ready! Connecting to training session...
        </div>
      )}
    </div>
  );
};

export default Start;
