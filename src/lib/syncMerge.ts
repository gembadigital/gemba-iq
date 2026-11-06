// Veri kaybı koruması için saf (yan etkisiz) yardımcılar.
//
// Arka plan: eskiden her kayıtta istemcinin bellekteki TÜM listesi veritabanına
// yazılıyor, listede olmayan satırlar siliniyordu (son yazan kazanır). Eski bir
// sekme/ikinci kullanıcı/OpenClaw API'nin eklediği kayıtlar silinebiliyor,
// diğer istemcilerin düzenlemeleri eski sürümle eziliyordu. Bu dosyadaki
// fonksiyonlar "yalnızca bu istemcinin değiştirdiği şeyi yaz" mantığının
// çekirdeğidir ve ağ/DB'ye hiç dokunmaz — bu yüzden birim testi yazılabilir.

/** Anahtar sırasından bağımsız, kararlı JSON imzası. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(val as Record<string, unknown>).sort()) {
        sorted[k] = (val as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return val;
  });
}

export interface RowBaselineEntry {
  sig: string;
  updatedAt: string | null;
}

export type RowBaseline = Map<string, RowBaselineEntry>;

export interface RowDiff<T extends { id: string }> {
  /** Yüklendiğinden/son yazıldığından beri değişen veya yeni eklenen satırlar. */
  changed: T[];
  /** Bu istemcinin bilerek sildiği (baseline'da olup listede olmayan) id'ler. */
  removedIds: string[];
}

/**
 * Baseline ile istemci listesini karşılaştırır. Baseline'da hiç bulunmayan bir
 * satır (başkasının eklediği) ASLA silinmez; çünkü "silinecek" kümesi yalnızca
 * baseline'da bilinen id'lerden hesaplanır.
 */
export function diffAgainstBaseline<T extends { id: string }>(items: T[], baseline: RowBaseline): RowDiff<T> {
  const present = new Set<string>();
  const changed: T[] = [];
  for (const item of items) {
    present.add(item.id);
    const base = baseline.get(item.id);
    if (!base || base.sig !== stableStringify(item)) changed.push(item);
  }
  const removedIds: string[] = [];
  for (const id of baseline.keys()) {
    if (!present.has(id)) removedIds.push(id);
  }
  return { changed, removedIds };
}

/**
 * Toplu silme koruması: boş/yarım yüklenmiş bir listenin tabloyu silmesini
 * engeller. Tablonun en az yarısını ve 10'dan fazla satırı tek seferde silmek
 * olağan kullanımda yoktur.
 */
export function isSuspiciousBulkDelete(removedCount: number, baselineSize: number): boolean {
  return removedCount > 10 && removedCount >= baselineSize * 0.5;
}

export interface ConflictCheckRow {
  id: string;
  updated_at: string;
}

/**
 * Sunucudaki updated_at, bizim baseline'daki değerden farklıysa başka biri
 * (başka sekme/kullanıcı/API) o satırı yüklediğimizden beri değiştirmiştir.
 * Sunucuda hiç olmayan satır çakışma sayılmaz (yeni ekleme / yeniden oluşturma).
 */
export function findConflicts<T extends { id: string }>(
  changed: T[],
  baseline: RowBaseline,
  serverRows: ConflictCheckRow[]
): string[] {
  const serverById = new Map(serverRows.map((r) => [r.id, r.updated_at]));
  const conflicts: string[] = [];
  for (const item of changed) {
    const base = baseline.get(item.id);
    if (!base || !base.updatedAt) continue; // yeni satır
    const serverUpdated = serverById.get(item.id);
    if (serverUpdated === undefined) continue; // sunucuda yok
    if (new Date(serverUpdated).getTime() !== new Date(base.updatedAt).getTime()) conflicts.push(item.id);
  }
  return conflicts;
}

function hasStringId(item: unknown): item is { id: string } {
  return !!item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string";
}

