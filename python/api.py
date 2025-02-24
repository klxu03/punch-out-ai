from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import random
from datetime import datetime
import asyncio
from tts import text_to_speech_stream
import openai
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")
print(f"OpenAI API key loaded: {'Yes' if openai_api_key else 'No'}")  # Debug log - only shows if key exists, not the key itself
openai.api_key = openai_api_key

app = FastAPI(title="Punch-Out AI API")

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React client URL
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# Define the punch types with their corresponding numbers
PUNCH_TYPES = {
    1: "Jab",
    2: "Cross",
    3: "Left Hook",
    4: "Right Hook",
    5: "Left Uppercut",
    6: "Right Uppercut"
}

class PunchSequenceResponse(BaseModel):
    sequence: str
    description: str
    motivational_message: str

class PunchResult(BaseModel):
    num_correct: int

# State management
class GameState:
    def __init__(self):
        self.current_sequence: str = ""
        self.session_scores: List[float] = []
        self.total_punches: int = 0
        self.start_time: Optional[datetime] = None
        self.best_score: float = 0.0
        self.current_streak: int = 0
        self.best_streak: int = 0
        self.num_last_correct: int = 0  # Number of punches correctly executed in the last sequence

    def log_state(self, endpoint: str):
        """Log the current state to console"""
        print(f"\n=== GameState after {endpoint} ===")
        print(f"Current Sequence: {self.current_sequence}")
        print(f"Total Punches: {self.total_punches}")
        print(f"Best Score: {self.best_score}")
        print(f"Current Streak: {self.current_streak}")
        print(f"Best Streak: {self.best_streak}")
        print(f"Last Correct: {self.num_last_correct}")
        print("=" * 40 + "\n")

# Initialize game state
game_state = GameState()

START_SCRIPT = """
Alright champion, let's get ready for some training! I'm Cus, and I'll be your coach today.
Remember, boxing isn't just about throwing punches - it's about precision, timing, and staying focused.
Keep your guard up, stay light on your feet, and follow my lead.
Let's begin!
"""

@app.get("/generate-sequence", response_model=PunchSequenceResponse)
async def generate_sequence(length: int = 5):
    """
    Generate a random sequence of punches and a motivational message from a boxing coach.
    
    Args:
        length (int): The number of punches in the sequence (default: 5)
    
    Returns:
        PunchSequenceResponse: A sequence of punch numbers, their description, and a motivational message
    """
    game_state.log_state("generate_sequence [before]")
    
    if length < 1 or length > 20:
        raise HTTPException(status_code=400, detail="Sequence length must be between 1 and 20")
    
    # Generate random sequence
    sequence = [random.randint(1, len(PUNCH_TYPES)) for _ in range(length)]
    sequence_str = "".join(str(num) for num in sequence)
    
    # Create description
    description = " → ".join([f"{num} ({PUNCH_TYPES[num]})" for num in sequence])
    
    # Generate motivational message using OpenAI
    last_correct = game_state.num_last_correct
    last_performance = f"They got {last_correct} punches correct in their last sequence. " if last_correct > 0 else ""
    
    prompt = f"""As a boxing coach, give a short, energetic motivational message (max 30 words) to encourage 
    your athlete during their training. {last_performance} You could even give them feedback on how they can improve their form, although that is not always necessary. 
    The next combination they'll practice is: {description}. DO NOT include any emojis or symbols that cannot be easily said aloud."""
    
    print(f"Calling OpenAI with prompt: {prompt}")  # Debug log
    try:
        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_completion_tokens=100
        )
        print(f"OpenAI response: {response}")  # Debug log
        motivational_message = response.choices[0].message.content.strip()
        if not motivational_message:  # If we get an empty response
            motivational_message = "Let's crush this combo! Stay focused and give it your all!"
    except Exception as e:
        print(f"Error calling OpenAI: {str(e)}")  # Debug log
        motivational_message = "Let's crush this combo! Stay focused and give it your all!"  # Fallback message
    
    print(f"Final motivational message: {motivational_message}")  # Debug log
    
    response = PunchSequenceResponse(
        sequence=sequence_str,
        description=description,
        motivational_message=motivational_message
    )
    
    game_state.current_sequence = sequence_str
    game_state.log_state("generate_sequence [after]")
    return response

@app.post("/submit-result/{num_correct}")
async def submit_result(num_correct: int):
    """
    Submit the number of correctly executed punches from the last sequence.
    
    Args:
        num_correct (int): Number of punches executed correctly
        
    Returns:
        dict: A summary of the performance
    """
    game_state.log_state("submit_result [before]")
    
    # Update game state with number of correct punches
    game_state.num_last_correct = num_correct
    
    game_state.log_state("submit_result [after]")
    return {
        "message": "Results submitted successfully",
        "num_correct": num_correct
    }

@app.get("/start-script")
async def get_start_script():
    """
    HTTP endpoint to get the welcome script for a new training session.
    Initializes the game state and returns the script to be spoken by the client.
    """
    try:
        # Reset game state for new session
        global game_state
        game_state = GameState()
        game_state.start_time = datetime.now()
        
        return {
            "status": "ready",
            "script": START_SCRIPT,
            "state": {
                "current_streak": game_state.current_streak,
                "best_streak": game_state.best_streak,
                "best_score": game_state.best_score
            }
        }
        
    except Exception as e:
        error_msg = f"Error starting training session: {str(e)}"
        print(error_msg)  # Log the error
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/state")
async def get_state():
    """Get the current game state"""
    game_state.log_state("get_state")
    return {
        "current_sequence": game_state.current_sequence,
        "total_punches": game_state.total_punches,
        "session_scores": game_state.session_scores,
        "best_score": game_state.best_score,
        "current_streak": game_state.current_streak,
        "best_streak": game_state.best_streak
    }

@app.post("/reset-state")
async def reset_state():
    """Reset the game state"""
    global game_state
    game_state.log_state("reset_state [before]")
    game_state = GameState()
    game_state.log_state("reset_state [after]")
    return {"message": "Game state reset successfully"}