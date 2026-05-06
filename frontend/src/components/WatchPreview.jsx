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

export default function WatchPreview({ config, photoUrl, onMoveItem }) {
  const canvasRef = useRef(null);
  const photoRef = useRef(null);
  const logosquadraRef = useRef(null);
  const dragRef = useRef(null);

  // Precarica immagine quando cambia
  useEffect(() => {
    if (!photoUrl) { photoRef.current = null; return; }
    const img = new Image();
    img.onload = () => { photoRef.current = img; };
    img.src = photoUrl;
  }, [photoUrl]);

  useEffect(() => {
    const img = new Image();
    logosquadraRef.current = null;
    img.onload = () => { logosquadraRef.current = img; };
    img.onerror = () => { logosquadraRef.current = null; };
    if (config.logoHidden) {
      logosquadraRef.current = null;
    } else if (config.teamSlug) {
      img.src = `/api/teams/${encodeURIComponent(config.teamSlug)}/logo?t=${Date.now()}`;
    } else if (config.logoName) {
      img.src = `/api/logosquadra?logo=${encodeURIComponent(config.logoName)}&t=${Date.now()}`;
    }
  }, [config.logoName, config.teamSlug, config.logoHidden, config.logoCacheKey]);

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
        drawCoverImage(ctx, photoRef.current, cx - size / 2, cy - size / 2, size, size);
      } else {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, W, H);
      }

      if (logosquadraRef.current) {
        const logoScale = (config.logoScale ?? 100) / 100;
        const logoW = 160 * logoScale;
        const logoH = 62 * logoScale;
        ctx.drawImage(
          logosquadraRef.current,
          (config.logoX ?? 130) - logoW / 2,
          config.logoY ?? 192,
          logoW,
          logoH
        );
      }

      if (config.numbersMode !== "none" && config.showNumbers !== false) {
        ctx.fillStyle = accent;
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const numberRadius = config.showTicks === false
          ? 118
          : config.showHands === false
            ? 112
            : 96;
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

      const now = new Date();

      // Ora digitale
      if (config.showDigitalTime) {
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        drawShadowText(
          ctx,
          `${hh}:${mm}`,
          config.digitalTimeX ?? cx,
          config.digitalTimeY ?? 96,
          "bold 36px Arial",
          accent
        );
      }

      // Data
      if (config.showDate) {
        const dd = String(now.getDate()).padStart(2, "0");
        const mo = String(now.getMonth() + 1).padStart(2, "0");
        drawShadowText(
          ctx,
          `${dd}/${mo}`,
          config.dateX ?? cx,
          config.dateY ?? 120,
          "bold 16px Arial",
          "#fff"
        );
      }

      if (config.showAltitude) {
        drawShadowText(
          ctx,
          "325m",
          config.altitudeX ?? 210,
          config.altitudeY ?? 184,
          "bold 16px Arial",
          "#ffffff"
        );
      }

      if (config.showSteps) {
        drawShadowText(
          ctx,
          "8200",
          config.stepsX ?? 130,
          config.stepsY ?? 218,
          "bold 16px Arial",
          accent
        );
      }

      if (config.showCalories) {
        drawShadowText(
          ctx,
          "540 kcal",
          config.caloriesX ?? 210,
          config.caloriesY ?? 74,
          "bold 15px Arial",
          "#ffffff"
        );
      }

      const athleteName = config.athleteName || config.memorialLine1;
      const athleteNumber = config.athleteNumber || config.memorialLine2;
      if (athleteName) {
        drawShadowText(
          ctx,
          athleteName,
          config.athleteNameX ?? config.text1X ?? cx,
          config.athleteNameY ?? config.text1Y ?? 130,
          "bold 20px Arial",
          "#fff"
        );
      }
      if (athleteNumber) {
        drawShadowText(
          ctx,
          athleteNumber,
          config.athleteNumberX ?? config.text2X ?? cx,
          config.athleteNumberY ?? config.text2Y ?? 160,
          "bold 34px Arial",
          accent
        );
      }

      // Lancette
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

  function pointerToCanvas(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  }

  function handlePointerDown(e) {
    if (!onMoveItem) return;
    const point = pointerToCanvas(e);
    const item = findDraggableItem(config, logosquadraRef.current, point);
    if (!item) return;
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    dragRef.current = {
      ...item,
      offsetX: point.x - item.x,
      offsetY: point.y - item.y,
    };
  }

  function handlePointerMove(e) {
    const drag = dragRef.current;
    if (!drag || !onMoveItem) return;
    e.preventDefault();
    const point = pointerToCanvas(e);
    onMoveItem(drag.xKey, drag.yKey, clamp(point.x - drag.offsetX, 10, 250), clamp(point.y - drag.offsetY, 0, 250));
  }

  function handlePointerUp(e) {
    if (dragRef.current && canvasRef.current.hasPointerCapture(e.pointerId)) {
      canvasRef.current.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
  }

  return (
    <canvas
      className={`watch-canvas${onMoveItem ? " draggable" : ""}`}
      ref={canvasRef}
      width={W}
      height={H}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}

function findDraggableItem(config, logoImage, point) {
  const items = [];
  if (logoImage) {
    const logoScale = (config.logoScale ?? 100) / 100;
    const w = 160 * logoScale;
    const h = 62 * logoScale;
    items.push({
      xKey: "logoX",
      yKey: "logoY",
      x: config.logoX ?? 130,
      y: config.logoY ?? 192,
      hit: { type: "rect", x: (config.logoX ?? 130) - w / 2, y: config.logoY ?? 192, w, h },
    });
  }
  if (config.showHr) items.push(pointItem("hrX", "hrY", config.hrX ?? 130, config.hrY ?? 50, 34));
  if (config.showBattery) items.push(pointItem("batteryX", "batteryY", config.batteryX ?? 130, config.batteryY ?? 165, 34));
  if (config.showDigitalTime) items.push(pointItem("digitalTimeX", "digitalTimeY", config.digitalTimeX ?? 130, config.digitalTimeY ?? 96, 48));
  if (config.showDate) items.push(pointItem("dateX", "dateY", config.dateX ?? 130, config.dateY ?? 120, 28));
  if (config.showAltitude) items.push(pointItem("altitudeX", "altitudeY", config.altitudeX ?? 210, config.altitudeY ?? 184, 30));
  if (config.showSteps) items.push(pointItem("stepsX", "stepsY", config.stepsX ?? 130, config.stepsY ?? 218, 30));
  if (config.showCalories) items.push(pointItem("caloriesX", "caloriesY", config.caloriesX ?? 210, config.caloriesY ?? 74, 38));
  if (config.athleteName || config.memorialLine1) {
    items.push(pointItem("athleteNameX", "athleteNameY", config.athleteNameX ?? config.text1X ?? 130, config.athleteNameY ?? config.text1Y ?? 130, 44));
  }
  if (config.athleteNumber || config.memorialLine2) {
    items.push(pointItem("athleteNumberX", "athleteNumberY", config.athleteNumberX ?? config.text2X ?? 130, config.athleteNumberY ?? config.text2Y ?? 160, 44));
  }

  return items.reverse().find((item) => hitTest(item, point)) || null;
}

function pointItem(xKey, yKey, x, y, radius) {
  return { xKey, yKey, x, y, hit: { type: "circle", x, y, radius } };
}

function hitTest(item, point) {
  if (item.hit.type === "rect") {
    return (
      point.x >= item.hit.x &&
      point.x <= item.hit.x + item.hit.w &&
      point.y >= item.hit.y &&
      point.y <= item.hit.y + item.hit.h
    );
  }
  const dx = point.x - item.hit.x;
  const dy = point.y - item.hit.y;
  return Math.sqrt(dx * dx + dy * dy) <= item.hit.radius;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(value)));
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

function drawCoverImage(ctx, img, x, y, w, h) {
  const sourceRatio = img.width / img.height;
  const targetRatio = w / h;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  if (sourceRatio > targetRatio) {
    sw = img.height * targetRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / targetRatio;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}
