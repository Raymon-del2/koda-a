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

// Koda Firebase Config
const kodaFirebaseConfig = {
  apiKey: "AIzaSyAyoBS2qSBYCQCzfJcoKig44H-gD2lpjqc",
  authDomain: "koda-021.firebaseapp.com",
  projectId: "koda-021",
  storageBucket: "koda-021.firebasestorage.app",
  messagingSenderId: "430672411340",
  appId: "1:430672411340:web:69a7a82ddbe926a71c6069",
  measurementId: "G-MY056KJXWS"
};

// Bxarchi Firebase Config
const bxarchiFirebaseConfig = {
  apiKey: "AIzaSyCIIVgDWr9SgOQnvCzqMqKhyw4D7Rv14M8",
  authDomain: "bxarchi-10a7d.firebaseapp.com",
  projectId: "bxarchi-10a7d",
  storageBucket: "bxarchi-10a7d.firebasestorage.app",
  messagingSenderId: "1085258654675",
  appId: "1:1085258654675:web:d46facd4549334656a0526",
  measurementId: "G-BVFCZEX873"
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
