from flask import Flask, jsonify, request, Response, stream_with_context
from flask_cors import CORS
from datetime import datetime
import os
import json
import traceback
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain.schema import StrOutputParser
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Read allowed origins from environment variable or use default values
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000,https://researchnavigator.netlify.app').split(',')

# Configure CORS with explicit settings for streaming endpoints
CORS(app, resources={
    r"/api/*": {
        "origins": ALLOWED_ORIGINS,
        "supports_credentials": True,
        "expose_headers": ["Content-Type", "X-CSRFToken"],
        "allow_headers": ["Content-Type", "Authorization"]
    },
    r"/ping": {
        "origins": ALLOWED_ORIGINS,
        "methods": ["GET"],
        "allow_headers": ["Content-Type"]
    }
})

# Check if API key is available
api_key = os.getenv('GOOGLE_API_KEY')
if not api_key:
    print("WARNING: GOOGLE_API_KEY environment variable not found.")
    print("Please create a .env file with your GOOGLE_API_KEY=your_api_key_here")
    print("You can get an API key from https://makersuite.google.com/app/apikey")

# Initialize the Gemini model with correct parameters when API key is available
if api_key:
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-pro-exp-03-25", 
            google_api_key=api_key,
            disable_streaming=False
        )
        
        # Define prompt template
        llm_prompt_template = """
        You are Research Navigator, an AI research assistant designed to provide helpful, 
        accurate, and thoughtful responses to research questions.

        User question: "{question}"
        """

        llm_prompt = PromptTemplate.from_template(llm_prompt_template)

        # Create the chain
        rag_chain = (
            llm_prompt
            | llm
            | StrOutputParser()
        )
        
        print("Gemini model initialized successfully!")
    except Exception as e:
        print(f"ERROR initializing Gemini model: {e}")
        llm = None
        rag_chain = None
else:
    llm = None
    rag_chain = None
    print("No API key found, Gemini model NOT initialized.")

@app.route('/api/status', methods=['GET'])
def get_status():
    """Get the status of the server and model"""
    status = {
        "server": "online",
        "model_initialized": rag_chain is not None,
        "api_key_available": api_key is not None
    }
    return jsonify(status)

@app.route('/ping', methods=['GET'])
def ping():
    """Simple endpoint to check if the server is running"""
    return jsonify({
        "status": "success",
        "message": "pong",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/chat', methods=['POST'])
def chat():
    """Handle user questions and stream AI responses"""
    try:
        # Check if the model is initialized
        if not rag_chain:
            if not api_key:
                return jsonify({
                    "error": "Google API key not found. Please set the GOOGLE_API_KEY environment variable."
                }), 500
            else:
                return jsonify({
                    "error": "AI model not initialized. Check server logs for details."
                }), 500

        # Get the question from the request
        data = request.json
        if not data or 'question' not in data:
            return jsonify({"error": "Missing question parameter"}), 400
        
        question = data['question']
        print(f"Received question: {question}")
        
        # Function to stream the response
        def generate_response():
            try:
                # Send the response header for Server-Sent Events
                yield 'data: ' + json.dumps({'status': 'started'}) + '\n\n'
                
                # Process tokens as they're generated
                for token in rag_chain.stream({"question": question}):
                    # Send each token as a Server-Sent Event
                    yield 'data: ' + json.dumps({'token': token}) + '\n\n'
                    
                # Send completion event
                yield 'data: ' + json.dumps({'status': 'complete'}) + '\n\n'
            except Exception as e:
                print(f"Error in streaming response: {e}")
                print(traceback.format_exc())
                yield 'data: ' + json.dumps({
                    'error': str(e), 
                    'status': 'error'
                }) + '\n\n'
        
        # Return a streaming response
        return Response(
            stream_with_context(generate_response()),
            content_type='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no',
                'Access-Control-Allow-Origin': request.headers.get('Origin', '*'),
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Credentials': 'true'
            }
        )
    
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

# Route to handle preflight CORS requests for the streaming endpoint
@app.route('/api/chat', methods=['OPTIONS'])
def chat_options():
    response = app.make_default_options_response()
    response.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
    response.headers['Access-Control-Allow-Methods'] = 'POST'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

@app.route('/api/chat/simple', methods=['POST'])
def simple_chat():
    """Handle user questions with a simple response"""
    data = request.json
    question = data.get('question', '')
    
    # Simple response for now - you would integrate with your AI model here
    response = f"You asked: {question}\n\nThis is a simple response from the Research Navigator. In the future, this will be connected to an AI research assistant."
    
    # Return a simple JSON response
    return jsonify({
        "status": "complete",
        "token": response
    })

def get_ssl_context():
    """
    Get SSL context for HTTPS.
    
    To generate self-signed certificates for testing:
    1. openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365
    2. Place cert.pem and key.pem in the same directory as this script or specify path
    
    For production, use certificates from a proper Certificate Authority (e.g., Let's Encrypt)
    """
    cert_path = os.getenv('SSL_CERT_PATH', 'cert.pem')
    key_path = os.getenv('SSL_KEY_PATH', 'key.pem')
    
    if os.path.exists(cert_path) and os.path.exists(key_path):
        return (cert_path, key_path)
    else:
        print("WARNING: SSL certificate or key file not found.")
        print(f"Looking for: {cert_path} and {key_path}")
        print("HTTPS will not be available. Server will run in HTTP mode only.")
        return None

if __name__ == '__main__':
    print("Server starting...")
    print(f"API key {'found' if api_key else 'NOT FOUND'}")
    print(f"Model {'initialized' if rag_chain else 'NOT initialized'}")
    print(f"Allowed origins: {ALLOWED_ORIGINS}")
    
    # Get port from environment variable or use default
    port = int(os.getenv('PORT', 5000))
    
    # Try to use HTTPS if certificates are available
    ssl_context = get_ssl_context()
    if ssl_context:
        print("HTTPS enabled. Server will run with SSL/TLS.")
        app.run(host='0.0.0.0', port=port, ssl_context=ssl_context, debug=False)
    else:
        print("HTTPS not available. Running in HTTP mode.")
        print("To enable HTTPS, generate SSL certificates or provide paths in environment variables.")
        app.run(host='0.0.0.0', port=port, debug=False)