import { useState, useEffect } from 'react';

const TimeDisplay = () => {
  const [currentTime, setCurrentTime] = useState('Loading...');
  const [error, setError] = useState(null);

  // Function to fetch time from the backend API
  const fetchTime = async () => {
    try {
      // Configure this URL to point to your backend when deploying
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/time';
      const response = await fetch(API_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      setCurrentTime(data.current_time);
    } catch (error) {
      console.error('Failed to fetch time:', error);
      setError('Error loading time');
      setCurrentTime('Error');
    }
  };

  // Fetch time on component mount
  useEffect(() => {
    fetchTime();
  }, []);

  return (
    <div className="time-container">
      <h1>Research <span className="emoji">🧭</span> Navigator</h1>
      <div className="time">{error || currentTime}</div>
      <button className="refresh" onClick={fetchTime}>Refresh Time</button>
    </div>
  );
};

export default TimeDisplay;