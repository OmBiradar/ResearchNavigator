import React from 'react';

interface ChatMessageProps {
  isUser: boolean;
  message: string;
  timestamp: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ isUser, message, timestamp }) => {
  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-4`}>
      <div className={isUser ? 'user-bubble' : 'assistant-bubble'}>
        {message}
      </div>
      <span className="text-xs text-gray-500 mt-1">{timestamp}</span>
    </div>
  );
};

export default ChatMessage;