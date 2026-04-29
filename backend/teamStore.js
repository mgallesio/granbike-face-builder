import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

const TEAM_SLUG_RE = /^[a-z0-9-]{2,40}$/;
const LOGO_ID_RE = /^[a-z0-9-]{2,40}$/;
const DEFAULT_CONFIG_KEYS = new Set([
  "device",
  "backgroundColor",
  "accentColor",
  "secondHandColor",
  "showHr",
  "showBattery",
  "showHands",
  "showDigitalTime",
  "showDate",
  "showAltitude",
  "showSteps",
  "showCalories",
  "showSeconds",
  "showTicks",
  "showNumbers",
  "numbersMode",
  "hrX",
  "hrY",
  "batteryX",
  "batteryY",
  "digitalTimeX",
  "digitalTimeY",
  "dateX",
  "dateY",
  "altitudeX",
  "altitudeY",
  "stepsX",
  "stepsY",
  "caloriesX",
  "caloriesY",
  "text1X",
  "text1Y",
  "text2X",
  "text2Y",
  "logoX",
  "logoY",
  "logoScale",
  "photoScale",
  "memorialLine1",
  "memorialLine2",
]);

export function createTeamStore(baseDir) {
  const dataDir = path.join(baseDir, "data");
  const logoDir = path.join(dataDir, "logos");
  const teamsPath = path.join(dataDir, "teams.json");
  const logosPath = path.join(dataDir, "logos.json");

  async function ensureReady() {
    await fs.mkdir(logoDir, { recursive: true });
    await ensureJsonFile(teamsPath);
    await ensureJsonFile(logosPath);
  }

  async function listTeams() {
    await ensureReady();
    return readTeams();
  }

  async function getTeam(slug) {
    const cleanSlug = safeSlug(slug);
    if (!cleanSlug) return null;
    const teams = await readTeams();
    return teams.find((team) => team.slug === cleanSlug) || null;
  }

  async function saveTeam(input, logoUploadPath = null) {
    await ensureReady();
    const slug = safeSlug(input.slug || slugify(input.name));
    if (!slug) throw new Error("Slug squadra non valido");

    const teams = await readTeams();
    const logos = await readLogos();
    const now = new Date().toISOString();
    const existing = teams.find((team) => team.slug === slug);
    const selectedLogoId = safeLogoId(input.logoId);
    const selectedLogo = selectedLogoId
      ? logos.find((logo) => logo.id === selectedLogoId)
      : null;
    const logoFileName = logoUploadPath
      ? `${slug}.png`
      : selectedLogo?.fileName
        ? null
        : existing?.logoFileName || null;

    if (logoUploadPath && logoFileName) {
      await saveTransparentLogo(logoUploadPath, path.join(logoDir, logoFileName));
    }

    const team = {
      slug,
      name: safeText(input.name, 60) || existing?.name || slug,
      prgFileName: safeFileName(input.prgFileName || existing?.prgFileName || slug),
      backgroundColor: safeText(input.backgroundColor, 20) || existing?.backgroundColor || "BLACK",
      accentColor: safeText(input.accentColor, 20) || existing?.accentColor || "YELLOW",
      logoId: selectedLogo?.id || null,
      logoFileName,
      defaultConfig: existing?.defaultConfig || {},
      updatedAt: now,
      createdAt: existing?.createdAt || now,
    };

    const next = existing
      ? teams.map((item) => (item.slug === slug ? team : item))
      : [...teams, team];
    await writeTeams(next);
    return team;
  }

  async function saveTeamDefaults(slug, config) {
    await ensureReady();
    const cleanSlug = safeSlug(slug);
    if (!cleanSlug) throw new Error("Slug squadra non valido");
    const teams = await readTeams();
    const existing = teams.find((team) => team.slug === cleanSlug);
    if (!existing) throw new Error("Squadra non trovata");
    const team = {
      ...existing,
      defaultConfig: sanitizeDefaultConfig(config),
      updatedAt: new Date().toISOString(),
    };
    await writeTeams(teams.map((item) => (item.slug === cleanSlug ? team : item)));
    return team;
  }

  async function listLogos() {
    await ensureReady();
    return readLogos();
  }

  async function getLogo(id) {
    const cleanId = safeLogoId(id);
    if (!cleanId) return null;
    const logos = await readLogos();
    return logos.find((logo) => logo.id === cleanId) || null;
  }

  async function saveLogo(input, logoUploadPath) {
    await ensureReady();
    if (!logoUploadPath) throw new Error("Logo non caricato");
    const id = safeLogoId(input.id || slugify(input.name));
    if (!id) throw new Error("Nome logo non valido");

    const logos = await readLogos();
    const now = new Date().toISOString();
    const existing = logos.find((logo) => logo.id === id);
    const fileName = `library-${id}.png`;
    await saveTransparentLogo(logoUploadPath, path.join(logoDir, fileName));

    const logo = {
      id,
      name: safeText(input.name, 60) || existing?.name || id,
      fileName,
      updatedAt: now,
      createdAt: existing?.createdAt || now,
    };

    const next = existing
      ? logos.map((item) => (item.id === id ? logo : item))
      : [...logos, logo];
    await writeLogos(next);
    return logo;
  }

  async function getNamedLogoPath(id) {
    const logo = await getLogo(id);
    if (!logo?.fileName) return null;
    return getLogoFilePath(logo.fileName);
  }

  async function getLogoPath(team) {
    if (team?.logoId) {
      const namedLogoPath = await getNamedLogoPath(team.logoId);
      if (namedLogoPath) return namedLogoPath;
    }
    if (!team?.logoFileName) return null;
    return getLogoFilePath(team.logoFileName);
  }

  async function getLogoFilePath(fileName) {
    const logoPath = path.join(logoDir, fileName);
    try {
      await fs.access(logoPath);
      return logoPath;
    } catch {
      return null;
    }
  }

  async function readTeams() {
    await ensureReady();
    return readJson(teamsPath);
  }

  async function readLogos() {
    await ensureReady();
    return readJson(logosPath);
  }

  async function readJson(filePath) {
    const raw = await fs.readFile(filePath, "utf8");
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  async function writeTeams(teams) {
    await fs.writeFile(teamsPath, `${JSON.stringify(teams, null, 2)}\n`, "utf8");
  }

  async function writeLogos(logos) {
    await fs.writeFile(logosPath, `${JSON.stringify(logos, null, 2)}\n`, "utf8");
  }

  async function ensureJsonFile(filePath) {
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, "[]\n", "utf8");
    }
  }

  return {
    listTeams,
    getTeam,
    saveTeam,
    saveTeamDefaults,
    listLogos,
    getLogo,
    saveLogo,
    getNamedLogoPath,
    getLogoPath,
  };
}

