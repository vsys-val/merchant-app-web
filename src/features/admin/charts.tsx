import { KeyboardEvent, PointerEvent, ReactNode, useId, useState } from "react";
import { CheckCircle, MinusCircle, WarningCircle } from "@phosphor-icons/react";

/*
 * Gráficos do painel em SVG simples, seguindo a skill de visualização:
 * barras <= 24px com ponta arredondada, linhas de 2px, grade em hairline
 * sólida, rótulos só no máximo e no último valor, tooltip por ponteiro e
 * teclado e, para cada gráfico, uma tabela com os mesmos números.
 */

const WIDTH = 640;
const HEIGHT = 180;
const PAD = { top: 16, right: 44, bottom: 26, left: 40 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

export const numberFormat = new Intl.NumberFormat("pt-BR");
const compactFormat = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

export function formatDay(iso: string) {
  const [, month, day] = iso.split("-");
  return `${day}/${month}`;
}

function niceMax(value: number) {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((candidate) => value <= candidate * 4) ?? magnitude * 10;
  return step * 4;
}

function ticks(max: number) {
  return [0, max / 4, max / 2, (3 * max) / 4, max];
}

interface TooltipState {
  index: number;
  x: number;
}

function ChartFrame({
  title,
  subtitle,
  legend,
  children,
  table,
}: {
  title: string;
  subtitle?: string;
  legend?: ReactNode;
  children: ReactNode;
  table: ReactNode;
}) {
  return (
    <figure className="chartCard">
      <figcaption>
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </figcaption>
      {legend}
      {children}
      <details className="chartTable">
        <summary>Ver tabela</summary>
        {table}
      </details>
    </figure>
  );
}

function useKeyboardIndex(length: number) {
  const [active, setActive] = useState<TooltipState | null>(null);
  function onKeyDown(event: KeyboardEvent<SVGSVGElement>, xFor: (index: number) => number) {
    if (length === 0) return;
    // Sem ponto ativo, as setas começam pelo dia mais recente.
    const current = active?.index;
    let next: number | null = null;
    if (event.key === "ArrowRight") next = current === undefined ? length - 1 : Math.min(length - 1, current + 1);
    if (event.key === "ArrowLeft") next = current === undefined ? length - 1 : Math.max(0, current - 1);
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = length - 1;
    if (event.key === "Escape") { setActive(null); return; }
    if (next === null) return;
    event.preventDefault();
    setActive({ index: next, x: xFor(next) });
  }
  return { active, setActive, onKeyDown };
}

/** Uma série ao longo do tempo, em colunas de uma só cor. */
export function ColumnChart({
  title,
  subtitle,
  points,
  unit = "",
  format = (value: number) => numberFormat.format(value),
}: {
  title: string;
  subtitle?: string;
  points: Array<{ label: string; value: number | null }>;
  unit?: string;
  format?: (value: number) => string;
}) {
  const values = points.map((point) => point.value ?? 0);
  const max = niceMax(Math.max(0, ...values));
  const band = PLOT_W / Math.max(points.length, 1);
  const barWidth = Math.min(24, Math.max(2, band - 2));
  const xFor = (index: number) => PAD.left + band * index + band / 2;
  const yFor = (value: number) => PAD.top + PLOT_H - (value / max) * PLOT_H;
  const { active, setActive, onKeyDown } = useKeyboardIndex(points.length);
  const maxIndex = values.indexOf(Math.max(...values));
  const labelled = new Set([maxIndex, points.length - 1].filter((index) => index >= 0 && values[index] > 0));
  const description = `${title}. ${points.length} pontos, máximo ${format(values[maxIndex] ?? 0)}${unit}.`;

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      table={<SimpleTable headers={["Dia", `Valor${unit ? ` (${unit.trim()})` : ""}`]} rows={points.map((point) => [point.label, point.value === null ? "—" : format(point.value)])} />}
    >
      <div className="chartBody">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={description} tabIndex={0}
          onKeyDown={(event) => onKeyDown(event, xFor)} onBlur={() => setActive(null)}
          onPointerLeave={() => setActive(null)}>
          <Grid max={max} format={(value) => compactFormat.format(value)} />
          {points.map((point, index) => {
            const value = point.value ?? 0;
            const x = xFor(index) - barWidth / 2;
            const y = yFor(value);
            const height = PAD.top + PLOT_H - y;
            return (
              <g key={point.label}>
                {height > 0 && (
                  <path className={`columnMark${active?.index === index ? " isActive" : ""}`}
                    d={roundedTop(x, y, barWidth, height, Math.min(4, barWidth / 2, height))} />
                )}
                {labelled.has(index) && (
                  <text className="markLabel" x={xFor(index)} y={y - 5} textAnchor="middle">{format(value)}</text>
                )}
                <rect className="hitArea" x={PAD.left + band * index} y={PAD.top} width={band} height={PLOT_H}
                  onPointerEnter={() => setActive({ index, x: xFor(index) })} />
              </g>
            );
          })}
          <XLabels labels={points.map((point) => point.label)} xFor={xFor} />
        </svg>
        {active && points[active.index] && (
          <Tooltip x={active.x} title={points[active.index].label}
            rows={[{ label: title, value: points[active.index].value === null ? "sem dados" : `${format(points[active.index].value ?? 0)}${unit}` }]} />
        )}
      </div>
    </ChartFrame>
  );
}

