import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const wordfilesDir = join(rootDir, 'public', 'wordfiles');
const generatedDir = join(rootDir, 'tmp', 'generated-word-batches');

const wordList = JSON.parse(readFileSync(join(wordfilesDir, 'word-list.json'), 'utf-8'));
const wordDetails = JSON.parse(readFileSync(join(wordfilesDir, 'word-details.json'), 'utf-8'));
const batchFiles = readdirSync(generatedDir)
  .filter((file) => /^batch-\d+\.json$/.test(file))
  .sort();

for (const file of batchFiles) {
  const batch = JSON.parse(readFileSync(join(generatedDir, file), 'utf-8'));

  for (const item of batch.wordList || []) {
    const word = (item.word || '').trim();
    if (!word) continue;

    const key = word.toLowerCase();
    const cleanDistractors = [...new Set((item.distractors || []).filter(
      (d) => d && d !== item.correct
    ))];
    const listEntry = {
      word,
      correct: item.correct || '',
      distractors: cleanDistractors.slice(0, 3),
      difficulty: item.difficulty ?? 2,
    };

    const existingIndex = wordList.findIndex(
      (entry) => (entry.word || '').toLowerCase().trim() === key
    );

    if (existingIndex >= 0) {
      wordList[existingIndex] = listEntry;
    } else {
      wordList.push(listEntry);
    }

    const details = batch.wordDetails?.[word] || {};
    wordDetails[word] = {
      explanation: details.explanation || '',
      example: details.example || '',
    };
  }
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
  `Merged ${batchFiles.length} generated batches. word-list: ${wordList.length} entries, word-details: ${Object.keys(wordDetails).length} entries`
);
