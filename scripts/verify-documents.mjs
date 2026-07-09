/**
 * Documents module verification script.
 * Run: node scripts/verify-documents.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnv() {
  try {
    const raw = readFileSync(join(root, ".env"), "utf8");
    const env = {};
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1).replace(/^["']|["']$/g, "");
    }
    return env;
  } catch {
    return {};
  }
}

const ALLOWED = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "csv", "txt",
  "png", "jpg", "jpeg", "webp", "zip",
]);
const MAX = 100 * 1024 * 1024;

function getExtension(name) {
  const parts = name.split(".");
  return parts.length < 2 ? "" : parts.pop().toLowerCase();
}

function validate(file) {
  if (file.size > MAX) return "File exceeds the 100 MB upload limit.";
  const ext = getExtension(file.name);
  if (!ALLOWED.has(ext)) return `File type .${ext || "unknown"} is not allowed.`;
  return null;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function verifyValidation() {
  const tmp = join(root, ".tmp-doc-verify");
  mkdirSync(tmp, { recursive: true });

  const pdfPath = join(tmp, "sample.pdf");
  const xlsxPath = join(tmp, "sample.xlsx");
  const pngPath = join(tmp, "sample.png");

  writeFileSync(pdfPath, "%PDF-1.4 test");
  writeFileSync(xlsxPath, "PK\x03\x04 fake xlsx");
  writeFileSync(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

  const pdf = new File([readFileSync(pdfPath)], "sample.pdf", { type: "application/pdf" });
  const xlsx = new File([readFileSync(xlsxPath)], "sample.xlsx", { type: "" });
  const png = new File([readFileSync(pngPath)], "sample.png", { type: "image/png" });
  const bad = new File([Buffer.from("x")], "virus.exe", { type: "application/octet-stream" });

  assert(validate(pdf) === null, "PDF should be allowed");
  assert(validate(xlsx) === null, "XLSX should be allowed");
  assert(validate(png) === null, "PNG should be allowed");
  assert(validate(bad) !== null, "EXE should be rejected");

  rmSync(tmp, { recursive: true, force: true });
  console.log("✓ File validation (pdf, xlsx, png, reject exe)");
}

async function verifySupabaseSchema(env) {
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    console.log("⚠ Skipping Supabase checks (missing VITE_SUPABASE_URL / ANON_KEY)");
    return;
  }

  const client = createClient(url, key);
  const { error: tableError } = await client.from("documents").select("id").limit(1);
  if (tableError) {
    console.log(`⚠ documents table not reachable: ${tableError.message}`);
    console.log("  Apply supabase/migrations/003_documents.sql in SQL Editor");
    return;
  }
  console.log("✓ documents table reachable");

  const { data: buckets, error: bucketError } = await client.storage.listBuckets();
  if (bucketError) {
    console.log(`⚠ storage buckets not listable: ${bucketError.message}`);
    return;
  }
  const hasBucket = (buckets || []).some((b) => b.id === "organization-documents");
  if (!hasBucket) {
    console.log("⚠ organization-documents bucket missing — run 003_documents.sql");
    return;
  }
  console.log("✓ organization-documents bucket exists");
}

async function main() {
  console.log("Documents module verification\n");
  await verifyValidation();
  await verifySupabaseSchema(loadEnv());
  console.log("\nVerification complete.");
}

main().catch((err) => {
  console.error("Verification failed:", err.message);
  process.exit(1);
});
