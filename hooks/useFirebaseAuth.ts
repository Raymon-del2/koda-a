"use client";

import { useState, useEffect } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  FirebaseUser
} from '../lib/firebase';

export interface FirebaseUserData {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  avatar: string | null;
  displayName: string | null;
}

export const useFirebaseAuth = () => {
  const [user, setUser] = useState<FirebaseUserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Convert Firebase user to our format
  const formatUser = (firebaseUser: FirebaseUser): FirebaseUserData => {
    const displayName = firebaseUser.displayName || '';
    const nameParts = displayName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email,
      firstName,
      lastName,
      avatar: firebaseUser.photoURL,
      displayName: firebaseUser.displayName,
    };
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userData = formatUser(result.user);
      setUser(userData);
      setIsAuthenticated(true);
      return userData;
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  };

  // Sign out
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userData = formatUser(firebaseUser);
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated,
    signInWithGoogle,
    logout,
  };
};
