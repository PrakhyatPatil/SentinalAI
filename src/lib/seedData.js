import { collection, getDocs, serverTimestamp, deleteDoc, doc, setDoc, writeBatch, getDoc } from 'firebase/firestore';
import { db, FIREBASE_CONFIGURED, authReady } from './firebase.js';

/**
 * 85+ highly realistic pre-seeded incidents across Indore.
 * Provides dense clusters around Central Indore (Rajwada/Sarafa) and along 
 * the default demo route corridor (AITR College -> Vijay Nagar Square) for a proper heatmap.
 */
export const SEED_INCIDENTS = [
  // ── Central Indore / Rajwada / Sarafa (Immediate visual impact on load) ──────
  { lat: 22.7196, lng: 75.8577, type: 'poor_lighting',      hour: 22, weight: 2, label: 'Rajwada Chowk', description: 'Dark alleys behind the main historical palace. Very dim lighting.' },
  { lat: 22.7194, lng: 75.8583, type: 'poor_lighting',      hour: 23, weight: 2, label: 'Rajwada Market Alley', description: 'Broken street lamps in the busy market lanes make it dark after closing.' },
  { lat: 22.7202, lng: 75.8570, type: 'isolated',           hour: 23, weight: 1, label: 'MG Road Junction', description: 'Underpass area gets completely deserted with minimal police presence.' },
  { lat: 22.7183, lng: 75.8550, type: 'harassment_history', hour: 21, weight: 3, label: 'Sarafa Bazaar Entrance', description: 'Crowded lanes where pickpocketing and eve-teasing are frequently reported.' },
  { lat: 22.7180, lng: 75.8555, type: 'harassment_history', hour: 22, weight: 3, label: 'Sarafa Jewelry Street', description: 'Narrow jewelry corridors with history of bag snatching incidents.' },
  { lat: 22.7186, lng: 75.8544, type: 'isolated',           hour: 23, weight: 1, label: 'Sarafa Back Lane', description: 'Dimly lit pathway behind food stalls with low security.' },
  { lat: 22.7215, lng: 75.8601, type: 'poor_lighting',      hour: 20, weight: 2, label: 'Near Subhash Chowk', description: 'Multiple streetlights are non-functional on this corner.' },
  { lat: 22.7175, lng: 75.8590, type: 'isolated',           hour: 22, weight: 1, label: 'Nandlalpura Road', description: 'Industrial/trade shops close early, leaving the road deserted.' },
  { lat: 22.7230, lng: 75.8540, type: 'poor_lighting',      hour: 21, weight: 2, label: 'Khajuri Bazar Alleys', description: 'Very narrow streets with poor lighting, blocks visibility.' },
  { lat: 22.7150, lng: 75.8560, type: 'harassment_history', hour: 20, weight: 3, label: 'Jawahar Marg Crossing', description: 'Frequent loitering near the local bus stop.' },
  { lat: 22.7170, lng: 75.8630, type: 'isolated',           hour: 1,  weight: 1, label: 'Indore Railway Station Front', description: 'High congestion and vagrancy. Feels unsafe late at night.' },
  { lat: 22.7185, lng: 75.8650, type: 'poor_lighting',      hour: 23, weight: 2, label: 'Station Road Alleys', description: 'Poor lighting under the trees behind the railway office.' },

  // ── Vijay Nagar / AB Road Corridor (Target Endpoint) ──────────────────────
  { lat: 22.7533, lng: 75.8937, type: 'poor_lighting',      hour: 22, weight: 2, label: 'Vijay Nagar Square', description: 'Junction streetlights frequently fail, causing dark spots.' },
  { lat: 22.7530, lng: 75.8942, type: 'harassment_history', hour: 23, weight: 3, label: 'C-21 Mall Service Lane', description: 'Eve-teasing and catcalling reported near mall parking exits.' },
  { lat: 22.7540, lng: 75.8931, type: 'isolated',           hour: 22, weight: 1, label: 'Behind Malhar Mega Mall', description: 'Extremely quiet commercial backyard with no foot traffic.' },
  { lat: 22.7525, lng: 75.8948, type: 'poor_lighting',      hour: 21, weight: 2, label: 'Mangal City Connector', description: 'Broken lamps along the footpath block visibility.' },
  { lat: 22.7550, lng: 75.8920, type: 'isolated',           hour: 0,  weight: 1, label: 'Satya Sai Flyover Underpass', description: 'Unlit, isolated space under the flyover structure.' },
  { lat: 22.7560, lng: 75.8912, type: 'harassment_history', hour: 20, weight: 3, label: 'Scheme 78 Sector Lane', description: 'Unmonitored public park boundary with loitering groups.' },
  { lat: 22.7515, lng: 75.8955, type: 'poor_lighting',      hour: 23, weight: 2, label: 'Scheme 54 Corner', description: 'Dimly lit residential street corner with tall trees.' },
  { lat: 22.7480, lng: 75.8965, type: 'isolated',           hour: 22, weight: 1, label: 'LIG Link Road', description: 'Deserted straight road, vehicles speed past but no pedestrians.' },
  { lat: 22.7495, lng: 75.8930, type: 'harassment_history', hour: 21, weight: 3, label: 'Bapat Square Bus Stop', description: 'Complaints of verbal harassment at the night bus shelter.' },

  // ── Old Vijay Nagar / Star Square Area ──────────────────────────────────────
  { lat: 22.7240, lng: 75.8840, type: 'poor_lighting',      hour: 22, weight: 2, label: 'Vijay Nagar Old Sector', description: 'Residential lane with multiple non-functional streetlights.' },
  { lat: 22.7230, lng: 75.8800, type: 'isolated',           hour: 23, weight: 1, label: 'Star Square Entry', description: 'Dark service road leading onto the main bypass corridor.' },
  { lat: 22.7260, lng: 75.8870, type: 'harassment_history', hour: 21, weight: 3, label: 'C-21 Outer Circle', description: 'Reports of harassment near local fast food stalls.' },
  { lat: 22.7250, lng: 75.8820, type: 'poor_lighting',      hour: 22, weight: 2, label: 'AB Road Service Rd', description: 'Dense tree cover blocks what little light the streetlamps provide.' },
  { lat: 22.7245, lng: 75.8855, type: 'harassment_history', hour: 23, weight: 3, label: 'Vijay Nagar Playground', description: 'Vandalism and rowdy groups gathered at the park edge.' },
  { lat: 22.7235, lng: 75.8810, type: 'isolated',           hour: 1,  weight: 1, label: 'Star Square Bypass', description: 'Deserted highway service lane, no active shops or security.' },
  { lat: 22.7255, lng: 75.8865, type: 'poor_lighting',      hour: 22, weight: 2, label: 'Vijay Nagar B-Block', description: 'Dark corridor behind local apartments.' },

  // ── AITR to Vijay Nagar Corridor (Bypass / MR-11 / Nipania) ──────────────────
  // Dense clusters directly along the route to show safe vs. risky segments
  { lat: 22.7932, lng: 75.9329, type: 'poor_lighting',      hour: 20, weight: 2, label: 'AITR College Gate', description: 'Dim lighting at the college entrance pathway after campus hours.' },
  { lat: 22.7925, lng: 75.9340, type: 'harassment_history', hour: 21, weight: 3, label: 'Student Hostel Alley', description: 'Reports of harassment targeting students walking back to hostels.' },
  { lat: 22.7940, lng: 75.9320, type: 'isolated',           hour: 22, weight: 1, label: 'Acropolis Back Road', description: 'Completely empty and dark dirt road behind the college campus.' },
  { lat: 22.7950, lng: 75.9360, type: 'poor_lighting',      hour: 23, weight: 2, label: 'Manglia Bypass Junction', description: 'High-speed trucks passing through a poorly illuminated junction.' },
  { lat: 22.7905, lng: 75.9305, type: 'isolated',           hour: 23, weight: 1, label: 'Industrial Service Road', description: 'Quiet road bordering warehouse plots, highly isolated.' },
  { lat: 22.7880, lng: 75.9310, type: 'poor_lighting',      hour: 20, weight: 2, label: 'Bypass Truck Terminal', description: 'Dimly lit highway shoulder where trucks park.' },
  { lat: 22.7850, lng: 75.9270, type: 'isolated',           hour: 22, weight: 1, label: 'Bypass near Ruchi Soya', description: 'Empty industrial corridor. Low visibility at night.' },
  { lat: 22.7830, lng: 75.9260, type: 'isolated',           hour: 23, weight: 1, label: 'Jhalaria Crossing', description: 'Quiet rural connector road leading onto the highway.' },
  { lat: 22.7800, lng: 75.9220, type: 'poor_lighting',      hour: 21, weight: 2, label: 'Bypass near Jhalaria', description: 'Long stretch of bypass with several broken streetlights.' },
  { lat: 22.7810, lng: 75.9230, type: 'harassment_history', hour: 22, weight: 3, label: 'Jhalaria Dhaba Lane', description: 'Rowdy groups gather outside local dhabas late at night.' },
  { lat: 22.7825, lng: 75.9250, type: 'poor_lighting',      hour: 23, weight: 2, label: 'Bypass Pedestrian Path', description: 'No lighting fixtures active on the pedestrian overbridge.' },
  { lat: 22.7780, lng: 75.9180, type: 'harassment_history', hour: 21, weight: 3, label: 'Omaxe Link Road', description: 'Eve-teasing reported near the residential township outer boundary.' },
  { lat: 22.7750, lng: 75.9150, type: 'harassment_history', hour: 22, weight: 3, label: 'Omaxe City Main Gate', description: 'Loitering groups gather in the shadows outside the gated area.' },
  { lat: 22.7758, lng: 75.9158, type: 'isolated',           hour: 23, weight: 1, label: 'Omaxe Back Road', description: 'Unpaved, pitch black lane bordering agricultural fields.' },
  { lat: 22.7745, lng: 75.9142, type: 'poor_lighting',      hour: 0,  weight: 2, label: 'Omaxe Sector 1 Connector', description: 'Dim lighting between residential layout blocks.' },
  { lat: 22.7720, lng: 75.9120, type: 'poor_lighting',      hour: 23, weight: 2, label: 'Nipania Market Corner', description: 'Dimly lit alley behind local vendor shops.' },
  { lat: 22.7700, lng: 75.9100, type: 'poor_lighting',      hour: 22, weight: 2, label: 'Nipania Crossing', description: 'Busy market junction during the day, poorly lit at night.' },
  { lat: 22.7705, lng: 75.9108, type: 'harassment_history', hour: 21, weight: 3, label: 'Nipania Service Lane', description: 'Catcalling reported outside local convenience stores.' },
  { lat: 22.7695, lng: 75.9092, type: 'isolated',           hour: 23, weight: 1, label: 'Nipania Back Lane', description: 'Quiet pathway bordered by vacant residential plots.' },
  { lat: 22.7680, lng: 75.9080, type: 'isolated',           hour: 0,  weight: 1, label: 'MR-11 Shortcut Road', description: 'Completely isolated road linking local colonies.' },
  { lat: 22.7650, lng: 75.9050, type: 'isolated',           hour: 23, weight: 1, label: 'MR-11 Bypass Junction', description: 'Very quiet highway junction with no streetlights or patrols.' },
  { lat: 22.7662, lng: 75.9070, type: 'poor_lighting',      hour: 22, weight: 2, label: 'MR-11 Service Road', description: 'Heavy foliage hides the streetlights, casting dark shadows.' },
  { lat: 22.7645, lng: 75.9060, type: 'harassment_history', hour: 22, weight: 3, label: 'MR-11 Outer Loop', description: 'Rowdy groups gather in cars near the empty plots.' },
  { lat: 22.7620, lng: 75.9050, type: 'isolated',           hour: 23, weight: 1, label: 'MR-11 Underpass', description: 'Isolated, damp, and pitch black walk under the bypass rail track.' },
  { lat: 22.7625, lng: 75.9058, type: 'poor_lighting',      hour: 0,  weight: 2, label: 'MR-11 Main Stretch', description: 'Frequent streetlight outages along this main road segment.' },
  { lat: 22.7615, lng: 75.9042, type: 'harassment_history', hour: 21, weight: 3, label: 'MR-11 Bus Shelter', description: 'Bus stop is in a dark pocket; several reports of theft and harassment.' },
  { lat: 22.7600, lng: 75.9020, type: 'poor_lighting',      hour: 23, weight: 2, label: 'Premium Park Outer Rd', description: 'Dim lighting along the boundary wall of the colony.' },
  { lat: 22.7580, lng: 75.9000, type: 'poor_lighting',      hour: 22, weight: 2, label: 'MR-11 Link Road', description: 'Road construction has disabled the streetlights completely.' },
  { lat: 22.7565, lng: 75.8985, type: 'isolated',           hour: 1,  weight: 1, label: 'Premium Park Colony Lane', description: 'Quiet residential street with zero foot traffic.' },
  { lat: 22.7560, lng: 75.8980, type: 'isolated',           hour: 23, weight: 1, label: 'Shalimar Connector Path', description: 'Pedestrian shortcut bordered by high bushes and no lights.' },
  { lat: 22.7545, lng: 75.8960, type: 'harassment_history', hour: 21, weight: 3, label: 'Scheme 54 Underpass', description: 'Eve-teasing reported under the link bridge connecting local sectors.' },
  { lat: 22.7535, lng: 75.8945, type: 'poor_lighting',      hour: 22, weight: 2, label: 'Vijay Nagar Back Alley', description: 'Dark corridor behind corporate buildings with poor security.' },

  // ── Bhawarkua / DAVV Student Hub (Student Area) ──────────────────────────
  { lat: 22.7001, lng: 75.8682, type: 'poor_lighting',      hour: 22, weight: 2, label: 'Bhawarkua Square Subway', description: 'Subway stairs are extremely dark and poorly lit.' },
  { lat: 22.7008, lng: 75.8675, type: 'harassment_history', hour: 21, weight: 3, label: 'DAVV Campus Wall Lane', description: 'Catcalling and stalking incidents reported along the outer wall.' },
  { lat: 22.6992, lng: 75.8690, type: 'isolated',           hour: 23, weight: 1, label: 'Bhawarkua PG Sector', description: 'Highly crowded by day, but back alleys are deserted and dark at night.' },
  { lat: 22.7015, lng: 75.8660, type: 'poor_lighting',      hour: 22, weight: 2, label: 'Bhawarkua Side Alleys', description: 'Frequent local power cuts leave these corridors pitch black.' },
  { lat: 22.6980, lng: 75.8672, type: 'harassment_history', hour: 20, weight: 3, label: 'Bhawarkua Market Lane', description: 'Crowded corners with frequent pickpocketing and eve-teasing.' },
  { lat: 22.7100, lng: 75.8560, type: 'poor_lighting',      hour: 21, weight: 2, label: 'Old Bhawarkua Road', description: 'Broken street lamps near student coaching centers.' },
  { lat: 22.7110, lng: 75.8540, type: 'isolated',           hour: 22, weight: 1, label: 'Tilak Nagar Back Lane', description: 'Residential street gets quiet and dark early in the evening.' },
  { lat: 22.7090, lng: 75.8550, type: 'harassment_history', hour: 23, weight: 3, label: 'Bhawarkua Underpass', description: 'Isolated pedestrian underpass walk has safety alerts.' },

  // ── Palasia / Geeta Bhawan / LIG Area ──────────────────────────────────────
  { lat: 22.7310, lng: 75.8750, type: 'harassment_history', hour: 21, weight: 3, label: 'LIG Square Fast-Food Corner', description: 'Crowded area with history of catcalling near food stalls.' },
  { lat: 22.7305, lng: 75.8762, type: 'isolated',           hour: 22, weight: 1, label: 'LIG Colony Inner Park', description: 'Dark park perimeter walk, no security guard on duty.' },
  { lat: 22.7320, lng: 75.8740, type: 'poor_lighting',      hour: 23, weight: 2, label: 'Anoop Nagar Alleys', description: 'Dense tree branches block the streetlamps completely.' },
  { lat: 22.7265, lng: 75.8770, type: 'poor_lighting',      hour: 22, weight: 2, label: 'Palasia Square Corner', description: 'Dim lighting behind commercial shops and cafe complexes.' },
  { lat: 22.7275, lng: 75.8785, type: 'harassment_history', hour: 21, weight: 3, label: 'Geeta Bhawan Coaching Lane', description: 'Groups loiter outside coaching institutes post evening batches.' },
  { lat: 22.7220, lng: 75.8580, type: 'harassment_history', hour: 20, weight: 3, label: 'LIG Square Junction', description: 'Reports of purse snatching near the flyover pillar.' },
  { lat: 22.7230, lng: 75.8610, type: 'poor_lighting',      hour: 21, weight: 2, label: 'Annapurna Road Walkway', description: 'Poor lighting on the footpath near local markets.' },
  { lat: 22.7225, lng: 75.8595, type: 'isolated',           hour: 22, weight: 1, label: 'LIG Back Alley', description: 'Deserted passage behind commercial shops.' },
  { lat: 22.7160, lng: 75.8780, type: 'poor_lighting',      hour: 22, weight: 2, label: 'Sapna Sangeeta Highway Link', description: 'Large billboard hoardings cast shadows on the service lane.' },
  { lat: 22.7150, lng: 75.8760, type: 'harassment_history', hour: 21, weight: 3, label: 'Sapna Sangeeta Cinema Lane', description: 'Crowds leaving theater lead to frequent harassment complaints.' },
  { lat: 22.7170, lng: 75.8800, type: 'isolated',           hour: 23, weight: 1, label: 'New Palasia Alley', description: 'Quiet residential alley connecting main blocks.' },
  { lat: 22.7155, lng: 75.8770, type: 'poor_lighting',      hour: 0,  weight: 2, label: 'Sapna Sangeeta Parking Lot', description: 'Commercial parking lot lacks proper light coverage.' },
  { lat: 22.7130, lng: 75.8680, type: 'harassment_history', hour: 22, weight: 3, label: 'Geeta Bhawan Square Bus Stop', description: 'Coaching student hub, loitering reported after dark.' },
  { lat: 22.7120, lng: 75.8660, type: 'poor_lighting',      hour: 21, weight: 2, label: 'Geeta Bhawan Hostel Lane', description: 'Broken street lamps near student girls hostles.' },
  { lat: 22.7140, lng: 75.8700, type: 'isolated',           hour: 23, weight: 1, label: 'South Tukoganj Alley', description: 'Empty street bordered by high residential walls.' },

  // ── Bengali Square / Khajrana / Ring Road ──────────────────────────────────
  { lat: 22.7280, lng: 75.9050, type: 'poor_lighting',      hour: 22, weight: 2, label: 'Khajrana Temple Back Exit', description: 'Temple exit road gets very dark and lacks street lighting.' },
  { lat: 22.7270, lng: 75.9030, type: 'isolated',           hour: 23, weight: 1, label: 'Musakhedi Alleys', description: 'Narrow lanes with zero streetlights.' },
  { lat: 22.7290, lng: 75.9070, type: 'harassment_history', hour: 21, weight: 3, label: 'Khajrana Main Crossing', description: 'Eve-teasing and minor fights reported near tea stalls.' },
  { lat: 22.7340, lng: 75.8480, type: 'poor_lighting',      hour: 22, weight: 2, label: 'Bengali Square Junction', description: 'Dimly lit junction near the railway crossing lines.' },
  { lat: 22.7350, lng: 75.8500, type: 'isolated',           hour: 23, weight: 1, label: 'MR-10 Service Loop', description: 'No foot traffic or open shops. Surrounded by vacant land.' },
  { lat: 22.7330, lng: 75.8460, type: 'harassment_history', hour: 20, weight: 3, label: 'Bengali Back Road', description: 'Dark residential street corner has reports of home entry.' },
  { lat: 22.7050, lng: 75.8600, type: 'isolated',           hour: 22, weight: 1, label: 'Ring Road Service Lane', description: 'Service road under the flyover is extremely isolated.' },
  { lat: 22.7060, lng: 75.8620, type: 'poor_lighting',      hour: 23, weight: 2, label: 'Bombay Hospital Front Rd', description: 'Dimly lit parking entrance road.' },
  { lat: 22.7040, lng: 75.8580, type: 'harassment_history', hour: 21, weight: 3, label: 'Ring Road Footpath', description: 'Dark footpath near the bus shelter.' },

  // ── Rau / Dewas Naka / AB Road Outer ──────────────────────────────────────
  { lat: 22.6950, lng: 75.8500, type: 'isolated',           hour: 22, weight: 1, label: 'Rau Square bypass', description: 'Bypass junction is deserted in late night hours.' },
  { lat: 22.6960, lng: 75.8520, type: 'poor_lighting',      hour: 23, weight: 2, label: 'Rau Market Road', description: 'Streetlights are turned off after midnight.' },
  { lat: 22.7400, lng: 75.8550, type: 'poor_lighting',      hour: 22, weight: 2, label: 'Dewas Naka Truck Terminal', description: 'Heavy truck terminal area, poorly lit and crowded.' },
  { lat: 22.7410, lng: 75.8530, type: 'harassment_history', hour: 21, weight: 3, label: 'Dewas Naka Underpass', description: 'Underpass walk has reported safety incidents.' },
  { lat: 22.7180, lng: 75.8850, type: 'poor_lighting',      hour: 22, weight: 2, label: 'AB Road Apollo Junction', description: 'Broken high-mast lamp leaves the bus stop in shadow.' },
  { lat: 22.7200, lng: 75.8880, type: 'isolated',           hour: 23, weight: 1, label: 'AB Road Flyover Base', description: 'Quiet path under the flyover structure.' },
  { lat: 22.7165, lng: 75.8830, type: 'harassment_history', hour: 21, weight: 3, label: 'AB Road BRTS Stop', description: 'Unregulated taxi stands have reports of eve-teasing.' },
];

