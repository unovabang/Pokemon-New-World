import { useEffect, useMemo, useRef, useState } from "react";

/* Palette type-couleur pour les arcs/hubs (cohérence avec HologramGlobe) */
const TYPE_COLORS = {
  fire:     "#F87171",
  water:    "#60A5FA",
  grass:    "#34D399",
  electric: "#FBBF24",
  psychic:  "#F472B6",
  ice:      "#7DD3FC",
  dragon:   "#C084FC",
  fairy:    "#FDA4AF",
};

/* ──────────────── Hubs (trade nodes) ──────────────── */
const ANCHOR_POINTS = [
  { lat: 45,  lng: 10,   type: "electric" },
  { lat: 30,  lng: -80,  type: "fire"     },
  { lat: -25, lng: 135,  type: "grass"    },
  { lat: 15,  lng: 100,  type: "water"    },
  { lat: 60,  lng: -150, type: "ice"      },
  { lat: -35, lng: 20,   type: "psychic"  },
  { lat: 35,  lng: 140,  type: "dragon"   },
  { lat: -42, lng: 170,  type: "fairy"    },
  { lat: 5,   lng: -55,  type: "fire"     },
  { lat: 55,  lng: 80,   type: "ice"      },
  { lat: -10, lng: 30,   type: "psychic"  },
  { lat: 25,  lng: -110, type: "fairy"    },
];

/* ──────────────── Continents (formes pleines) ────────────────
 * On rend chaque continent comme une zone ovale remplie avec léger gradient.
 * Différent de HologramGlobe qui utilise une matrice de points. */
const CONTINENT_BLOBS = [
  { lat: 50,  lng: -100, rLat: 22, rLng: 40 },  // Amérique du Nord
  { lat: 22,  lng: -100, rLat: 9,  rLng: 12 },  // Mexique
  { lat: -10, lng: -60,  rLat: 22, rLng: 16 },  // Amérique du Sud
  { lat: 70,  lng: -42,  rLat: 8,  rLng: 18 },  // Groenland
  { lat: 52,  lng: 18,   rLat: 14, rLng: 28 },  // Europe
  { lat: 0,   lng: 22,   rLat: 28, rLng: 22 },  // Afrique
  { lat: 50,  lng: 90,   rLat: 22, rLng: 50 },  // Asie
  { lat: 22,  lng: 80,   rLat: 12, rLng: 18 },  // Inde
  { lat: -28, lng: 135,  rLat: 11, rLng: 16 },  // Australie
  { lat: 38,  lng: 138,  rLat: 8,  rLng: 6  },  // Japon
];

const ACCENT     = "#F472B6"; // rose primaire (theme GTS)
const ACCENT_2   = "#7DD3FC"; // cyan secondaire
const ACCENT_3   = "#FCD34D"; // jaune accent

function isLand(lat, lng) {
  for (const c of CONTINENT_BLOBS) {
    const dLat = (lat - c.lat) / c.rLat;
    let dLng = lng - c.lng;
    if (dLng > 180) dLng -= 360;
    if (dLng < -180) dLng += 360;
    const dn = dLng / c.rLng;
    if (dLat * dLat + dn * dn < 1) return true;
  }
  return false;
}

/* On échantillonne fine pour rendre des "patches" de continent */
function generateLandPatches() {
  const dots = [];
  const latStep = 4;
  const lngStep = 4;
  for (let lat = -75; lat <= 75; lat += latStep) {
    const scaleFactor = Math.max(0.3, Math.cos((lat * Math.PI) / 180));
    const step = lngStep / scaleFactor;
    for (let lng = -180; lng < 180; lng += step) {
      if (isLand(lat, lng)) dots.push({ lat, lng });
    }
  }
  return dots;
}

