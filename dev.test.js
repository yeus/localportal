import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DEV_PASSWORD, resolveDevPassword } from "./dev.js";

test("uses LECTURE_PW when set and does not prompt", async () => {
  let asked = false;
  const password = await resolveDevPassword({
    envPassword: "from-env",
    isInteractive: true,
    ask: async () => {
      asked = true;
      return "typed";
    },
  });

  assert.equal(password, "from-env");
  assert.equal(asked, false);
});

test("uses default without prompting when not interactive", async () => {
  let asked = false;
  const password = await resolveDevPassword({
    envPassword: undefined,
    isInteractive: false,
    ask: async () => {
      asked = true;
      return "typed";
    },
  });

  assert.equal(password, DEFAULT_DEV_PASSWORD);
  assert.equal(asked, false);
});

test("uses the trimmed answer when provided", async () => {
  const password = await resolveDevPassword({
    envPassword: undefined,
    isInteractive: true,
    ask: async () => "  typed  ",
  });

  assert.equal(password, "typed");
});

test("falls back to default on an empty answer", async () => {
  const password = await resolveDevPassword({
    envPassword: undefined,
    isInteractive: true,
    ask: async () => "   ",
  });

  assert.equal(password, DEFAULT_DEV_PASSWORD);
});
