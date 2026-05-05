import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUNDLED_DEVICES_DIR = path.join(__dirname, "devices");

const DEVICE_LABELS = {
  enduro: "Garmin Enduro",
  enduro3: "Garmin Enduro 3",
  epix2: "Garmin epix Gen 2",
  epix2pro42mm: "Garmin epix Pro 42mm",
  epix2pro47mm: "Garmin epix Pro 47mm",
  epix2pro51mm: "Garmin epix Pro 51mm",
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
  fenix843mm: "Garmin fenix 8 AMOLED 43mm",
  fenix847mm: "Garmin fenix 8 AMOLED 47mm",
  fenix8solar47mm: "Garmin fenix 8 Solar 47mm",
  fenix8solar51mm: "Garmin fenix 8 Solar 51mm",
  fenixe: "Garmin fenix E",
  fr165: "Garmin Forerunner 165",
  fr165m: "Garmin Forerunner 165 Music",
  fr255: "Garmin Forerunner 255",
  fr255m: "Garmin Forerunner 255 Music",
  fr255s: "Garmin Forerunner 255S",
  fr255sm: "Garmin Forerunner 255S Music",
  fr265: "Garmin Forerunner 265",
  fr265s: "Garmin Forerunner 265S",
  fr57042mm: "Garmin Forerunner 570 42mm",
  fr57047mm: "Garmin Forerunner 570 47mm",
  fr955: "Garmin Forerunner 955",
  fr965: "Garmin Forerunner 965",
  fr970: "Garmin Forerunner 970",
  instinct2: "Garmin Instinct 2",
  instinct2s: "Garmin Instinct 2S",
  instinct2x: "Garmin Instinct 2X",
  instinct3amoled45mm: "Garmin Instinct 3 AMOLED 45mm",
  instinct3amoled50mm: "Garmin Instinct 3 AMOLED 50mm",
  instinct3solar45mm: "Garmin Instinct 3 Solar 45mm",
  marq2: "Garmin MARQ Gen 2",
  marq2aviator: "Garmin MARQ Aviator Gen 2",
  venu2: "Garmin Venu 2",
  venu2s: "Garmin Venu 2S",
  venu2plus: "Garmin Venu 2 Plus",
  venu3: "Garmin Venu 3",
  venu3s: "Garmin Venu 3S",
  venu441mm: "Garmin Venu 4 41mm",
  venu445mm: "Garmin Venu 4 45mm",
  vivoactive4: "Garmin vivoactive 4",
  vivoactive4s: "Garmin vivoactive 4S",
  vivoactive5: "Garmin vivoactive 5",
  vivoactive6: "Garmin vivoactive 6",
};

const SUPPORTED_DEVICE_IDS = new Set(Object.keys(DEVICE_LABELS));

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
      if (SUPPORTED_DEVICE_IDS.has(entry.name)) ids.add(entry.name);
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
