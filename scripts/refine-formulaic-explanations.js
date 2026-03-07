import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const detailsPath = join(rootDir, 'public', 'wordfiles', 'word-details.json');
const listPath = join(rootDir, 'public', 'wordfiles', 'word-list.json');

const details = JSON.parse(readFileSync(detailsPath, 'utf-8'));
const wordList = JSON.parse(readFileSync(listPath, 'utf-8'));

const currentTemplatePatterns = [
  /^"(.+)" syftar på (.+)\.$/,
  /^"(.+)" innebär att (.+)\.$/,
  /^"(.+)" används om (.+)\.$/,
  /^Något som är "(.+)" är (.+)\.$/,
  /^Ordet "(.+)" syftar på (.+)\.$/,
  /^Ordet "(.+)" används om (.+)\.$/,
  /^Ordet "(.+)" beskriver något (.+)\.$/,
  /^Ordet "(.+)" beskriver någon eller något som är (.+)\.$/,
  /^Verbet "(.+)" används när man menar att (.+)\.$/,
  /^Uttrycket "(.+)" används när man menar att (.+)\.$/,
  /^Uttrycket "(.+)" används om (.+)\.$/,
];

function isPhrase(word) {
  return /\s/.test(word);
}

function isPrefix(word) {
  return word.endsWith('-');
}

function looksVerbLike(text) {
  const first = String(text || '').trim().split(/\s+/)[0]?.toLowerCase() || '';
  const commonVerbStarts = new Set([
    'följa', 'överlägga', 'utforma', 'föreskriva', 'spöa', 'uppfylla',
    'placera', 'tilldela', 'envisas', 'diskutera', 'befria', 'förtala',
    'orsaka', 'motsvara', 'avslöja', 'förenkla', 'missa', 'värdesätta',
    'portionera', 'jämföra', 'granska', 'bekräfta', 'lyssna', 'belysa',
    'ta', 'ge', 'ha', 'bli', 'gå', 'stå', 'ligga', 'föra', 'äta', 'röja',
    'skapa', 'ställa', 'prenumerera', 'avhandla', 'ta', 'gå'
  ]);

  if (commonVerbStarts.has(first)) return true;
  return (
    first.endsWith('a') ||
    first.endsWith('era') ||
    first.endsWith('iera') ||
    first.endsWith('isera')
  );
}

function looksAdjectival(text) {
  const lower = String(text || '').trim().toLowerCase();
  if (!lower) return false;
  if (lower.startsWith('som ')) return true;

  const adjectiveEndings = [
    'ig', 'lig', 'isk', 'sam', 'bar', 'ad', 'at', 'en', 'är', 'full',
    'lös', 'ande', 'ant', 'iv', 'iskt', 'erad', 'isk', 'e'
  ];

  const first = lower.split(/\s+/)[0];
  return adjectiveEndings.some((ending) => first.endsWith(ending));
}

function looksAdjectivalWord(word) {
  const lower = String(word || '').trim().toLowerCase();
  const adjectiveEndings = [
    'ig', 'lig', 'isk', 'sam', 'bar', 'ad', 'at', 'är', 'full',
    'lös', 'iv', 'ant', 'ent', 'en'
  ];
  return adjectiveEndings.some((ending) => lower.endsWith(ending));
}

function looksPersonLike(text) {
  const lower = String(text || '').trim().toLowerCase();
  const personMarkers = [
    'person', 'människa', 'vän', 'lärare', 'forskare', 'finsmakare',
    'förrädare', 'människovän', 'domare', 'åklagare', 'advokat', 'ledare'
  ];

  if (lower.includes(' person')) return true;
  if (personMarkers.some((marker) => lower === marker || lower.endsWith(marker))) return true;

  const first = lower.split(/\s+/)[0];
  return ['are', 'ör', 'ist', 'man', 'bo'].some((ending) => first.endsWith(ending));
}

function looksAbstractNoun(text) {
  const lower = String(text || '').trim().toLowerCase();
  const first = lower.split(/\s+/)[0];
  const abstractEndings = ['ning', 'het', 'else', 'ion', 'ism', 'skap', 'dom', 'ering'];
  return abstractEndings.some((ending) => first.endsWith(ending));
}

function withArticleIfPerson(text) {
  if (/^(en|ett)\s/i.test(text)) return text;
  return `en ${text}`;
}

function refineExplanation(word, meaning) {
  const cleanMeaning = String(meaning || '').trim();
  const tokens = cleanMeaning.split(/\s+/).filter(Boolean);
  const secondToken = tokens[1]?.toLowerCase();
  const adjectivePhraseLinkers = new Set(['av', 'på', 'till', 'från', 'för', 'med', 'utan']);

  if (isPrefix(word)) {
    return `Prefixet "${word}" används för att ange ${cleanMeaning}.`;
  }

  if (isPhrase(word)) {
    if (looksVerbLike(cleanMeaning)) {
      return `Uttrycket "${word}" används när man menar att ${cleanMeaning}.`;
    }
    if (cleanMeaning.startsWith('som ')) {
      return `Uttrycket "${word}" används om något som ${cleanMeaning}.`;
    }
    return `Uttrycket "${word}" används om ${cleanMeaning}.`;
  }

  if (looksVerbLike(cleanMeaning)) {
    return `Verbet "${word}" används när man menar att ${cleanMeaning}.`;
  }

  if (cleanMeaning.startsWith('som ')) {
    return `Ordet "${word}" beskriver något ${cleanMeaning}.`;
  }

  if (tokens.length > 1) {
    if (looksPersonLike(cleanMeaning)) {
      return `Ordet "${word}" används om ${withArticleIfPerson(cleanMeaning)}.`;
    }

    if (adjectivePhraseLinkers.has(secondToken)) {
      return `Ordet "${word}" beskriver någon eller något som är ${cleanMeaning}.`;
    }

    return `Ordet "${word}" används om ${cleanMeaning}.`;
  }

  if (looksAdjectival(cleanMeaning) || looksAdjectivalWord(word)) {
    return `Ordet "${word}" beskriver någon eller något som är ${cleanMeaning}.`;
  }

  if (looksPersonLike(cleanMeaning)) {
    return `Ordet "${word}" används om ${withArticleIfPerson(cleanMeaning)}.`;
  }

  if (looksAbstractNoun(cleanMeaning)) {
    return `Ordet "${word}" används om ${cleanMeaning}.`;
  }

  return `Ordet "${word}" används om ${cleanMeaning}.`;
}

let updated = 0;

for (const item of wordList) {
  const word = item.word;
  const current = details[word]?.explanation;
  if (!current) continue;

  const isFormulaic = currentTemplatePatterns.some((pattern) => pattern.test(current));
  if (!isFormulaic) continue;

  details[word].explanation = refineExplanation(word, item.correct);
  updated += 1;
}

writeFileSync(detailsPath, JSON.stringify(details, null, 2), 'utf-8');
console.log(`Refined ${updated} formulaic explanations.`);
