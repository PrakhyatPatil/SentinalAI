import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db, FIREBASE_CONFIGURED, authReady, auth } from '../lib/firebase.js';
import { SEED_INCIDENTS } from '../lib/seedData.js';

/**
 * useIncidents — subscribes to the Firestore `incidents` collection
 * via onSnapshot for real-time updates. Falls back to SEED_INCIDENTS
 * if offline / Firestore unavailable / Firebase not configured.
 */
export function useIncidents() {
  const [incidents, setIncidents] = useState(SEED_INCIDENTS);
  const [loading, setLoading] = useState(true);
  // Track IDs that have been locally deleted (for seed incidents or Firestore fallback)
  const [deletedIds, setDeletedIds] = useState(new Set());

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
        // Always merge Firestore docs with SEED_INCIDENTS so pre-loaded
        // incidents never disappear when a new report is written.
        const firestoreDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Deduplicate: prefer Firestore doc if it shares an id with a seed entry
        const firestoreIds = new Set(firestoreDocs.map((d) => d.id));
        const seeds = SEED_INCIDENTS.filter((s) => !firestoreIds.has(s.id));
        setIncidents([...firestoreDocs, ...seeds]);
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

  /**
   * deleteIncident — removes an incident by id.
   * - If it is a Firestore doc (no "local_" prefix and Firebase configured), deletes from Firestore.
   * - Otherwise removes it from local state only.
   */
  const deleteIncident = useCallback(async (incidentId) => {
    const isLocal = String(incidentId).startsWith('local_');
    const isSeed  = SEED_INCIDENTS.some((s) => s.id === incidentId);

    if (!isLocal && !isSeed && FIREBASE_CONFIGURED && db) {
      try {
        await authReady;
        const user = auth?.currentUser;
        if (user) {
          await deleteDoc(doc(db, 'incidents', incidentId));
          // onSnapshot will automatically update `incidents` state
          return;
        }
      } catch (err) {
        console.warn('[useIncidents] Firestore delete failed, removing locally:', err.message);
      }
    }

    // Local removal: mark id as deleted so it is filtered from the merged list
    setDeletedIds((prev) => new Set([...prev, incidentId]));
    setIncidents((prev) => prev.filter((inc) => inc.id !== incidentId));
  }, []);

  return { incidents, loading, deletedIds, deleteIncident };
}
