import React, { createContext, useContext, useState, useEffect } from 'react';

export const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // On app load, check if JWT exists and validate it
  useEffect(() => {
    const token = localStorage.getItem('jwtToken');
    if (token) {
      validateToken(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  const validateToken = async (token) => {
    try {
      const response = await fetch('/api/auth/validate', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.valid && data.user) {
        setUser(data.user);
      } else {
        localStorage.removeItem('jwtToken');
        setUser(null);
      }
    } catch (err) {
      console.error('Token validation error:', err);
      localStorage.removeItem('jwtToken');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      
      if (!data.success) {
        setError(data.error || 'Login failed');
        return false;
      }

      if (data.requires2FA) {
        return { requires2FA: true, method: data.method, tempToken: data.tempToken };
      }

      localStorage.setItem('jwtToken', data.token);
      setUser(data.user);
      setError(null);
      return true;
    } catch (err) {
      setError('Network error. Please try again.');
      return false;
    }
  };

  const verify2FA = async (tempToken, code) => {
    setError(null);
    try {
      const response = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, code })
      });
      const data = await response.json();
      
      if (!data.success) {
        setError(data.error || 'Verification failed');
        return false;
      }

      localStorage.setItem('jwtToken', data.token);
      setUser(data.user);
      setError(null);
      return true;
    } catch (err) {
      setError('Network error. Please try again.');
      return false;
    }
  };

  const signUp = async (email, firstName, lastName, department, password) => {
    setError(null);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName, lastName, department, password })
      });
      const data = await response.json();
      
      if (!data.success) {
        setError(data.error || 'Sign up failed');
        return null;
      }

      localStorage.setItem('jwtToken', data.token);
      setUser(data.user);
      setError(null);
      return data.user;
    } catch (err) {
      setError('Network error. Please try again.');
      return null;
    }
  };

  const logout = () => {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('inception_api_key');
    setUser(null);
    setError(null);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      error, 
      login, 
      verify2FA,
      signUp, 
      logout, 
      clearError 
    }}>
      {children}
    </AuthContext.Provider>
  );
}