// build.js
import { promises as fs } from "fs";
import { marked } from "marked";
import { webcrypto } from "crypto";

const { subtle } = webcrypto;

const CONTENT_DIR = "./content";
const PUBLIC_DIR = "./public";
const LECTURES_DIR = `${PUBLIC_DIR}/lectures`;
const INDEX_SRC = "./index.html";
const INDEX_DEST = `${PUBLIC_DIR}/index.html`;
const STYLE_SRC = "./style.css";
const STYLE_DEST = `${PUBLIC_DIR}/style.css`;

function logStep(msg) {
  console.log(`[BUILD] ${msg}`);
}

async function deriveKey(password, salt) {
  const pwUtf8 = new TextEncoder().encode(password);
  const keyMaterial = await subtle.importKey("raw", pwUtf8, "PBKDF2", false, [
    "deriveKey",
  ]);
  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 250_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
}

async function encryptHtml(html, password) {
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);
  const pt = new TextEncoder().encode(html);
  const ct = await subtle.encrypt({ name: "AES-GCM", iv }, key, pt);

  return Buffer.concat([Buffer.from(salt), Buffer.from(iv), Buffer.from(ct)]);
}

async function build() {
  logStep("Starting build process...");

  // Clean public folder, recreate structure
  logStep(`Removing ${PUBLIC_DIR} (if exists)...`);
  await fs.rm(PUBLIC_DIR, { recursive: true, force: true });
  logStep(`Creating ${LECTURES_DIR}...`);
  await fs.mkdir(LECTURES_DIR, { recursive: true });

  // Copy index.html and style.css into public
  logStep(`Copying ${INDEX_SRC} to ${INDEX_DEST}...`);
  await fs.copyFile(INDEX_SRC, INDEX_DEST);
  logStep(`Copying ${STYLE_SRC} to ${STYLE_DEST}...`);
  await fs.copyFile(STYLE_SRC, STYLE_DEST);

  // Read content files
  logStep(`Reading content directory: ${CONTENT_DIR}...`);
  const files = await fs.readdir(CONTENT_DIR);
  logStep(`Found ${files.length} files in content.`);

  const password = process.env.LECTURE_PW;
  if (!password) {
    console.error("[BUILD][ERROR] LECTURE_PW environment variable is not set!");
    console.log("[BUILD][DEBUG] Environment variable names:");
    Object.keys(process.env).forEach((name) => console.log("  -", name));
    process.exit(1);
  } else {
    logStep(`LECTURE_PW is set (length: ${password.length} characters).`);
  }

  const manifest = [];
  for (const fname of files.filter((f) => f.endsWith(".md"))) {
    const id = fname.replace(/\.md$/, "");
    logStep(`Processing file: ${fname} (id: ${id})`);
    const md = await fs.readFile(`${CONTENT_DIR}/${fname}`, "utf8");
    const html = marked(md);
    logStep(`Encrypting HTML for ${id}...`);
    const blob = await encryptHtml(html, password);
    const encPath = `${LECTURES_DIR}/${id}.enc`;
    await fs.writeFile(encPath, blob);
    logStep(`Encrypted file written: ${encPath} (${blob.length} bytes)`);

    // Extract title from first Markdown heading
    const titleMatch = md.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : id.replace(/-/g, " ");

    manifest.push({ id, title, file: `lectures/${id}.enc` });
  }

  // Write manifest.json to public/
  const manifestPath = `${PUBLIC_DIR}/manifest.json`;
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  logStep(`Manifest written: ${manifestPath} (${manifest.length} entries)`);

  logStep(
    "Build complete: index.html & style.css copied, lectures encrypted, manifest.json created."
  );
}

build().catch((err) => {
  console.error("[BUILD][FATAL]", err);
  process.exit(1);
});
