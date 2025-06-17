// build.js
// ES module: add "type": "module" to package.json
import { promises as fs } from 'fs';
import { marked } from 'marked';
import { webcrypto } from 'crypto';

const { subtle } = webcrypto;

const CONTENT_DIR = './content';
const PUBLIC_DIR  = './public';
const LECTURES_DIR = `${PUBLIC_DIR}/lectures`;
const INDEX_SRC   = './index.html';
const INDEX_DEST  = `${PUBLIC_DIR}/index.html`;

async function deriveKey(password, salt) {
  const pwUtf8 = new TextEncoder().encode(password);
  const keyMaterial = await subtle.importKey(
    'raw', pwUtf8, 'PBKDF2', false, ['deriveKey']
  );
  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 250_000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
}

async function encryptHtml(html, password) {
  const iv   = webcrypto.getRandomValues(new Uint8Array(12));
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const key  = await deriveKey(password, salt);
  const pt   = new TextEncoder().encode(html);
  const ct   = await subtle.encrypt({ name: 'AES-GCM', iv }, key, pt);

  return Buffer.concat([
    Buffer.from(salt),
    Buffer.from(iv),
    Buffer.from(ct)
  ]);
}

async function build() {
  // Clean public folder, recreate structure
  await fs.rm(PUBLIC_DIR, { recursive: true, force: true });
  await fs.mkdir(LECTURES_DIR, { recursive: true });

  // Copy index.html into public
  await fs.copyFile(INDEX_SRC, INDEX_DEST);

  // Read content files
  const files = await fs.readdir(CONTENT_DIR);
  const password = process.env.LECTURE_PW;
  if (!password) {
    console.error('Error: set LECTURE_PW env var');
    process.exit(1);
  }

  const manifest = [];
  for (const fname of files.filter(f => f.endsWith('.md'))) {
    const id = fname.replace(/\.md$/, '');
    const md = await fs.readFile(`${CONTENT_DIR}/${fname}`, 'utf8');
    const html = marked(md);
    const blob = await encryptHtml(html, password);
    await fs.writeFile(`${LECTURES_DIR}/${id}.enc`, blob);

    // Extract title from first Markdown heading
    const titleMatch = md.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : id.replace(/-/g, ' ');

    manifest.push({ id, title, file: `lectures/${id}.enc` });
  }

  // Write manifest.json to public/
  await fs.writeFile(`${PUBLIC_DIR}/manifest.json`, JSON.stringify(manifest, null, 2));
  console.log('Build complete: index.html copied, lectures encrypted, manifest.json created.');
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
