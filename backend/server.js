import "dotenv/config";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { buildFace, createLogoSquadraAsset } from "./builder.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;
const TMP_DIR = process.env.TMP_DIR || path.join(__dirname, "tmp");
const UPLOAD_DIR = path.join(TMP_DIR, "uploads");

await fs.mkdir(UPLOAD_DIR, { recursive: true });

// multer per upload foto — limite 10 MB
const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.use(express.json({ limit: "1mb" }));

// Health check
app.get("/api/health", (req, res) => {
  const hasSdk = Boolean(process.env.SDK_PATH);
  const hasKey = Boolean(process.env.DEVELOPER_KEY_PATH);
  res.json({
    status: "ok",
    time: new Date().toISOString(),
    buildReady: hasSdk && hasKey,
    buildConfig: {
      sdk: hasSdk,
      developerKey: hasKey,
    },
  });
});

app.get("/api/logosquadra", async (req, res) => {
  try {
    const png = await createLogoSquadraAsset(null, { width: 320, height: 124 });
    res.setHeader("Cache-Control", "no-store");
    res.type("png").send(png);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// Endpoint build
app.post("/api/build", upload.single("photo"), async (req, res) => {
  let buildDir = null;
  try {
    const configRaw = req.body.config;
    if (!configRaw) throw new Error("Manca il campo 'config' nel form");
    const config = parseConfig(configRaw);

    const photoPath = req.file?.path || null;

    console.log("[build] config:", config, "photo:", !!photoPath);

    const result = await buildFace(config, photoPath, TMP_DIR);
    buildDir = result.buildDir;

    const downloadName = `${safeDownloadName(config.name || "MyFace")}.prg`;

    res.download(result.prgPath, downloadName, async (err) => {
      if (err) console.error("[build] download error:", err);
      // cleanup: build dir + foto upload
      try {
        if (buildDir) await fs.rm(buildDir, { recursive: true, force: true });
        if (photoPath) await fs.unlink(photoPath).catch(() => {});
      } catch (e) {
        console.warn("[build] cleanup error:", e.message);
      }
    });
  } catch (e) {
    console.error("[build] error:", e);
    res.status(500).json({ error: String(e.message || e) });
    if (buildDir) {
      await fs.rm(buildDir, { recursive: true, force: true }).catch(() => {});
    }
  }
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "La foto supera il limite di 10 MB"
        : `Upload non valido: ${err.message}`;
    return res.status(400).json({ error: message });
  }
  next(err);
});

// Serve il frontend React (build di produzione)
const FRONTEND_DIST = path.join(__dirname, "..", "frontend", "dist");
app.use(express.static(FRONTEND_DIST));
app.get("*", (req, res) => {
  res.sendFile(path.join(FRONTEND_DIST, "index.html"), (err) => {
    if (err) res.status(404).send("Frontend non ancora buildato. Fai `npm run build` in frontend/");
  });
});

app.listen(PORT, () => {
  console.log(`Granbike Face Builder API in ascolto su http://localhost:${PORT}`);
  console.log(`  JAVA_PATH:      ${process.env.JAVA_PATH || "(non impostato)"}`);
  console.log(`  SDK_PATH:       ${process.env.SDK_PATH || "(non impostato)"}`);
  console.log(`  DEVELOPER_KEY:  ${process.env.DEVELOPER_KEY_PATH || "(non impostato)"}`);
});

function safeDownloadName(name) {
  return String(name)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .trim()
    .slice(0, 40) || "MyFace";
}

function parseConfig(configRaw) {
  try {
    return JSON.parse(configRaw);
  } catch {
    throw new Error("Configurazione JSON non valida");
  }
}
