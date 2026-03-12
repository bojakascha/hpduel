import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { app, isConfigured } from './firebase.js';

const db = isConfigured ? getFirestore(app) : null;

function userRef(uid) {
  return doc(db, 'users', uid);
}

// ── User lifecycle ────────────────────────────────────────────────────────────

export async function ensureUser(uid) {
  if (!db) return;
  const snap = await getDoc(userRef(uid));
  if (!snap.exists()) {
    await setDoc(userRef(uid), { createdAt: serverTimestamp() });
  }
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function saveSession(uid, results, score, difficulty, elapsedSeconds) {
  if (!db) return;

  const answers = results.map(r => ({
    word: r.word,
    chosen: r.chosen,
    correct: r.correct,
    isCorrect: r.isCorrect,
  }));

  const sessionData = {
    timestamp: serverTimestamp(),
    score,
    total: results.length,
    difficulty,
    answers,
  };
  if (elapsedSeconds > 0) sessionData.elapsedSeconds = elapsedSeconds;

  // Save session document
  await addDoc(collection(db, 'users', uid, 'sessions'), sessionData);

  // Update aggregated word stats on user doc
  const snap = await getDoc(userRef(uid));
  const data = snap.data() || {};
  const stats = data.wordStats || {};
  const now = Date.now();

  for (const r of results) {
    const key = r.word.toLowerCase().trim();
    const prev = stats[key] || { seen: 0, correct: 0, lastSeen: 0 };
    stats[key] = {
      seen: prev.seen + 1,
      correct: prev.correct + (r.isCorrect ? 1 : 0),
      lastSeen: now,
      lastCorrect: r.isCorrect,
    };
  }

  await updateDoc(userRef(uid), { wordStats: stats });
  return stats;
}

// ── Word stats ────────────────────────────────────────────────────────────────

export async function loadWordStats(uid) {
  if (!db) return {};
  const snap = await getDoc(userRef(uid));
  return snap.data()?.wordStats || {};
}

// ── Settings sync ─────────────────────────────────────────────────────────────

export async function saveUserSettings(uid, settings) {
  if (!db) return;
  await updateDoc(userRef(uid), { settings });
}

export async function loadUserSettings(uid) {
  if (!db) return null;
  const snap = await getDoc(userRef(uid));
  return snap.data()?.settings || null;
}

// ── Session history ──────────────────────────────────────────────────────────

export async function loadSessionHistory(uid, max = 30) {
  if (!db) return [];
  const snap = await getDocs(collection(db, 'users', uid, 'sessions'));
  const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  // Sort by timestamp descending, handling null/missing timestamps
  sessions.sort((a, b) => {
    const ta = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp || 0);
    const tb = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp || 0);
    return tb - ta;
  });
  return sessions.slice(0, max);
}

// ── Delete user data ─────────────────────────────────────────────────────────

export async function deleteUserData(uid) {
  if (!db) return;
  // Delete sessions subcollection (batch, max 500 per batch)
  const sessionsSnap = await getDocs(collection(db, 'users', uid, 'sessions'));
  if (!sessionsSnap.empty) {
    const batch = writeBatch(db);
    sessionsSnap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  // Delete user document
  await deleteDoc(userRef(uid));
}

// ── Public profiles ──────────────────────────────────────────────────────────

export async function savePublicProfile(uid, name) {
  if (!db) return;
  await setDoc(doc(db, 'publicProfiles', uid), { name }, { merge: true });
}

export async function searchPlayers(searchName, myUid) {
  if (!db) return [];
  const q = query(
    collection(db, 'publicProfiles'),
    where('name', '>=', searchName),
    where('name', '<=', searchName + '\uf8ff'),
  );
  const snap = await getDocs(q);
  return snap.docs
    .filter(d => d.id !== myUid)
    .map(d => ({ uid: d.id, ...d.data() }));
}

// ── Friends ──────────────────────────────────────────────────────────────────

export async function sendFriendRequest(fromUid, toUid, fromName, toName) {
  if (!db) return;
  // Check for existing friendship in either direction
  const existing = await getDocs(query(
    collection(db, 'friendships'),
    where('from', '==', fromUid),
    where('to', '==', toUid),
  ));
  if (!existing.empty) throw new Error('Förfrågan redan skickad.');

  const reverse = await getDocs(query(
    collection(db, 'friendships'),
    where('from', '==', toUid),
    where('to', '==', fromUid),
  ));
  if (!reverse.empty) throw new Error('Ni är redan vänner eller har en väntande förfrågan.');

  await addDoc(collection(db, 'friendships'), {
    from: fromUid,
    to: toUid,
    fromName: fromName || 'Spelare',
    toName: toName || 'Spelare',
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

export async function getPendingInvites(uid) {
  if (!db) return [];
  const q = query(
    collection(db, 'friendships'),
    where('to', '==', uid),
    where('status', '==', 'pending'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function acceptFriendRequest(docId) {
  if (!db) return;
  await updateDoc(doc(db, 'friendships', docId), { status: 'accepted' });
}

export async function ignoreFriendRequest(docId) {
  if (!db) return;
  await deleteDoc(doc(db, 'friendships', docId));
}

export async function getFriends(uid) {
  if (!db) return [];
  // Query both directions and merge
  const [fromSnap, toSnap] = await Promise.all([
    getDocs(query(
      collection(db, 'friendships'),
      where('from', '==', uid),
      where('status', '==', 'accepted'),
    )),
    getDocs(query(
      collection(db, 'friendships'),
      where('to', '==', uid),
      where('status', '==', 'accepted'),
    )),
  ]);

  const friends = [];
  for (const d of fromSnap.docs) {
    const data = d.data();
    friends.push({ id: d.id, uid: data.to, name: data.toName });
  }
  for (const d of toSnap.docs) {
    const data = d.data();
    friends.push({ id: d.id, uid: data.from, name: data.fromName });
  }
  return friends;
}

export async function removeFriend(docId) {
  if (!db) return;
  await deleteDoc(doc(db, 'friendships', docId));
}
