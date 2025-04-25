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
# New imports for web search functionality
from langchain_community.utilities import DuckDuckGoSearchAPIWrapper
from langchain_core.runnables import RunnablePassthrough
from langchain_community.document_loaders import WebBaseLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from urllib.parse import urlparse
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from typing import List
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# WebRAG class for web search functionality
class WebRAG:
    def __init__(self, google_api_key):
        self.llm = ChatGoogleGenerativeAI(
            model="gemma-3-27b-it",
            google_api_key=google_api_key
        )
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=google_api_key
        )
        self.search = DuckDuckGoSearchAPIWrapper()
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        self.vectorstore = None
        self.current_search_urls = []  # Track URLs used for the current search

        # Create prompt template for web search results that includes source references
        self.prompt = PromptTemplate.from_template("""
        Use the following context from web searches to answer the question.
        Compile all the informaiton from all the sources and provide a comprehensive answer.
        If the answer cannot be found in the context, say "I couldn't find relevant information."
        
        While mentioning the answer, include a reference to the sources used. 
        For example, "According to the Economic Times, .."
        where "Economic Times" is the name of the source.

        Context: {context}

        Question: {question}
        """)
        
        # Create prompt template for generating search questions
        self.search_questions_prompt = PromptTemplate.from_template("""
        You are a research assistant tasked with breaking down a complex question into multiple specific search queries.
        For the following question, generate 3-5 specific search queries that would help gather comprehensive information to answer it.
        Make the queries diverse to cover different aspects of the question.
        
        Original question: "{question}"
        
        Output the search queries as a numbered list without any additional explanation.
        """)

    def generate_search_questions(self, question: str) -> List[str]:
        """Generate multiple search questions based on the original query"""
        logger.info(f"Generating search questions for: {question}")
        
        try:
            # Create a chain to generate search questions
            search_questions_chain = (
                self.search_questions_prompt 
                | self.llm 
                | StrOutputParser()
            )
            
            # Generate the search questions
            result = search_questions_chain.invoke({"question": question})
            
            # Parse the numbered list into individual questions
            questions = []
            for line in result.strip().split('\n'):
                # Remove numbering and any leading/trailing whitespace
                if line and any(c.isdigit() for c in line):
                    # Extract everything after the number and period/parenthesis
                    cleaned_line = line.strip()
                    idx = 0
                    while idx < len(cleaned_line) and (cleaned_line[idx].isdigit() or cleaned_line[idx] in '.()\\ -'):
                        idx += 1
                    cleaned_line = cleaned_line[idx:].strip()
                    if cleaned_line:
                        questions.append(cleaned_line)
            
            # If parsing failed, use the original question as fallback
            if not questions:
                logger.warning("Failed to parse search questions, using original question")
                questions = [question]
            
            logger.info(f"Generated {len(questions)} search questions")
            return questions
        
        except Exception as e:
            logger.error(f"Error generating search questions: {str(e)}")
            return [question]  # Fall back to the original question

    def search_and_load(self, query: str, num_results: int = 3) -> List[str]:
        """Perform DuckDuckGo search and load webpage contents"""
        logger.info(f"Searching the web for: {query}")
        search_results = self.search.results(query, num_results)
        
        # Store URLs and titles for the current search
        urls = []
        
        for result in search_results:
            url = result["link"]
            title = result.get("title", url)
            domain = urlparse(url).netloc
            
            # Add URL and title to the current search list
            self.current_search_urls.append({
                "url": url,
                "title": title,
                "domain": domain
            })
            
            urls.append(url)
            logger.info(f"Found result from domain: {domain}, title: {title}")
        
        # Load webpages
        try:
            loader = WebBaseLoader(urls)
            documents = loader.load()
            logger.info(f"Loaded {len(documents)} documents from web search")
            
            # Split documents
            splits = self.text_splitter.split_documents(documents)
            
            # Create or update vectorstore
            if self.vectorstore is None:
                self.vectorstore = Chroma.from_documents(
                    documents=splits,
                    embedding=self.embeddings,
                    persist_directory="./web_chroma_db"
                )
            else:
                self.vectorstore.add_documents(splits)
                
            return splits
        except Exception as e:
            logger.error(f"Error loading web content: {str(e)}")
            return []

    def query(self, question: str) -> str:
        """Process query through RAG pipeline"""
        # First search and load relevant content
        try:
            # Clear any previous search URLs
            self.current_search_urls = []
            
            # Generate multiple search questions
            search_questions = self.generate_search_questions(question)
            
            # Search for each question
            all_urls_set = set()  # Track unique URLs to avoid duplicates
            for search_question in search_questions:
                logger.info(f"Searching for question: {search_question}")
                self.search_and_load(search_question)
                
                # Keep track of unique URLs for citation
                current_urls = {source["url"] for source in self.current_search_urls}
                all_urls_set.update(current_urls)
            
            # Create retriever function
            def retrieve_context(question):
                docs = self.vectorstore.similarity_search(question, k=5)  # Increased to get more context
                return "\n".join([doc.page_content for doc in docs])

            # Create RAG chain
            rag_chain = (
                {
                    "context": retrieve_context,
                    "question": RunnablePassthrough()
                }
                | self.prompt
                | self.llm
                | StrOutputParser()
            )

            # Get the answer from the RAG chain
            answer = rag_chain.invoke(question)
            
            # Format the search URLs as markdown links and append to the answer
            if self.current_search_urls:
                sources_section = "\n\n**Sources:**\n"
                for i, source in enumerate(self.current_search_urls):
                    title = source["title"] or f"Source {i+1}"
                    url = source["url"]
                    sources_section += f"- [{title}]({url})\n"
                
                answer += sources_section
            
            return answer
        except Exception as e:
            logger.error(f"Error in web RAG query: {str(e)}")
            return f"I encountered an error while searching the web: {str(e)}"

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

