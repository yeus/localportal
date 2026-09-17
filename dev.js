// dev.js
import { spawn } from "child_process";
import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import { createInterface } from "readline";
import { fileURLToPath, pathToFileURL } from "url";

const DEV_PASSWORD_FILE_NAME = ".dev-password";
const DEV_PASSWORD_FILE = fileURLToPath(
  new URL(DEV_PASSWORD_FILE_NAME, import.meta.url)
);
const PASSWORD_TIMEOUT_MS = 5000;

function generateDevPassword() {
  return randomBytes(12).toString("base64url");
}

export async function readStoredDevPassword(filePath) {
  try {
    const value = (await fs.readFile(filePath, "utf8")).trim();
    return value || null;
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`[DEV] Could not read ${filePath}: ${error.message}`);
    }
    return null;
  }
}

export async function storeDevPassword(filePath, password) {
  try {
    await fs.writeFile(filePath, `${password}\n`, { mode: 0o600 });
    await fs.chmod(filePath, 0o600);
  } catch (error) {
    console.warn(`[DEV] Could not save ${filePath}: ${error.message}`);
  }
}

export async function resolveDevPassword({
  envPassword,
  isInteractive,
  readStored,
  storePassword,
  generate,
  ask,
}) {
  if (envPassword) return envPassword;

  const stored = await readStored();
  const devPassword = stored ?? generate();
  if (!stored) {
    await storePassword(devPassword);
  }

  if (!isInteractive) return devPassword;

  const answer = (await ask(devPassword)).trim();
  if (!answer || answer === devPassword) return devPassword;

  await storePassword(answer);
  return answer;
}

function askForPassword({ input, output, defaultValue, timeoutMs }) {
  const seconds = Math.round(timeoutMs / 1000);
  const question =
    "Enter dev unlock password " +
    `(Enter for "${defaultValue}", auto-continues in ${seconds}s): `;

  return new Promise((resolve) => {
    const rl = createInterface({ input, output, terminal: true });
    let settled = false;
    let timer;

    const finish = (answer) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      rl.close();
      resolve(answer);
    };

    timer = setTimeout(() => finish(""), timeoutMs);
    rl.question(question, (answer) => finish(answer));
    rl.on("close", () => finish(""));
  });
}

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env });

    const forward = (signal) => child.kill(signal);
    process.on("SIGINT", forward);
    process.on("SIGTERM", forward);

    const finish = (code) => {
      process.off("SIGINT", forward);
      process.off("SIGTERM", forward);
      resolve(code);
    };

    child.on("error", (error) => {
      process.off("SIGINT", forward);
      process.off("SIGTERM", forward);
      reject(error);
    });
    child.on("exit", (code, signal) =>
      finish(code ?? (signal === "SIGINT" ? 130 : 1))
    );
  });
}

function printUnlockReminder({ password, storedInFile }) {
  console.log("");
  console.log("  -------------------------------------");
  console.log(`  Local unlock password: ${password}`);
  if (storedInFile) {
    console.log(`  Stored in ${DEV_PASSWORD_FILE_NAME} (gitignored)`);
  }
  console.log("  Override with: LECTURE_PW=... yarn dev");
  console.log("  -------------------------------------");
  console.log("");
}

async function main() {
  const envPassword = process.env.LECTURE_PW;

  const password = await resolveDevPassword({
    envPassword,
    isInteractive: Boolean(process.stdin.isTTY),
    readStored: () => readStoredDevPassword(DEV_PASSWORD_FILE),
    storePassword: (value) => storeDevPassword(DEV_PASSWORD_FILE, value),
    generate: generateDevPassword,
    ask: (defaultValue) =>
      askForPassword({
        input: process.stdin,
        output: process.stdout,
        defaultValue,
        timeoutMs: PASSWORD_TIMEOUT_MS,
      }),
  });

  const env = { ...process.env, LECTURE_PW: password };

  const buildCode = await run("yarn", ["build"], env);
  if (buildCode !== 0) {
    process.exit(buildCode);
  }

  printUnlockReminder({ password, storedInFile: !envPassword });

  const serveCode = await run(
    "yarn",
    [
      "concurrently",
      "-k",
      "-n",
      "watch,serve",
      "-c",
      "yellow,cyan",
      "yarn watch",
      "yarn serve",
    ],
    env
  );
  process.exit(serveCode);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
