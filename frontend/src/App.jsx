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

export default function App() {
  const [config, setConfig] = useState({
    name: "Granbike Face",
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
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [status, setStatus] = useState({
    msg: "Configura la watch face e premi Genera PRG.",
    kind: "",
  });
  const [apiReady, setApiReady] = useState(false);
  const [buildReady, setBuildReady] = useState(false);
  const [busy, setBusy] = useState(false);

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
      link.download = `${safeFileName(config.name || "GranbikeFace")}.prg`;
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

  function handlePreviewDownload() {
    const canvas = document.querySelector(".watch-canvas");
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeFileName(config.name || "GranbikeFace")}-preview.png`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus({ msg: "Anteprima face scaricata in PNG.", kind: "ok" });
    }, "image/png");
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <header className="topbar">
          <div>
            <h1>Granbike Face Builder</h1>
            <p>Generatore web per watch face Garmin Connect IQ.</p>
          </div>
          <span className={`api-dot ${apiReady ? "ok" : "error"}`} title={apiReady ? "API online" : "API offline"} />
        </header>

        <section className="panel">
          <h2>Generale</h2>
          <div className="field">
            <label>Nome app</label>
            <input
              type="text"
              value={config.name}
              onChange={(e) => update("name", e.target.value)}
              maxLength={30}
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
