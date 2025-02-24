import React, { useState, useEffect, useRef } from 'react';
import { ElevenLabsClient } from 'elevenlabs';

// Using Jamahal's voice - a friendly, energetic male voice perfect for workout instructions
const VOICE_ID = "DTKMou8ccj1ZaWGBiotd";
const API_BASE_URL = 'http://localhost:8000';

/**
 * Start component handles the initiation of a new workout session.
 * It uses HTTP requests to the FastAPI backend and ElevenLabs
 * for client-side text-to-speech of the trainer's instructions.
 */
const Start: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [sequence, setSequence] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [elevenlabsClient, setElevenlabsClient] = useState<ElevenLabsClient | null>(null);

  // Initialize ElevenLabs client
  useEffect(() => {
    const client = new ElevenLabsClient({
      apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY,
    });
    setElevenlabsClient(client);
  }, []);

  /**
   * Function to convert text to speech using ElevenLabs API
   */
  const textToSpeech = async (text: string): Promise<void> => {
    if (!elevenlabsClient) {
      console.error("ElevenLabs client not initialized");
      return;
    }

    try {
      console.log("Converting text to speech:", text);
      
      // Use the direct API call with fetch instead of the client library
      const API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
        method: 'POST',
        headers: {
          'xi-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_flash_v2_5",
          voice_settings: {
            stability: 0.0,
            similarity_boost: 1.0,
            style: 0.0,
            use_speaker_boost: true,
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Elevenlabs API error: ${response.status} ${response.statusText}`);
      }
      
      // Get audio data as blob
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      console.log("Audio blob created", audioBlob.size, "bytes");
      
      // Play audio
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.oncanplaythrough = async () => {
          try {
            await audioRef.current?.play();
            console.log("Audio playback started");
          } catch (playError) {
            console.error("Error playing audio:", playError);
          }
        };
      } else {
        console.error("Audio element not available");
      }
    } catch (error) {
      console.error("Error converting text to speech:", error);
    }
  };

  /**
   * Fetches the start script from the backend and speaks it using ElevenLabs
   */
  const handleStartWorkout = async () => {
    setIsLoading(true);

    try {
      // Get the start script from the backend
      const response = await fetch(`${API_BASE_URL}/start-script`);
      
      if (!response.ok) {
        throw new Error(`Failed to get start script: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Received start script:', data);
      
      if (data.script) {
        // Speak the start script using ElevenLabs
        await textToSpeech(data.script);
        setWorkoutStarted(true);
      } else {
        console.error('No start script received from backend');
        await textToSpeech('Error starting workout. Please try again.');
      }
    } catch (error) {
      console.error('Error starting workout:', error);
      await textToSpeech('Error starting workout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Fetches the next sequence from the backend and speaks the motivational message
   */
  const handleGetNextSequence = async () => {
    setIsLoading(true);

    try {
      // Get the next sequence from the backend
      const response = await fetch(`${API_BASE_URL}/generate-sequence`);
      
      if (!response.ok) {
        throw new Error(`Failed to get sequence: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Received sequence:', data);
      
      if (data.motivational_message) {
        // Speak the motivational message using ElevenLabs
        await textToSpeech(data.motivational_message);
        setSequence(data.description);
        return data;
      } else {
        console.error('No motivational message received from backend');
        await textToSpeech('Error getting next sequence. Please try again.');
      }
    } catch (error) {
      console.error('Error getting next sequence:', error);
      await textToSpeech('Error getting next sequence. Please try again.');
    } finally {
      setIsLoading(false);
    }
    
    return null;
  };
  
  /**
   * Submits the result of the last sequence to the backend
   */
  const handleSubmitResult = async (numCorrect: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/submit-result/${numCorrect}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to submit result: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Result submitted:', data);
      
      return data;
    } catch (error) {
      console.error('Error submitting result:', error);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-xl gap-5 mt-8">
      <div className="w-full bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-lg">
        {/* Audio element for playing TTS audio */}
        <div className="mb-4">
          <audio ref={audioRef} controls className="w-full rounded-md" style={{filter: 'invert(0.8)'}} />
        </div>
        
        {/* Workout control button always below audio */}
        {!workoutStarted ? (
          <div className="flex flex-col items-center gap-3 mt-4">
            <button
              onClick={handleStartWorkout}
              disabled={isLoading}
              className={`
                w-full px-6 py-4 rounded-lg text-lg font-semibold
                ${isLoading 
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white transform hover:scale-105 transition-all'
                }
              `}
            >
              {isLoading ? 'Starting Workout...' : 'Start New Workout'}
            </button>
            
            {isLoading && (
              <div className="text-blue-300">
                Get ready! Starting training session...
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col w-full gap-4">            
            {sequence && (
              <div className="bg-gray-700 p-3 rounded-lg border border-gray-600">
                <h3 className="font-mono text-blue-300 mb-2 text-sm">Current Combo:</h3>
                <p className="text-green-400 font-mono text-base">{sequence}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                onClick={handleGetNextSequence}
                disabled={isLoading}
                className={`
                  py-3 rounded-lg font-semibold
                  ${isLoading 
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white transform hover:scale-105 transition-all'
                  }
                `}
              >
                Get Next Combo
              </button>
              
              <button
                onClick={() => setWorkoutStarted(false)}
                disabled={isLoading}
                className="py-3 rounded-lg font-semibold bg-red-600 hover:bg-red-700 text-white"
              >
                End Workout
              </button>
            </div>
            
            {isLoading && (
              <div className="text-blue-300 text-center mt-2">
                Loading next combination...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Start;