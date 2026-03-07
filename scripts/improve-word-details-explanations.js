import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const detailsPath = join(rootDir, 'public', 'wordfiles', 'word-details.json');

const data = JSON.parse(readFileSync(detailsPath, 'utf-8'));

const quotedApproxPattern = /^"(.+)" betyder ungefär "(.+)"\.$/;

function isPhrase(word) {
  return /\s/.test(word);
}

function isPrefix(word) {
  return word.endsWith('-');
}

function looksLikeVerb(word) {
  const lower = word.toLowerCase();
  return (
    lower.endsWith('a') ||
    lower.endsWith('era') ||
    lower.endsWith('iera') ||
    lower.endsWith('isera')
  );
}

function looksLikeAdjective(word) {
  const lower = word.toLowerCase();
  const adjectiveEndings = [
    'ig', 'lig', 'isk', 'sam', 'bar', 'ad', 'at', 'en', 'är', 'iskt',
    'isk', 'full', 'lös', 'isk', 'ande', 'sam', 'tionell', 'ell'
  ];
  return adjectiveEndings.some((ending) => lower.endsWith(ending));
}

function looksLikeNounPhrase(text) {
  const lower = text.toLowerCase();
  return (
    /^[a-zåäö]/i.test(text) &&
    !lower.startsWith('att ') &&
    !looksLikeVerb(lower)
  );
}

function formatMeaning(word, meaning) {
  if (looksLikeVerb(word) && !meaning.startsWith('att ')) {
    return `att ${meaning}`;
  }
  return meaning;
}

function rewriteExplanation(word, meaning) {
  const normalizedMeaning = formatMeaning(word, meaning);

  if (isPrefix(word)) {
    return `Prefixet "${word}" används för att ange ${meaning}.`;
  }

  if (isPhrase(word)) {
    return `Uttrycket "${word}" används om ${normalizedMeaning}.`;
  }

  if (looksLikeVerb(word)) {
    return `"${word}" innebär ${normalizedMeaning}.`;
  }

  if (looksLikeAdjective(word)) {
    return `Något som är "${word}" är ${meaning}.`;
  }

  if (looksLikeNounPhrase(meaning)) {
    return `"${word}" syftar på ${meaning}.`;
  }

  return `"${word}" används om ${normalizedMeaning}.`;
}

let updated = 0;

for (const [word, details] of Object.entries(data)) {
  const explanation = String(details.explanation || '').trim();
  const match = explanation.match(quotedApproxPattern);
  if (!match) continue;

  const [, matchedWord, meaning] = match;
  data[word].explanation = rewriteExplanation(matchedWord, meaning);
  updated += 1;
}

writeFileSync(detailsPath, JSON.stringify(data, null, 2), 'utf-8');
console.log(`Improved ${updated} explanations.`);
