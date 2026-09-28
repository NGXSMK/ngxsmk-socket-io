import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = join(process.cwd(), 'dist', 'ngxsmk-socket-io', 'fesm2022');
const MAX_PRIMARY_BYTES = 30 * 1024; // 30 KiB
const MAX_TESTING_BYTES = 12 * 1024; // 12 KiB

function findBundle(fileName) {
  const files = readdirSync(DIST);
  if (!files.includes(fileName)) {
    throw new Error(
      `Could not find FESM bundle "${fileName}" in ${DIST}. Found: ${files.join(', ')}`,
    );
  }
  return join(DIST, fileName);
}

function assertMaxSize(filePath, maxBytes, label) {
  const size = statSync(filePath).size;
  const kib = (size / 1024).toFixed(2);
  const maxKib = (maxBytes / 1024).toFixed(2);
  if (size > maxBytes) {
    throw new Error(`${label} is ${kib} KiB (max ${maxKib} KiB): ${filePath}`);
  }
  console.log(`✓ ${label}: ${kib} KiB (max ${maxKib} KiB)`);
}

const primary = findBundle('ngxsmk-socket-io.mjs');
const testing = findBundle('ngxsmk-socket-io-testing.mjs');

assertMaxSize(primary, MAX_PRIMARY_BYTES, 'primary FESM');
assertMaxSize(testing, MAX_TESTING_BYTES, 'testing FESM');
