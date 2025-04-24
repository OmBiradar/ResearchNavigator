import { useState, useEffect } from 'react';

const ChatInterface = () => {
  const [serverStatus, setServerStatus] = useState('checking');
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'system',
      content: 'Welcome to Research Navigator! How can I help you with your research today?'
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  // Function to check server status
  const checkServerStatus = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/time';
      const response = await fetch(API_URL, { method: 'GET', timeout: 3000 });
      setServerStatus(response.ok ? 'active' : 'inactive');
    } catch (error) {
      console.error('Server status check failed:', error);
      setServerStatus('inactive');
    }
  };

  // Check server status on component mount and every 10 seconds
  useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Add user message
    const newUserMessage = {
      id: messages.length + 1,
      role: 'user',
      content: inputValue
    };
    
    setMessages([...messages, newUserMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response (in a real app, this would call your backend API)
    setTimeout(() => {
      const newAIMessage = {
        id: messages.length + 2,
        role: 'system',
        content: 'This is a demonstration of the Research Navigator interface. In a real implementation, this would connect to your backend API to process research queries.'
      };
      setMessages(prev => [...prev, newAIMessage]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h1>Research <span className="emoji">🧭</span> Navigator</h1>
        <div className={`server-status ${serverStatus}`}>
          <span className="status-dot"></span>
          <span className="status-text">
            {serverStatus === 'active' ? 'Server Online' : 
             serverStatus === 'inactive' ? 'Server Offline' : 'Checking Server...'}
          </span>
        </div>
      </div>

      <div className="messages-container">
        {messages.map(message => (
          <div 
            key={message.id} 
            className={`message ${message.role === 'user' ? 'user-message' : 'system-message'}`}
          >
            {message.role === 'user' ? 
              <div className="avatar user">👤</div> : 
              <div className="avatar system">🧭</div>
            }
            <div className="message-content">{message.content}</div>
          </div>
        ))}
        
        {isTyping && (
          <div className="message system-message typing-indicator">
            <div className="avatar system">🧭</div>
            <div className="typing-animation">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Ask anything about your research..."
          className="chat-input"
          disabled={isTyping}
        />
        <button type="submit" className="send-button" disabled={isTyping || !inputValue.trim()}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </form>
    </div>
  );
};

export default ChatInterface;