/* Étoiles fond — seeded PRNG */
function generateStars(size, count) {
  let seed = 137;
  const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const cx = size / 2, cy = size / 2, r = size * 0.40;
  const stars = [];
  for (let i = 0; i < count; i++) {
    let x = 0, y = 0;
    for (let t = 0; t < 12; t++) {
      x = rand() * size;
      y = rand() * size;
      if (Math.hypot(x - cx, y - cy) > r * 1.10) break;
    }
    stars.push({ x, y, size: 0.3 + rand() * 1.0, phase: rand() * Math.PI * 2 });
  }
  return stars;
}

/* ──────────────── Pokéball miniature (SVG) ──────────────── */
function PokeballMark({ x, y, size, opacity, rot }) {
  const half = size / 2;
  return (
    <g
      transform={`translate(${x - half} ${y - half}) rotate(${rot} ${half} ${half})`}
      opacity={opacity}
    >
      <circle cx={half} cy={half} r={half}        fill="#fff" />
      <path
        d={`M 0 ${half} A ${half} ${half} 0 0 1 ${size} ${half} L 0 ${half} Z`}
        fill="#EF4444"
      />
      <line x1={0} y1={half} x2={size} y2={half} stroke="#1F2937" strokeWidth={size * 0.10} />
      <circle cx={half} cy={half} r={size * 0.18} fill="#fff" stroke="#1F2937" strokeWidth={size * 0.08} />
      <circle cx={half} cy={half} r={size * 0.07} fill="#1F2937" />
    </g>
  );
}