export function publicTeam(team) {
  if (!team) return null;
  return {
    slug: team.slug,
    name: team.name,
    prgFileName: team.prgFileName,
    backgroundColor: team.backgroundColor,
    accentColor: team.accentColor,
    logoId: team.logoId || "",
    hasLogo: Boolean(team.logoId || team.logoFileName),
    defaultConfig: team.defaultConfig || {},
    updatedAt: team.updatedAt,
    createdAt: team.createdAt,
  };
}

export function publicLogo(logo) {
  if (!logo) return null;
  return {
    id: logo.id,
    name: logo.name,
    updatedAt: logo.updatedAt,
    createdAt: logo.createdAt,
  };
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function safeSlug(value) {
  const slug = slugify(value);
  return TEAM_SLUG_RE.test(slug) ? slug : "";
}

function safeLogoId(value) {
  const id = slugify(value);
  return LOGO_ID_RE.test(id) ? id : "";
}

function safeText(value, max) {
  return String(value || "")
    .replace(/[\r\n<>]/g, "")
    .trim()
    .slice(0, max);
}

function safeFileName(value) {
  return String(value || "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .trim()
    .slice(0, 40) || "GranbikeFace";
}

function sanitizeDefaultConfig(config) {
  if (!config || typeof config !== "object") return {};
  const next = {};
  for (const [key, value] of Object.entries(config)) {
    if (!DEFAULT_CONFIG_KEYS.has(key)) continue;
    if (typeof value === "boolean") {
      next[key] = value;
    } else if (typeof value === "number") {
      next[key] = Math.max(0, Math.min(999, Math.round(value)));
    } else if (typeof value === "string") {
      next[key] = safeText(value, 80);
    }
  }
  return next;
}

async function saveTransparentLogo(src, dst) {
  const { data, info } = await sharp(src)
    .ensureAlpha()
    .trim({ background: await detectCornerBackground(src), threshold: 25 })
    .resize(640, 248, {
      fit: "inside",
      withoutEnlargement: true,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const bg = await detectCornerColorFromRaw(data, info);
  const tolerance = 42;
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const diff = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
    if (diff < tolerance) data[i + 3] = 0;
  }

  await sharp(data, { raw: info })
    .png({ palette: false, compressionLevel: 9 })
    .toFile(dst);
}

async function detectCornerBackground(src) {
  const { data, info } = await sharp(src)
    .ensureAlpha()
    .resize(80, 80, { fit: "inside", withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const color = await detectCornerColorFromRaw(data, info);
  return { r: color.r, g: color.g, b: color.b, alpha: 1 };
}

async function detectCornerColorFromRaw(data, info) {
  const points = [
    [0, 0],
    [info.width - 1, 0],
    [0, info.height - 1],
    [info.width - 1, info.height - 1],
  ];
  const colors = points.map(([x, y]) => {
    const idx = (y * info.width + x) * info.channels;
    return { r: data[idx], g: data[idx + 1], b: data[idx + 2] };
  });
  const total = colors.reduce((acc, color) => ({
    r: acc.r + color.r,
    g: acc.g + color.g,
    b: acc.b + color.b,
  }), { r: 0, g: 0, b: 0 });
  return {
    r: Math.round(total.r / colors.length),
    g: Math.round(total.g / colors.length),
    b: Math.round(total.b / colors.length),
  };
}
