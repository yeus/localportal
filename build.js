// build.js
import { promises as fs } from 'fs';
import { marked } from 'marked';
import { webcrypto } from 'crypto';     // Node.js v18+ WebCrypto
const { subtle, getRandomValues } = webcrypto;

const CONTENT_DIR = './content';
const OUT_DIR     = './public/lectures';
const MANIFEST    = [];

async function deriveKey(password, salt) {
  const pwUtf8 = new TextEncoder().encode(password);
  const keyMaterial = await subtle.importKey(
    'raw', pwUtf8, 'PBKDF2', false, ['deriveKey']
  );
  return subtle.deriveKey({
    name: 'PBKDF2',
    salt,
    iterations: 250_000,
    hash: 'SHA-256'
  }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
}

async function encryptHtml(html, password) {
  const iv = getRandomValues(new Uint8Array(12));
  const salt = getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);
  const pt = new TextEncoder().encode(html);
  const ct = await subtle.encrypt({ name:'AES-GCM', iv }, key, pt);
  // package salt+iv+ciphertext in a single Uint8Array
  return Buffer.concat([Buffer.from(salt), Buffer.from(iv), Buffer.from(ct)]);
}

async function build() {
  await fs.rm(OUT_DIR, { recursive:true, force:true });
  await fs.mkdir(OUT_DIR, { recursive:true });
  const files = await fs.readdir(CONTENT_DIR);

  const password = process.env.LECTURE_PW;
  if (!password) throw new Error('Set LECTURE_PW env var');

  for (let fname of files.filter(f => f.endsWith('.md'))) {
    const id = fname.replace(/\.md$/, '');
    const md  = await fs.readFile(`${CONTENT_DIR}/${fname}`, 'utf8');
    const html = marked(md);
    const blob = await encryptHtml(html, password);
    await fs.writeFile(`${OUT_DIR}/${id}.enc`, blob);

    // ← NEW: extract title from first “# Heading” in the MD
    const titleMatch = md.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : id.replace(/-/g, ' ');

    MANIFEST.push({
      id,
      title,
      file: `lectures/${id}.enc`
    });
  }

  await fs.writeFile('./public/manifest.json', JSON.stringify(MANIFEST, null,2));
}

build().catch(err => { console.error(err); process.exit(1); });
