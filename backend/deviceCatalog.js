import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUNDLED_DEVICES_DIR = path.join(__dirname, "devices");

const DEVICE_LABELS = {
  fenix6: "Garmin fenix 6",
  fenix6s: "Garmin fenix 6S",
  fenix6pro: "Garmin fenix 6 Pro",
  fenix6spro: "Garmin fenix 6S Pro",
  fenix6xpro: "Garmin fenix 6X Pro",
  fenix7: "Garmin fenix 7",
  fenix7s: "Garmin fenix 7S",
  fenix7x: "Garmin fenix 7X",
  fenix7pro: "Garmin fenix 7 Pro / Pro Solar",
  fenix7spro: "Garmin fenix 7S Pro",
  fenix7xpro: "Garmin fenix 7X Pro",
  fenix7pronowifi: "Garmin fenix 7 Pro No Wi-Fi",
  fenix7xpronowifi: "Garmin fenix 7X Pro No Wi-Fi",
  epix2: "Garmin epix Gen 2",
  epix2pro42mm: "Garmin epix Pro 42mm",
  epix2pro47mm: "Garmin epix Pro 47mm",
  epix2pro51mm: "Garmin epix Pro 51mm",
  forerunner255: "Garmin Forerunner 255",
  forerunner265: "Garmin Forerunner 265",
  forerunner955: "Garmin Forerunner 955",
  forerunner965: "Garmin Forerunner 965",
  venu2: "Garmin Venu 2",
  venu2plus: "Garmin Venu 2 Plus",
  venu3: "Garmin Venu 3",
  venu3s: "Garmin Venu 3S",
  instinct2: "Garmin Instinct 2",
  instinct2s: "Garmin Instinct 2S",
  instinct2x: "Garmin Instinct 2X",
};

export async function listDeviceIds() {
  const ids = new Set();
  for (const dir of getDeviceRoots()) {
    await collectDeviceIds(dir, ids);
  }
  return [...ids].sort(compareDeviceIds);
}

export async function listDeviceOptions() {
  const ids = await listDeviceIds();
  return ids.map((id) => ({ id, label: DEVICE_LABELS[id] || prettifyDeviceId(id) }));
}

function getDeviceRoots() {
  const roots = [BUNDLED_DEVICES_DIR];
  const home = process.env.HOME || process.env.USERPROFILE;
  if (home) roots.push(path.join(home, ".Garmin", "ConnectIQ", "Devices"));
  if (process.env.APPDATA) roots.push(path.join(process.env.APPDATA, "Garmin", "ConnectIQ", "Devices"));
  if (process.env.LOCALAPPDATA) roots.push(path.join(process.env.LOCALAPPDATA, "Garmin", "ConnectIQ", "Devices"));
  return [...new Set(roots)];
}

async function collectDeviceIds(root, ids) {
  let entries = [];
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const compilerPath = path.join(root, entry.name, "compiler.json");
    try {
      await fs.access(compilerPath);
      ids.add(entry.name);
    } catch {
      // Ignore folders that are not Connect IQ device definitions.
    }
  }
}

function compareDeviceIds(a, b) {
  const knownA = Object.prototype.hasOwnProperty.call(DEVICE_LABELS, a);
  const knownB = Object.prototype.hasOwnProperty.call(DEVICE_LABELS, b);
  if (knownA !== knownB) return knownA ? -1 : 1;
  return (DEVICE_LABELS[a] || a).localeCompare(DEVICE_LABELS[b] || b, "it");
}

function prettifyDeviceId(id) {
  return `Garmin ${String(id)
    .replace(/([a-z])([0-9])/gi, "$1 $2")
    .replace(/([0-9])([a-z])/gi, "$1 $2")
    .replace(/\bpro\b/gi, "Pro")
    .replace(/\bsolar\b/gi, "Solar")
    .replace(/\bwi\b/gi, "Wi")
    .replace(/\bfi\b/gi, "Fi")
    .trim()}`;
}