export function isIdArray(value: unknown): value is { id: string }[] {
  return Array.isArray(value) && value.every(hasStringId);
}

/**
 * Üç yönlü birleştirme (id'li nesne dizileri için):
 *  - base: bu istemcinin yüklediği / en son yazdığı sürüm
 *  - mine: bu istemcinin şu anki sürümü
 *  - server: sunucudaki GÜNCEL sürüm
 * Sonuç: sunucudaki her şey korunur; yalnızca bu istemcinin değiştirdiği,
 * eklediği veya bilerek sildiği öğeler uygulanır. Böylece eksik/eski bir
 * listeyle kaydeden istemci 3000 kişilik sunucu listesini küçültemez.
 */
export function mergeIdArrays<T extends { id: string }>(
  base: T[] | undefined,
  mine: T[],
  server: T[] | undefined
): T[] {
  const baseMap = new Map((base || []).map((i) => [i.id, i]));
  const mineMap = new Map(mine.map((i) => [i.id, i]));
  const serverList = server || [];
  const serverIds = new Set(serverList.map((i) => i.id));

  const mineChanged = (id: string): boolean => {
    const m = mineMap.get(id);
    if (!m) return false;
    const b = baseMap.get(id);
    return !b || stableStringify(b) !== stableStringify(m);
  };

  const result: T[] = [];
  for (const s of serverList) {
    const removedByMe = baseMap.has(s.id) && !mineMap.has(s.id);
    if (removedByMe) continue;
    result.push(mineChanged(s.id) ? (mineMap.get(s.id) as T) : s);
  }
  for (const m of mine) {
    if (serverIds.has(m.id)) continue;
    const inBase = baseMap.has(m.id);
    // Bizim eklediğimiz yeni öğe -> ekle. Sunucudan başkası silmiş ama biz
    // değiştirmişsek -> geri koy. Dokunmadığımız ve sunucuda silinmişse -> düşür.
    if (!inBase || mineChanged(m.id)) result.push(m);
  }
  return result;
}

export interface KvMergeResult {
  merged: Record<string, unknown>;
  /** Birleştirme sonucu istemcinin gönderdiğinden farklı çıkan anahtarlar. */
  changedByMerge: string[];
}

/**
 * kvStore için: dirty anahtarlardan id'li dizi olanlar üç yönlü birleştirilir,
 * diğerleri (skaler/nesne) son yazan kazanır.
 */
export function mergeKvStore(
  serverKv: Record<string, unknown>,
  mineKv: Record<string, unknown>,
  baseKv: Record<string, unknown>,
  dirtyKeys: string[]
): KvMergeResult {
  const merged: Record<string, unknown> = { ...serverKv };
  const changedByMerge: string[] = [];
  for (const key of dirtyKeys) {
    if (!(key in mineKv)) continue;
    const mine = mineKv[key];
    const server = serverKv[key];
    const base = baseKv[key];
    if (isIdArray(mine) && (server === undefined || isIdArray(server)) && (base === undefined || isIdArray(base))) {
      const result = mergeIdArrays(base as { id: string }[] | undefined, mine, server as { id: string }[] | undefined);
      merged[key] = result;
      if (stableStringify(result) !== stableStringify(mine)) changedByMerge.push(key);
    } else {
      merged[key] = mine;
    }
  }
  return { merged, changedByMerge };
}

/**
 * kvStore dışındaki üst düzey aux alanları (taskNotifications, crmUsers ...):
 * istemci o alanı yüklediğinden beri DEĞİŞTİRMEDİYSE sunucudaki değer korunur.
 */
export function pickAuxField(
  field: string,
  mineValue: unknown,
  baseSigByField: Record<string, string>,
  serverValue: unknown,
  serverHasField: boolean
): unknown {
  const unchanged = field in baseSigByField && baseSigByField[field] === stableStringify(mineValue);
  if (unchanged && serverHasField) return serverValue;
  return mineValue;
}
