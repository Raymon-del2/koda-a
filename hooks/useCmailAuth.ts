"use client";

import { useState, useEffect, useCallback } from 'react';

const CMAIL_API_URL = 'https://c-mail.vercel.app/api';

export interface CmailUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

export const useCmailAuth = () => {
  const [user, setUser] = useState<CmailUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const getToken = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    
    if (urlToken) {
      localStorage.setItem('cmail_token', urlToken);
      window.history.replaceState({}, document.title, window.location.pathname);
      return urlToken;
    }
    
    return localStorage.getItem('cmail_token');
  }, []);

  const redirectToCmailLogin = useCallback((appName: string) => {
    if (typeof window === 'undefined') return;
    
    const currentUrl = window.location.origin + window.location.pathname;
    const encodedAppName = encodeURIComponent(appName);
    const encodedRedirect = encodeURIComponent(currentUrl);
    
    window.location.href = `https://c-mail.vercel.app/signin?redirect_uri=${encodedRedirect}&app_name=${encodedAppName}`;
  }, []);

  const verifyToken = useCallback(async (token: string) => {
    try {
      const response = await fetch(`${CMAIL_API_URL}/sso/sso-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setUser(data.user);
        setIsAuthenticated(true);
        return data.user;
      } else {
        // Token invalid/expired - clear and redirect to login
        localStorage.removeItem('cmail_token');
        setIsAuthenticated(false);
        setUser(null);
        redirectToCmailLogin('Koda-A');
      }
    } catch (error) {
      // Network/API error - clear token and redirect to login
      localStorage.removeItem('cmail_token');
      setIsAuthenticated(false);
      setUser(null);
      redirectToCmailLogin('Koda-A');
    } finally {
      setIsLoading(false);
    }
    return null;
  }, [redirectToCmailLogin]);

  const logout = useCallback(() => {
    localStorage.removeItem('cmail_token');
    setUser(null);
    setIsAuthenticated(false);
    if (typeof window !== 'undefined') {
      window.location.href = 'https://c-mail.vercel.app/signin';
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const token = getToken();
      if (token) {
        await verifyToken(token);
      } else {
        setIsLoading(false);
      }
    };
    init();
  }, [getToken, verifyToken]);

  return {
    user,
    isLoading,
    isAuthenticated,
    logout,
    redirectToCmailLogin,
    getToken,
  };
};
