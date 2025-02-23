from fastapi import FastAPI, HTTPException, WebSocket
from pydantic import BaseModel
from typing import List, Dict, Optional
import random
from datetime import datetime
import asyncio
from tts import text_to_speech_stream

app = FastAPI(title="Punch-Out AI API")

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

class PunchResult(BaseModel):
    sequence: str
    accuracy: List[float]  # Accuracy score for each punch (0.0 to 1.0)
    total_time: float     # Total time taken to complete the sequence in seconds

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

# Initialize game state
game_state = GameState()

START_SCRIPT = """
Alright champion, let's get ready for some training! I'm Cus, and I'll be your coach today.
Remember, boxing isn't just about throwing punches - it's about precision, timing, and staying focused.
When you see the numbers, follow along with these moves:
One is a Jab
Two is a Cross
Three is a Left Hook
Four is a Right Hook
Five is a Left Uppercut
Six is a Right Uppercut

Keep your guard up, stay light on your feet, and follow my lead.
Let's begin!
"""

@app.get("/generate-sequence", response_model=PunchSequenceResponse)
async def generate_sequence(length: int = 5):
    """
    Generate a random sequence of punches.
    
    Args:
        length (int): The number of punches in the sequence (default: 5)
    
    Returns:
        PunchSequenceResponse: A sequence of punch numbers and their description
    """
    if length < 1 or length > 20:
        raise HTTPException(status_code=400, detail="Sequence length must be between 1 and 20")
    
    # Generate random sequence
    sequence = [random.randint(1, len(PUNCH_TYPES)) for _ in range(length)]
    sequence_str = "".join(str(num) for num in sequence)
    
    # Create description
    description = " → ".join([f"{num} ({PUNCH_TYPES[num]})" for num in sequence])
    
    return PunchSequenceResponse(sequence=sequence_str, description=description)

@app.post("/submit-result")
async def submit_result(result: PunchResult):
    """
    Submit the results of a completed punch sequence.
    
    Args:
        result (PunchResult): The results of the punch sequence, including accuracy scores
        
    Returns:
        dict: A summary of the performance
    """
    # Convert string sequence to list of integers
    sequence = [int(digit) for digit in result.sequence]
    
    if len(sequence) != len(result.accuracy):
        raise HTTPException(
            status_code=400,
            detail="Sequence length must match accuracy length"
        )
    
    # Calculate average accuracy
    avg_accuracy = sum(result.accuracy) / len(result.accuracy)
    
    # Calculate punches per second
    pps = len(sequence) / result.total_time if result.total_time > 0 else 0
    
    # Generate performance summary
    performance_rating = "Excellent!" if avg_accuracy > 0.9 else \
                        "Great job!" if avg_accuracy > 0.8 else \
                        "Good work!" if avg_accuracy > 0.7 else \
                        "Keep practicing!"
    
    return {
        "average_accuracy": round(avg_accuracy * 100, 2),
        "punches_per_second": round(pps, 2),
        "performance_rating": performance_rating,
        "sequence_details": [
            {
                "punch": f"{num} ({PUNCH_TYPES[num]})",
                "accuracy": f"{acc * 100:.2f}%"
            }
            for num, acc in zip(sequence, result.accuracy)
        ]
    }

@app.websocket("/start")
async def start_training(websocket: WebSocket):
    """
    WebSocket endpoint to start a training session.
    Streams the welcome message using ElevenLabs text-to-speech and initializes game state.
    """
    await websocket.accept()
    
    try:
        # Send welcome message
        audio_stream = text_to_speech_stream(START_SCRIPT)
        
        # Stream the audio in chunks
        chunk_size = 4096  # Increased chunk size for better performance
        while True:
            chunk = audio_stream.read(chunk_size)
            if not chunk:
                break
            await websocket.send_bytes(chunk)
            await asyncio.sleep(0.01)  # Small delay to prevent overwhelming the connection
            
        # Reset game state for new session
        global game_state
        game_state = GameState()
        game_state.start_time = datetime.now()
        
        await websocket.send_json({
            "status": "ready",
            "message": "Training session started",
            "state": {
                "current_streak": game_state.current_streak,
                "best_streak": game_state.best_streak,
                "best_score": game_state.best_score
            }
        })
        
    except Exception as e:
        error_msg = f"Error during training session: {str(e)}"
        print(error_msg)  # Log the error
        try:
            await websocket.send_json({
                "status": "error",
                "message": error_msg
            })
        except:
            pass  # Connection might be already closed
    finally:
        try:
            await websocket.close()
        except:
            pass  # Connection might be already closed

@app.get("/state")
async def get_state():
    """Get the current game state"""
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
    game_state = GameState()
    return {"message": "Game state reset successfully"}
