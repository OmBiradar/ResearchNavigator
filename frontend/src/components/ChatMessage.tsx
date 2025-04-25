import React, { useMemo } from 'react';

interface ChatMessageProps {
  isUser: boolean;
  message: string;
  timestamp: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ isUser, message, timestamp }) => {
  // Process search questions to apply styling to the spans
  const processSearchQuestions = (content: string) => {
    if (!content.includes('<span class=\'search-question\'>')) {
      return content;
    }

    // Replace newlines with <br> tags for proper HTML rendering
    const contentWithLineBreaks = content.replace(/\n/g, '<br>');

    // Enhance the search question boxes to make them more visually appealing
    // This adds additional styling to highlight the magnifying glass emoji
    return contentWithLineBreaks;
  };

  // Parse the message to detect and render the Sources section specially
  const renderMessage = useMemo(() => {
    // Check if the message contains a Sources section
    if (!isUser && message.includes('**Sources:**')) {
      const parts = message.split('**Sources:**');
      
      const mainContent = parts[0];
      const sourcesSection = parts[1];
      
      // Parse links in the format [title](url)
      const linkRegex = /\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g;
      let linkMatch;
      const sourceLinks = [];
      
      while ((linkMatch = linkRegex.exec(sourcesSection)) !== null) {
        sourceLinks.push({
          title: linkMatch[1],
          url: linkMatch[2]
        });
      }
      
      return (
        <>
          <div dangerouslySetInnerHTML={{ __html: processSearchQuestions(mainContent) }} />
          
          {sourceLinks.length > 0 && (
            <div className="sources-section">
              <p className="sources-title">Sources:</p>
              <div className="sources-links">
                {sourceLinks.map((link, index) => (
                  <a 
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="source-link"
                  >
                    {link.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      );
    }
    
    // If no sources section, process for search questions and return
    return <div dangerouslySetInnerHTML={{ __html: processSearchQuestions(message) }} />;
  }, [isUser, message]);

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-4`}>
      <div className={isUser ? 'user-bubble' : 'assistant-bubble'}>
        {renderMessage}
      </div>
      <span className="text-xs text-gray-500 mt-1">{timestamp}</span>
      
      {/* Add CSS for search question boxes */}
      <style jsx>{`
        :global(.search-question) {
          display: inline-flex;
          align-items: center;
          background-color: rgba(255, 255, 255, 0.7);
          padding: 6px 12px;
          margin: 4px;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          font-weight: 500;
          border: 1px solid rgba(200, 200, 200, 0.5);
          transition: all 0.2s ease;
        }
        
        :global(.search-question:hover) {
          background-color: rgba(255, 255, 255, 0.9);
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </div>
  );
};

export default ChatMessage;