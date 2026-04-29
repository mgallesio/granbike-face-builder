import { execFile } from "child_process";
import { randomBytes } from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import Mustache from "mustache";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, "templates");
const LOGO_SQUADRA_SOURCES = {
  logosquadra: path.join(__dirname, "..", "LogoSquadra.png"),
  logosquadra2: path.join(__dirname, "..", "LogoSquadra2.png"),
};
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
const VALID_LOGOS = new Set(["logosquadra", "logosquadra2"]);

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

function safeLogoName(name) {
  return VALID_LOGOS.has(name) ? name : "logosquadra";
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
  const logoName = safeLogoName(options.logoName);
  const sourcePath = LOGO_SQUADRA_SOURCES[logoName];
  const source = await fileExists(sourcePath)
    ? sourcePath
    : LOGO_SQUADRA_FALLBACK;
  const trimBackground = logoName === "logosquadra2" ? "#000000" : "#ffffff";

  const { data, info } = await sharp(source)
    .trim({ background: trimBackground, threshold: 25 })
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
    if (logoName === "logosquadra2") {
      if (r < 48 && g < 48 && b < 48) {
        data[i + 3] = 0;
      } else if (r < 75 && g < 75 && b < 75) {
        data[i + 3] = Math.min(data[i + 3], 35);
      }
    } else {
      if (r > 232 && g > 232 && b > 232) {
        data[i + 3] = 0;
      } else if (r > 205 && g > 205 && b > 205) {
        data[i + 3] = Math.min(data[i + 3], 35);
      }
    }
  }

  const png = await sharp(data, { raw: info })
    .png({ palette: false, compressionLevel: 9 })
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

function safeLogoScale(n, fallback = 100) {
  return safeNumber(n, fallback, 40, 180);
}

/**
 * Costruisce una watch face .prg a partire da una configurazione utente.
 * @param {object} config { name, accentColor, secondHandColor, showHr, showBattery, showSeconds, showTicks, memorialLine1, memorialLine2, device }
 * @param {string|null} photoPath path al file foto caricato (o null)
 * @param {string} tmpBase cartella base per build temporanee
 */
export async function buildFace(config, photoPath, tmpBase) {
  const numbersMode = safeNumberMode(config.numbersMode, config.showNumbers);
  const logoName = safeLogoName(config.logoName);
  // Validazione / sanificazione
  const vars = {
    BACKGROUND_COLOR: safeColor(config.backgroundColor, "BLACK"),
    ACCENT_COLOR: safeColor(config.accentColor, "YELLOW"),
    SECOND_HAND_COLOR: safeColor(config.secondHandColor, "WHITE"),
    SHOW_HR: !!config.showHr,
    SHOW_BATTERY: !!config.showBattery,
    SHOW_SECONDS: !!config.showSeconds,
    SHOW_HANDS: config.showHands !== false,
    SHOW_DIGITAL_TIME: !!config.showDigitalTime,
    SHOW_DATE: !!config.showDate,
    SHOW_ALTITUDE: !!config.showAltitude,
    SHOW_STEPS: !!config.showSteps,
    SHOW_CALORIES: !!config.showCalories,
    SHOW_TICKS: config.showTicks !== false, // default true
    SHOW_NUMBERS: numbersMode !== "none",
    SHOW_CARDINAL_NUMBERS: numbersMode === "cardinal",
    SHOW_ALL_NUMBERS: numbersMode === "all",
    HR_X: safeNumber(config.hrX, 130),
    HR_Y: safeNumber(config.hrY, 50),
    BATTERY_X: safeNumber(config.batteryX, 130),
    BATTERY_Y: safeNumber(config.batteryY, 165),
    DIGITAL_TIME_X: safeNumber(config.digitalTimeX, 130),
    DIGITAL_TIME_Y: safeNumber(config.digitalTimeY, 96),
    DATE_X: safeNumber(config.dateX, 130),
    DATE_Y: safeNumber(config.dateY, 120),
    ALTITUDE_X: safeNumber(config.altitudeX, 210),
    ALTITUDE_Y: safeNumber(config.altitudeY, 184),
    STEPS_X: safeNumber(config.stepsX, 130),
    STEPS_Y: safeNumber(config.stepsY, 218),
    CALORIES_X: safeNumber(config.caloriesX, 210),
    CALORIES_Y: safeNumber(config.caloriesY, 74),
    TEXT1_X: safeNumber(config.text1X, 130),
    TEXT1_Y: safeNumber(config.text1Y, 130),
    TEXT2_X: safeNumber(config.text2X, 130),
    TEXT2_Y: safeNumber(config.text2Y, 152),
    LOGO_X: safeNumber(config.logoX, 130),
    LOGO_Y: safeNumber(config.logoY, 192),
    LOGO_SCALE: safeLogoScale(config.logoScale, 100),
    LOGO_WIDTH: Math.round(160 * safeLogoScale(config.logoScale, 100) / 100),
    LOGO_HEIGHT: Math.round(62 * safeLogoScale(config.logoScale, 100) / 100),
    LOGO_HALF_WIDTH: Math.round(80 * safeLogoScale(config.logoScale, 100) / 100),
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
  const manXml = Mustache.render(manTpl, {
    APP_ID: appId,
    DEVICE: device,
    SHOW_ALTITUDE: vars.SHOW_ALTITUDE,
  });
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
    path.join(buildDir, "resources", "drawables", "logosquadra.png"),
    {
      logoName,
      width: Math.round(160 * safeLogoScale(config.logoScale, 100) / 100),
      height: Math.round(62 * safeLogoScale(config.logoScale, 100) / 100),
    }
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
