import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, FIREBASE_CONFIGURED } from './firebase.js';

/**
 * 10 realistic pre-seeded incidents around AITR / Indore
 * (Rajwada, Vijay Nagar, AITR campus area)
 */
export const SEED_INCIDENTS = [
  // ── Central Indore ─────────────────────────────────────────────────────────
  { lat: 22.7196, lng: 75.8577, type: 'poor_lighting',      hour: 22, weight: 2, label: 'Near Rajwada Chowk' },
  { lat: 22.7213, lng: 75.8601, type: 'isolated',           hour: 23, weight: 1, label: 'Near MG Road underpass' },
  { lat: 22.7183, lng: 75.8550, type: 'harassment_history', hour: 21, weight: 3, label: 'Near Sarafa Bazaar' },
  { lat: 22.7200, lng: 75.8590, type: 'harassment_history', hour: 23, weight: 3, label: 'Near Treasure Island Mall' },
  { lat: 22.7175, lng: 75.8565, type: 'isolated',           hour: 22, weight: 1, label: 'Near Old Palasia' },
  { lat: 22.7190, lng: 75.8595, type: 'poor_lighting',      hour: 23, weight: 2, label: 'Near Bhanwarkuan Square' },
  // ── Vijay Nagar / Star Square corridor ────────────────────────────────────
  { lat: 22.7240, lng: 75.8840, type: 'poor_lighting',      hour: 20, weight: 2, label: 'Near Vijay Nagar Square' },
  { lat: 22.7230, lng: 75.8800, type: 'isolated',           hour: 22, weight: 1, label: 'Near Star Square' },
  { lat: 22.7260, lng: 75.8870, type: 'harassment_history', hour: 21, weight: 3, label: 'Near C-21 Mall' },
  { lat: 22.7250, lng: 75.8820, type: 'poor_lighting',      hour: 22, weight: 2, label: 'Near AB Road junction' },
  // ── MR-11 / Bypass road area ───────────────────────────────────────────────
  { lat: 22.7510, lng: 75.8700, type: 'isolated',           hour: 23, weight: 1, label: 'Near MR-11 Bypass' },
  { lat: 22.7480, lng: 75.8650, type: 'poor_lighting',      hour: 22, weight: 2, label: 'Near Nipania crossing' },
  { lat: 22.7520, lng: 75.8750, type: 'harassment_history', hour: 21, weight: 3, label: 'Near Bypass overbridge' },
  // ── Nipania / OMAXE area ───────────────────────────────────────────────────
  { lat: 22.7560, lng: 75.8900, type: 'poor_lighting',      hour: 21, weight: 2, label: 'Near OMAXE City' },
  { lat: 22.7540, lng: 75.8850, type: 'isolated',           hour: 22, weight: 1, label: 'Near Nipania main road' },
  // ── LIG / Annapurna area ───────────────────────────────────────────────────
  { lat: 22.7220, lng: 75.8580, type: 'harassment_history', hour: 20, weight: 3, label: 'Near LIG Square' },
  { lat: 22.7230, lng: 75.8610, type: 'poor_lighting',      hour: 21, weight: 2, label: 'Near Annapurna Road' },
];

/**
 * Seeds Firestore with demo incidents if not already seeded.
 * Uses a `meta/seeded` document as a one-time flag.
 */
export async function seedIncidentsIfNeeded() {
  if (!FIREBASE_CONFIGURED || !db) {
    console.warn('[SafeRoute] Firebase not configured — skipping seed, using local data.');
    return;
  }
  try {
    const metaRef = collection(db, 'meta');
    const snap = await getDocs(metaRef);
    const alreadySeeded = snap.docs.some((d) => d.id === 'seeded');
    if (alreadySeeded) return;

    const incidentsRef = collection(db, 'incidents');
    for (const incident of SEED_INCIDENTS) {
      await addDoc(incidentsRef, {
        ...incident,
        timestamp: serverTimestamp(),
      });
    }

    // Mark as seeded
    await addDoc(metaRef, { seededAt: serverTimestamp() });
    console.log('[SafeRoute] Seed incidents written to Firestore.');
  } catch (err) {
    console.warn('[SafeRoute] Could not seed incidents (offline?). Using local fallback.', err);
  }
}
