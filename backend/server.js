import "dotenv/config";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { buildFace, buildStorePackage, createLogoSquadraAsset } from "./builder.js";
import { createTeamStore, publicLogo, publicTeam } from "./teamStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;
const TMP_DIR = process.env.TMP_DIR || path.join(__dirname, "tmp");
const UPLOAD_DIR = path.join(TMP_DIR, "uploads");
const TEAM_DATA_DIR = process.env.TEAM_DATA_DIR || __dirname;
const teamStore = createTeamStore(TEAM_DATA_DIR);

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
    const png = await createLogoSquadraAsset(null, {
      width: 320,
      height: 124,
      logoName: req.query.logo,
    });
    res.setHeader("Cache-Control", "no-store");
    res.type("png").send(png);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.get("/api/teams", async (req, res) => {
  const teams = await teamStore.listTeams();
  res.json(teams.map(publicTeam));
});

app.get("/api/teams/:slug", async (req, res) => {
  const team = await teamStore.getTeam(req.params.slug);
  if (!team) return res.status(404).json({ error: "Squadra non trovata" });
  res.json(publicTeam(team));
});

app.get("/api/teams/:slug/logo", async (req, res) => {
  try {
    const team = await teamStore.getTeam(req.params.slug);
    if (!team) return res.status(404).json({ error: "Squadra non trovata" });
    const logoPath = await teamStore.getLogoPath(team);
    if (!logoPath) return res.status(404).json({ error: "Logo squadra non caricato" });
    const png = await createLogoSquadraAsset(null, {
      width: 320,
      height: 124,
      sourcePath: logoPath,
      trimBackground: "#ffffff",
    });
    res.setHeader("Cache-Control", "no-store");
    res.type("png").send(png);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.get("/api/logos", async (req, res) => {
  const logos = await teamStore.listLogos();
  res.json(logos.map(publicLogo));
});

app.get("/api/logos/:id/image", async (req, res) => {
  try {
    const logoPath = await teamStore.getNamedLogoPath(req.params.id);
    if (!logoPath) return res.status(404).json({ error: "Logo non trovato" });
    const png = await createLogoSquadraAsset(null, {
      width: 320,
      height: 124,
      sourcePath: logoPath,
      trimBackground: "#ffffff",
    });
    res.setHeader("Cache-Control", "no-store");
    res.type("png").send(png);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.post("/api/admin/logos", requireAdmin, upload.single("logo"), async (req, res) => {
  try {
    const logo = await teamStore.saveLogo(
      {
        ...req.body,
        logoOriginalName: req.file?.originalname,
      },
      req.file?.path || null
    );
    if (req.file?.path) await cleanupUpload(req.file.path);
    res.json(publicLogo(logo));
  } catch (e) {
    if (req.file?.path) await cleanupUpload(req.file.path);
    res.status(400).json({ error: String(e.message || e) });
  }
});

app.post("/api/admin/teams", requireAdmin, upload.single("logo"), async (req, res) => {
  try {
    const team = await teamStore.saveTeam(
      {
        ...req.body,
        logoOriginalName: req.file?.originalname,
      },
      req.file?.path || null
    );
    if (req.file?.path) await cleanupUpload(req.file.path);
    res.json(publicTeam(team));
  } catch (e) {
    if (req.file?.path) await cleanupUpload(req.file.path);
    res.status(400).json({ error: String(e.message || e) });
  }
});

// Endpoint build
app.post("/api/build", upload.single("photo"), async (req, res) => {
  let buildDir = null;
  try {
    const configRaw = req.body.config;
    if (!configRaw) throw new Error("Manca il campo 'config' nel form");
    const config = parseConfig(configRaw);
    await applyTeamConfig(config);

    const photoPath = req.file?.path || null;

    console.log("[build] config:", config, "photo:", !!photoPath);

    const result = await buildFace(config, photoPath, TMP_DIR);
    buildDir = result.buildDir;

    const downloadName = `${safeDownloadName(config.prgFileName || config.name || "MyFace")}.prg`;

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

app.post("/api/package", upload.single("photo"), async (req, res) => {
  try {
    const config = JSON.parse(req.body.config || "{}");
    await applyTeamConfig(config);
    const photoPath = req.file ? req.file.path : null;
    const result = await buildStorePackage(config, photoPath, TMP_DIR);
    const downloadName = `${safeDownloadName(config.prgFileName || config.name || "GranbikeFace")}-beta.iq`;

    res.download(result.packagePath, downloadName, async (err) => {
      await cleanupUpload(photoPath);
      if (err) console.error("Errore download package:", err);
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Errore durante la generazione del pacchetto beta" });
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
  console.log(`  TEAM_DATA_DIR:  ${TEAM_DATA_DIR}`);
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

async function applyTeamConfig(config) {
  if (!config.teamSlug) return;
  const team = await teamStore.getTeam(config.teamSlug);
  if (!team) throw new Error("Squadra non trovata");
  const logoPath = await teamStore.getLogoPath(team);
  config.name = team.name;
  config.prgFileName = team.prgFileName;
  config.logoName = "logosquadra";
  if (team.backgroundColor) config.backgroundColor = team.backgroundColor;
  if (team.accentColor) config.accentColor = team.accentColor;
  if (!logoPath) throw new Error(`Logo non configurato per la squadra ${team.name}`);
  config.teamLogoPath = logoPath;
}

async function cleanupUpload(filePath) {
  if (!filePath) return;
  await fs.unlink(filePath).catch(() => {});
}

function requireAdmin(req, res, next) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return res.status(503).json({ error: "ADMIN_PASSWORD non configurata sul server" });
  }
  if (req.get("x-admin-password") !== password) {
    return res.status(401).json({ error: "Password backoffice non valida" });
  }
  next();
}
