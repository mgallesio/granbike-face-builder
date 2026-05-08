import { useEffect, useMemo, useState } from "react";
import WatchPreview from "./components/WatchPreview.jsx";

const COLORS = [
  { name: "BLACK", label: "Nero", css: "#000000" },
  { name: "YELLOW", label: "Giallo", css: "#ffd700" },
  { name: "WHITE", label: "Bianco", css: "#ffffff" },
  { name: "RED", label: "Rosso", css: "#ff2020" },
  { name: "ORANGE", label: "Arancio", css: "#ff8c00" },
  { name: "GREEN", label: "Verde", css: "#32cd32" },
  { name: "BLUE", label: "Blu", css: "#3a7bd5" },
  { name: "PURPLE", label: "Viola", css: "#a020f0" },
  { name: "PINK", label: "Rosa", css: "#ff69b4" },
  { name: "LT_GRAY", label: "Grigio", css: "#aaaaaa" },
];
const COLOR_NAMES = new Set(COLORS.map((color) => color.name));
const DEFAULT_TEAM_FEATURES = {
  allowBackgroundColor: true,
  allowHandColors: true,
  allowLogo: true,
  allowNumbers: true,
  allowAthleteName: true,
  allowAthleteNumber: true,
};

const FALLBACK_DEVICES = [
  { id: "fenix7pro", label: "Garmin fenix 7 Pro / Pro Solar" },
  { id: "fenix7spro", label: "Garmin fenix 7S Pro" },
  { id: "fenix7xpro", label: "Garmin fenix 7X Pro" },
  { id: "fenix7", label: "Garmin fenix 7" },
  { id: "fenix7s", label: "Garmin fenix 7S" },
  { id: "fenix7x", label: "Garmin fenix 7X" },
  { id: "fenix6pro", label: "Garmin fenix 6 Pro" },
  { id: "fenix6spro", label: "Garmin fenix 6S Pro" },
  { id: "fenix6xpro", label: "Garmin fenix 6X Pro" },
  { id: "fenix6", label: "Garmin fenix 6" },
  { id: "fenix6s", label: "Garmin fenix 6S" },
];

const WATCH_EXPORT_PRESETS = [
  { id: "apple-ultra-49", label: "Apple Watch Ultra 49mm", platform: "apple-watch", width: 410, height: 502, shape: "rounded" },
  { id: "apple-series10-46", label: "Apple Watch Series 10 46mm", platform: "apple-watch", width: 416, height: 496, shape: "rounded" },
  { id: "apple-series10-42", label: "Apple Watch Series 10 42mm", platform: "apple-watch", width: 374, height: 446, shape: "rounded" },
  { id: "apple-series7-9-45", label: "Apple Watch Series 7/8/9 45mm", platform: "apple-watch", width: 396, height: 484, shape: "rounded" },
  { id: "apple-series7-9-41", label: "Apple Watch Series 7/8/9 41mm", platform: "apple-watch", width: 352, height: 430, shape: "rounded" },
  { id: "apple-se-44", label: "Apple Watch SE 44mm", platform: "apple-watch", width: 368, height: 448, shape: "rounded" },
  { id: "apple-se-40", label: "Apple Watch SE 40mm", platform: "apple-watch", width: 324, height: 394, shape: "rounded" },
  { id: "wearos-round-454", label: "Wear OS rotondo 454x454", platform: "wear-os", width: 454, height: 454, shape: "round" },
  { id: "wearos-round-450", label: "Wear OS rotondo 450x450", platform: "wear-os", width: 450, height: 450, shape: "round" },
  { id: "wearos-round-384", label: "Wear OS rotondo 384x384", platform: "wear-os", width: 384, height: 384, shape: "round" },
  { id: "amazfit-round-480", label: "Amazfit/Zepp rotondo 480x480", platform: "amazfit", width: 480, height: 480, shape: "round" },
  { id: "amazfit-square-390", label: "Amazfit/Zepp rettangolare 390x450", platform: "amazfit", width: 390, height: 450, shape: "rounded" },
];

const DEFAULT_CONFIG = {
  name: "Team Face",
  prgFileName: "TeamFace",
  teamSlug: "",
  device: "fenix7pro",
  backgroundColor: "BLACK",
  accentColor: "YELLOW",
  secondHandColor: "WHITE",
  logoName: "",
  showHr: true,
  showBattery: true,
  showHands: true,
  showDigitalTime: false,
  showDate: false,
  showAltitude: false,
  showSteps: false,
  showCalories: false,
  showSeconds: true,
  showTicks: true,
  showNumbers: true,
  numbersMode: "cardinal",
  hrX: 130,
  hrY: 50,
  batteryX: 130,
  batteryY: 165,
  digitalTimeX: 130,
  digitalTimeY: 96,
  dateX: 130,
  dateY: 120,
  altitudeX: 210,
  altitudeY: 184,
  stepsX: 130,
  stepsY: 218,
  caloriesX: 210,
  caloriesY: 74,
  athleteNameX: 130,
  athleteNameY: 130,
  athleteNumberX: 130,
  athleteNumberY: 160,
  text1X: 130,
  text1Y: 130,
  text2X: 130,
  text2Y: 152,
  logoX: 130,
  logoY: 192,
  logoScale: 100,
  photoScale: 100,
  athleteName: "",
  athleteNumber: "",
  memorialLine1: "",
  memorialLine2: "",
  hasPhoto: false,
  logoHidden: false,
};

export default function App() {
  const route = getRoute();
  if (route.mode === "admin") {
    return <AdminApp />;
  }
  return <BuilderApp route={route} />;
}

