import type React from "react";
import Svg, { Circle, G, Path, Polyline, Rect } from "react-native-svg";
import { View } from "react-native";

// Inline SVG glyphs covering MET Norway's symbol_code vocabulary. Visual
// language follows MET's icon set (sun/moon over clouds, raindrop = rain,
// snowflake = snow, bolt = thunder) without lifting the exact assets. Bundled
// inline so there's no Metro transformer config and the icons travel with the
// JS bundle for free. Refining toward the literal MET SVGs is a v0.5 polish.

type Suffix = "day" | "night" | "polartwilight";

interface GlyphProps {
  size: number;
}

function rootAndSuffix(symbol: string): { root: string; suffix: Suffix } {
  const m = symbol.match(/^([a-z]+?)(?:_(day|night|polartwilight))?$/);
  if (!m) return { root: symbol, suffix: "day" };
  return {
    root: m[1] ?? symbol,
    suffix: (m[2] as Suffix | undefined) ?? "day",
  };
}

const COLORS = {
  sunBody: "#facc15",
  sunRay: "#f59e0b",
  moonBody: "#e2e8f0",
  moonShadow: "#94a3b8",
  cloud: "#cbd5e1",
  cloudDark: "#94a3b8",
  cloudEdge: "#64748b",
  rain: "#0284c7",
  sleet: "#0ea5e9",
  snow: "#e0f2fe",
  snowEdge: "#7dd3fc",
  bolt: "#f97316",
  fog: "#94a3b8",
};

function Sun({ size, cx = 0.32, cy = 0.32, r = 0.16 }: GlyphProps & { cx?: number; cy?: number; r?: number }) {
  const rays: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const cxPx = cx * size;
  const cyPx = cy * size;
  const inner = r * size + size * 0.04;
  const outer = r * size + size * 0.11;
  for (let i = 0; i < 8; i += 1) {
    const a = (i * Math.PI) / 4;
    rays.push({
      x1: cxPx + inner * Math.cos(a),
      y1: cyPx + inner * Math.sin(a),
      x2: cxPx + outer * Math.cos(a),
      y2: cyPx + outer * Math.sin(a),
    });
  }
  return (
    <G>
      {rays.map((s, i) => (
        <Path
          key={i}
          d={`M ${s.x1} ${s.y1} L ${s.x2} ${s.y2}`}
          stroke={COLORS.sunRay}
          strokeWidth={size * 0.025}
          strokeLinecap="round"
        />
      ))}
      <Circle cx={cxPx} cy={cyPx} r={r * size} fill={COLORS.sunBody} />
    </G>
  );
}

function Moon({ size, cx = 0.34, cy = 0.32, r = 0.16 }: GlyphProps & { cx?: number; cy?: number; r?: number }) {
  const cxPx = cx * size;
  const cyPx = cy * size;
  const rPx = r * size;
  return (
    <G>
      <Circle cx={cxPx} cy={cyPx} r={rPx} fill={COLORS.moonBody} />
      <Circle
        cx={cxPx + rPx * 0.45}
        cy={cyPx - rPx * 0.2}
        r={rPx * 0.85}
        fill="#0b1220"
      />
    </G>
  );
}

function Cloud({ size, offsetY = 0 }: GlyphProps & { offsetY?: number }) {
  // Cloud silhouette covering the lower-right ~70% of the canvas.
  const s = size;
  const dy = offsetY * s;
  const d = `M ${0.18 * s} ${0.62 * s + dy}
             C ${0.05 * s} ${0.62 * s + dy} ${0.05 * s} ${0.45 * s + dy} ${0.22 * s} ${0.45 * s + dy}
             C ${0.22 * s} ${0.30 * s + dy} ${0.45 * s} ${0.27 * s + dy} ${0.5 * s} ${0.40 * s + dy}
             C ${0.62 * s} ${0.32 * s + dy} ${0.85 * s} ${0.38 * s + dy} ${0.82 * s} ${0.55 * s + dy}
             C ${0.97 * s} ${0.55 * s + dy} ${0.97 * s} ${0.72 * s + dy} ${0.78 * s} ${0.72 * s + dy}
             L ${0.18 * s} ${0.72 * s + dy} Z`;
  return (
    <Path
      d={d}
      fill={COLORS.cloud}
      stroke={COLORS.cloudEdge}
      strokeWidth={s * 0.015}
    />
  );
}

function RainDrop({
  size,
  x,
  y,
  color = COLORS.rain,
}: GlyphProps & { x: number; y: number; color?: string }) {
  const s = size;
  const cx = x * s;
  const cy = y * s;
  return (
    <Path
      d={`M ${cx} ${cy} L ${cx - s * 0.025} ${cy + s * 0.07} L ${cx + s * 0.025} ${cy + s * 0.07} Z`}
      fill={color}
    />
  );
}

