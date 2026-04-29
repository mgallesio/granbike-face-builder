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

const DEVICES = [
  { id: "fenix7pro", label: "fenix 7 Pro / Pro Solar" },
  { id: "fenix7", label: "fenix 7" },
  { id: "fenix7s", label: "fenix 7S" },
  { id: "fenix7x", label: "fenix 7X" },
  { id: "fenix7spro", label: "fenix 7S Pro" },
  { id: "fenix7xpro", label: "fenix 7X Pro" },
  { id: "fenix6", label: "fenix 6" },
  { id: "fenix6pro", label: "fenix 6 Pro" },
  { id: "fenix6s", label: "fenix 6S" },
  { id: "fenix6xpro", label: "fenix 6X Pro" },
];

const DEFAULT_CONFIG = {
  name: "Granbike Face",
  prgFileName: "GranbikeFace",
  teamSlug: "",
  device: "fenix7pro",
  backgroundColor: "BLACK",
  accentColor: "YELLOW",
  secondHandColor: "WHITE",
  logoName: "logosquadra",
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
  text1X: 130,
  text1Y: 130,
  text2X: 130,
  text2Y: 152,
  logoX: 130,
  logoY: 192,
  logoScale: 100,
  photoScale: 100,
  memorialLine1: "",
  memorialLine2: "",
  hasPhoto: false,
};

export default function App() {
  const route = getRoute();
  if (route.mode === "admin") {
    return <AdminApp />;
  }
  return <BuilderApp route={route} />;
}

