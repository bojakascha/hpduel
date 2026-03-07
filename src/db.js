import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  addDoc,
  updateDoc,
  collection,
  serverTimestamp,
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

export async function saveSession(uid, results, score, difficulty) {
  if (!db) return;

  const answers = results.map(r => ({
    word: r.word,
    chosen: r.chosen,
    correct: r.correct,
    isCorrect: r.isCorrect,
  }));

  // Save session document
  await addDoc(collection(db, 'users', uid, 'sessions'), {
    timestamp: serverTimestamp(),
    score,
    total: results.length,
    difficulty,
    answers,
  });

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
