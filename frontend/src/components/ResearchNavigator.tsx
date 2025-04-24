import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import FileAttachment from './FileAttachment';
import PDFGenerator from './PDFGenerator';
import ServerStatus from './ServerStatus';
import { API_ENDPOINTS } from '../config/api';

interface Message {
  id: string;
  isUser: boolean;
  text: string;
  timestamp: string;
}

interface ResearchNavigatorProps {
  title?: string;
}

const ResearchNavigator: React.FC<ResearchNavigatorProps> = ({ title = 'Research Navigator' }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPdfGenerator, setShowPdfGenerator] = useState(false);
  const [pdfContent, setPdfContent] = useState('');
  const [currentResponseText, setCurrentResponseText] = useState('');
  const [isStreamActive, setIsStreamActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const responseTextRef = useRef(''); // Use ref to avoid race conditions

  // Scroll to bottom whenever messages change or currentResponseText updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentResponseText]);

  // Clean up AbortController on component unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      isUser: true,
      text: inputMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const questionText = inputMessage;
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsProcessing(true);
    setCurrentResponseText('');
    responseTextRef.current = ''; // Reset the ref
    setIsStreamActive(true);

    // Special case for PDF generation (keeping this demo feature)
    if (questionText.toLowerCase().includes('pdf') || questionText.toLowerCase().includes('report')) {
      handlePdfRequest(questionText);
      return;
    }

    try {
      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();
      
      // Connect to the server using fetch with streaming
      connectToStream(questionText);
    } catch (error) {
      console.error('Error connecting to AI service:', error);
      handleAssistantResponse("I'm sorry, there was an error connecting to the AI service. Please try again later.");
      setIsProcessing(false);
      setIsStreamActive(false);
    }
  };

  const connectToStream = (question: string) => {
    // First, make the POST request to initiate the chat
    fetch(API_ENDPOINTS.chat, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({ question }),
      credentials: 'include',
      signal: abortControllerRef.current?.signal
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      // Create a reader from the response body stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Could not get reader from response');
      }
      
      // Process the stream
      const decoder = new TextDecoder();
      let buffer = '';
      
      function processStream() {
        // Using non-null assertion since we've already checked above
        reader!.read().then(({ done, value }) => {
          if (done) {
            // Stream is done naturally (not due to abort)
            console.log("Stream closed with done signal");
            // Finalize the message if we have content and haven't already finalized it
            if (responseTextRef.current && isStreamActive) {
              handleAssistantResponse(responseTextRef.current);
              setIsProcessing(false);
              setIsStreamActive(false);
            }
            return;
          }
          
          // Decode the chunk and add to buffer
          const chunk = decoder.decode(value, { stream: true });
          console.log("Received chunk:", chunk);
          buffer += chunk;
          
          // Process complete events in buffer
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';
          
          for (const event of events) {
            if (!event.trim()) continue;
            
            // Parse the SSE data format (data: {...})
            const dataMatch = event.match(/^data: (.+)$/m);
            if (dataMatch && dataMatch[1]) {
              try {
                console.log("Parsing data:", dataMatch[1]);
                const data = JSON.parse(dataMatch[1]);
                
                if (data.status === 'started') {
                  console.log("Stream started");
                  // Stream started - nothing to do here
                } else if (data.token !== undefined) {
                  console.log("Received token:", data.token);
                  // Append token to the current response
                  const newText = responseTextRef.current + data.token;
                  responseTextRef.current = newText;
                  setCurrentResponseText(newText);
                } else if (data.status === 'complete') {
                  // Stream complete - finalize the message
                  console.log("Stream complete");
                  if (responseTextRef.current) {
                    // Use a small timeout to ensure all tokens are processed
                    setTimeout(() => {
                      handleAssistantResponse(responseTextRef.current);
                      setIsProcessing(false);
                      setIsStreamActive(false);
                    }, 100);
                  } else {
                    setIsProcessing(false);
                    setIsStreamActive(false);
                  }
                  return; // Exit the stream processing
                } else if (data.error || data.status === 'error') {
                  // Handle error
                  console.error("Stream error:", data.error);
                  handleAssistantResponse(`Error: ${data.error || 'Unknown error occurred'}`);
                  setIsProcessing(false);
                  setIsStreamActive(false);
                  return; // Exit the stream processing
                }
              } catch (error) {
                console.error('Error parsing SSE data:', error, dataMatch[1]);
              }
            }
          }
          
          // Continue reading
          processStream();
        }).catch(error => {
          if (error.name === 'AbortError') {
            console.log('Stream reading was aborted');
          } else {
            console.error('Error reading stream:', error);
            handleAssistantResponse("I'm sorry, there was an error processing the AI response. Please try again later.");
          }
          setIsProcessing(false);
          setIsStreamActive(false);
        });
      }
      
      // Start processing the stream
      processStream();
    })
    .catch(error => {
      if (error.name === 'AbortError') {
        console.log('Request was aborted');
      } else {
        console.error('Error sending POST request:', error);
        handleAssistantResponse("I'm sorry, there was an error connecting to the AI service. Please try again later.");
      }
      setIsProcessing(false);
      setIsStreamActive(false);
    });
  };

  // Handle PDF generation requests (keeping this demo feature)
  const handlePdfRequest = (question: string) => {
    handleAssistantResponse("I'll create a PDF report based on the sales analysis. Let me prepare that for you.");
    
    setTimeout(() => {
      setShowPdfGenerator(true);
      setPdfContent(`
        <h2>Sales Analysis Report</h2>
        <p>This report provides a comprehensive analysis of sales data for Q1 2024.</p>
        <h3>Quarterly Trends</h3>
        <p>Sales have increased by 15% compared to the previous quarter.</p>
        <h3>Key Growth Areas</h3>
        <ul>
          <li>North America: 18% growth</li>
          <li>Europe: 12% growth</li>
          <li>Asia: 22% growth</li>
        </ul>
        <h3>Recommendations</h3>
        <ol>
          <li>Increase marketing budget for Asian markets</li>
          <li>Focus on product development for European customers</li>
          <li>Optimize supply chain for North American distribution</li>
        </ol>
      `);
      
      // Add the completion message
      handleAssistantResponse("I've created a comprehensive PDF report based on the sales analysis. The report includes quarterly trends, growth percentages, and recommendations for future strategies.");
      setIsProcessing(false);
      setIsStreamActive(false);
    }, 2000);
  };

  const handleAssistantResponse = (text: string) => {
    // Only add non-empty responses
    if (!text.trim()) return;
    
    const assistantMessage: Message = {
      id: Date.now().toString(),
      isUser: false,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, assistantMessage]);
    setCurrentResponseText('');
    responseTextRef.current = '';
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-indigo-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold">{title}</h1>
          </div>
          <ServerStatus />
        </div>
      </header>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map(message => (
          <ChatMessage
            key={message.id}
            isUser={message.isUser}
            message={message.text}
            timestamp={message.timestamp}
          />
        ))}
        
        {/* Display streaming text in real-time */}
        {isStreamActive && currentResponseText && (
          <div className="flex flex-col items-start mb-4">
            <div className="temp-message-bubble">
              <div id="temp-message">{currentResponseText}</div>
            </div>
            <span className="text-xs text-gray-500 mt-1">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
        
        {showPdfGenerator && (
          <>
            <div className="flex flex-col items-start mb-4">
              <PDFGenerator 
                title="Sales Analysis Report" 
                content={pdfContent} 
              />
            </div>
            <div className="flex flex-col items-start mb-4">
              <FileAttachment 
                fileName="sales_report.pdf"
                fileSize="1.8 MB"
                filePath="/path/to/file"
                fileType="pdf"
              />
              <span className="text-xs text-gray-500 mt-1">4:37 PM</span>
            </div>
            <ChatMessage 
              isUser={false} 
              message="I've created a comprehensive PDF report based on the sales analysis. The report includes quarterly trends, growth percentages, and recommendations for future strategies." 
              timestamp="4:37 PM" 
            />
          </>
        )}
        
        {isProcessing && !isStreamActive && !currentResponseText && (
          <div className="flex items-center space-x-2 mb-4">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-4">
        <form onSubmit={handleSendMessage} className="flex items-center">
          <input
            type="text"
            placeholder="Message Research Navigator..."
            className="input-field"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isProcessing}
          />
          <button
            type="submit"
            className="ml-2 p-2 rounded-full bg-indigo-600 text-white"
            disabled={isProcessing || !inputMessage.trim()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResearchNavigator;