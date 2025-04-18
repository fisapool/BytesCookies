import { useAuth } from '../contexts/AuthContext';
import { useState, useCallback } from 'react';

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
}

export function useApi<T>() {
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const request = useCallback(async (endpoint: string, options: ApiOptions = {}) => {
    const {
      method = 'GET',
      body,
      headers = {},
      requiresAuth = true
    } = options;

    setLoading(true);
    setError(null);

    try {
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers
      };

      if (requiresAuth) {
        const authHeaders = getAuthHeaders();
        Object.assign(requestHeaders, authHeaders);
      }

      const response = await fetch(`/api${endpoint}`, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API request failed');
      }

      const responseData = await response.json();
      setData(responseData);
      return responseData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  return {
    data,
    error,
    loading,
    request
  };
} 