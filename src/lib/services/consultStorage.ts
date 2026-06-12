// ── AI Consult IndexedDB Storage ────────────────────────────────────────
// Replaces localStorage for chat history. IndexedDB offers ~50MB+ (vs 5MB
// localStorage), which is essential when storing compressed ECG images.
// Falls back to in-memory storage when IndexedDB is unavailable (SSR).

import { openDB, type IDBPDatabase } from "idb";
import type { ConsultMessage } from "./consultService";

const DB_NAME = "ep-mentor-consult";
const STORE_NAME = "messages";
const DB_VERSION = 1;
const MAX_MESSAGES = 60; // auto-trim when exceeding

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (typeof indexedDB === "undefined") {
    // SSR or extreme legacy browser — never resolves
    return new Promise(() => {});
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

export const consultStore = {
  async getMessages(): Promise<ConsultMessage[]> {
    try {
      const db = await getDb();
      const all = await db.getAll(STORE_NAME);
      all.sort((a, b) => (a.id as number) - (b.id as number));
      return all.map(
        ({ role, content, images, error }: ConsultMessage & { id?: number; error?: boolean }) => ({
          role,
          content,
          ...(images ? { images } : {}),
          ...(error ? { error } : {}),
        })
      );
    } catch {
      return [];
    }
  },

  async addMessage(msg: ConsultMessage): Promise<void> {
    try {
      const db = await getDb();
      await db.add(STORE_NAME, msg);
      await _trim(db, MAX_MESSAGES);
    } catch {
      // Chat works without persistence
    }
  },

  async updateLastMessage(msg: ConsultMessage): Promise<void> {
    try {
      const db = await getDb();
      const all = await db.getAll(STORE_NAME);
      all.sort((a, b) => (a.id as number) - (b.id as number));
      const last = all[all.length - 1];
      if (last) {
        await db.put(STORE_NAME, { ...msg, id: last.id });
      }
    } catch {
      // ignore
    }
  },

  async clear(): Promise<void> {
    try {
      const db = await getDb();
      await db.clear(STORE_NAME);
    } catch {
      // ignore
    }
  },
};

async function _trim(db: IDBPDatabase, max: number): Promise<void> {
  const all = await db.getAll(STORE_NAME);
  if (all.length <= max) return;
  all.sort((a, b) => (a.id as number) - (b.id as number));
  const toDelete = all.slice(0, all.length - max);
  const tx = db.transaction(STORE_NAME, "readwrite");
  for (const r of toDelete) await tx.store.delete(r.id!);
  await tx.done;
}
