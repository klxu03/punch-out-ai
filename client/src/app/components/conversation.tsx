'use client';

import { useConversation } from '@11labs/react';
import { useCallback, useState, useEffect, useRef } from 'react';

interface Message {
  text: string;
  type: 'user' | 'agent';
  isFinal?: boolean;
}

export function Conversation() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isClient, setIsClient] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Set isClient to true once the component mounts
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected');
      // Append welcome message to existing messages
      setMessages(prev => [...prev, { 
        text: "Hello! I'm your AI boxing trainer. Let's start your training session!", 
        type: 'agent' 
      }]);
    },
    onDisconnect: () => console.log('Disconnected'),
    onMessage: (message) => {
      console.log('Message received:', message);
      
      // Handle user's voice transcription
      if (message.type === 'speech') {
        console.log('Speech message:', message);
        setMessages(prev => {
          console.log('Previous messages:', prev);
          const lastMessage = prev[prev.length - 1];
          
          // If the last message was an incomplete user message, update it
          if (lastMessage?.type === 'user' && !lastMessage.isFinal) {
            console.log('Updating existing user message');
            const newMessages = [
              ...prev.slice(0, -1),
              { ...lastMessage, text: message.text, isFinal: message.isFinal }
            ];
            console.log('New messages after update:', newMessages);
            return newMessages;
          }
          
          // Add new transcription
          console.log('Adding new user message');
          const newMessages = [...prev, { 
            text: message.text, 
            type: 'user', 
            isFinal: message.isFinal 
          }];
          console.log('New messages after add:', newMessages);
          return newMessages;
        });
      }
      // Handle agent's response
      else if (message.type === 'message') {
        console.log('Agent message:', message);
        setMessages(prev => {
          const newMessages = [...prev, { 
            text: message.text, 
            type: 'agent'
          }];
          console.log('Messages after adding agent response:', newMessages);
          return newMessages;
        });
      }
      // Handle agent's speech start
      else if (message.type === 'speech_start') {
        console.log('Agent started speaking');
      }
      // Handle agent's speech end
      else if (message.type === 'speech_end') {
        console.log('Agent finished speaking');
      }
    },
    onError: (error) => {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        text: 'Sorry, there was an error. Please try again.', 
        type: 'agent' 
      }]);
    },
    apiKey: process.env.ELEVENLABS_API_KEY,
  });

  const startConversation = useCallback(async () => {
    if (!isClient) return;

    try {
      console.log('Starting new conversation');
      setMessages([]); // Clear messages when starting new conversation
      
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Start the conversation with your agent
      await conversation.startSession({
        agentId: process.env.NEXT_PUBLIC_AGENT_ID,
      });

    } catch (error) {
      console.error('Failed to start conversation:', error);
      setMessages([{ 
        text: 'Failed to start conversation. Please make sure your microphone is connected and try again.', 
        type: 'agent' 
      }]);
    }
  }, [conversation, isClient]);

  const stopConversation = useCallback(async () => {
    if (!isClient) return;
    try {
      await conversation.endSession();
      setMessages(prev => [...prev, { 
        text: 'Training session ended. Great work!', 
        type: 'agent' 
      }]);
    } catch (error) {
      console.error('Failed to stop conversation:', error);
    }
  }, [conversation, isClient]);

  // Don't render anything during SSR
  if (!isClient) {
    return <div className="flex flex-col items-center gap-4 w-full max-w-2xl mx-auto p-4">
      <p>Loading conversation...</p>
    </div>;
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-2xl mx-auto p-4">
      <div className="flex gap-2">
        <button
          onClick={startConversation}
          disabled={conversation.status === 'connected'}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          Start Conversation
        </button>
        <button
          onClick={stopConversation}
          disabled={conversation.status !== 'connected'}
          className="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-300"
        >
          Stop Conversation
        </button>
      </div>

      <div className="flex flex-col items-center mb-4">
        <p>Status: {conversation.status}</p>
        <p>Agent is {conversation.isSpeaking ? 'speaking' : 'listening'}</p>
      </div>

      {/* Chat history */}
      <div className="w-full h-[500px] overflow-y-auto border rounded-lg p-4 bg-gray-50">
        {messages.length === 0 ? (
          <p className="text-center text-gray-500">
            Click "Start Conversation" to begin your training session
          </p>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`mb-4 ${
                message.type === 'agent' ? 'text-left' : 'text-right'
              }`}
            >
              <div
                className={`inline-block max-w-[80%] rounded-lg px-4 py-2 ${
                  message.type === 'agent'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-800'
                } ${!message.isFinal && message.type === 'user' ? 'opacity-70' : ''}`}
              >
                <p>{message.text}</p>
                {message.type === 'user' && !message.isFinal && (
                  <span className="text-xs italic">Listening...</span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Debug info */}
      <div className="text-xs text-gray-500 mt-2">
        Messages in chat: {messages.length}
      </div>
    </div>
  );
}