function BuilderApp({ route }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [team, setTeam] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [status, setStatus] = useState({
    msg: "Configura la watch face e premi Genera PRG.",
    kind: "",
  });
  const [apiReady, setApiReady] = useState(false);
  const [buildReady, setBuildReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [adminPassword, setAdminPassword] = useState(() => sessionStorage.getItem("adminPassword") || "");

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
    if (route.mode !== "team") return;
    let active = true;
    fetch(`/api/teams/${encodeURIComponent(route.slug)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Squadra non trovata");
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        setTeam(data);
        setConfig((current) => ({
          ...current,
          ...(data.defaultConfig || {}),
          name: data.name,
          prgFileName: data.prgFileName,
          teamSlug: data.slug,
          logoName: "logosquadra",
          backgroundColor: data.backgroundColor || current.backgroundColor,
          accentColor: data.accentColor || current.accentColor,
        }));
      })
      .catch((e) => {
        if (!active) return;
        setStatus({ msg: `Errore: ${e.message}`, kind: "error" });
      });
    return () => {
      active = false;
    };
  }, [route.mode, route.slug]);

  function update(key, value) {
    setConfig((current) => ({ ...current, [key]: value }));
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
      link.download = `${safeFileName(config.prgFileName || config.name || "GranbikeFace")}.prg`;
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
      link.download = `${safeFileName(config.prgFileName || config.name || "GranbikeFace")}-beta.iq`;
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
      link.download = `${safeFileName(config.prgFileName || config.name || "GranbikeFace")}-preview.png`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus({ msg: "Anteprima face scaricata in PNG.", kind: "ok" });
    }, "image/png");
  }

  async function handleSaveTeamDefaults() {
    if (!team) return;
    setBusy(true);
    setStatus({ msg: "Salvataggio impostazioni default squadra...", kind: "" });
    try {
      sessionStorage.setItem("adminPassword", adminPassword);
      const res = await fetch(`/api/admin/teams/${encodeURIComponent(team.slug)}/defaults`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({ config }),
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

  return (
    <div className="app">
      <aside className="sidebar">
        <header className="topbar">
          <div>
            <h1>Granbike Face Builder</h1>
            <p>{team ? `${team.name} - link squadra` : "Generatore web per watch face Garmin Connect IQ."}</p>
          </div>
          <span className={`api-dot ${apiReady ? "ok" : "error"}`} title={apiReady ? "API online" : "API offline"} />
        </header>

        <section className="panel">
          <h2>Generale</h2>
          {team && (
            <div className="team-banner">
              <strong>{team.name}</strong>
              <span>File: {team.prgFileName}.prg</span>
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
              {DEVICES.map((device) => (
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
              <option value="logosquadra">Logo squadra</option>
              <option value="logosquadra2">Logo squadra 2</option>
            </select>
          </div>
          )}
        </section>

        <section className="panel">
          <h2>Colori</h2>
          <ColorPicker
            label="Sfondo"
            value={config.backgroundColor}
            onChange={(value) => update("backgroundColor", value)}
          />
          <ColorPicker
            label="Lancette ore/minuti e tacche"
            value={config.accentColor}
            onChange={(value) => update("accentColor", value)}
          />
          <ColorPicker
            label="Lancetta secondi"
            value={config.secondHandColor}
            onChange={(value) => update("secondHandColor", value)}
          />
        </section>

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

        <section className="panel">
          <h2>Layout</h2>
          <PositionControl
            label="Cuore"
            x={config.hrX}
            y={config.hrY}
            onX={(value) => update("hrX", value)}
            onY={(value) => update("hrY", value)}
          />
          <PositionControl
            label="Batteria"
            x={config.batteryX}
            y={config.batteryY}
            onX={(value) => update("batteryX", value)}
            onY={(value) => update("batteryY", value)}
          />
          <PositionControl
            label="Ora digitale"
            x={config.digitalTimeX}
            y={config.digitalTimeY}
            onX={(value) => update("digitalTimeX", value)}
            onY={(value) => update("digitalTimeY", value)}
          />
          <PositionControl
            label="Data"
            x={config.dateX}
            y={config.dateY}
            onX={(value) => update("dateX", value)}
            onY={(value) => update("dateY", value)}
          />
          <PositionControl
            label="Altitudine"
            x={config.altitudeX}
            y={config.altitudeY}
            onX={(value) => update("altitudeX", value)}
            onY={(value) => update("altitudeY", value)}
          />
          <PositionControl
            label="Passi"
            x={config.stepsX}
            y={config.stepsY}
            onX={(value) => update("stepsX", value)}
            onY={(value) => update("stepsY", value)}
          />
          <PositionControl
            label="Calorie"
            x={config.caloriesX}
            y={config.caloriesY}
            onX={(value) => update("caloriesX", value)}
            onY={(value) => update("caloriesY", value)}
          />
          <PositionControl
            label="Testo riga 1"
            x={config.text1X}
            y={config.text1Y}
            onX={(value) => update("text1X", value)}
            onY={(value) => update("text1Y", value)}
          />
          <PositionControl
            label="Testo riga 2"
            x={config.text2X}
            y={config.text2Y}
            onX={(value) => update("text2X", value)}
            onY={(value) => update("text2Y", value)}
          />
          <PositionControl
            label="Logo"
            x={config.logoX}
            y={config.logoY}
            onX={(value) => update("logoX", value)}
            onY={(value) => update("logoY", value)}
          />
          <ScaleControl
            label="Dimensione logo"
            value={config.logoScale}
            min={40}
            max={180}
            onChange={(value) => update("logoScale", value)}
          />
        </section>

        <section className="panel">
          <h2>Testo</h2>
          <div className="field">
            <label>Riga 1</label>
            <input
              type="text"
              value={config.memorialLine1}
              onChange={(e) => update("memorialLine1", e.target.value)}
              maxLength={20}
              placeholder="Andrea"
            />
          </div>
          <div className="field">
            <label>Riga 2</label>
            <input
              type="text"
              value={config.memorialLine2}
              onChange={(e) => update("memorialLine2", e.target.value)}
              maxLength={30}
              placeholder="Sempre con noi"
            />
          </div>
        </section>

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
        <WatchPreview config={config} photoUrl={photoUrl} />
        <div className="actions">
          <button className="btn" onClick={handleBuild} disabled={busy || !apiReady || !buildReady}>
            {busy ? "Compilazione..." : buildReady ? "Genera PRG" : "PRG non configurato"}
          </button>
          <button className="secondary-action" onClick={handlePreviewDownload} type="button">
            Scarica face PNG
          </button>
          <button
            className="secondary-action"
            onClick={handlePackageBuild}
            type="button"
            disabled={busy || !apiReady || !buildReady}
          >
            Scarica pacchetto beta Garmin (.iq)
          </button>
          {team && (
            <div className="admin-default-box">
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Password backoffice"
              />
              <button
                className="secondary-action"
                onClick={handleSaveTeamDefaults}
                type="button"
                disabled={busy || !adminPassword}
              >
                Salva default squadra
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
      Object.entries(form).forEach(([key, value]) => fd.append(key, value));
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
      const fd = new FormData();
      fd.append("name", logoForm.name);
      fd.append("id", logoForm.id);
      if (libraryLogoFile) fd.append("logo", libraryLogoFile);
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
          <div>
            <h1>Backoffice squadre</h1>
            <p>Crea link dedicati per ogni squadra sportiva.</p>
          </div>
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
            <input value={form.slug} onChange={(e) => updateForm("slug", e.target.value)} placeholder="granbike-team" />
          </div>
          <div className="field">
            <label>Nome file PRG</label>
            <input value={form.prgFileName} onChange={(e) => updateForm("prgFileName", e.target.value)} placeholder="GranbikeTeamFace" />
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
            <input value={logoForm.id} onChange={(e) => setLogoForm((current) => ({ ...current, id: e.target.value }))} placeholder="logo-granbike" />
          </div>
          <div className="field">
            <label>File logo</label>
            <input type="file" accept="image/*" onChange={(e) => setLibraryLogoFile(e.target.files?.[0] || null)} required />
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
          <h2>Link squadre</h2>
          {teams.length === 0 && <p className="muted">Nessuna squadra configurata.</p>}
          <div className="team-list">
            {teams.map((team) => (
              <article className="team-card" key={team.slug}>
                <div>
                  <strong>{team.name}</strong>
                  <span>{team.prgFileName}.prg</span>
                </div>
                <a href={`/team/${team.slug}`}>{window.location.origin}/team/{team.slug}</a>
                {team.hasLogo && <img src={`/api/teams/${team.slug}/logo`} alt="" />}
                <button className="secondary-btn" type="button" onClick={() => editTeam(team)}>
                  Modifica
                </button>
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

function ColorPicker({ label, value, onChange }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="swatches">
        {COLORS.map((color) => (
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
    .slice(0, 40) || "GranbikeFace";
}

function getRoute() {
  const path = window.location.pathname;
  if (path === "/admin" || path.startsWith("/admin/")) return { mode: "admin" };
  const match = path.match(/^\/team\/([a-z0-9-]+)/i);
  if (match) return { mode: "team", slug: match[1].toLowerCase() };
  return { mode: "builder" };
}
