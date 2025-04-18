import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { sessionService } from '../services/session.service';
import { jwtDecode } from 'jwt-decode';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  register: (email: string, password: string) => Promise<void>;
  getAuthHeaders: () => Record<string, string>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getUserFromToken = useCallback((token: string) => {
    try {
      const decoded = jwtDecode<{ userId: string; email: string }>(token);
      return {
        id: decoded.userId,
        email: decoded.email,
      };
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }, []);

  const updateAuthState = useCallback((token: string | null) => {
    if (token) {
      const userData = getUserFromToken(token);
      setIsAuthenticated(true);
      setUser(userData);
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
  }, [getUserFromToken]);

  useEffect(() => {
    // Check for existing session on mount
    const checkSession = () => {
      try {
        const hasSession = sessionService.hasValidSession();
        if (hasSession) {
          const token = sessionService.getAccessToken();
          updateAuthState(token);
        } else {
          updateAuthState(null);
        }
      } catch (error) {
        console.error('Error checking session:', error);
        updateAuthState(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [updateAuthState]);

  const login = useCallback((accessToken: string, refreshToken: string) => {
    try {
      sessionService.setSession(accessToken, refreshToken);
      updateAuthState(accessToken);
    } catch (error) {
      console.error('Error setting session:', error);
      throw error;
    }
  }, [updateAuthState]);

  const logout = useCallback(() => {
    try {
      sessionService.clearSession();
      updateAuthState(null);
    } catch (error) {
      console.error('Error clearing session:', error);
      throw error;
    }
  }, [updateAuthState]);

  const register = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to register');
      }

      const { accessToken, refreshToken } = await response.json();
      login(accessToken, refreshToken);
    } catch (error) {
      console.error('Error registering:', error);
      throw error;
    }
  }, [login]);

  const refreshSession = useCallback(async () => {
    if (isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      await sessionService.refreshSession();
      const token = sessionService.getAccessToken();
      updateAuthState(token);
    } catch (error) {
      console.error('Error refreshing session:', error);
      updateAuthState(null);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, updateAuthState]);

  const getAuthHeaders = useCallback(() => {
    try {
      return sessionService.getAuthHeaders();
    } catch (error) {
      console.error('Error getting auth headers:', error);
      throw error;
    }
  }, []);

  const value = {
    isAuthenticated,
    isLoading,
    user,
    login,
    logout,
    register,
    getAuthHeaders,
    refreshSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 