import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const wordListPath = join(rootDir, 'public', 'wordfiles', 'word-list.json');

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function tokenCount(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

function suffixKey(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return '';
  if (text.includes(' ')) return '__phrase__';
  if (text.endsWith('-')) return '__prefix__';
  const letters = text.replace(/[^a-zåäö]/g, '');
  if (letters.length >= 4) return letters.slice(-3);
  if (letters.length >= 2) return letters.slice(-2);
  return letters;
}

function buildPool(items) {
  const seen = new Set();
  const pool = [];

  for (const item of items) {
    const values = [item.correct, ...(item.distractors || [])];
    for (const value of values) {
      const text = String(value || '').trim();
      const key = normalizeText(text);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      pool.push({
        text,
        key,
        difficulty: item.difficulty ?? 2,
        tokenCount: tokenCount(text),
        suffixKey: suffixKey(text),
        length: text.length,
      });
    }
  }

  return pool;
}

function chooseExtraDistractor(item, existingDistractors, pool) {
  const correct = String(item.correct || '').trim();
  const word = String(item.word || '').trim();
  const forbidden = new Set([
    normalizeText(correct),
    normalizeText(word),
    ...existingDistractors.map(normalizeText),
  ]);

  const correctTokenCount = tokenCount(correct);
  const correctSuffixKey = suffixKey(correct);
  const correctLength = correct.length;
  const targetDifficulty = item.difficulty ?? 2;

  let bestCandidate = null;
  let bestScore = -Infinity;

  for (const candidate of pool) {
    if (forbidden.has(candidate.key)) continue;

    let score = 0;
    if (candidate.difficulty === targetDifficulty) score += 40;
    if (candidate.tokenCount === correctTokenCount) score += 60;
    if (candidate.suffixKey === correctSuffixKey) score += 30;
    score -= Math.abs(candidate.length - correctLength) * 0.4;

    if (correctTokenCount === 1 && candidate.tokenCount === 1) score += 10;
    if (correctTokenCount > 1 && candidate.tokenCount > 1) score += 10;

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate.text;
    }
  }

  return bestCandidate || 'obetydlig';
}

const wordList = JSON.parse(readFileSync(wordListPath, 'utf-8'));
const pool = buildPool(wordList);

for (const item of wordList) {
  const correctKey = normalizeText(item.correct);
  const uniqueDistractors = [];
  const seenDistractors = new Set();

  for (const distractor of item.distractors || []) {
    const key = normalizeText(distractor);
    if (!key || key === correctKey || seenDistractors.has(key)) continue;
    seenDistractors.add(key);
    uniqueDistractors.push(String(distractor).trim());
  }

  while (uniqueDistractors.length < 4) {
    const extra = chooseExtraDistractor(item, uniqueDistractors, pool);
    const extraKey = normalizeText(extra);
    if (!extraKey || extraKey === correctKey || seenDistractors.has(extraKey)) break;
    seenDistractors.add(extraKey);
    uniqueDistractors.push(extra);
  }

  item.distractors = uniqueDistractors.slice(0, 4);
}

writeFileSync(wordListPath, JSON.stringify(wordList, null, 2), 'utf-8');

const counts = wordList.reduce((acc, item) => {
  const count = (item.distractors || []).length;
  acc[count] = (acc[count] || 0) + 1;
  return acc;
}, {});

console.log('Normalized distractors:', counts);
