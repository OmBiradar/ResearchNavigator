import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config/api';

const ServerStatus: React.FC = () => {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Function to check server status
    const checkServerStatus = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(API_ENDPOINTS.ping, { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        setIsActive(response.ok);
      } catch (error) {
        setIsActive(false);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial check
    checkServerStatus();

    // Set interval to check every 5 seconds
    const intervalId = setInterval(checkServerStatus, 5000);

    // Clean up on component unmount
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className={`ml-auto px-2 py-1 text-xs rounded-full flex items-center ${
      isLoading 
        ? 'bg-yellow-100 text-yellow-800' 
        : isActive 
          ? 'bg-green-100 text-green-800'
          : 'bg-red-100 text-red-800'
    }`}>
      <div className={`w-2 h-2 rounded-full mr-1.5 ${
        isLoading 
          ? 'bg-yellow-500 animate-pulse' 
          : isActive 
            ? 'bg-green-500'
            : 'bg-red-500'
      }`}></div>
      {isLoading ? 'Checking...' : isActive ? 'Server Active' : 'Server Offline'}
    </div>
  );
};

export default ServerStatus;