import assert from "node:assert/strict";
import { test } from "node:test";
import catalog from "../src/data/serviceCatalog.json";
import { serviceDefinitionBlocks } from "../src/lib/serviceDefinition";

test("mixed-case section titles become h3 without uppercasing the prose", () => {
  const [heading, paragraph] = serviceDefinitionBlocks("1. Çalışmanın Tanımı ve Kapsamı\nSüreçlerin analizi yapılır.");
  assert.match(heading, /^<h3\b/);
  assert.match(paragraph, /^<p\b/);
  assert.ok(paragraph.includes("Süreçlerin analizi yapılır."));
});

test("explicit h3 input is retained as a heading without executable attributes", () => {
  const html = serviceDefinitionBlocks('<h3 onclick="alert(1)">Eğitimin Amacı</h3>\nAçıklama <img src=x onerror=alert(1)>').join("");
  assert.equal((html.match(/<h3\b/g) || []).length, 1);
  assert.ok(!html.includes("onclick="));
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes("&lt;img"));
});

test("normal paragraphs, bullets and ampersands remain readable", () => {
  const blocks = serviceDefinitionBlocks("Kalite & verimlilik birlikte incelenir.\n• Saha gözlemi", "screen");
  assert.ok(blocks.every(block => block.startsWith("<p")));
  assert.ok(blocks[0].includes("Kalite &amp; verimlilik birlikte incelenir."));
  assert.ok(blocks[1].includes("• Saha gözlemi"));
});

test("all 18 available definitions contain h3 sections and preserve every source line", () => {
  const ready = catalog.filter(card => card.definitionStatus === "ready");
  assert.equal(ready.length, 18);
  for (const card of ready) {
    const blocks = serviceDefinitionBlocks(card.defaultCoverPage);
    assert.ok(blocks.some(block => block.startsWith("<h3")), card.code);
    assert.equal(blocks.length, card.defaultCoverPage.split(/[\r\n]+/).filter(line => line.trim()).length, card.code);
  }
});