# Initialize components when API key is available
if api_key:
    try:
        # Initialize the main Gemini model
        llm = ChatGoogleGenerativeAI(
            model="gemma-3-27b-it", 
            google_api_key=api_key,
            disable_streaming=False
        )
        
        # Initialize the WebRAG system
        web_rag = WebRAG(google_api_key=api_key)
        
        # Define prompt template for web search decision
        web_search_decision_template = """
        You are Research Navigator, an AI assistant that determines if a question requires searching the web.
        
        For the following question, answer with only "Yes" if you need to search the web for current information, 
        or "No" if you already have enough knowledge to answer accurately without searching.
        
        Question: "{question}"
        """

        web_search_decision_prompt = PromptTemplate.from_template(web_search_decision_template)
        
        # Create the web search decision chain
        web_search_decision_chain = (
            web_search_decision_prompt
            | llm
            | StrOutputParser()
        )
        
        # Define prompt template for regular questions
        standard_prompt_template = """
        You are Research Navigator, an AI research assistant designed to provide helpful, 
        accurate, and thoughtful responses to research questions.

        User question: "{question}"
        
        Provide a well-structured and comprehensive answer.
        """

        standard_prompt = PromptTemplate.from_template(standard_prompt_template)

        # Create the standard chain
        standard_chain = (
            standard_prompt
            | llm
            | StrOutputParser()
        )
        
        print("Gemini models and WebRAG initialized successfully!")
    except Exception as e:
        print(f"ERROR initializing Gemini model or WebRAG: {e}")
        llm = None
        web_rag = None
        web_search_decision_chain = None
        standard_chain = None
else:
    llm = None
    web_rag = None
    web_search_decision_chain = None
    standard_chain = None
    print("No API key found, models NOT initialized.")

@app.route('/api/status', methods=['GET'])
def get_status():
    """Get the status of the server and model"""
    status = {
        "server": "online",
        "model_initialized": llm is not None,
        "web_rag_initialized": web_rag is not None,
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
    """Handle user questions and stream AI responses with optional web search"""
    try:
        # Check if the models are initialized
        if not llm or not web_rag:
            if not api_key:
                return jsonify({
                    "error": "Google API key not found. Please set the GOOGLE_API_KEY environment variable."
                }), 500
            else:
                return jsonify({
                    "error": "AI models not initialized. Check server logs for details."
                }), 500

        # Get the question from the request
        data = request.json
        if not data or 'question' not in data:
            return jsonify({"error": "Missing question parameter"}), 400
        
        question = data['question']
        logger.info(f"Received question: {question}")
        
        # Function to stream the response
        def generate_response():
            try:
                # Send the response header for Server-Sent Events
                yield 'data: ' + json.dumps({'status': 'started'}) + '\n\n'
                
                # First, determine if we need to search the web
                logger.info("Determining if web search is needed...")
                yield 'data: ' + json.dumps({'token': "Thinking if I need to search the web...\n"}) + '\n\n'
                
                need_web_search = web_search_decision_chain.invoke({"question": question}).strip().lower()
                logger.info(f"Web search decision: {need_web_search}")
                
                if "yes" in need_web_search:
                    # Use web search to answer the question
                    yield 'data: ' + json.dumps({'token': "I need to search the web for this. One moment...\n\n"}) + '\n\n'
                    
                    # Get answer from web RAG
                    answer = web_rag.query(question)
                    
                    # Stream the answer token by token
                    for i in range(0, len(answer), 10):  # Send chunks of 10 chars for smoother streaming
                        chunk = answer[i:i+10]
                        yield 'data: ' + json.dumps({'token': chunk}) + '\n\n'
                else:
                    # Use standard model without web search
                    yield 'data: ' + json.dumps({'token': "I can answer this without searching the web.\n\n"}) + '\n\n'
                    
                    # Stream tokens from standard chain
                    for token in standard_chain.stream({"question": question}):
                        yield 'data: ' + json.dumps({'token': token}) + '\n\n'
                    
                # Send completion event
                yield 'data: ' + json.dumps({'status': 'complete'}) + '\n\n'
                
            except Exception as e:
                logger.error(f"Error in streaming response: {str(e)}")
                logger.error(traceback.format_exc())
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
        logger.error(f"Error in chat endpoint: {str(e)}")
        logger.error(traceback.format_exc())
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
    print(f"Model {'initialized' if llm and web_rag else 'NOT initialized'}")
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