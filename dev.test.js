import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import {
  readStoredDevPassword,
  resolveDevPassword,
  storeDevPassword,
} from "./dev.js";

const envValue = "fixture-env-value";
const storedValue = "fixture-stored-value";
const typedValue = "fixture-typed-value";
const generatedValue = "fixture-generated-value";

function createStore(initial) {
  let value = initial;
  return {
    read: async () => value,
    write: async (next) => {
      value = next;
    },
    current: () => value,
  };
}

test("uses LECTURE_PW when set without touching the store or the prompt", async () => {
  const store = createStore(null);
  let asked = false;

  const resolved = await resolveDevPassword({
    envPassword: envValue,
    isInteractive: true,
    readStored: store.read,
    storePassword: store.write,
    generate: () => generatedValue,
    ask: async () => {
      asked = true;
      return typedValue;
    },
  });

  assert.equal(resolved, envValue);
  assert.equal(store.current(), null);
  assert.equal(asked, false);
});

test("reuses a stored dev password when not interactive", async () => {
  const store = createStore(storedValue);
  let generated = false;

  const resolved = await resolveDevPassword({
    envPassword: undefined,
    isInteractive: false,
    readStored: store.read,
    storePassword: store.write,
    generate: () => {
      generated = true;
      return generatedValue;
    },
    ask: async () => {
      throw new Error("must not prompt when not interactive");
    },
  });

  assert.equal(resolved, storedValue);
  assert.equal(generated, false);
  assert.equal(store.current(), storedValue);
});

test("generates and stores a dev password when none exists", async () => {
  const store = createStore(null);

  const resolved = await resolveDevPassword({
    envPassword: undefined,
    isInteractive: false,
    readStored: store.read,
    storePassword: store.write,
    generate: () => generatedValue,
    ask: async () => {
      throw new Error("must not prompt when not interactive");
    },
  });

  assert.equal(resolved, generatedValue);
  assert.equal(store.current(), generatedValue);
});

test("keeps the stored dev password on an empty answer", async () => {
  const store = createStore(storedValue);

  const resolved = await resolveDevPassword({
    envPassword: undefined,
    isInteractive: true,
    readStored: store.read,
    storePassword: store.write,
    generate: () => generatedValue,
    ask: async () => "   ",
  });

  assert.equal(resolved, storedValue);
  assert.equal(store.current(), storedValue);
});

test("stores a typed dev password", async () => {
  const store = createStore(storedValue);

  const resolved = await resolveDevPassword({
    envPassword: undefined,
    isInteractive: true,
    readStored: store.read,
    storePassword: store.write,
    generate: () => generatedValue,
    ask: async () => `  ${typedValue}  `,
  });

  assert.equal(resolved, typedValue);
  assert.equal(store.current(), typedValue);
});

test("dev password file round-trips through disk", async () => {
  const dir = await mkdtemp(join(tmpdir(), "profpage-dev-"));
  const filePath = join(dir, "password-file");
  try {
    assert.equal(await readStoredDevPassword(filePath), null);
    await storeDevPassword(filePath, storedValue);
    assert.equal(await readStoredDevPassword(filePath), storedValue);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("treats an empty dev password file as missing", async () => {
  const dir = await mkdtemp(join(tmpdir(), "profpage-dev-"));
  const filePath = join(dir, "password-file");
  try {
    await storeDevPassword(filePath, "");
    assert.equal(await readStoredDevPassword(filePath), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
