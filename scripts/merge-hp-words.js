import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const wordfilesDir = join(__dirname, '..', 'public', 'wordfiles');

const hpWords = JSON.parse(readFileSync(join(wordfilesDir, 'hp-words.json'), 'utf-8'));
const wordList = JSON.parse(readFileSync(join(wordfilesDir, 'word-list.json'), 'utf-8'));
const wordDetails = JSON.parse(readFileSync(join(wordfilesDir, 'word-details.json'), 'utf-8'));

for (const item of hpWords) {
  const word = (item.word || '').trim();
  if (!word) continue;

  const key = word.toLowerCase();
  const cleanDistractors = (item.distractors || []).filter(
    (d) => d && d !== item.correct
  );
  const listEntry = {
    word,
    correct: item.correct || '',
    distractors: [...new Set(cleanDistractors)],
    difficulty: item.difficulty ?? 2,
  };

  const existingIndex = wordList.findIndex(
    (w) => (w.word || '').toLowerCase().trim() === key
  );
  if (existingIndex >= 0) {
    wordList[existingIndex] = listEntry;
  } else {
    wordList.push(listEntry);
  }

  wordDetails[word] = {
    explanation: item.explanation || '',
    example: item.example || '',
  };
}

writeFileSync(
  join(wordfilesDir, 'word-list.json'),
  JSON.stringify(wordList, null, 2),
  'utf-8'
);
writeFileSync(
  join(wordfilesDir, 'word-details.json'),
  JSON.stringify(wordDetails, null, 2),
  'utf-8'
);

console.log(
  `Merged ${hpWords.length} hp-words. word-list: ${wordList.length} entries, word-details: ${Object.keys(wordDetails).length} entries`
);
