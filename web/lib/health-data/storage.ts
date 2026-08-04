import {
  emptyLocalHealthStore,
  localHealthStoreSchema,
  type LocalHealthStore,
} from "./model";

export const LEGACY_HEALTH_STORAGE_KEY = "akucheckhome.health-data.v1";
const USER_STORAGE_PREFIX = "akucheckhome.health-data.v2";

export function healthStorageKey(userId: string) {
  return `${USER_STORAGE_PREFIX}:${encodeURIComponent(userId)}`;
}

export function parseLocalHealthStore(value: string | null): LocalHealthStore {
  if (!value) return emptyLocalHealthStore();
  const parsed = localHealthStoreSchema.safeParse(JSON.parse(value));
  if (!parsed.success) throw new Error("Zapisane dane mają nieprawidłowy format.");
  return parsed.data;
}

export function readUserHealthStore(storage: Storage, userId: string): LocalHealthStore {
  try {
    return parseLocalHealthStore(storage.getItem(healthStorageKey(userId)));
  } catch {
    return emptyLocalHealthStore();
  }
}

export function writeUserHealthStore(
  storage: Storage,
  userId: string,
  store: LocalHealthStore,
) {
  const validated = localHealthStoreSchema.parse(store);
  storage.setItem(healthStorageKey(userId), JSON.stringify(validated));
}

export function hasValidLegacyHealthStore(storage: Storage) {
  try {
    return Boolean(storage.getItem(LEGACY_HEALTH_STORAGE_KEY)) &&
      localHealthStoreSchema.safeParse(
        JSON.parse(storage.getItem(LEGACY_HEALTH_STORAGE_KEY) ?? "null"),
      ).success;
  } catch {
    return false;
  }
}

export function claimLegacyHealthStore(storage: Storage, userId: string) {
  const legacy = parseLocalHealthStore(storage.getItem(LEGACY_HEALTH_STORAGE_KEY));
  writeUserHealthStore(storage, userId, legacy);
  storage.removeItem(LEGACY_HEALTH_STORAGE_KEY);
  return legacy;
}
