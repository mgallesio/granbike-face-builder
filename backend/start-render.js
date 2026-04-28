import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { createWriteStream } from "fs";
import { get } from "https";

const TMP_DIR = process.env.TMP_DIR || "/tmp/granbike-face-builder";
const SDK_DIR = path.join(TMP_DIR, "connectiq-sdk");
const KEY_PATH = path.join(TMP_DIR, "developer_key.der");
const DEFAULT_SDK_ZIP_URL =
  "https://developer.garmin.com/downloads/connect-iq/sdks/connectiq-sdk-lin-9.1.0-2026-03-09-6a872a80b.zip";

await fs.mkdir(TMP_DIR, { recursive: true });

if (process.env.DEVELOPER_KEY_DER_BASE64 && !process.env.DEVELOPER_KEY_PATH) {
  await fs.writeFile(KEY_PATH, Buffer.from(process.env.DEVELOPER_KEY_DER_BASE64, "base64"));
  process.env.DEVELOPER_KEY_PATH = KEY_PATH;
}

const sdkZipUrl = process.env.CONNECTIQ_SDK_ZIP_URL || DEFAULT_SDK_ZIP_URL;

if (sdkZipUrl && !process.env.SDK_PATH) {
  await fs.mkdir(SDK_DIR, { recursive: true });
  const zipPath = path.join(TMP_DIR, "connectiq-sdk.zip");
  await download(sdkZipUrl, zipPath);
  await exec("unzip", ["-q", "-o", zipPath, "-d", SDK_DIR]);
  process.env.SDK_PATH = await findSdkRoot(SDK_DIR);
}

await import("./server.js");

function download(url, dst) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dst);
    get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        return download(res.headers.location, dst).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        return reject(new Error(`Download SDK fallito: HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", (err) => {
      file.close();
      reject(err);
    });
  });
}

function exec(file, args) {
  return new Promise((resolve, reject) => {
    execFile(file, args, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || stdout || err.message));
      resolve(stdout);
    });
  });
}

async function findSdkRoot(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (await hasMonkeybrains(fullPath)) return fullPath;
      const found = await findSdkRoot(fullPath).catch(() => null);
      if (found) return found;
    }
  }
  throw new Error("SDK Connect IQ non trovato nello zip: manca bin/monkeybrains.jar");
}

async function hasMonkeybrains(dir) {
  try {
    await fs.access(path.join(dir, "bin", "monkeybrains.jar"));
    return true;
  } catch {
    return false;
  }
}
