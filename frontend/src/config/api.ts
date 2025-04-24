/**
 * API Configuration
 * 
 * This file manages the API URLs used throughout the application.
 * URLs are sourced from environment variables when available,
 * with fallbacks to default values for local development.
 */

// The base URL of the API server
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

// Helper function to construct API URLs
export const getApiUrl = (path: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${API_BASE_URL}/${cleanPath}`;
};

// Common API endpoints
export const API_ENDPOINTS = {
  ping: getApiUrl('ping'),
  status: getApiUrl('api/status'),
  chat: getApiUrl('api/chat'),
  chatSimple: getApiUrl('api/chat/simple'),
};