function BuilderApp({ route }) {
  const isTeamRoute = route.mode === "team" || route.mode === "admin-team-settings";
  const isAdminSettings = route.mode === "admin-team-settings";
  const canEditDesign = !isTeamRoute || isAdminSettings;
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [team, setTeam] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [status, setStatus] = useState({
    msg: "Configura la watch face e premi Genera PRG.",
    kind: "",
  });
  const [apiReady, setApiReady] = useState(false);
  const [buildReady, setBuildReady] = useState(false);
  const [devices, setDevices] = useState(FALLBACK_DEVICES);
  const [busy, setBusy] = useState(false);
  const [adminPassword, setAdminPassword] = useState(() => sessionStorage.getItem("adminPassword") || "");
  const [availableLogos, setAvailableLogos] = useState([]);
  const [teamLogoId, setTeamLogoId] = useState("");
  const [allowedBackgroundColors, setAllowedBackgroundColors] = useState(COLORS.map((color) => color.name));
  const [allowedHandColors, setAllowedHandColors] = useState(COLORS.map((color) => color.name));
  const [teamFeatures, setTeamFeatures] = useState(DEFAULT_TEAM_FEATURES);
  const [watchExportPreset, setWatchExportPreset] = useState(WATCH_EXPORT_PRESETS[0].id);

  const photoUrl = useMemo(
    () => (photoFile ? URL.createObjectURL(photoFile) : null),
    [photoFile]
  );

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  useEffect(() => {
    let active = true;
    fetch("/api/health")
      .then((res) => {
        if (!res.ok) throw new Error("offline");
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        setApiReady(true);
        setBuildReady(Boolean(data.buildReady));
      })
      .catch(() => {
        if (!active) return;
        setApiReady(false);
        setBuildReady(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/devices")
      .then((res) => {
        if (!res.ok) throw new Error("devices");
        return res.json();
      })
      .then((data) => {
        if (!active || !Array.isArray(data) || data.length === 0) return;
        setDevices(data);
        setConfig((current) => (
          data.some((device) => device.id === current.device)
            ? current
            : { ...current, device: data[0].id }
        ));
      })
      .catch(() => {
        if (active) setDevices(FALLBACK_DEVICES);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isTeamRoute) return;
    let active = true;
    fetch(`/api/teams/${encodeURIComponent(route.slug)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Squadra non trovata");
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        const allowedColors = normalizeAllowedColors(data.allowedBackgroundColors);
        const handColors = normalizeAllowedColors(data.allowedHandColors);
        const features = normalizeTeamFeatures(data.teamFeatures);
        const defaultBackground = data.defaultConfig?.backgroundColor || data.backgroundColor || DEFAULT_CONFIG.backgroundColor;
        const backgroundColor = allowedColors.includes(defaultBackground)
          ? defaultBackground
          : allowedColors[0];
        setTeam(data);
        setTeamLogoId(data.logoId || "");
        setAllowedBackgroundColors(allowedColors);
        setAllowedHandColors(handColors);
        setTeamFeatures(features);
        setConfig((current) => ({
          ...current,
          ...(data.defaultConfig || {}),
          name: data.name,
          prgFileName: data.prgFileName,
          teamSlug: data.slug,
          logoHidden: features.allowLogo === false,
          backgroundColor,
          accentColor: handColors.includes(data.defaultConfig?.accentColor || data.accentColor)
            ? data.defaultConfig?.accentColor || data.accentColor
            : handColors[0],
          secondHandColor: handColors.includes(data.defaultConfig?.secondHandColor || current.secondHandColor)
            ? data.defaultConfig?.secondHandColor || current.secondHandColor
            : handColors[0],
          showNumbers: features.allowNumbers === false ? false : data.defaultConfig?.showNumbers ?? current.showNumbers,
          numbersMode: features.allowNumbers === false ? "none" : data.defaultConfig?.numbersMode ?? current.numbersMode,
          athleteName: features.allowAthleteName === false ? "" : data.defaultConfig?.athleteName ?? current.athleteName,
          athleteNumber: features.allowAthleteNumber === false ? "" : data.defaultConfig?.athleteNumber ?? current.athleteNumber,
        }));
      })
      .catch((e) => {
        if (!active) return;
        setStatus({ msg: `Errore: ${e.message}`, kind: "error" });
      });
    return () => {
      active = false;
    };
  }, [isTeamRoute, route.slug]);

  useEffect(() => {
    if (!isAdminSettings) return;
    let active = true;
    fetch("/api/logos")
      .then((res) => res.json())
      .then((data) => {
        if (active) setAvailableLogos(data);
      })
      .catch(() => {
        if (active) setAvailableLogos([]);
      });
    return () => {
      active = false;
    };
  }, [isAdminSettings]);

  function update(key, value) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  function updateTeamFeature(key, value) {
    setTeamFeatures((current) => ({ ...current, [key]: value }));
    if (key === "allowLogo") update("logoHidden", !value);
    if (key === "allowHandColors" && !value) {
      update("accentColor", team?.defaultConfig?.accentColor || team?.accentColor || config.accentColor);
      update("secondHandColor", team?.defaultConfig?.secondHandColor || config.secondHandColor);
    }
    if (key === "allowNumbers" && !value) {
      update("numbersMode", "none");
      update("showNumbers", false);
    }
    if (key === "allowAthleteName" && !value) update("athleteName", "");
    if (key === "allowAthleteNumber" && !value) update("athleteNumber", "");
  }

  function movePreviewItem(xKey, yKey, x, y) {
    setConfig((current) => ({ ...current, [xKey]: x, [yKey]: y }));
  }

  function onPhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    update("hasPhoto", true);
  }

  function clearPhoto() {
    setPhotoFile(null);
    update("hasPhoto", false);
  }

  async function handleBuild() {
    setBusy(true);
    setStatus({ msg: "Compilazione PRG in corso...", kind: "" });
    try {
      const fd = new FormData();
      fd.append("config", JSON.stringify(config));
      if (photoFile) fd.append("photo", photoFile);

      const res = await fetch("/api/build", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Errore sconosciuto" }));
        throw new Error(err.error || res.statusText);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeFileName(config.prgFileName || config.name || "TeamFace")}.prg`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus({
        msg: "PRG generato e scaricato. Copialo nella cartella GARMIN/APPS dell'orologio.",
        kind: "ok",
      });
    } catch (e) {
      setStatus({ msg: `Errore: ${e.message}`, kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function handlePackageBuild() {
    setBusy(true);
    setStatus({ msg: "Creazione pacchetto beta Garmin in corso...", kind: "" });
    try {
      const fd = new FormData();
      fd.append("config", JSON.stringify(config));
      if (photoFile) fd.append("photo", photoFile);

      const res = await fetch("/api/package", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Errore sconosciuto" }));
        throw new Error(err.error || res.statusText);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeFileName(config.prgFileName || config.name || "TeamFace")}-beta.iq`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus({
        msg: "Pacchetto .iq generato. Caricalo nella dashboard Garmin Connect IQ come beta.",
        kind: "ok",
      });
    } catch (e) {
      setStatus({ msg: `Errore: ${e.message}`, kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  function handlePreviewDownload() {
    const canvas = document.querySelector(".watch-canvas");
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeFileName(config.prgFileName || config.name || "TeamFace")}-preview.png`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus({ msg: "Anteprima face scaricata in PNG.", kind: "ok" });
    }, "image/png");
  }

  function handleWatchImageDownload() {
    const source = document.querySelector(".watch-canvas");
    if (!source) return;
    const preset = WATCH_EXPORT_PRESETS.find((item) => item.id === watchExportPreset) || WATCH_EXPORT_PRESETS[0];
    const canvas = document.createElement("canvas");
    canvas.width = preset.width;
    canvas.height = preset.height;
    const ctx = canvas.getContext("2d");
    ctx.save();
    if (preset.shape === "round") {
      drawCircleClip(ctx, preset.width / 2, preset.height / 2, Math.min(preset.width, preset.height) / 2);
    } else {
      drawRoundedRect(ctx, 0, 0, preset.width, preset.height, Math.round(Math.min(preset.width, preset.height) * 0.16));
    }
    ctx.clip();
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, preset.width, preset.height);
    const size = Math.min(preset.width, preset.height);
    ctx.drawImage(source, (preset.width - size) / 2, (preset.height - size) / 2, size, size);
    ctx.restore();
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeFileName(config.prgFileName || config.name || "TeamFace")}-${preset.platform}-${preset.width}x${preset.height}.png`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus({ msg: `${preset.label} scaricato in PNG.`, kind: "ok" });
    }, "image/png");
  }

  async function handleSaveTeamDefaults() {
    if (!team) return;
    setBusy(true);
    setStatus({ msg: "Salvataggio impostazioni default squadra...", kind: "" });
    try {
      if (!adminPassword) throw new Error("Inserisci la password squadra o backoffice");
      sessionStorage.setItem("adminPassword", adminPassword);
      const res = await fetch(`/api/admin/teams/${encodeURIComponent(team.slug)}/defaults`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
          "x-team-password": adminPassword,
        },
        body: JSON.stringify({ config, allowedBackgroundColors, allowedHandColors, teamFeatures }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Errore sconosciuto" }));
        throw new Error(err.error || res.statusText);
      }
      setStatus({
        msg: "Impostazioni default salvate. Chi apre questo link partirà da questa configurazione.",
        kind: "ok",
      });
    } catch (e) {
      setStatus({ msg: `Errore: ${e.message}`, kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveTeamLogo() {
    if (!team) return;
    setBusy(true);
    setStatus({ msg: "Salvataggio logo squadra...", kind: "" });
    try {
      if (!adminPassword) throw new Error("Inserisci la password backoffice");
      sessionStorage.setItem("adminPassword", adminPassword);
      const savedTeam = await saveTeamLogoSelection();
      setTeam(savedTeam);
      setConfig((current) => ({ ...current, logoCacheKey: Date.now() }));
      setStatus({ msg: "Logo squadra salvato e anteprima aggiornata.", kind: "ok" });
    } catch (e) {
      setStatus({ msg: `Errore: ${e.message}`, kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function saveTeamLogoSelection() {
    if (!teamLogoId) throw new Error("Seleziona un logo dalla lista");
    const fd = new FormData();
    fd.append("name", team.name);
    fd.append("slug", team.slug);
    fd.append("prgFileName", team.prgFileName);
    fd.append("logoId", teamLogoId);
    fd.append("backgroundColor", config.backgroundColor || team.backgroundColor || "BLACK");
    fd.append("accentColor", config.accentColor || team.accentColor || "YELLOW");
    const res = await fetch("/api/admin/teams", {
      method: "POST",
      body: fd,
      headers: { "x-admin-password": adminPassword },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Errore sconosciuto" }));
      throw new Error(err.error || res.statusText);
    }
    return res.json();
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <header className="topbar">
          <BrandTitle
            title="FaceBuilder"
            subtitle={
              team
                ? isAdminSettings
                  ? `${team.name} - impostazioni default`
                  : `${team.name} - link squadra`
                : "Generatore web per watch face Garmin Connect IQ."
            }
          />
          <span className={`api-dot ${apiReady ? "ok" : "error"}`} title={apiReady ? "API online" : "API offline"} />
        </header>

        <section className="panel">
          <h2>Generale</h2>
          {team && (
            <div className="team-banner">
              <strong>{team.name}</strong>
              <span>File: {team.prgFileName}.prg</span>
              {isAdminSettings && <a href="/admin">Torna al backoffice</a>}
            </div>
          )}
          {isAdminSettings && (
            <div className="admin-default-box admin-default-top">
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Password squadra o backoffice"
              />
              <button
                className="btn"
                onClick={handleSaveTeamDefaults}
                type="button"
                disabled={busy}
              >
                Salva impostazioni default
              </button>
            </div>
          )}
          {isAdminSettings && (
            <div className="team-logo-admin">
              <div className="field">
                <label>Logo squadra dalla lista</label>
                <select value={teamLogoId} onChange={(e) => setTeamLogoId(e.target.value)}>
                  <option value="">Seleziona logo</option>
                  {availableLogos.map((logo) => (
                    <option key={logo.id} value={logo.id}>{logo.name}</option>
                  ))}
                </select>
              </div>
              {teamLogoId && (
                <img src={`/api/logos/${encodeURIComponent(teamLogoId)}/image`} alt="" />
              )}
              <button
                className="secondary-btn"
                onClick={handleSaveTeamLogo}
                type="button"
                disabled={busy || !teamLogoId}
              >
                Salva logo squadra (backoffice)
              </button>
            </div>
          )}
          <div className="field">
            <label>Nome app</label>
            <input
              type="text"
              value={config.name}
              onChange={(e) => update("name", e.target.value)}
              maxLength={30}
              disabled={Boolean(team)}
            />
          </div>
          <div className="field">
            <label>Modello Garmin</label>
            <select
              value={config.device}
              onChange={(e) => update("device", e.target.value)}
            >
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.label}
                </option>
              ))}
            </select>
          </div>
          {!team && (
          <div className="field">
            <label>Logo squadra</label>
            <select
              value={config.logoName}
              onChange={(e) => update("logoName", e.target.value)}
            >
              <option value="">Nessun logo</option>
              <option value="logosquadra">Logo squadra</option>
              <option value="logosquadra2">Logo squadra 2</option>
            </select>
          </div>
          )}
        </section>

        <section className="panel">
          <h2>Colori</h2>
          {(!isTeamRoute || isAdminSettings || teamFeatures.allowBackgroundColor) && (
            <ColorPicker
              label="Sfondo"
              value={config.backgroundColor}
              onChange={(value) => update("backgroundColor", value)}
              colors={isTeamRoute ? colorOptions(allowedBackgroundColors) : COLORS}
            />
          )}
          {isAdminSettings && (
            <>
              <div className="feature-locks">
                <Toggle checked={teamFeatures.allowBackgroundColor} onChange={(value) => updateTeamFeature("allowBackgroundColor", value)}>
                  Utenti possono cambiare sfondo
                </Toggle>
                <Toggle checked={teamFeatures.allowHandColors} onChange={(value) => updateTeamFeature("allowHandColors", value)}>
                  Utenti possono cambiare colori lancette
                </Toggle>
                <Toggle checked={teamFeatures.allowLogo} onChange={(value) => updateTeamFeature("allowLogo", value)}>
                  Logo squadra visibile nella face
                </Toggle>
                <Toggle checked={teamFeatures.allowNumbers} onChange={(value) => updateTeamFeature("allowNumbers", value)}>
                  Numeri orologio abilitati
                </Toggle>
                <Toggle checked={teamFeatures.allowAthleteName} onChange={(value) => updateTeamFeature("allowAthleteName", value)}>
                  Nome / nickname atleta abilitato
                </Toggle>
                <Toggle checked={teamFeatures.allowAthleteNumber} onChange={(value) => updateTeamFeature("allowAthleteNumber", value)}>
                  Numero maglia abilitato
                </Toggle>
              </div>
              <ColorPermissionPicker
                label="Colori sfondo utilizzabili dalla squadra"
                value={allowedBackgroundColors}
                onChange={(colors) => {
                  setAllowedBackgroundColors(colors);
                  if (!colors.includes(config.backgroundColor)) {
                    update("backgroundColor", colors[0]);
                  }
                }}
              />
              <ColorPermissionPicker
                label="Colori lancette utilizzabili dalla squadra"
                value={allowedHandColors}
                onChange={(colors) => {
                  setAllowedHandColors(colors);
                  if (!colors.includes(config.accentColor)) update("accentColor", colors[0]);
                  if (!colors.includes(config.secondHandColor)) update("secondHandColor", colors[0]);
                }}
              />
            </>
          )}
          {(!isTeamRoute || isAdminSettings || teamFeatures.allowHandColors) && (
            <>
              <ColorPicker
                label="Lancette ore/minuti e tacche"
                value={config.accentColor}
                onChange={(value) => update("accentColor", value)}
                colors={isTeamRoute ? colorOptions(allowedHandColors) : COLORS}
              />
              <ColorPicker
                label="Lancetta secondi"
                value={config.secondHandColor}
                onChange={(value) => update("secondHandColor", value)}
                colors={isTeamRoute ? colorOptions(allowedHandColors) : COLORS}
              />
            </>
          )}
        </section>

        {canEditDesign && (
          <section className="panel">
            <h2>Elementi</h2>
            <Toggle checked={config.showTicks} onChange={(value) => update("showTicks", value)}>
              Tacche orarie 12/3/6/9
            </Toggle>
            <Toggle checked={config.showHands} onChange={(value) => update("showHands", value)}>
              Lancette ore/minuti
            </Toggle>
            <Toggle checked={config.showDigitalTime} onChange={(value) => update("showDigitalTime", value)}>
              Ora digitale
            </Toggle>
            <Toggle checked={config.showDate} onChange={(value) => update("showDate", value)}>
              Data
            </Toggle>
            <Toggle checked={config.showAltitude} onChange={(value) => update("showAltitude", value)}>
              Altitudine
            </Toggle>
            <Toggle checked={config.showSteps} onChange={(value) => update("showSteps", value)}>
              Passi
            </Toggle>
            <Toggle checked={config.showCalories} onChange={(value) => update("showCalories", value)}>
              Calorie
            </Toggle>
            {(!isTeamRoute || isAdminSettings || teamFeatures.allowNumbers) && (
              <div className="field">
                <label>Numeri</label>
                <select
                  value={config.numbersMode}
                  onChange={(e) => {
                    update("numbersMode", e.target.value);
                    update("showNumbers", e.target.value !== "none");
                  }}
                >
                  <option value="none">Nessuno</option>
                  <option value="cardinal">12/3/6/9</option>
                  <option value="all">Tutti 1-12</option>
                </select>
              </div>
            )}
            <Toggle checked={config.showSeconds} onChange={(value) => update("showSeconds", value)}>
              Lancetta secondi
            </Toggle>
            <Toggle checked={config.showHr} onChange={(value) => update("showHr", value)}>
              Frequenza cardiaca
            </Toggle>
            <Toggle checked={config.showBattery} onChange={(value) => update("showBattery", value)}>
              Batteria percentuale
            </Toggle>
          </section>
        )}

        {canEditDesign && (!isTeamRoute || isAdminSettings || teamFeatures.allowLogo) && (
          <section className="panel">
            <h2>Dimensioni</h2>
            {(!isTeamRoute || isAdminSettings || teamFeatures.allowLogo) && (
              <ScaleControl
                label="Dimensione logo"
                value={config.logoScale}
                min={40}
                max={180}
                onChange={(value) => update("logoScale", value)}
              />
            )}
          </section>
        )}

        {(!isTeamRoute || isAdminSettings || teamFeatures.allowAthleteName || teamFeatures.allowAthleteNumber) && (
        <section className="panel">
          <h2>Atleta</h2>
          {(!isTeamRoute || isAdminSettings || teamFeatures.allowAthleteName) && (
          <div className="field">
            <label>Nome / nickname</label>
            <input
              type="text"
              value={config.athleteName}
              onChange={(e) => update("athleteName", e.target.value)}
              maxLength={20}
              placeholder="Nome atleta"
            />
          </div>
          )}
          {(!isTeamRoute || isAdminSettings || teamFeatures.allowAthleteNumber) && (
          <div className="field">
            <label>Numero maglia</label>
            <input
              type="text"
              value={config.athleteNumber}
              onChange={(e) => update("athleteNumber", e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
              inputMode="numeric"
              maxLength={3}
              placeholder="10"
            />
          </div>
          )}
        </section>
        )}

        <section className="panel">
          <h2>Foto</h2>
          <input type="file" accept="image/*" onChange={onPhotoChange} />
          {photoFile && (
            <ScaleControl
              label="Dimensione foto"
              value={config.photoScale}
              min={25}
              max={180}
              onChange={(value) => update("photoScale", value)}
            />
          )}
          {photoFile && (
            <button className="secondary-btn" onClick={clearPhoto} type="button">
              Rimuovi foto
            </button>
          )}
        </section>
      </aside>

      <main className="preview-area">
        <WatchPreview config={config} photoUrl={photoUrl} onMoveItem={canEditDesign ? movePreviewItem : null} />
        <div className="actions">
          <button className="btn" onClick={handleBuild} disabled={busy || !apiReady || !buildReady}>
            {busy ? "Compilazione..." : buildReady ? "Genera PRG" : "PRG non configurato"}
          </button>
          <button className="secondary-action" onClick={handlePreviewDownload} type="button">
            Scarica face PNG
          </button>
          <div className="watch-export">
            <select value={watchExportPreset} onChange={(e) => setWatchExportPreset(e.target.value)}>
              {WATCH_EXPORT_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>{preset.label}</option>
              ))}
            </select>
            <button className="secondary-action" onClick={handleWatchImageDownload} type="button">
              Scarica PNG watch
            </button>
          </div>
          <button
            className="secondary-action"
            onClick={handlePackageBuild}
            type="button"
            disabled={busy || !apiReady || !buildReady}
          >
            Scarica pacchetto beta Garmin (.iq)
          </button>
          <div className="instruction-links">
            <span>Istruzioni PDF</span>
            <a href="/api/instructions/garmin.pdf">Garmin PRG</a>
            <a href="/api/instructions/apple-watch.pdf">Apple Watch</a>
            <a href="/api/instructions/wear-os.pdf">Wear OS</a>
            <a href="/api/instructions/amazfit.pdf">Amazfit</a>
          </div>
          {isAdminSettings && (
            <div className="admin-default-box">
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Password squadra o backoffice"
              />
              <button
                className="secondary-action"
                onClick={handleSaveTeamDefaults}
                type="button"
                disabled={busy}
              >
                Salva impostazioni default
              </button>
            </div>
          )}
          <div className={`status ${status.kind}`}>{status.msg}</div>
          <p>
            {buildReady
              ? "Collega il Garmin via USB e copia il file scaricato in "
              : "Demo visuale attiva. Per generare PRG servono SDK Garmin e developer key sul server."}
            {buildReady && <code>GARMIN/APPS</code>}
          </p>
        </div>
      </main>
    </div>
  );
}

function AdminApp() {
  const [password, setPassword] = useState(() => sessionStorage.getItem("adminPassword") || "");
  const [teams, setTeams] = useState([]);
  const [logos, setLogos] = useState([]);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    prgFileName: "",
    logoId: "",
    managerPassword: "",
    allowedBackgroundColors: COLORS.map((color) => color.name),
    allowedHandColors: COLORS.map((color) => color.name),
    teamFeatures: DEFAULT_TEAM_FEATURES,
    backgroundColor: "BLACK",
    accentColor: "YELLOW",
  });
  const [logoForm, setLogoForm] = useState({ name: "", id: "" });
  const [logoFile, setLogoFile] = useState(null);
  const [libraryLogoFile, setLibraryLogoFile] = useState(null);
  const [bulkLogoFiles, setBulkLogoFiles] = useState([]);
  const [status, setStatus] = useState({ msg: "", kind: "" });
  const [logoStatus, setLogoStatus] = useState({ msg: "", kind: "" });

  const dedicatedLogoUrl = useMemo(
    () => (logoFile ? URL.createObjectURL(logoFile) : null),
    [logoFile]
  );
  const teamLogoPreviewUrl = dedicatedLogoUrl
    || (form.logoId ? `/api/logos/${encodeURIComponent(form.logoId)}/image` : "")
    || (form.slug ? `/api/teams/${encodeURIComponent(form.slug)}/logo` : "");

  useEffect(() => {
    loadTeams();
    loadLogos();
  }, []);

  useEffect(() => {
    return () => {
      if (dedicatedLogoUrl) URL.revokeObjectURL(dedicatedLogoUrl);
    };
  }, [dedicatedLogoUrl]);

  async function loadTeams() {
    const res = await fetch("/api/teams");
    const data = await res.json();
    setTeams(data);
  }

  async function loadLogos() {
    const res = await fetch("/api/logos");
    const data = await res.json();
    setLogos(data);
  }

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function editTeam(team) {
    setForm({
      name: team.name,
      slug: team.slug,
      prgFileName: team.prgFileName,
      logoId: team.logoId || "",
      managerPassword: "",
      allowedBackgroundColors: normalizeAllowedColors(team.allowedBackgroundColors),
      allowedHandColors: normalizeAllowedColors(team.allowedHandColors),
      teamFeatures: normalizeTeamFeatures(team.teamFeatures),
      backgroundColor: team.backgroundColor || "BLACK",
      accentColor: team.accentColor || "YELLOW",
    });
    setLogoFile(null);
  }

  async function saveTeam(e) {
    e.preventDefault();
    setStatus({ msg: "Salvataggio squadra...", kind: "" });
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        fd.append(key, Array.isArray(value) || typeof value === "object" ? JSON.stringify(value) : value);
      });
      if (logoFile) fd.append("logo", logoFile);
      sessionStorage.setItem("adminPassword", password);
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        body: fd,
        headers: { "x-admin-password": password },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Errore sconosciuto" }));
        throw new Error(err.error || res.statusText);
      }
      const team = await res.json();
      setStatus({ msg: `Squadra salvata: /team/${team.slug}`, kind: "ok" });
      setForm({
        name: "",
        slug: "",
        prgFileName: "",
        logoId: "",
        managerPassword: "",
        allowedBackgroundColors: COLORS.map((color) => color.name),
        allowedHandColors: COLORS.map((color) => color.name),
        teamFeatures: DEFAULT_TEAM_FEATURES,
        backgroundColor: "BLACK",
        accentColor: "YELLOW",
      });
      setLogoFile(null);
      await loadTeams();
    } catch (e) {
      setStatus({ msg: `Errore: ${e.message}`, kind: "error" });
    }
  }

  async function saveNamedLogo(e) {
    e.preventDefault();
    setLogoStatus({ msg: "Salvataggio logo...", kind: "" });
    try {
      const selectedFile = libraryLogoFile || e.currentTarget.elements.libraryLogo?.files?.[0] || null;
      if (!selectedFile) throw new Error("Logo non selezionato");
      const fd = new FormData();
      fd.append("name", logoForm.name);
      fd.append("id", logoForm.id);
      fd.append("logo", selectedFile);
      sessionStorage.setItem("adminPassword", password);
      const res = await fetch("/api/admin/logos", {
        method: "POST",
        body: fd,
        headers: { "x-admin-password": password },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Errore sconosciuto" }));
        throw new Error(err.error || res.statusText);
      }
      const logo = await res.json();
      setLogoStatus({ msg: `Logo salvato: ${logo.name}`, kind: "ok" });
      setLogoForm({ name: "", id: "" });
      setLibraryLogoFile(null);
      await loadLogos();
    } catch (e) {
      setLogoStatus({ msg: `Errore: ${e.message}`, kind: "error" });
    }
  }

  async function saveLogoList(e) {
    e.preventDefault();
    setLogoStatus({ msg: "Caricamento lista loghi...", kind: "" });
    try {
      if (bulkLogoFiles.length === 0) throw new Error("Seleziona almeno un file logo");
      const fd = new FormData();
      bulkLogoFiles.forEach((file) => fd.append("logos", file));
      sessionStorage.setItem("adminPassword", password);
      const res = await fetch("/api/admin/logos/bulk", {
        method: "POST",
        body: fd,
        headers: { "x-admin-password": password },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Errore sconosciuto" }));
        throw new Error(err.error || res.statusText);
      }
      const result = await res.json();
      setLogoStatus({ msg: `${result.count} loghi caricati nell'archivio`, kind: "ok" });
      setBulkLogoFiles([]);
      await loadLogos();
    } catch (e) {
      setLogoStatus({ msg: `Errore: ${e.message}`, kind: "error" });
    }
  }

  return (
    <div className="app admin-app">
      <aside className="sidebar">
        <header className="topbar">
          <BrandTitle
            title="Backoffice squadre"
            subtitle="Crea link dedicati per ogni squadra sportiva."
          />
        </header>

        <form className="panel" onSubmit={saveTeam}>
          <h2>Squadra</h2>
          <div className="field">
            <label>Password backoffice</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Nome squadra</label>
            <input value={form.name} onChange={(e) => updateForm("name", e.target.value)} required />
          </div>
          <div className="field">
            <label>Slug link</label>
            <input value={form.slug} onChange={(e) => updateForm("slug", e.target.value)} placeholder="nome-squadra" />
          </div>
          <div className="field">
            <label>Nome file PRG</label>
            <input value={form.prgFileName} onChange={(e) => updateForm("prgFileName", e.target.value)} placeholder="NomeSquadraFace" />
          </div>
          <div className="field">
            <label>Password responsabile squadra</label>
            <input
              type="password"
              value={form.managerPassword}
              onChange={(e) => updateForm("managerPassword", e.target.value)}
              placeholder={form.slug ? "Lascia vuoto per non cambiarla" : "Password per impostazioni squadra"}
            />
          </div>
          <div className="field">
            <label>Logo salvato</label>
            <select value={form.logoId} onChange={(e) => updateForm("logoId", e.target.value)}>
              <option value="">Nessun logo salvato</option>
              {logos.map((logo) => (
                <option key={logo.id} value={logo.id}>{logo.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Logo squadra dedicato</label>
            <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
          </div>
          {teamLogoPreviewUrl && (
            <div className="team-logo-preview">
              <span>Anteprima logo squadra</span>
              <img
                src={teamLogoPreviewUrl}
                alt=""
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}
          <ColorPicker label="Sfondo default" value={form.backgroundColor} onChange={(value) => updateForm("backgroundColor", value)} />
          <ColorPermissionPicker
            label="Colori sfondo concessi"
            value={form.allowedBackgroundColors}
            onChange={(colors) => {
              updateForm("allowedBackgroundColors", colors);
              if (!colors.includes(form.backgroundColor)) updateForm("backgroundColor", colors[0]);
            }}
          />
          <ColorPermissionPicker
            label="Colori lancette concessi"
            value={form.allowedHandColors}
            onChange={(colors) => {
              updateForm("allowedHandColors", colors);
              if (!colors.includes(form.accentColor)) updateForm("accentColor", colors[0]);
            }}
          />
          <div className="feature-locks">
            <Toggle
              checked={form.teamFeatures.allowBackgroundColor}
              onChange={(value) => updateForm("teamFeatures", { ...form.teamFeatures, allowBackgroundColor: value })}
            >
              Utenti possono cambiare sfondo
            </Toggle>
            <Toggle
              checked={form.teamFeatures.allowHandColors}
              onChange={(value) => updateForm("teamFeatures", { ...form.teamFeatures, allowHandColors: value })}
            >
              Utenti possono cambiare colori lancette
            </Toggle>
            <Toggle
              checked={form.teamFeatures.allowLogo}
              onChange={(value) => updateForm("teamFeatures", { ...form.teamFeatures, allowLogo: value })}
            >
              Logo squadra visibile nella face
            </Toggle>
            <Toggle
              checked={form.teamFeatures.allowNumbers}
              onChange={(value) => updateForm("teamFeatures", { ...form.teamFeatures, allowNumbers: value })}
            >
              Numeri orologio abilitati
            </Toggle>
            <Toggle
              checked={form.teamFeatures.allowAthleteName}
              onChange={(value) => updateForm("teamFeatures", { ...form.teamFeatures, allowAthleteName: value })}
            >
              Nome / nickname atleta abilitato
            </Toggle>
            <Toggle
              checked={form.teamFeatures.allowAthleteNumber}
              onChange={(value) => updateForm("teamFeatures", { ...form.teamFeatures, allowAthleteNumber: value })}
            >
              Numero maglia abilitato
            </Toggle>
          </div>
          <ColorPicker label="Colore default" value={form.accentColor} onChange={(value) => updateForm("accentColor", value)} />
          <button className="btn" type="submit">Salva squadra</button>
          <div className={`status ${status.kind}`}>{status.msg}</div>
        </form>

        <form className="panel" onSubmit={saveNamedLogo}>
          <h2>Loghi salvati</h2>
          <div className="field">
            <label>Nome logo</label>
            <input value={logoForm.name} onChange={(e) => setLogoForm((current) => ({ ...current, name: e.target.value }))} required />
          </div>
          <div className="field">
            <label>Codice logo</label>
            <input value={logoForm.id} onChange={(e) => setLogoForm((current) => ({ ...current, id: e.target.value }))} placeholder="logo-squadra" />
          </div>
          <div className="field">
            <label>File logo</label>
            <input
              name="libraryLogo"
              type="file"
              accept="image/*"
              onChange={(e) => setLibraryLogoFile(e.target.files?.[0] || null)}
              required
            />
          </div>
          <button className="btn" type="submit">Salva logo</button>
          <div className={`status ${logoStatus.kind}`}>{logoStatus.msg}</div>
        </form>

        <form className="panel" onSubmit={saveLogoList}>
          <h2>Lista loghi</h2>
          <div className="field">
            <label>Carica più loghi</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setBulkLogoFiles(Array.from(e.target.files || []))}
            />
          </div>
          {bulkLogoFiles.length > 0 && (
            <div className="bulk-summary">
              {bulkLogoFiles.length} file selezionati
            </div>
          )}
          <button className="btn" type="submit">Carica lista loghi</button>
        </form>
      </aside>

      <main className="admin-list">
        <section className="panel">
          <h2>Squadre create</h2>
          {teams.length === 0 && <p className="muted">Nessuna squadra configurata.</p>}
          <div className="team-list">
            {teams.map((team) => (
              <article className="team-card" key={team.slug}>
                <div>
                  <strong>{team.name}</strong>
                  <span>{team.prgFileName}.prg</span>
                  <span>{team.hasManagerPassword ? "Password squadra configurata" : "Password squadra mancante"}</span>
                </div>
                <a href={`/team/${team.slug}`}>{window.location.origin}/team/{team.slug}</a>
                {team.hasLogo && <img src={`/api/teams/${team.slug}/logo`} alt="" />}
                <button className="secondary-btn" type="button" onClick={() => editTeam(team)}>
                  Modifica dati
                </button>
                <a className="secondary-btn team-action-link" href={`/admin/team/${team.slug}/settings`}>
                  Imposta default
                </a>
              </article>
            ))}
          </div>
        </section>
        <section className="panel logo-library-panel">
          <h2>Archivio loghi</h2>
          {logos.length === 0 && <p className="muted">Nessun logo salvato.</p>}
          <div className="logo-list">
            {logos.map((logo) => (
              <article className="logo-card" key={logo.id}>
                <img src={`/api/logos/${logo.id}/image`} alt="" />
                <div>
                  <strong>{logo.name}</strong>
                  <span>{logo.id}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function BrandTitle({ title, subtitle }) {
  return (
    <div className="brand-title">
      <img src="/facebuilder-logo.png" alt="" />
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function ColorPicker({ label, value, onChange, colors = COLORS }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="swatches">
        {colors.map((color) => (
          <button
            key={color.name}
            type="button"
            className={`swatch${value === color.name ? " selected" : ""}`}
            style={{ background: color.css }}
            title={color.label}
            aria-label={color.label}
            onClick={() => onChange(color.name)}
          />
        ))}
      </div>
    </div>
  );
}

function ColorPermissionPicker({ label, value, onChange }) {
  const selected = normalizeAllowedColors(value);
  function toggle(colorName) {
    const next = selected.includes(colorName)
      ? selected.filter((item) => item !== colorName)
      : [...selected, colorName];
    onChange(next.length > 0 ? next : [colorName]);
  }

  return (
    <div className="field">
      <label>{label}</label>
      <div className="swatches permission-swatches">
        {COLORS.map((color) => (
          <button
            key={color.name}
            type="button"
            className={`swatch permission-swatch${selected.includes(color.name) ? " selected" : ""}`}
            style={{ background: color.css }}
            title={color.label}
            aria-label={color.label}
            onClick={() => toggle(color.name)}
          />
        ))}
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, children }) {
  return (
    <label className="toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{children}</span>
    </label>
  );
}

function PositionControl({ label, x, y, onX, onY }) {
  return (
    <div className="position-control">
      <div className="position-title">
        <span>{label}</span>
        <code>{x},{y}</code>
      </div>
      <label>
        X
        <input
          type="range"
          min="20"
          max="240"
          value={x}
          onChange={(e) => onX(Number(e.target.value))}
        />
      </label>
      <label>
        Y
        <input
          type="range"
          min="20"
          max="230"
          value={y}
          onChange={(e) => onY(Number(e.target.value))}
        />
      </label>
    </div>
  );
}

function ScaleControl({ label, value, min, max, onChange }) {
  return (
    <div className="scale-control">
      <div className="position-title">
        <span>{label}</span>
        <code>{value}%</code>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function safeFileName(name) {
  return String(name)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .trim()
    .slice(0, 40) || "TeamFace";
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawCircleClip(ctx, x, y, radius) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.closePath();
}

function normalizeAllowedColors(value) {
  const raw = Array.isArray(value) ? value : [];
  const colors = raw.filter((color, index) => COLOR_NAMES.has(color) && raw.indexOf(color) === index);
  return colors.length > 0 ? colors : COLORS.map((color) => color.name);
}

function colorOptions(names) {
  const allowed = new Set(normalizeAllowedColors(names));
  return COLORS.filter((color) => allowed.has(color.name));
}

function normalizeTeamFeatures(value) {
  return { ...DEFAULT_TEAM_FEATURES, ...(value && typeof value === "object" ? value : {}) };
}

function getRoute() {
  const path = window.location.pathname;
  const adminTeamMatch = path.match(/^\/admin\/team\/([a-z0-9-]+)\/settings/i);
  if (adminTeamMatch) {
    return {
      mode: "admin-team-settings",
      slug: adminTeamMatch[1].toLowerCase(),
    };
  }
  if (path === "/admin" || path.startsWith("/admin/")) return { mode: "admin" };
  const match = path.match(/^\/team\/([a-z0-9-]+)/i);
  if (match) return { mode: "team", slug: match[1].toLowerCase() };
  return { mode: "builder" };
}
