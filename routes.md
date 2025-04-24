# ResearchNavigator API Routes Documentation

This document provides a comprehensive overview of all routes configured in the ResearchNavigator's Flask backend application.

## Summary of Available Endpoints

| Route | Method | Description |
|-------|--------|-------------|
| `/ping` | GET | Simple health check endpoint |
| `/api/status` | GET | Get server and model status |
| `/api/chat` | POST | Stream AI responses to questions |
| `/api/chat` | OPTIONS | Handle CORS preflight requests |
| `/api/chat/simple` | POST | Get non-streamed simple responses |

## Detailed Route Documentation

### `/ping`

**Method**: GET

**Purpose**: Simple health check endpoint to verify that the server is running.

**Response Format**:
```json
{
  "status": "success",
  "message": "pong",
  "timestamp": "2025-04-24T15:30:45.123456"
}
```

**Notes**: This endpoint is specifically configured for CORS to allow requests from the frontend. It's used by the ServerStatus component to validate server connectivity every 5 seconds.

### `/api/status`

**Method**: GET

**Purpose**: Check the status of the server and whether the AI model (Gemini) is properly initialized.

**Response Format**:
```json
{
  "server": "online",
  "model_initialized": true,
  "api_key_available": true
}
```

**Notes**: This endpoint provides a more detailed status check than the `/ping` endpoint, including information about the model and API key status.

### `/api/chat`

**Method**: POST

**Purpose**: Primary endpoint for submitting research questions to the AI assistant and receiving streamed responses.

**Request Format**:
```json
{
  "question": "What are the latest advancements in quantum computing?"
}
```

**Response Format**: Server-Sent Events (SSE) stream with the following event types:
- Start event: `{"status": "started"}`
- Token events: `{"token": "text fragment"}`
- Complete event: `{"status": "complete"}`
- Error event: `{"error": "error message", "status": "error"}`

**Error Conditions**:
- 400: Missing question parameter
- 500: Google API key not found or AI model not initialized

**Notes**: This endpoint uses Gemini 1.5 Pro to generate responses and streams them token by token using Server-Sent Events, allowing for real-time display of AI responses.

### `/api/chat` (OPTIONS)

**Method**: OPTIONS

**Purpose**: Handle CORS preflight requests for the streaming chat endpoint.

**Notes**: This route exists to properly support CORS for the streaming endpoint, ensuring that browsers can make cross-origin requests.

### `/api/chat/simple`

**Method**: POST

**Purpose**: Alternative, simpler endpoint for chat that returns a complete response rather than streaming.

**Request Format**:
```json
{
  "question": "What are the latest advancements in quantum computing?"
}
```

**Response Format**:
```json
{
  "status": "complete",
  "token": "You asked: What are the latest advancements in quantum computing?\n\nThis is a simple response from the Research Navigator. In the future, this will be connected to an AI research assistant."
}
```

**Notes**: Currently serves as a placeholder that echoes the question. In the future, it could be integrated with the AI model for non-streamed responses.

## CORS Configuration

The application has CORS configured for two path patterns:

1. `/api/*` routes allow:
   - Origins: `http://localhost:3000`, `http://127.0.0.1:3000`, `http://localhost:5000`
   - Credentials: Supported
   - Exposed headers: `Content-Type`, `X-CSRFToken`
   - Allowed headers: `Content-Type`, `Authorization`

2. `/ping` route allows:
   - Origins: `http://localhost:3000`, `http://127.0.0.1:3000`
   - Methods: GET only
   - Allowed headers: `Content-Type`