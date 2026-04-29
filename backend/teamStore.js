import fs from "fs/promises";
import path from "path";

const TEAM_SLUG_RE = /^[a-z0-9-]{2,40}$/;

export function createTeamStore(baseDir) {
  const dataDir = path.join(baseDir, "data");
  const logoDir = path.join(dataDir, "logos");
  const teamsPath = path.join(dataDir, "teams.json");

  async function ensureReady() {
    await fs.mkdir(logoDir, { recursive: true });
    try {
      await fs.access(teamsPath);
    } catch {
      await fs.writeFile(teamsPath, "[]\n", "utf8");
    }
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
    const now = new Date().toISOString();
    const existing = teams.find((team) => team.slug === slug);
    const logoFileName = logoUploadPath
      ? `${slug}${path.extname(input.logoOriginalName || ".png").toLowerCase() || ".png"}`
      : existing?.logoFileName || null;

    if (logoUploadPath && logoFileName) {
      await fs.copyFile(logoUploadPath, path.join(logoDir, logoFileName));
    }

    const team = {
      slug,
      name: safeText(input.name, 60) || existing?.name || slug,
      prgFileName: safeFileName(input.prgFileName || existing?.prgFileName || slug),
      backgroundColor: safeText(input.backgroundColor, 20) || existing?.backgroundColor || "BLACK",
      accentColor: safeText(input.accentColor, 20) || existing?.accentColor || "YELLOW",
      logoFileName,
      updatedAt: now,
      createdAt: existing?.createdAt || now,
    };

    const next = existing
      ? teams.map((item) => (item.slug === slug ? team : item))
      : [...teams, team];
    await writeTeams(next);
    return team;
  }

  async function getLogoPath(team) {
    if (!team?.logoFileName) return null;
    const logoPath = path.join(logoDir, team.logoFileName);
    try {
      await fs.access(logoPath);
      return logoPath;
    } catch {
      return null;
    }
  }

  async function readTeams() {
    await ensureReady();
    const raw = await fs.readFile(teamsPath, "utf8");
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  async function writeTeams(teams) {
    await fs.writeFile(teamsPath, `${JSON.stringify(teams, null, 2)}\n`, "utf8");
  }

  return {
    listTeams,
    getTeam,
    saveTeam,
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
    hasLogo: Boolean(team.logoFileName),
    updatedAt: team.updatedAt,
    createdAt: team.createdAt,
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
