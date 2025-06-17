// build.js
import fs from 'fs/promises';
import { marked } from 'marked';
import { execSync } from 'child_process';
import globby from 'globby';

const SRC = 'lectures';
const OUT = 'dist/lectures';

async function renderMarkdown() {
  await fs.mkdir(OUT, { recursive: true });
  const files = await globby(`${SRC}/*.md`);
  await Promise.all(files.map(async mdPath => {
    const name = mdPath.split('/').pop().replace(/\.md$/, '');
    const md = await fs.readFile(mdPath, 'utf8');
    const html = marked(md);
    await fs.writeFile(`${OUT}/${name}.html`, html);
  }));
}

async function copyAssets() {
  await fs.cp('index.html', 'dist/index.html');
  await fs.cp('style.css', 'dist/style.css');
}

async function encryptSite() {
  // expects PAGECRYPT_PW in env
  execSync(
    `pagecrypt encrypt --input dist --output encrypted --password "${process.env.PAGECRYPT_PW}"`,
    { stdio: 'inherit' }
  );
}

async function main() {
  await renderMarkdown();
  await copyAssets();
  await encryptSite();
}

main().catch(err => { console.error(err); process.exit(1); });
