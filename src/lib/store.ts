import fs from "fs";
import path from "path";

export type VideoQuality = "480p" | "720p" | "1080p";
export type VideoDuration = 5 | 10;

export interface Mission {
  id: string;
  imageUrl: string;
  prompt: string;
  status: "pending" | "generating" | "completed" | "failed";
  videoUrl: string | null;
  predictionId: string | null;
  error: string | null;
  creditsCost: number;
  createdAt: string;
  paidWithZoria: boolean;
  quality: VideoQuality;
  duration: VideoDuration;
  txHash: string | null;
}

interface UserData {
  credits: number;
  missions: Mission[];
}

interface StoreData {
  users: Record<string, UserData>;
}

const INITIAL_CREDITS = 10;
const STORE_PATH = path.join(process.cwd(), "data", "store.json");

function ensureStore(): StoreData {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    const initial: StoreData = { users: {} };
    fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  const raw = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
  if (!raw.users) {
    const migrated: StoreData = { users: {} };
    fs.writeFileSync(STORE_PATH, JSON.stringify(migrated, null, 2));
    return migrated;
  }
  return raw as StoreData;
}

function saveStore(data: StoreData) {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
}

function ensureUser(data: StoreData, wallet: string): UserData {
  const key = wallet.toLowerCase();
  if (!data.users[key]) {
    data.users[key] = { credits: INITIAL_CREDITS, missions: [] };
    saveStore(data);
  }
  return data.users[key];
}

export function getCredits(wallet: string): number {
  const data = ensureStore();
  return ensureUser(data, wallet).credits;
}

export function deductCredits(wallet: string, amount: number): boolean {
  const data = ensureStore();
  const user = ensureUser(data, wallet);
  if (user.credits < amount) return false;
  user.credits -= amount;
  saveStore(data);
  return true;
}

export function addCredits(wallet: string, amount: number) {
  const data = ensureStore();
  const user = ensureUser(data, wallet);
  user.credits += amount;
  saveStore(data);
}

export function getMissions(wallet: string): Mission[] {
  const data = ensureStore();
  return ensureUser(data, wallet).missions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getMission(wallet: string, id: string): Mission | undefined {
  const data = ensureStore();
  return ensureUser(data, wallet).missions.find((m) => m.id === id);
}

export function createMission(wallet: string, mission: Mission) {
  const data = ensureStore();
  const user = ensureUser(data, wallet);
  user.missions.push(mission);
  saveStore(data);
}

export function getAllCompletedMissions(): (Mission & { wallet: string })[] {
  const data = ensureStore();
  const all: (Mission & { wallet: string })[] = [];
  for (const [wallet, user] of Object.entries(data.users)) {
    for (const m of user.missions) {
      if (m.status === "completed" && m.videoUrl) {
        all.push({ ...m, wallet });
      }
    }
  }
  return all.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function updateMission(wallet: string, id: string, updates: Partial<Mission>) {
  const data = ensureStore();
  const user = ensureUser(data, wallet);
  const idx = user.missions.findIndex((m) => m.id === id);
  if (idx !== -1) {
    user.missions[idx] = { ...user.missions[idx], ...updates };
    saveStore(data);
  }
}
