import { execFile } from "child_process";
import { randomBytes } from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import Mustache from "mustache";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, "templates");
const LOGO_SQUADRA_SOURCE = path.join(__dirname, "..", "LogoSquadra.png");
const LOGO_SQUADRA_FALLBACK = path.join(
  TEMPLATES_DIR,
  "resources",
  "drawables",
  "logosquadra.png"
);

// Colori Monkey C accettati (validati per evitare injection)
const VALID_COLORS = new Set([
  "WHITE", "BLACK", "RED", "DARK_RED", "ORANGE",
  "YELLOW", "GREEN", "DARK_GREEN", "BLUE", "DARK_BLUE",
  "PURPLE", "PINK", "LT_GRAY", "DK_GRAY",
]);

const VALID_DEVICES = new Set([
  "fenix6", "fenix6pro", "fenix6s", "fenix6spro", "fenix6xpro",
  "fenix7", "fenix7pro", "fenix7s", "fenix7spro", "fenix7x", "fenix7xpro",
  "fenix7pronowifi", "fenix7xpronowifi",
]);

const VALID_NUMBER_MODES = new Set(["none", "cardinal", "all"]);

function safeColor(c, fallback = "YELLOW") {
  return VALID_COLORS.has(c) ? c : fallback;
}

function safeDevice(d, fallback = "fenix7pro") {
  return VALID_DEVICES.has(d) ? d : fallback;
}

function safeNumberMode(mode, showNumbers) {
  if (VALID_NUMBER_MODES.has(mode)) return mode;
  return showNumbers === false ? "none" : "cardinal";
}

