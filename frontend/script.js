// Configuration - change this to your backend URL when deploying
const API_URL = 'http://localhost:5000/api/time';

// Function to fetch time from backend
async function fetchTime() {
    try {
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        document.getElementById('time').textContent = data.current_time;
    } catch (error) {
        console.error('Failed to fetch time:', error);
        document.getElementById('time').textContent = 'Error loading time';
    }
}

// Add event listener to refresh button
document.getElementById('refresh-btn').addEventListener('click', fetchTime);

// Fetch time on page load
document.addEventListener('DOMContentLoaded', fetchTime);