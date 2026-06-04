import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, FIREBASE_CONFIGURED } from '../lib/firebase.js';
import { SEED_INCIDENTS } from '../lib/seedData.js';

/**
 * useIncidents — subscribes to the Firestore `incidents` collection
 * via onSnapshot for real-time updates. Falls back to SEED_INCIDENTS
 * if offline / Firestore unavailable / Firebase not configured.
 */
export function useIncidents() {
  const [incidents, setIncidents] = useState(SEED_INCIDENTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If Firebase not configured, use seed data immediately
    if (!FIREBASE_CONFIGURED || !db) {
      setLoading(false);
      return;
    }

    const incidentsRef = collection(db, 'incidents');

    const unsub = onSnapshot(
      incidentsRef,
      (snap) => {
        if (snap.docs.length > 0) {
          const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setIncidents(data);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('[useIncidents] Firestore error, using seed data fallback:', err);
        setIncidents(SEED_INCIDENTS);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  return { incidents, loading };
}