function SnowFlake({ size, x, y }: GlyphProps & { x: number; y: number }) {
  const s = size;
  const cx = x * s;
  const cy = y * s;
  const r = s * 0.04;
  return (
    <G>
      <Path d={`M ${cx - r} ${cy} L ${cx + r} ${cy}`} stroke={COLORS.snowEdge} strokeWidth={s * 0.012} strokeLinecap="round" />
      <Path d={`M ${cx} ${cy - r} L ${cx} ${cy + r}`} stroke={COLORS.snowEdge} strokeWidth={s * 0.012} strokeLinecap="round" />
      <Path d={`M ${cx - r * 0.7} ${cy - r * 0.7} L ${cx + r * 0.7} ${cy + r * 0.7}`} stroke={COLORS.snowEdge} strokeWidth={s * 0.012} strokeLinecap="round" />
      <Path d={`M ${cx - r * 0.7} ${cy + r * 0.7} L ${cx + r * 0.7} ${cy - r * 0.7}`} stroke={COLORS.snowEdge} strokeWidth={s * 0.012} strokeLinecap="round" />
    </G>
  );
}

function Bolt({ size, x = 0.5, y = 0.65 }: GlyphProps & { x?: number; y?: number }) {
  const s = size;
  const cx = x * s;
  const cy = y * s;
  return (
    <Polyline
      points={`${cx - s * 0.04},${cy} ${cx},${cy} ${cx - s * 0.02},${cy + s * 0.08} ${cx + s * 0.05},${cy - s * 0.03} ${cx + s * 0.01},${cy - s * 0.03} ${cx + s * 0.05},${cy - s * 0.12}`}
      fill={COLORS.bolt}
      stroke={COLORS.bolt}
      strokeWidth={s * 0.01}
      strokeLinejoin="round"
    />
  );
}

function FogBars({ size }: GlyphProps) {
  const s = size;
  return (
    <G>
      {[0.5, 0.65, 0.8].map((y, i) => (
        <Rect
          key={i}
          x={s * 0.12}
          y={s * y}
          width={s * 0.76}
          height={s * 0.04}
          rx={s * 0.02}
          fill={COLORS.fog}
          opacity={0.7}
        />
      ))}
    </G>
  );
}

type DropKind = "rain" | "sleet" | "snow";

function dropsBeneathCloud(size: number, count: number, kind: DropKind) {
  const xs = [0.32, 0.5, 0.68, 0.26, 0.74];
  const ys = kind === "snow" ? [0.82, 0.78, 0.82, 0.92, 0.92] : [0.85, 0.8, 0.85, 0.95, 0.95];
  const out: React.ReactElement[] = [];
  for (let i = 0; i < count && i < xs.length; i += 1) {
    if (kind === "snow") {
      out.push(<SnowFlake key={`s${i}`} size={size} x={xs[i]!} y={ys[i]!} />);
    } else {
      const color = kind === "sleet" ? COLORS.sleet : COLORS.rain;
      out.push(<RainDrop key={`r${i}`} size={size} x={xs[i]!} y={ys[i]!} color={color} />);
    }
  }
  return out;
}

function renderSymbol(symbol: string, size: number): React.ReactElement {
  const { root, suffix } = rootAndSuffix(symbol);
  const isNight = suffix === "night";
  const Body = isNight ? Moon : Sun;
  const intensity = root.startsWith("heavy")
    ? "heavy"
    : root.startsWith("light")
      ? "light"
      : "medium";
  const dropCount = intensity === "heavy" ? 5 : intensity === "light" ? 2 : 3;

  // Categorize MET bases into the visual families.
  if (root === "clearsky") {
    return <Body size={size} cx={0.5} cy={0.5} r={0.22} />;
  }
  if (root === "fair") {
    return (
      <G>
        <Body size={size} />
        <Cloud size={size} offsetY={0.05} />
      </G>
    );
  }
  if (root === "partlycloudy") {
    return (
      <G>
        <Body size={size} cx={0.28} cy={0.3} r={0.13} />
        <Cloud size={size} />
      </G>
    );
  }
  if (root === "cloudy") {
    return <Cloud size={size} offsetY={0.05} />;
  }
  if (root === "fog") {
    return (
      <G>
        <Cloud size={size} offsetY={-0.05} />
        <FogBars size={size} />
      </G>
    );
  }
  if (root.includes("snow")) {
    return (
      <G>
        {root.includes("showers") ? <Body size={size} cx={0.28} cy={0.28} r={0.1} /> : null}
        <Cloud size={size} />
        {dropsBeneathCloud(size, dropCount, "snow")}
      </G>
    );
  }
  if (root.includes("sleet")) {
    return (
      <G>
        {root.includes("showers") ? <Body size={size} cx={0.28} cy={0.28} r={0.1} /> : null}
        <Cloud size={size} />
        {dropsBeneathCloud(size, dropCount, "sleet")}
      </G>
    );
  }
  if (root.includes("rain")) {
    const isThunder = root.includes("thunder");
    return (
      <G>
        {root.includes("showers") && !isThunder ? <Body size={size} cx={0.28} cy={0.28} r={0.1} /> : null}
        <Cloud size={size} />
        {dropsBeneathCloud(size, dropCount, "rain")}
        {isThunder ? <Bolt size={size} /> : null}
      </G>
    );
  }
  // Fallback — cloud with a gentle accent. Keeps the layout sane on unknown codes.
  return <Cloud size={size} offsetY={0.05} />;
}

export function WeatherSymbol({
  symbol,
  size = 72,
}: {
  symbol: string;
  size?: number;
}) {
  return (
    <View accessibilityLabel={symbol.replace(/_/g, " ")} style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {renderSymbol(symbol, size)}
      </Svg>
    </View>
  );
}
