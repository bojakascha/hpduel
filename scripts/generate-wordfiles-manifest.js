import { readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const wordfilesDir = join(__dirname, '..', 'public', 'wordfiles');

try {
  const files = readdirSync(wordfilesDir)
    .filter((f) => f.endsWith('.json') && f !== 'manifest.json')
    .sort();
  writeFileSync(join(wordfilesDir, 'manifest.json'), JSON.stringify(files));
  console.log('Generated wordfiles manifest:', files.join(', '));
} catch (err) {
  console.error('Could not generate wordfiles manifest:', err.message);
  process.exit(1);
}