export interface LineSeries {
  name: string;
  slot: 1 | 2;
  values: number[];
}

/** Várias séries da mesma unidade, com um único eixo. */
export function LineChart({
  title,
  subtitle,
  labels,
  series,
}: {
  title: string;
  subtitle?: string;
  labels: string[];
  series: LineSeries[];
}) {
  const max = niceMax(Math.max(0, ...series.flatMap((item) => item.values)));
  const step = PLOT_W / Math.max(labels.length - 1, 1);
  const xFor = (index: number) => PAD.left + step * index;
  const yFor = (value: number) => PAD.top + PLOT_H - (value / max) * PLOT_H;
  const { active, setActive, onKeyDown } = useKeyboardIndex(labels.length);
  const last = labels.length - 1;

  function pointerMove(event: PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * WIDTH;
    const index = Math.max(0, Math.min(last, Math.round((x - PAD.left) / step)));
    setActive({ index, x: xFor(index) });
  }

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      legend={
        <ul className="chartLegend">
          {series.map((item) => <li key={item.name}><span className={`lineKey slot${item.slot}`} />{item.name}</li>)}
        </ul>
      }
      table={<SimpleTable headers={["Dia", ...series.map((item) => item.name)]} rows={labels.map((label, index) => [label, ...series.map((item) => numberFormat.format(item.values[index]))])} />}
    >
      <div className="chartBody">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" tabIndex={0}
          aria-label={`${title}. ${series.map((item) => `${item.name}: último valor ${numberFormat.format(item.values[last] ?? 0)}`).join("; ")}.`}
          onPointerMove={pointerMove} onPointerLeave={() => setActive(null)}
          onKeyDown={(event) => onKeyDown(event, xFor)} onBlur={() => setActive(null)}>
          <Grid max={max} format={(value) => compactFormat.format(value)} />
          {active && <line className="crosshair" x1={active.x} x2={active.x} y1={PAD.top} y2={PAD.top + PLOT_H} />}
          {series.map((item) => (
            <g key={item.name}>
              <polyline className={`lineMark slot${item.slot}`}
                points={item.values.map((value, index) => `${xFor(index)},${yFor(value)}`).join(" ")} />
              <circle className={`dotMark slot${item.slot}`} cx={xFor(last)} cy={yFor(item.values[last] ?? 0)} r={4} />
              <text className="markLabel" x={xFor(last) + 8} y={yFor(item.values[last] ?? 0) + 4}>{numberFormat.format(item.values[last] ?? 0)}</text>
              {active && <circle className={`dotMark slot${item.slot}`} cx={active.x} cy={yFor(item.values[active.index] ?? 0)} r={4} />}
            </g>
          ))}
          <XLabels labels={labels} xFor={xFor} />
        </svg>
        {active && (
          <Tooltip x={active.x} title={labels[active.index]}
            rows={series.map((item) => ({ label: item.name, value: numberFormat.format(item.values[active.index] ?? 0), slot: item.slot }))} />
        )}
      </div>
    </ChartFrame>
  );
}

function Grid({ max, format }: { max: number; format(value: number): string }) {
  return (
    <g aria-hidden="true">
      {ticks(max).map((tick) => {
        const y = PAD.top + PLOT_H - (tick / max) * PLOT_H;
        return (
          <g key={tick}>
            <line className={tick === 0 ? "baseline" : "gridline"} x1={PAD.left} x2={PAD.left + PLOT_W} y1={y} y2={y} />
            <text className="axisLabel" x={PAD.left - 6} y={y + 4} textAnchor="end">{format(tick)}</text>
          </g>
        );
      })}
    </g>
  );
}

function XLabels({ labels, xFor }: { labels: string[]; xFor(index: number): number }) {
  const indices = Array.from(new Set([0, Math.floor((labels.length - 1) / 2), labels.length - 1])).filter((index) => index >= 0);
  return (
    <g aria-hidden="true">
      {indices.map((index) => (
        <text key={index} className="axisLabel" x={xFor(index)} y={HEIGHT - 6} textAnchor="middle">{labels[index]}</text>
      ))}
    </g>
  );
}

