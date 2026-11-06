// Çalıştırma: npm run test:sync
import assert from "node:assert/strict";
import {
  diffAgainstBaseline,
  findConflicts,
  isSuspiciousBulkDelete,
  mergeIdArrays,
  mergeKvStore,
  pickAuxField,
  stableStringify,
  type RowBaseline,
} from "./syncMerge";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

const item = (id: string, extra: Record<string, unknown> = {}) => ({ id, ...extra });
const baselineOf = (items: { id: string }[], updatedAt = "2026-11-06T07:00:00Z"): RowBaseline =>
  new Map(items.map((i) => [i.id, { sig: stableStringify(i), updatedAt }]));

test("stableStringify anahtar sırasından bağımsız", () => {
  assert.equal(stableStringify({ a: 1, b: { y: 1, x: 2 } }), stableStringify({ b: { x: 2, y: 1 }, a: 1 }));
});

test("diff: değişmeyen satır yazılmaz", () => {
  const items = [item("d1", { v: 1 }), item("d2", { v: 1 })];
  const { changed, removedIds } = diffAgainstBaseline(items, baselineOf(items));
  assert.deepEqual(changed, []);
  assert.deepEqual(removedIds, []);
});

test("diff: yalnızca değişen ve yeni satır yazılır", () => {
  const base = [item("d1", { v: 1 }), item("d2", { v: 1 })];
  const mine = [item("d1", { v: 2 }), item("d2", { v: 1 }), item("d3", { v: 1 })];
  const { changed } = diffAgainstBaseline(mine, baselineOf(base));
  assert.deepEqual(changed.map((c) => c.id), ["d1", "d3"]);
});

test("diff: baseline'da olmayan (başkasının eklediği) satır asla silinmez", () => {
  // Biz d1'i biliyoruz. Başkası d9 ekledi; bizim listemizde d9 yok.
  const base = [item("d1")];
  const { removedIds } = diffAgainstBaseline([item("d1", { v: 2 })], baselineOf(base));
  assert.deepEqual(removedIds, []);
});

test("diff: bilerek silinen satır removedIds'e girer", () => {
  const base = [item("d1"), item("d2")];
  const { removedIds } = diffAgainstBaseline([item("d1")], baselineOf(base));
  assert.deepEqual(removedIds, ["d2"]);
});

test("toplu silme koruması: boş liste tabloyu silemez, tek silme geçer", () => {
  assert.equal(isSuspiciousBulkDelete(91, 91), true);
  assert.equal(isSuspiciousBulkDelete(1, 91), false);
  assert.equal(isSuspiciousBulkDelete(5, 8), false);
  assert.equal(isSuspiciousBulkDelete(40, 91), false);
  assert.equal(isSuspiciousBulkDelete(46, 91), true);
});

test("çakışma: sunucu updated_at farklıysa çakışma", () => {
  const base = [item("d1")];
  const conflicts = findConflicts(
    [item("d1", { v: 2 })],
    baselineOf(base, "2026-11-06T07:00:00Z"),
    [{ id: "d1", updated_at: "2026-11-06T07:05:00Z" }]
  );
  assert.deepEqual(conflicts, ["d1"]);
});

test("çakışma: aynı updated_at ise çakışma yok; farklı biçim aynı an", () => {
  const base = [item("d1")];
  const conflicts = findConflicts(
    [item("d1", { v: 2 })],
    baselineOf(base, "2026-11-06T07:00:00.000Z"),
    [{ id: "d1", updated_at: "2026-11-06 07:00:00+00" }]
  );
  assert.deepEqual(conflicts, []);
});

test("çakışma: yeni satır ve sunucuda olmayan satır çakışma değil", () => {
  const conflicts = findConflicts([item("yeni"), item("d1", { v: 2 })], baselineOf([item("d1")]), []);
  assert.deepEqual(conflicts, []);
});

test("üç yönlü: eski/eksik liste 3000 kişilik sunucu listesini küçültemez", () => {
  const server = Array.from({ length: 3000 }, (_, i) => item(`p${i}`));
  const base = [item("p0")];
  const mine = [item("p0"), item("yeni")]; // eksik cache + 1 ekleme
  const out = mergeIdArrays(base, mine, server);
  assert.equal(out.length, 3001);
  assert.ok(out.some((i) => i.id === "yeni"));
  assert.ok(out.some((i) => i.id === "p2999"));
});

test("üç yönlü: bilerek silinen öğe sunucudan da düşer", () => {
  const server = [item("a"), item("b"), item("c")];
  const out = mergeIdArrays([item("a"), item("b"), item("c")], [item("a"), item("c")], server);
  assert.deepEqual(out.map((i) => i.id), ["a", "c"]);
});

test("üç yönlü: ben değiştirdiysem benimki, dokunmadıysam sunucununki", () => {
  const server = [item("a", { v: "srv" }), item("b", { v: "srv" })];
  const base = [item("a", { v: "old" }), item("b", { v: "old" })];
  const mine = [item("a", { v: "mine" }), item("b", { v: "old" })];
  const out = mergeIdArrays(base, mine, server);
  assert.equal((out.find((i) => i.id === "a") as any).v, "mine");
  assert.equal((out.find((i) => i.id === "b") as any).v, "srv");
});

test("üç yönlü: sunucuda başkasınca silinen, benim dokunmadığım öğe düşer", () => {
  const out = mergeIdArrays([item("a"), item("b")], [item("a"), item("b")], [item("a")]);
  assert.deepEqual(out.map((i) => i.id), ["a"]);
});

test("üç yönlü: sunucuda silinmiş ama ben değiştirdiysem geri gelir", () => {
  const out = mergeIdArrays([item("a", { v: 1 })], [item("a", { v: 2 })], []);
  assert.deepEqual(out.map((i) => i.id), ["a"]);
});

test("kv birleştirme: dizi anahtarı birleşir, skaler anahtar son yazan", () => {
  const server = { crm_lead_profiles: [item("p1"), item("p2")], crm_flag: "srv", crm_other: [item("x")] };
  const mine = { crm_lead_profiles: [item("p1"), item("p3")], crm_flag: "mine" };
  const base = { crm_lead_profiles: [item("p1")], crm_flag: "old" };
  const { merged, changedByMerge } = mergeKvStore(server, mine, base, ["crm_lead_profiles", "crm_flag"]);
  assert.deepEqual((merged.crm_lead_profiles as { id: string }[]).map((i) => i.id), ["p1", "p2", "p3"]);
  assert.equal(merged.crm_flag, "mine");
  assert.deepEqual(merged.crm_other, [item("x")]); // dirty olmayan anahtara dokunulmadı
  assert.deepEqual(changedByMerge, ["crm_lead_profiles"]);
});

test("kv birleştirme: id'siz dizi son yazan kazanır (geriye uyum)", () => {
  const { merged } = mergeKvStore({ k: ["a", "b"] }, { k: ["c"] }, { k: ["a"] }, ["k"]);
  assert.deepEqual(merged.k, ["c"]);
});

test("aux alan: değişmediyse sunucu değeri korunur", () => {
  const sigs = { crmUsers: stableStringify(["a"]) };
  assert.deepEqual(pickAuxField("crmUsers", ["a"], sigs, ["a", "b"], true), ["a", "b"]);
  assert.deepEqual(pickAuxField("crmUsers", ["z"], sigs, ["a", "b"], true), ["z"]);
  assert.deepEqual(pickAuxField("crmUsers", ["a"], sigs, undefined, false), ["a"]);
});

console.log(`\n${passed} test geçti`);
