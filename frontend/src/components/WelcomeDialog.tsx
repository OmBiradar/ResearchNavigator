import React from 'react';

interface WelcomeDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const WelcomeDialog: React.FC<WelcomeDialogProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fade-in-up">
        <div className="flex items-center mb-4">
          <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-indigo-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Welcome to Research Navigator</h2>
        </div>
        
        <div className="mb-6 text-gray-600">
          <p className="mb-3">
            Research Navigator is an AI-powered research assistant that helps you find and analyze information from the web.
          </p>
          <p>
            Ask any research question, and I'll search the web for the most relevant and up-to-date information to provide you with comprehensive answers.
          </p>
          <p className="mt-4">
            <strong>NOTE</strong>: Please accept the server certificate by visiting 
            <a href="https://172.31.149.249:5000/ping" className="text-indigo-600 hover:underline ml-1">
              this link
            </a> and trusting the site. The server uses a self-signed certificate.
            Return here afterward to use the website.
          </p>    
        
        </div>
        
        <div className="border-t border-gray-200 pt-4">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeDialog;