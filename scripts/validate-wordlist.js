#!/usr/bin/env node
/**
 * Validates public/wordfiles/word-list.json for data quality issues.
 * Checks: correct in distractors, duplicate distractors, empty/missing fields,
 * fewer than 3 distractors, case/format inconsistencies.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const wordListPath = join(__dirname, '../public/wordfiles/word-list.json');

const issues = [];
let totalEntries = 0;

function addIssue(index, word, issueType, description) {
  issues.push({ index, word, issueType, description });
}

function normalizeForComparison(str) {
  return String(str).trim().toLowerCase();
}

try {
  const data = JSON.parse(readFileSync(wordListPath, 'utf-8'));
  if (!Array.isArray(data)) {
    console.error('Error: word-list.json must be an array');
    process.exit(1);
  }

  totalEntries = data.length;

  for (let i = 0; i < data.length; i++) {
    const entry = data[i];
    const word = entry?.word ?? '(missing word)';

    // 3. Empty or missing word, correct, or distractors
    if (entry.word === undefined || entry.word === null) {
      addIssue(i, '(index ' + i + ')', 'MISSING_FIELD', 'Missing "word" field');
    } else if (typeof entry.word !== 'string' || entry.word.trim() === '') {
      addIssue(i, word, 'EMPTY_FIELD', 'Empty or invalid "word" field');
    }

    if (entry.correct === undefined || entry.correct === null) {
      addIssue(i, word, 'MISSING_FIELD', 'Missing "correct" field');
    } else if (typeof entry.correct !== 'string' || entry.correct.trim() === '') {
      addIssue(i, word, 'EMPTY_FIELD', 'Empty or invalid "correct" field');
    }

    if (entry.distractors === undefined || entry.distractors === null) {
      addIssue(i, word, 'MISSING_FIELD', 'Missing "distractors" field');
    } else if (!Array.isArray(entry.distractors)) {
      addIssue(i, word, 'INVALID_FIELD', '"distractors" must be an array');
    } else {
      // 4. Fewer than 3 distractors
      if (entry.distractors.length < 3) {
        addIssue(i, word, 'TOO_FEW_DISTRACTORS',
          `Has ${entry.distractors.length} distractors (need at least 3)`);
      }

      const correctNorm = normalizeForComparison(entry.correct);
      const seen = new Set();

      for (let j = 0; j < entry.distractors.length; j++) {
        const d = entry.distractors[j];
        const dNorm = normalizeForComparison(d);

        // Empty distractor
        if (d === undefined || d === null || (typeof d === 'string' && d.trim() === '')) {
          addIssue(i, word, 'EMPTY_FIELD', `Empty or invalid distractor at index ${j}`);
        }

        // 1. Correct answer appearing in distractors
        if (correctNorm && dNorm && correctNorm === dNorm) {
          addIssue(i, word, 'CORRECT_IN_DISTRACTORS',
            `Correct answer "${entry.correct}" appears in distractors`);
        }

        // 2. Duplicate values in distractors
        if (dNorm && seen.has(dNorm)) {
          addIssue(i, word, 'DUPLICATE_DISTRACTOR',
            `Duplicate distractor: "${d}"`);
        }
        if (dNorm) seen.add(dNorm);
      }
    }

    // 5. Format inconsistencies (whitespace only; skip case - proper nouns like Rom, Norden are correctly capitalized)
    const fields = ['word', 'correct', ...(entry.distractors || [])];
    const hasLeadingTrailing = fields.some(f =>
      typeof f === 'string' && (f !== f.trim() || f.length !== f.trim().length));
    if (hasLeadingTrailing) {
      addIssue(i, word, 'FORMAT_INCONSISTENCY',
        'Field has leading or trailing whitespace');
    }
  }

  // Report
  console.log('=== Word List Validation Report ===\n');
  console.log(`Total entries: ${totalEntries}`);
  console.log(`Issues found: ${issues.length}\n`);

  if (issues.length === 0) {
    console.log('No issues found. Validation passed.');
    process.exit(0);
  }

  const byType = {};
  for (const { issueType } of issues) {
    byType[issueType] = (byType[issueType] || 0) + 1;
  }
  console.log('Issues by type:', byType);
  console.log('\n--- All issues ---\n');

  for (const { index, word, issueType, description } of issues) {
    console.log(`[${index}] word="${word}" | ${issueType}: ${description}`);
  }

  process.exit(issues.length > 0 ? 1 : 0);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
