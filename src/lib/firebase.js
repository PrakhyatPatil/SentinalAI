import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if all required keys are present before initialising
export const FIREBASE_CONFIGURED =
  !!firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== 'YOUR_FIREBASE_API_KEY_HERE' &&
  !!firebaseConfig.projectId;

let app, db, auth;

if (FIREBASE_CONFIGURED) {
  try {
    app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    db   = getFirestore(app);
    auth = getAuth(app);
    // Sign in anonymously on init — silent, no UI prompt
    signInAnonymously(auth).catch((e) => console.warn('[Firebase] Anon auth failed:', e.message));
  } catch (e) {
    console.error('[Firebase] Init error:', e);
  }
} else {
  console.warn('[Firebase] Missing or placeholder config — Firestore disabled, using seed data only.');
}

export { app, db, auth };
export default app;