function roundedTop(x: number, y: number, width: number, height: number, radius: number) {
  const bottom = y + height;
  return `M${x},${bottom} V${y + radius} Q${x},${y} ${x + radius},${y} H${x + width - radius} Q${x + width},${y} ${x + width},${y + radius} V${bottom} Z`;
}

function Tooltip({ x, title, rows }: { x: number; title: string; rows: Array<{ label: string; value: string; slot?: 1 | 2 }> }) {
  const left = `${(x / WIDTH) * 100}%`;
  return (
    <div className="chartTooltip" style={{ left }} role="status">
      <span className="tooltipTitle">{title}</span>
      {rows.map((row) => (
        <span className="tooltipRow" key={row.label}>
          {row.slot && <span className={`lineKey slot${row.slot}`} />}
          <strong>{row.value}</strong>
          <span>{row.label}</span>
        </span>
      ))}
    </div>
  );
}

export function SimpleTable({ headers, rows }: { headers: string[]; rows: Array<Array<ReactNode>> }) {
  return (
    <div className="tableScroll">
      <table className="dataTable">
        <thead><tr>{headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

/** Barras horizontais de uma cor (magnitude) ou rampa ordinal (funil). */
export function BarList({
  rows,
  ordinal = false,
  format = (value: number) => numberFormat.format(value),
}: {
  rows: Array<{ label: string; value: number; detail?: string }>;
  ordinal?: boolean;
  format?: (value: number) => string;
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <ul className="barList">
      {rows.map((row, index) => (
        <li key={row.label}>
          <span className="barLabel">{row.label}</span>
          <span className="barTrack">
            <span className={`barFill${ordinal ? ` ordinal${Math.min(index + 1, 4)}` : ""}`} style={{ width: `${(row.value / max) * 100}%` }} />
          </span>
          <span className="barValue">{format(row.value)}{row.detail && <small>{row.detail}</small>}</span>
        </li>
      ))}
    </ul>
  );
}

/** Positivo à direita, negativo à esquerda, a partir de um eixo neutro. */
export function DivergingBars({ rows }: { rows: Array<{ label: string; positive: number; negative: number }> }) {
  const max = Math.max(1, ...rows.flatMap((row) => [row.positive, row.negative]));
  return (
    <div>
      <ul className="chartLegend">
        <li><span className="swatch negative" />Negativa</li>
        <li><span className="swatch positive" />Positiva</li>
      </ul>
      <ul className="divergingList">
        {rows.map((row) => (
          <li key={row.label}>
            <span className="barLabel">{row.label}</span>
            <span className="divergingSide left">
              <span className="divergingValue">{row.negative > 0 ? numberFormat.format(row.negative) : ""}</span>
              <span className="divergingFill negative" style={{ width: `${(row.negative / max) * 100}%` }} />
            </span>
            <span className="divergingSide right">
              <span className="divergingFill positive" style={{ width: `${(row.positive / max) * 100}%` }} />
              <span className="divergingValue">{row.positive > 0 ? numberFormat.format(row.positive) : ""}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type Health = "good" | "bad" | "none";

export function healthFor(value: number | null, target: number, direction: "min" | "max"): Health {
  if (value === null) return "none";
  return direction === "min" ? (value >= target ? "good" : "bad") : (value <= target ? "good" : "bad");
}

/** Número com meta explícita; o estado sempre vem com ícone e texto. */
export function StatTile({
  label,
  value,
  goal,
  health,
  detail,
  hero = false,
}: {
  label: string;
  value: string;
  goal?: string;
  health?: Health;
  detail?: string;
  hero?: boolean;
}) {
  const id = useId();
  const status = health === "good"
    ? { icon: <CheckCircle size={16} weight="fill" />, text: "Dentro da meta" }
    : health === "bad"
      ? { icon: <WarningCircle size={16} weight="fill" />, text: "Fora da meta" }
      : health === "none"
        ? { icon: <MinusCircle size={16} weight="fill" />, text: "Sem dados suficientes" }
        : null;
  return (
    <article className={`statTile${hero ? " statTile--hero" : ""}`} aria-labelledby={id}>
      <h3 id={id}>{label}</h3>
      <p className="statValue">{value}</p>
      {goal && <p className="statGoal">{goal}</p>}
      {status && <p className={`statStatus ${health}`}>{status.icon}{status.text}</p>}
      {detail && <p className="statDetail">{detail}</p>}
    </article>
  );
}
