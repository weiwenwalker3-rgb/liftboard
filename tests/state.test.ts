import test from "node:test";
import assert from "node:assert/strict";
import { getState, putState } from "../lib/store";

test("state saves are rejected when the caller is behind", async () => {
  const id = "t" + Math.random().toString(36).slice(2);
  assert.equal(await getState(id), null);
  const a = await putState(id, '{"lifts":[1]}', null);
  assert.ok(a.ok);
  // a stale device that never saw version `a` tries to save from nothing
  const stale = await putState(id, '{"lifts":[]}', null);
  assert.ok(!stale.ok);
  assert.equal((stale as { current: { data: string } }).current.data, '{"lifts":[1]}');
  // a device holding the current version can save, and the old version is then stale
  const b = await putState(id, '{"lifts":[1,2]}', (a as { rev: string }).rev);
  assert.ok(b.ok);
  assert.ok(!(await putState(id, '{"lifts":[]}', (a as { rev: string }).rev)).ok);
  assert.equal((await getState(id))!.data, '{"lifts":[1,2]}');
  // clients that send no base keep the old always-write behaviour
  assert.ok((await putState(id, '{"lifts":[9]}', undefined)).ok);
});
