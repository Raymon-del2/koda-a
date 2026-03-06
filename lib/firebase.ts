"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Koda Firebase Config - from environment variables
const kodaFirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Bxarchi Firebase Config - from environment variables
const bxarchiFirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_BXARCHI_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_BXARCHI_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_BXARCHI_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_BXARCHI_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_BXARCHI_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_BXARCHI_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_BXARCHI_FIREBASE_MEASUREMENT_ID,
};

// Initialize Koda Firebase (primary app)
const app = getApps().length === 0 ? initializeApp(kodaFirebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Bxarchi Firebase as secondary app
let bxarchiApp;
try {
  bxarchiApp = getApp("bxarchi");
} catch {
  bxarchiApp = initializeApp(bxarchiFirebaseConfig, "bxarchi");
}
const bxarchiDb = getFirestore(bxarchiApp);

const googleProvider = new GoogleAuthProvider();

// Add scopes to get full profile information
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export interface FirebaseUserData {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  avatar: string | null;
  displayName: string | null;
}

export { app, auth, db, bxarchiDb, googleProvider, signInWithPopup, signOut, onAuthStateChanged };
export type { FirebaseUser };
