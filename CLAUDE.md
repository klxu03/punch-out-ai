# CLAUDE.md - Coding Guidelines for Punch-Out AI

## Build Commands
- React Client: `cd react-client && npm run dev` - Vite dev server
- Python API: `cd python && uvicorn api:app --reload` - FastAPI with hot reload
- Linting: `cd react-client && npm run lint`
- Build: `cd react-client && npm run build && npm run preview`

## Code Style Guidelines
- TypeScript with strict typing and React functional components with hooks
- Python: Type hints with Pydantic models for API requests/responses
- Error handling: Try/catch with specific error messages in Python, React ErrorBoundaries
- Imports: Group by 1) React/framework 2) third-party 3) local modules
- Naming: camelCase for JS/TS variables/functions, PascalCase for components/types, snake_case for Python
- Use CSS modules for styling in React components
- Async/await for asynchronous operations (avoid raw promises/callbacks)
- Comments required for complex logic, functions should have docstrings in Python
- State management: React hooks for client, explicit GameState class for Python backend

## Project Structure
- `/react-client` - React/Vite frontend client
- `/python` - FastAPI backend for game state management and AI feedback