// dev.js
import { spawn } from "child_process";
import { createInterface } from "readline";
import { pathToFileURL } from "url";

export const DEFAULT_DEV_PASSWORD = "profpage-dev";

const PASSWORD_TIMEOUT_MS = 5000;

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

export async function resolveDevPassword({
  envPassword,
  defaultValue = DEFAULT_DEV_PASSWORD,
  isInteractive,
  ask,
}) {
  if (envPassword) return envPassword;
  if (!isInteractive) return defaultValue;

  const answer = await ask(defaultValue);
  return answer.trim() || defaultValue;
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

function printUnlockReminder(password) {
  console.log("");
  console.log("  -------------------------------------");
  console.log(`  Local unlock password: ${password}`);
  console.log("  Override with: LECTURE_PW=... yarn dev");
  console.log("  -------------------------------------");
  console.log("");
}

async function main() {
  const password = await resolveDevPassword({
    envPassword: process.env.LECTURE_PW,
    isInteractive: Boolean(process.stdin.isTTY),
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

  printUnlockReminder(password);

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
