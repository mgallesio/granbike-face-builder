import { useEffect, useRef } from "react";

// Mappa nome colore -> CSS (corrisponde a Graphics.COLOR_* di Monkey C)
const COLOR_MAP = {
  WHITE: "#ffffff",
  BLACK: "#000000",
  RED: "#ff2020",
  DARK_RED: "#aa0000",
  ORANGE: "#ff8c00",
  YELLOW: "#ffd700",
  GREEN: "#32cd32",
  DARK_GREEN: "#008000",
  BLUE: "#3a7bd5",
  DARK_BLUE: "#00008b",
  PURPLE: "#a020f0",
  PINK: "#ff69b4",
  LT_GRAY: "#aaaaaa",
  DK_GRAY: "#555555",
};

const W = 260;
const H = 260;

export default function WatchPreview({ config, photoUrl }) {
  const canvasRef = useRef(null);
  const photoRef = useRef(null);
  const logosquadraRef = useRef(null);

  // Precarica immagine quando cambia
  useEffect(() => {
    if (!photoUrl) { photoRef.current = null; return; }
    const img = new Image();
    img.onload = () => { photoRef.current = img; };
    img.src = photoUrl;
  }, [photoUrl]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => { logosquadraRef.current = img; };
    img.src = `/api/logosquadra?logo=${encodeURIComponent(config.logoName || "logosquadra")}&t=${Date.now()}`;
  }, [config.logoName]);

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    let raf;

    const accent = COLOR_MAP[config.accentColor] || "#ffd700";
    const secondCol = COLOR_MAP[config.secondHandColor] || "#ffffff";
    const background = COLOR_MAP[config.backgroundColor] || "#000000";

    const render = () => {
      const cx = W / 2, cy = H / 2;
      // Sfondo
      if (photoRef.current && config.hasPhoto) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, W, H);
        const size = W * ((config.photoScale ?? 100) / 100);
        ctx.drawImage(photoRef.current, cx - size / 2, cy - size / 2, size, size);
      } else {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, W, H);
      }

      if (logosquadraRef.current) {
        ctx.drawImage(
          logosquadraRef.current,
          (config.logoX ?? 130) - 80,
          config.logoY ?? 192,
          160,
          62
        );
      }

      if (config.numbersMode !== "none" && config.showNumbers !== false) {
        ctx.fillStyle = accent;
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const numberRadius = config.showHands === false ? 112 : 96;
        const yAdjust = config.showHands === false ? 8 : 8;
        if (config.numbersMode === "all") {
          for (let n = 1; n <= 12; n += 1) {
            const angle = n * (2 * Math.PI / 12);
            const x = cx + numberRadius * Math.sin(angle);
            const y = cy - numberRadius * Math.cos(angle) + yAdjust;
            ctx.fillText(String(n), x, y);
          }
        } else {
          ctx.fillText("12", cx, cy - numberRadius);
          ctx.fillText("3", cx + numberRadius, cy - 2);
          ctx.fillText("6", cx, cy + numberRadius - 14);
          ctx.fillText("9", cx - numberRadius, cy - 2);
        }
      }

      // Tacche
      if (config.showTicks) {
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        ctx.lineCap = "butt";
        const outer = 122, inner = 110;
        for (const [x1, y1, x2, y2] of [
          [cx, cy - outer, cx, cy - inner],
          [cx, cy + inner, cx, cy + outer],
          [cx + inner, cy, cx + outer, cy],
          [cx - outer, cy, cx - inner, cy],
        ]) {
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }

      // FC
      if (config.showHr) {
        ctx.fillStyle = "#ff2020";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("\u2665 72", config.hrX ?? cx, config.hrY ?? 50);
      }

      // Batteria
      if (config.showBattery) {
        ctx.fillStyle = "#32cd32";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("85%", config.batteryX ?? cx, config.batteryY ?? 165);
      }

      // Memorial text
      if (config.memorialLine1) {
        drawShadowText(
          ctx,
          config.memorialLine1,
          config.text1X ?? cx,
          config.text1Y ?? 130,
          "bold 20px Arial",
          "#fff"
        );
      }
      if (config.memorialLine2) {
        drawShadowText(
          ctx,
          config.memorialLine2,
          config.text2X ?? cx,
          config.text2Y ?? 152,
          "16px Arial",
          "#fff"
        );
      }

      // Lancette
      const now = new Date();
      const hour = now.getHours() % 12;
      const min = now.getMinutes();
      const sec = now.getSeconds();
      const hourA = (hour + min / 60) * (2 * Math.PI / 12);
      const minA  = (min + sec / 60) * (2 * Math.PI / 60);
      const secA  = sec * (2 * Math.PI / 60);

      if (config.showHands !== false) {
        drawHand(ctx, cx, cy, hourA, 55, 6, accent);
        drawHand(ctx, cx, cy, minA,  95, 4, accent);
      }
      if (config.showSeconds) {
        drawHand(ctx, cx, cy, secA, 105, 2, secondCol);
      }

      // Perno
      if (config.showHands !== false) {
        ctx.fillStyle = accent;
        ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = background;
        ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 2 * Math.PI); ctx.fill();
      }

      raf = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(raf);
  }, [config, photoUrl]);

  return <canvas className="watch-canvas" ref={canvasRef} width={W} height={H} />;
}

function drawHand(ctx, cx, cy, angle, length, width, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  const ex = cx + length * Math.sin(angle);
  const ey = cy - length * Math.cos(angle);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(ex, ey);
  ctx.stroke();
}

function drawShadowText(ctx, text, x, y, font, color) {
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#000";
  for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    ctx.fillText(text, x + dx, y + dy);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}
