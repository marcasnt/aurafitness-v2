import React from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';

// Material Dark Athletic theme colors
const COLORS = {
  lime: '#d4f826',
  limeTransparent: 'rgba(212, 248, 38, 0.15)',
  cyan: '#00e5ff',
  magenta: '#ff00ff',
  orange: '#ff9100',
  lightGreen: '#76ff03',
  blue: '#2979ff',
  red: '#ff5449',
  grid: '#27272a',
  text: '#a1a1aa',
  tooltipBg: '#1c1c1f',
  tooltipBorder: '#27272a',
};

const tooltipStyle = {
  backgroundColor: COLORS.tooltipBg,
  border: `1px solid ${COLORS.tooltipBorder}`,
  borderRadius: '8px',
  fontSize: '11px',
  color: '#e4e2e6',
  fontFamily: 'Geist, monospace',
};

const axisStyle = {
  fontSize: 10,
  fill: COLORS.text,
  fontFamily: 'Geist, monospace',
};

interface WeightChartProps {
  data: { date: string; weight: number }[];
}

export function WeightChart({ data }: WeightChartProps) {
  const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return (
    <div className="bg-[#141416] border border-[#27272a] rounded-[16px] p-4">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#d4f826]" />
        Evolución de Peso
      </h4>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={sorted} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
          <defs>
            <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.lime} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLORS.lime} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
          <XAxis dataKey="date" tick={axisStyle} axisLine={{ stroke: COLORS.grid }} tickLine={false} />
          <YAxis tick={axisStyle} axisLine={{ stroke: COLORS.grid }} tickLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
          <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: COLORS.lime }} labelStyle={{ color: COLORS.text }} formatter={(value: number) => [`${value} kg`, 'Peso']} />
          <Area type="monotone" dataKey="weight" stroke={COLORS.lime} strokeWidth={2} fill="url(#weightGradient)" dot={{ fill: COLORS.lime, r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: COLORS.lime, stroke: '#0a0a0c', strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface MeasurementsChartProps {
  data: { date: string; waist?: number; hips?: number; neck?: number; thighs?: number }[];
}

export function BodyMeasurementsChart({ data }: MeasurementsChartProps) {
  const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return (
    <div className="bg-[#141416] border border-[#27272a] rounded-[16px] p-4">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#00e5ff]" />
        Medidas Corporales
      </h4>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={sorted} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
          <XAxis dataKey="date" tick={axisStyle} axisLine={{ stroke: COLORS.grid }} tickLine={false} />
          <YAxis tick={axisStyle} axisLine={{ stroke: COLORS.grid }} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: COLORS.text }} />
          <Legend wrapperStyle={{ fontSize: '10px', color: COLORS.text, fontFamily: 'Geist, monospace' }} />
          <Line type="monotone" dataKey="waist" name="Cintura" stroke={COLORS.cyan} strokeWidth={2} dot={{ r: 3, fill: COLORS.cyan, strokeWidth: 0 }} />
          <Line type="monotone" dataKey="hips" name="Cadera" stroke={COLORS.magenta} strokeWidth={2} dot={{ r: 3, fill: COLORS.magenta, strokeWidth: 0 }} />
          <Line type="monotone" dataKey="neck" name="Cuello" stroke={COLORS.orange} strokeWidth={2} dot={{ r: 3, fill: COLORS.orange, strokeWidth: 0 }} />
          <Line type="monotone" dataKey="thighs" name="Piernas" stroke={COLORS.lightGreen} strokeWidth={2} dot={{ r: 3, fill: COLORS.lightGreen, strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface BicepsChartProps {
  data: { date: string; bicepsLeft?: number; bicepsRight?: number }[];
}

export function BicepsChart({ data }: BicepsChartProps) {
  const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return (
    <div className="bg-[#141416] border border-[#27272a] rounded-[16px] p-4">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#2979ff]" />
        Comparación de Bíceps
      </h4>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={sorted} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
          <XAxis dataKey="date" tick={axisStyle} axisLine={{ stroke: COLORS.grid }} tickLine={false} />
          <YAxis tick={axisStyle} axisLine={{ stroke: COLORS.grid }} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: COLORS.text }} formatter={(value: number, name: string) => [`${value} cm`, name === 'bicepsLeft' ? 'Izquierdo' : 'Derecho']} />
          <Legend wrapperStyle={{ fontSize: '10px', color: COLORS.text, fontFamily: 'Geist, monospace' }} formatter={(value: string) => value === 'bicepsLeft' ? 'Izquierdo' : 'Derecho'} />
          <Bar dataKey="bicepsLeft" name="bicepsLeft" fill={COLORS.blue} radius={[4, 4, 0, 0]} barSize={20} />
          <Bar dataKey="bicepsRight" name="bicepsRight" fill={COLORS.red} radius={[4, 4, 0, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface MeasurementCardsProps {
  latest?: { weight?: number; waist?: number; hips?: number; bicepsLeft?: number; bicepsRight?: number; height?: number; neck?: number; thighs?: number };
  previous?: { weight?: number; waist?: number; hips?: number; bicepsLeft?: number; bicepsRight?: number; height?: number; neck?: number; thighs?: number };
}

export function MeasurementCards({ latest, previous }: MeasurementCardsProps) {
  if (!latest) return null;

  const diff = (curr?: number, prev?: number) => {
    if (curr === undefined || prev === undefined || prev === 0) return null;
    const d = curr - prev;
    const pct = ((d / prev) * 100).toFixed(1);
    const isUp = d > 0;
    const isDown = d < 0;
    return { value: Math.abs(d).toFixed(1), pct: Math.abs(Number(pct)).toFixed(1), isUp, isDown, sign: d > 0 ? '+' : '-' };
  };

  const items = [
    { label: 'Peso', value: latest.weight, prev: previous?.weight, unit: 'kg', color: 'text-[#d4f826]' },
    { label: 'Cintura', value: latest.waist, prev: previous?.waist, unit: 'cm', color: 'text-[#00e5ff]' },
    { label: 'Cadera', value: latest.hips, prev: previous?.hips, unit: 'cm', color: 'text-[#ff00ff]' },
    { label: 'Bíceps Izq.', value: latest.bicepsLeft, prev: previous?.bicepsLeft, unit: 'cm', color: 'text-[#2979ff]' },
    { label: 'Bíceps Der.', value: latest.bicepsRight, prev: previous?.bicepsRight, unit: 'cm', color: 'text-[#ff5449]' },
    { label: 'Cuello', value: latest.neck, prev: previous?.neck, unit: 'cm', color: 'text-[#ff9100]' },
    { label: 'Piernas', value: latest.thighs, prev: previous?.thighs, unit: 'cm', color: 'text-[#76ff03]' },
    { label: 'Altura', value: latest.height, prev: previous?.height, unit: 'cm', color: 'text-[#e4e2e6]' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
      {items.map((item) => {
        const d = diff(item.value, item.prev);
        return (
          <div key={item.label} className="bg-[#141416] border border-[#27272a] rounded-[12px] p-3">
            <p className="text-[9px] text-[#52525b] font-mono uppercase tracking-wider">{item.label}</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-lg font-bold ${item.color}`}>{item.value !== undefined && item.value !== 0 ? item.value : '--'}</span>
              <span className="text-[10px] text-[#52525b]">{item.unit}</span>
            </div>
            {d && (
              <div className={`text-[9px] font-mono mt-0.5 ${d.isUp ? 'text-[#ff5449]' : 'text-[#d4f826]'}`}>
                {d.sign}{d.value} ({d.sign}{d.pct}%)
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface WorkoutHistoryChartProps {
  data: { date: string; duration: number; feeling: number }[];
}

export function WorkoutHistoryChart({ data }: WorkoutHistoryChartProps) {
  const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return (
    <div className="bg-[#141416] border border-[#27272a] rounded-[16px] p-4">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#76ff03]" />
        Historial de Entrenos
      </h4>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={sorted} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
          <defs>
            <linearGradient id="durationGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.lightGreen} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLORS.lightGreen} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
          <XAxis dataKey="date" tick={axisStyle} axisLine={{ stroke: COLORS.grid }} tickLine={false} />
          <YAxis tick={axisStyle} axisLine={{ stroke: COLORS.grid }} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: COLORS.text }} formatter={(value: number, name: string) => name === 'duration' ? [`${value} min`, 'Duración'] : [`${value}/5`, 'Sensación']} />
          <Legend wrapperStyle={{ fontSize: '10px', color: COLORS.text, fontFamily: 'Geist, monospace' }} />
          <Area type="monotone" dataKey="duration" name="duration" stroke={COLORS.lightGreen} strokeWidth={2} fill="url(#durationGradient)" dot={{ r: 3, fill: COLORS.lightGreen, strokeWidth: 0 }} />
          <Line type="step" dataKey="feeling" name="feeling" stroke={COLORS.orange} strokeWidth={2} dot={{ r: 3, fill: COLORS.orange, strokeWidth: 0 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
