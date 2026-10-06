/**
 * Firebase Service Initialization
 * BKK SMK PGRI 1 Taman
 * 
 * File ini menginisialisasi Firebase Authentication dan Cloud Firestore.
 * Siap pakai untuk diunggah ke repository GitHub.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Prioritaskan file konfigurasi lokal, atau fallback ke Environment Variables (Vite)
let config = {};

try {
  // @ts-ignore
  const localConfig = await import('../firebase-applet-config.json');
  config = localConfig.default || localConfig;
} catch {
  // Fallback ke import.meta.env jika dijalankan di platform CI/CD atau hosting eksternal
  config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDZ1tDdIYdAAwWg42tegrAY7tQFu1I_u2k",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0376668382.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0376668382",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0376668382.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "419812768027",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:419812768027:web:ee4330664e271f6b32bbbe",
    firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || "ai-studio-d74210e5-8a4c-4fa7-90fd-9afab399dbde"
  };
}

export const firebaseConfig = config;

// Inisialisasi Firebase App (Singleton)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Inisialisasi Layanan Autentikasi
export const auth = getAuth(app);

// Provider Login Google
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Inisialisasi Firestore dengan Database ID khusus (Wajib untuk database terisolasi)
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export default app;
