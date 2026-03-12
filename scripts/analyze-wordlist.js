#!/usr/bin/env node
/**
 * Analyzes word-list.json for potential errors:
 * 1. Distractors that appear as CORRECT answer elsewhere (copy-paste errors)
 * 2. Distractors used in 5+ different words (overused)
 * 3. Words where ALL distractors share a common pattern but correct doesn't
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORD_LIST_PATH = join(__dirname, '../public/wordfiles/word-list.json');

function loadWordList() {
  const data = readFileSync(WORD_LIST_PATH, 'utf8');
  return JSON.parse(data);
}

function normalize(str) {
  return (str || '').toLowerCase().trim();
}

function findCommonPrefix(strings) {
  if (!strings.length) return '';
  const normalized = strings.map(normalize).filter(Boolean);
  if (normalized.length < 2) return '';
  let prefix = normalized[0];
  for (let i = 1; i < normalized.length; i++) {
    while (prefix && !normalized[i].startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
    }
  }
  return prefix.length >= 2 ? prefix : '';
}

function findCommonSuffix(strings) {
  if (!strings.length) return '';
  const normalized = strings.map(normalize).filter(Boolean);
  if (normalized.length < 2) return '';
  let suffix = normalized[0];
  for (let i = 1; i < normalized.length; i++) {
    while (suffix && !normalized[i].endsWith(suffix)) {
      suffix = suffix.slice(1);
    }
  }
  return suffix.length >= 2 ? suffix : '';
}

function analyze() {
  const words = loadWordList();
  const correctAnswers = new Map();
  const distractorUsage = new Map();
  const distractorAsCorrect = [];
  const overusedDistractors = [];
  const patternMismatches = [];

  for (const entry of words) {
    const correct = normalize(entry.correct);
    if (!correctAnswers.has(correct)) {
      correctAnswers.set(correct, []);
    }
    correctAnswers.get(correct).push({ word: entry.word, correct: entry.correct });
  }

  for (const entry of words) {
    const wordKey = normalize(entry.word);
    const correctNorm = normalize(entry.correct);

    for (const d of entry.distractors || []) {
      const dNorm = normalize(d);
      if (!dNorm) continue;

      if (!distractorUsage.has(dNorm)) {
        distractorUsage.set(dNorm, new Set());
      }
      distractorUsage.get(dNorm).add(entry.word);

      if (correctAnswers.has(dNorm)) {
        const correctFor = correctAnswers.get(dNorm);
        for (const cf of correctFor) {
          if (normalize(cf.word) !== wordKey) {
            distractorAsCorrect.push({
              word: entry.word,
              distractor: d,
              correctFor: cf.word,
              correctAnswer: cf.correct,
            });
          }
        }
      }
    }
  }

  for (const [distractor, wordSet] of distractorUsage) {
    if (wordSet.size >= 5) {
      overusedDistractors.push({
        distractor,
        count: wordSet.size,
        usedIn: [...wordSet].sort(),
      });
    }
  }

  for (const entry of words) {
    const distractors = (entry.distractors || []).filter((d) => d && d.trim());
    if (distractors.length < 2) continue;

    const correctNorm = normalize(entry.correct);
    const distractorPrefix = findCommonPrefix(distractors);
    const distractorSuffix = findCommonSuffix(distractors);

    if (distractorPrefix && distractorPrefix.length >= 2) {
      if (!correctNorm.startsWith(distractorPrefix)) {
        patternMismatches.push({
          word: entry.word,
          correct: entry.correct,
          pattern: 'prefix "' + distractorPrefix + '"',
          distractors,
          issue: 'All distractors start with "' + distractorPrefix + '" but correct does not',
        });
      }
    }

    if (distractorSuffix && distractorSuffix.length >= 2 && distractorSuffix !== distractorPrefix) {
      if (!correctNorm.endsWith(distractorSuffix)) {
        patternMismatches.push({
          word: entry.word,
          correct: entry.correct,
          pattern: 'suffix "' + distractorSuffix + '"',
          distractors,
          issue: 'All distractors end with "' + distractorSuffix + '" but correct does not',
        });
      }
    }
  }

  return {
    distractorAsCorrect,
    overusedDistractors: overusedDistractors.sort((a, b) => b.count - a.count),
    patternMismatches,
    totalWords: words.length,
  };
}

function printReport(results) {
  console.log('='.repeat(70));
  console.log('WORD-LIST ANALYSIS REPORT');
  console.log('='.repeat(70));
  console.log('Total words analyzed: ' + results.totalWords + '\n');

  console.log('-'.repeat(70));
  console.log('1. DISTRACTORS THAT APPEAR AS CORRECT ANSWER ELSEWHERE');
  console.log('   (Possible copy-paste errors)');
  console.log('-'.repeat(70));
  if (results.distractorAsCorrect.length === 0) {
    console.log('   None found.\n');
  } else {
    for (const item of results.distractorAsCorrect) {
      console.log('   Word: "' + item.word + '"');
      console.log('   Distractor: "' + item.distractor + '"');
      console.log('   -> Is correct answer for: "' + item.correctFor + '" (correct: "' + item.correctAnswer + '")');
      console.log('');
    }
    console.log('   Total: ' + results.distractorAsCorrect.length + ' potential issue(s)\n');
  }

  console.log('-'.repeat(70));
  console.log('2. DISTRACTORS USED IN 5+ DIFFERENT WORDS');
  console.log('   (May indicate overused/wrong distractors)');
  console.log('-'.repeat(70));
  if (results.overusedDistractors.length === 0) {
    console.log('   None found.\n');
  } else {
    for (const item of results.overusedDistractors) {
      console.log('   "' + item.distractor + '" - used in ' + item.count + ' words:');
      console.log('     ' + item.usedIn.slice(0, 8).join(', ') + (item.usedIn.length > 8 ? '...' : ''));
      if (item.usedIn.length > 8) {
        console.log('     (... and ' + (item.usedIn.length - 8) + ' more)');
      }
      console.log('');
    }
    console.log('   Total: ' + results.overusedDistractors.length + ' overused distractor(s)\n');
  }

  console.log('-'.repeat(70));
  console.log('3. WORDS WHERE ALL DISTRACTORS SHARE PATTERN BUT CORRECT DOES NOT');
  console.log('   (Might indicate wrong correct answer)');
  console.log('-'.repeat(70));
  if (results.patternMismatches.length === 0) {
    console.log('   None found.\n');
  } else {
    for (const item of results.patternMismatches) {
      console.log('   Word: "' + item.word + '"');
      console.log('   Correct: "' + item.correct + '"');
      console.log('   Issue: ' + item.issue);
      console.log('   Distractors: ' + item.distractors.join(', '));
      console.log('');
    }
    console.log('   Total: ' + results.patternMismatches.length + ' potential issue(s)\n');
  }

  console.log('='.repeat(70));
}

const results = analyze();
printReport(results);