function safeText(s, max = 40) {
  if (!s) return "";
  // rimuovi virgolette/newline che romperebbero il Monkey C
  return String(s).replace(/["\r\n\\]/g, "").slice(0, max);
}

function safeNumber(n, fallback, min = 0, max = 260) {
  const value = Number.parseInt(n, 10);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/**
 * Copia ricorsiva di una cartella
 */
async function copyRecursive(src, dst) {
  await fs.mkdir(dst, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) await copyRecursive(s, d);
    else await fs.copyFile(s, d);
  }
}

export async function createLogoSquadraAsset(dst = null, options = {}) {
  const width = options.width || 160;
  const height = options.height || 62;
  const source = await fileExists(LOGO_SQUADRA_SOURCE)
    ? LOGO_SQUADRA_SOURCE
    : LOGO_SQUADRA_FALLBACK;

  const { data, info } = await sharp(source)
    .trim({ background: "#ffffff", threshold: 25 })
    .resize(width, height, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r > 238 && g > 238 && b > 238) {
      data[i + 3] = 0;
    } else if (r > 225 && g > 225 && b > 225) {
      data[i + 3] = Math.min(data[i + 3], 70);
    } else if (r < 135 && g < 135 && b < 135) {
      data[i] = 245;
      data[i + 1] = 245;
      data[i + 2] = 245;
    }
  }

  const png = await sharp(data, { raw: info })
    .png({ palette: true, colors: 64, compressionLevel: 9 })
    .toBuffer();

  if (dst) await fs.writeFile(dst, png);
  return png;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function safeScale(n, fallback = 100) {
  return safeNumber(n, fallback, 25, 180);
}

/**
 * Costruisce una watch face .prg a partire da una configurazione utente.
 * @param {object} config { name, accentColor, secondHandColor, showHr, showBattery, showSeconds, showTicks, memorialLine1, memorialLine2, device }
 * @param {string|null} photoPath path al file foto caricato (o null)
 * @param {string} tmpBase cartella base per build temporanee
 */
export async function buildFace(config, photoPath, tmpBase) {
  const numbersMode = safeNumberMode(config.numbersMode, config.showNumbers);
  // Validazione / sanificazione
  const vars = {
    BACKGROUND_COLOR: safeColor(config.backgroundColor, "BLACK"),
    ACCENT_COLOR: safeColor(config.accentColor, "YELLOW"),
    SECOND_HAND_COLOR: safeColor(config.secondHandColor, "WHITE"),
    SHOW_HR: !!config.showHr,
    SHOW_BATTERY: !!config.showBattery,
    SHOW_SECONDS: !!config.showSeconds,
    SHOW_TICKS: config.showTicks !== false, // default true
    SHOW_NUMBERS: numbersMode !== "none",
    SHOW_CARDINAL_NUMBERS: numbersMode === "cardinal",
    SHOW_ALL_NUMBERS: numbersMode === "all",
    HR_X: safeNumber(config.hrX, 130),
    HR_Y: safeNumber(config.hrY, 50),
    BATTERY_X: safeNumber(config.batteryX, 130),
    BATTERY_Y: safeNumber(config.batteryY, 165),
    TEXT1_X: safeNumber(config.text1X, 130),
    TEXT1_Y: safeNumber(config.text1Y, 130),
    TEXT2_X: safeNumber(config.text2X, 130),
    TEXT2_Y: safeNumber(config.text2Y, 152),
    LOGO_X: safeNumber(config.logoX, 130),
    LOGO_Y: safeNumber(config.logoY, 192),
    PHOTO_SCALE: safeScale(config.photoScale, 100),
    HAS_PHOTO: !!photoPath,
    MEMORIAL_LINE1: safeText(config.memorialLine1),
    MEMORIAL_LINE2: safeText(config.memorialLine2),
    HAS_MEMORIAL:
      !!safeText(config.memorialLine1) || !!safeText(config.memorialLine2),
  };
  const device = safeDevice(config.device, "fenix7pro");
  const appName = safeText(config.name, 30) || "Custom Face";
  const appId = randomBytes(16).toString("hex");

  // Crea build dir temporanea
  const buildId = randomBytes(8).toString("hex");
  const buildDir = path.join(tmpBase, `build-${buildId}`);
  await copyRecursive(TEMPLATES_DIR, buildDir);

  // Render main.mc
  const mainTplPath = path.join(buildDir, "source", "main.mc.tpl");
  const mainTpl = await fs.readFile(mainTplPath, "utf8");
  const mainCode = Mustache.render(mainTpl, vars);
  await fs.writeFile(path.join(buildDir, "source", "main.mc"), mainCode);
  await fs.unlink(mainTplPath);

  // Render manifest.xml
  const manTplPath = path.join(buildDir, "manifest.xml.tpl");
  const manTpl = await fs.readFile(manTplPath, "utf8");
  const manXml = Mustache.render(manTpl, { APP_ID: appId, DEVICE: device });
  await fs.writeFile(path.join(buildDir, "manifest.xml"), manXml);
  await fs.unlink(manTplPath);

  // Render strings.xml
  const strTplPath = path.join(buildDir, "resources", "strings", "strings.xml.tpl");
  const strTpl = await fs.readFile(strTplPath, "utf8");
  const strXml = Mustache.render(strTpl, { APP_NAME: appName });
  await fs.writeFile(
    path.join(buildDir, "resources", "strings", "strings.xml"),
    strXml
  );
  await fs.unlink(strTplPath);

  // Render drawables.xml
  const drwTplPath = path.join(
    buildDir,
    "resources",
    "drawables",
    "drawables.xml.tpl"
  );
  const drwTpl = await fs.readFile(drwTplPath, "utf8");
  const drwXml = Mustache.render(drwTpl, { HAS_PHOTO: vars.HAS_PHOTO });
  await fs.writeFile(
    path.join(buildDir, "resources", "drawables", "drawables.xml"),
    drwXml
  );
  await fs.unlink(drwTplPath);

  await createLogoSquadraAsset(
    path.join(buildDir, "resources", "drawables", "logosquadra.png")
  );

  // Processa foto (se presente)
  if (photoPath) {
    const dst = path.join(buildDir, "resources", "drawables", "photo.png");
    const photoScale = safeScale(config.photoScale, 100) / 100;
    const photoSize = Math.round(260 * photoScale);
    await sharp(photoPath)
      .resize(photoSize, photoSize, { fit: "cover", position: "centre" })
      .extend({
        top: Math.floor((260 - photoSize) / 2),
        bottom: Math.ceil((260 - photoSize) / 2),
        left: Math.floor((260 - photoSize) / 2),
        right: Math.ceil((260 - photoSize) / 2),
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ palette: true, colors: 64, compressionLevel: 9 })
      .toFile(dst);
  }

  // Compila con monkeyc
  const SDK = process.env.SDK_PATH;
  const JAVA = process.env.JAVA_PATH || "java";
  const KEY = process.env.DEVELOPER_KEY_PATH;
  if (!SDK) throw new Error("SDK_PATH non configurato in .env");
  if (!KEY) throw new Error("DEVELOPER_KEY_PATH non configurato in .env");

  const JAR = process.env.MONKEYBRAINS_JAR || path.join(SDK, "bin", "monkeybrains.jar");
  const prgPath = path.join(buildDir, "out.prg");

  await new Promise((resolve, reject) => {
    execFile(
      JAVA,
      [
        "-jar", JAR,
        "-o", prgPath,
        "-f", path.join(buildDir, "monkey.jungle"),
        "-y", KEY,
        "-d", device,
        "-w",
      ],
      { timeout: 60000 },
      (err, stdout, stderr) => {
        if (err) {
          console.error("monkeyc stdout:", stdout);
          console.error("monkeyc stderr:", stderr);
          return reject(new Error("Compilazione fallita: " + (stderr || err.message)));
        }
        console.log("monkeyc:", stdout);
        resolve();
      }
    );
  });

  return { prgPath, buildDir };
}