export default function TradeGlobe({ size = 240, className }) {
  const [angle, setAngle] = useState(0);
  const [tick, setTick] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    let last = performance.now();
    const loop = (now) => {
      const dt = now - last;
      last = now;
      // Rotation un peu plus rapide que HologramGlobe pour un look "réseau actif"
      setAngle((a) => (a + ((2 * Math.PI) / 24000) * dt) % (2 * Math.PI));
      setTick(now / 1000);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
  }, []);

  const cx = size / 2;
  const cy = size / 2;
  const r  = size * 0.34; // Globe légèrement plus petit pour laisser place à l'orbite Pokéball

  const project = (lat, lng) => {
    const phi = (lat * Math.PI) / 180;
    const theta = (lng * Math.PI) / 180 + angle;
    const x = Math.cos(phi) * Math.sin(theta);
    const y = Math.sin(phi);
    const z = Math.cos(phi) * Math.cos(theta);
    return { x: cx + x * r, y: cy - y * r, z };
  };

  const land     = useMemo(() => generateLandPatches(), []);
  const stars    = useMemo(() => generateStars(size, 28), [size]);
  const meridians = useMemo(() => Array.from({ length: 6 }).map((_, i) => i), []);
  const parallels = [-45, 0, 45];

  /* ───── 3 arcs simultanés de trade ───── */
  const arcSlots = [
    { len: 2700, off: 0,    seedA: 1, seedB: 4 },
    { len: 2300, off: 800,  seedA: 5, seedB: 9 },
    { len: 3100, off: 1600, seedA: 2, seedB: 7 },
  ];

  /* ───── Pokéballs en orbite ───── */
  const orbitR = r * 1.42;
  const pokeballs = [
    { speed: 0.30, offset: 0,                 tilt: 18,  size: size * 0.06 },
    { speed: 0.42, offset: Math.PI * 0.66,    tilt: -45, size: size * 0.05 },
    { speed: 0.36, offset: Math.PI * 1.33,    tilt: 70,  size: size * 0.055 },
  ];

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        position: "relative",
        display: "block",
        filter: `drop-shadow(0 0 18px rgba(244,114,182,0.45))`,
      }}
      aria-hidden
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        style={{ display: "block", overflow: "visible" }}
      >
        <defs>
          <radialGradient id="tg2-fill" cx="38%" cy="34%" r="72%">
            <stop offset="0%"   stopColor="#F472B6" stopOpacity="0.42" />
            <stop offset="35%"  stopColor="#A78BFA" stopOpacity="0.22" />
            <stop offset="70%"  stopColor="#3B0764" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.55" />
          </radialGradient>
          <radialGradient id="tg2-atmo" cx="50%" cy="50%" r="50%">
            <stop offset="62%"  stopColor="#7DD3FC" stopOpacity="0"    />
            <stop offset="84%"  stopColor="#7DD3FC" stopOpacity="0.28" />
            <stop offset="96%"  stopColor="#F472B6" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#F472B6" stopOpacity="0"    />
          </radialGradient>
          <radialGradient id="tg2-halo" cx="50%" cy="50%" r="50%">
            <stop offset="65%"  stopColor="#F472B6" stopOpacity="0"    />
            <stop offset="88%"  stopColor="#F472B6" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#F472B6" stopOpacity="0"    />
          </radialGradient>
          <radialGradient id="tg2-shadow" cx="72%" cy="68%" r="65%">
            <stop offset="0%"   stopColor="#000" stopOpacity="0"    />
            <stop offset="62%"  stopColor="#000" stopOpacity="0"    />
            <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
          </radialGradient>
          <linearGradient id="tg2-equator" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor={ACCENT_2} stopOpacity="0.0" />
            <stop offset="50%"  stopColor={ACCENT}   stopOpacity="0.65" />
            <stop offset="100%" stopColor={ACCENT_3} stopOpacity="0.0" />
          </linearGradient>
          <clipPath id="tg2-clip">
            <circle cx={cx} cy={cy} r={r} />
          </clipPath>
        </defs>

        {/* ───── Étoiles fond ───── */}
        <g>
          {stars.map((s, i) => {
            const tw = 0.35 + 0.65 * Math.abs(Math.sin(tick * 1.6 + s.phase));
            return (
              <circle key={`s-${i}`} cx={s.x} cy={s.y} r={s.size}
                fill="#FFFFFF" opacity={tw * 0.55} />
            );
          })}
        </g>

        {/* Orbite (anneau pointillé) — visible derrière le globe */}
        <ellipse
          cx={cx} cy={cy}
          rx={orbitR} ry={orbitR * 0.32}
          fill="none"
          stroke={ACCENT}
          strokeWidth={0.6}
          strokeDasharray="3 5"
          opacity={0.22}
          transform={`rotate(-12 ${cx} ${cy})`}
        />

        {/* Halo extérieur rose */}
        <circle cx={cx} cy={cy} r={r * 1.32} fill="url(#tg2-halo)" />

        {/* Atmosphère (cyan/rose en bord) */}
        <circle cx={cx} cy={cy} r={r * 1.10} fill="url(#tg2-atmo)" />

        {/* Fill du globe */}
        <circle cx={cx} cy={cy} r={r} fill="url(#tg2-fill)" />

        {/* Parallèles */}
        {parallels.map((lat) => {
          const phi = (lat * Math.PI) / 180;
          const ry  = r * Math.cos(phi) * 0.22;
          const cyy = cy - Math.sin(phi) * r;
          return (
            <ellipse key={`par-${lat}`}
              cx={cx} cy={cyy} rx={r * Math.cos(phi)} ry={ry}
              fill="none"
              stroke={lat === 0 ? "url(#tg2-equator)" : ACCENT_2}
              strokeWidth={lat === 0 ? 1.0 : 0.45}
              opacity={lat === 0 ? 1 : 0.32}
            />
          );
        })}

        {/* Méridiens (animés avec la rotation) */}
        {meridians.map((i) => {
          const baseAngle = (i * Math.PI) / 6;
          const eff = baseAngle + angle;
          const rx = Math.abs(Math.sin(eff)) * r;
          const alpha = 0.18 + Math.abs(Math.sin(eff)) * 0.32;
          return (
            <ellipse key={`m-${i}`}
              cx={cx} cy={cy} rx={rx} ry={r}
              fill="none" stroke={ACCENT_2} strokeWidth={0.45} opacity={alpha} />
          );
        })}

        {/* Outline globe */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={ACCENT} strokeWidth={1} opacity={0.7} />

        {/* ───── Continents (patches denses) ───── */}
        {land.map((p, i) => {
          const { x, y, z } = project(p.lat, p.lng);
          if (z < 0) return null;
          const d = Math.max(0, Math.min(1, z));
          const dayNight = 0.5 + 0.5 * (x - cx) / r;
          // Coloration : rose côté jour, violet plus sombre côté nuit
          const baseColor = dayNight > 0.55 ? ACCENT : "#A78BFA";
          return (
            <circle key={`l-${i}`} cx={x} cy={y} r={0.95}
              fill={baseColor}
              opacity={(0.22 + d * 0.55) * (0.45 + dayNight * 0.55)}
            />
          );
        })}

        {/* Terminateur (ombre nocturne) */}
        <circle cx={cx} cy={cy} r={r} fill="url(#tg2-shadow)" />

        {/* ───── Hubs glow (visibles côté jour) ───── */}
        {ANCHOR_POINTS.map((p, i) => {
          const { x, y, z } = project(p.lat, p.lng);
          if (z < -0.05) return null;
          const d = Math.max(0, Math.min(1, z + 0.05));
          const dayNight = 0.5 + 0.5 * (x - cx) / r;
          const tt = (tick * 1.4 + i * 0.7) % (2 * Math.PI);
          const blink = 0.45 + 0.55 * Math.abs(Math.sin(tt));
          const col = TYPE_COLORS[p.type];
          const base = (0.45 + d * 0.55) * (0.4 + dayNight * 0.6);
          return (
            <g key={`hub-${i}`}>
              <circle cx={x} cy={y} r={3 + blink * 2} fill={col}
                opacity={base * 0.18} />
              <circle cx={x} cy={y} r={1.6 + blink * 0.9} fill={col}
                opacity={base * (0.65 + blink * 0.35)}
                style={{ filter: `drop-shadow(0 0 4px ${col})` }} />
              <circle cx={x} cy={y} r={0.7} fill="#FFFFFF" opacity={base * 0.95} />
            </g>
          );
        })}

        {/* ───── Pulse "ping" sur un hub aléatoire ───── */}
        {(() => {
          const cycleMs = 2400;
          const phase = ((tick * 1000) % cycleMs) / cycleMs;
          const idx = Math.floor((tick * 1000) / cycleMs) % ANCHOR_POINTS.length;
          const p = ANCHOR_POINTS[idx];
          if (!p) return null;
          const { x, y, z } = project(p.lat, p.lng);
          if (z < 0) return null;
          const pr = 3 + phase * 22;
          const op = Math.max(0, 1 - phase) * 0.85;
          const col = TYPE_COLORS[p.type];
          return (
            <circle cx={x} cy={y} r={pr} fill="none"
              stroke={col} strokeWidth={1.2} opacity={op} />
          );
        })()}

        {/* ───── Arcs de trade simultanés (3) ───── */}
        {arcSlots.map((slot, slotIdx) => {
          const elapsed = (tick * 1000) + slot.off;
          const cycleIdx = Math.floor(elapsed / slot.len);
          const phase = (elapsed % slot.len) / slot.len;
          const idxA = (cycleIdx * slot.seedA + slotIdx * 2)     % ANCHOR_POINTS.length;
          const idxB = (cycleIdx * slot.seedB + slotIdx * 5 + 1) % ANCHOR_POINTS.length;
          if (idxA === idxB) return null;
          const a = ANCHOR_POINTS[idxA];
          const b = ANCHOR_POINTS[idxB];
          const pa = project(a.lat, a.lng);
          const pb = project(b.lat, b.lng);
          if (pa.z < 0 || pb.z < 0) return null;

          const mx = (pa.x + pb.x) / 2;
          const my = (pa.y + pb.y) / 2;
          const dx = mx - cx;
          const dy = my - cy;
          const len = Math.sqrt(dx * dx + dy * dy);
          const lift = 0.5;
          const ctrlX = cx + (dx / Math.max(len, 1)) * (len + r * lift);
          const ctrlY = cy + (dy / Math.max(len, 1)) * (len + r * lift);

          const opacity =
            phase < 0.12
              ? phase / 0.12
              : phase < 0.78
                ? 1
                : Math.max(0, 1 - (phase - 0.78) / 0.22);
          const arcColor = TYPE_COLORS[a.type];
          const arcColorB = TYPE_COLORS[b.type];

          // Particle qui voyage (aller)
          const t  = Math.min(1, Math.max(0, (phase - 0.10) / 0.55));
          const px = (1 - t) * (1 - t) * pa.x + 2 * (1 - t) * t * ctrlX + t * t * pb.x;
          const py = (1 - t) * (1 - t) * pa.y + 2 * (1 - t) * t * ctrlY + t * t * pb.y;

          // Particle retour (échange bidirectionnel — symbolise le swap)
          const t2 = Math.min(1, Math.max(0, (phase - 0.30) / 0.55));
          const px2 = (1 - t2) * (1 - t2) * pb.x + 2 * (1 - t2) * t2 * ctrlX + t2 * t2 * pa.x;
          const py2 = (1 - t2) * (1 - t2) * pb.y + 2 * (1 - t2) * t2 * ctrlY + t2 * t2 * pa.y;

          return (
            <g key={`arc-${slotIdx}`} opacity={opacity * 0.92}>
              <path
                d={`M ${pa.x} ${pa.y} Q ${ctrlX} ${ctrlY} ${pb.x} ${pb.y}`}
                fill="none"
                stroke={arcColor}
                strokeWidth={1.3}
                strokeLinecap="round"
                strokeDasharray="3 4"
                style={{ filter: `drop-shadow(0 0 3px ${arcColor})` }}
              />
              <circle cx={px} cy={py} r={2}
                fill="#FFFFFF"
                style={{ filter: `drop-shadow(0 0 5px ${arcColor})` }} />
              {phase > 0.30 && (
                <circle cx={px2} cy={py2} r={1.6}
                  fill="#FFFFFF"
                  style={{ filter: `drop-shadow(0 0 5px ${arcColorB})` }} />
              )}
            </g>
          );
        })}

        {/* ───── Pokéballs en orbite ───── */}
        {pokeballs.map((o, i) => {
          const a = tick * o.speed + o.offset;
          const tiltRad = (o.tilt * Math.PI) / 180;
          const x = cx + Math.cos(a) * orbitR;
          const y = cy + Math.sin(a) * orbitR * Math.sin(tiltRad);
          const z = Math.sin(a) * Math.cos(tiltRad);
          // Devant (z>0) = opaque, derrière = atténué
          const depth = 0.35 + 0.65 * ((z + 1) / 2);
          const rot = (a * 180) / Math.PI;
          return (
            <PokeballMark
              key={`pb-${i}`}
              x={x} y={y}
              size={o.size}
              opacity={depth}
              rot={rot}
            />
          );
        })}

        {/* ───── Particules ascendantes (signaux upload) ───── */}
        {(() => {
          const count = 6;
          const items = [];
          for (let i = 0; i < count; i++) {
            const ph = ((tick * 0.55 + i * 0.18) % 1);
            const angOff = (i * 0.95 + tick * 0.12) % (2 * Math.PI);
            const baseR = r + 4;
            const dist  = baseR + ph * (size * 0.18);
            const x = cx + Math.cos(angOff) * dist;
            const y = cy + Math.sin(angOff) * dist;
            const op = Math.max(0, 1 - ph) * 0.55;
            const col = i % 2 === 0 ? ACCENT : ACCENT_3;
            items.push(
              <circle key={`up-${i}`} cx={x} cy={y} r={1.2 + (1 - ph) * 0.8}
                fill={col} opacity={op}
                style={{ filter: `drop-shadow(0 0 4px ${col})` }} />
            );
          }
          return <g>{items}</g>;
        })()}

        {/* Pôles */}
        <circle cx={cx} cy={cy - r} r={1.4} fill={ACCENT}   opacity={0.5} />
        <circle cx={cx} cy={cy + r} r={1.4} fill={ACCENT_2} opacity={0.5} />
      </svg>
    </div>
  );
}