let isSeedingInProgress = false;

/**
 * Seeds Firestore with demo incidents if not already seeded.
 * Uses a `meta/seeded_v7` document as a one-time flag.
 * Automatically clears out the previous version's sparse seed data to keep a clean heatmap.
 */
export async function seedIncidentsIfNeeded() {
  if (!FIREBASE_CONFIGURED || !db) {
    console.warn('[SafeRoute] Firebase not configured — skipping seed, using local data.');
    return;
  }
  if (isSeedingInProgress) {
    console.log('[SafeRoute] Seeding already in progress, skipping concurrent run.');
    return;
  }
  try {
    // Ensure anonymous auth has completed before writing
    await authReady;
    const seededDocRef = doc(db, 'meta', 'seeded');
    const seededSnap = await getDoc(seededDocRef);
    
    const incidentsRef = collection(db, 'incidents');
    const incidentsSnap = await getDocs(incidentsRef);

    if (seededSnap.exists() && seededSnap.data()?.version === 'v8' && incidentsSnap.docs.length >= SEED_INCIDENTS.length) {
      console.log('[SafeRoute] Already seeded with incidents.');
      return;
    }

    isSeedingInProgress = true;
    console.log('[SafeRoute] Upgrading seed data... Cleaning old incidents & writing new dense seed incidents atomically...');

    const batch = writeBatch(db);
    
    
    // Clear old incidents in this batch
    const existingIncidents = await getDocs(incidentsRef);
    for (const doc of existingIncidents.docs) {
      batch.delete(doc.ref);
    }

    // Write all new dense incidents in this batch
    for (const incident of SEED_INCIDENTS) {
      const newDocRef = doc(incidentsRef); // generates a unique ID document reference
      batch.set(newDocRef, {
        ...incident,
        timestamp: serverTimestamp(),
      });
    }

    // Mark as seeded in this batch
    batch.set(seededDocRef, {
      seededAt: serverTimestamp(),
      version: 'v8',
    });

    // Commit all deletions and insertions atomically!
    await batch.commit();
    console.log('[SafeRoute] 85 dense seed incidents written to Firestore atomically.');
  } catch (err) {
    console.warn('[SafeRoute] Could not seed incidents (offline?). Using local fallback.', err);
  } finally {
    isSeedingInProgress = false;
  }
}
