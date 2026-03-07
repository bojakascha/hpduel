import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const ordQuestions = JSON.parse(
  readFileSync(join(root, 'dist/ord-questions.json'), 'utf-8')
);

const words = ordQuestions.items.map((item, index) => {
  const altValues = Object.values(item.alternatives || {});
  const correctLetter = item.correct;
  const correctValue =
    correctLetter && item.alternatives?.[correctLetter]
      ? item.alternatives[correctLetter]
      : '';
  const distractors =
    correctValue
      ? altValues.filter((v) => v !== correctValue)
      : altValues;

  return {
    id: index + 1,
    word: item.word ?? '',
    correct: correctValue,
    distractors,
    explanation: '',
    example: '',
    difficulty: null,
  };
});

writeFileSync(
  join(root, 'dist/ord-questions.json'),
  JSON.stringify(words, null, 2),
  'utf-8'
);

console.log(`Transformed ${words.length} questions to dist/ord-questions.json`);
