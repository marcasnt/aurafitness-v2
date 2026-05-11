import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { User } from '../types/fitness';

// Material Dark Athletic theme colors
const METRICS = [
  { key: 'weight', label: 'Peso', unit: 'kg', color: '#d4f826', category: 'composicion' },
  { key: 'bodyFat', label: '% Grasa', unit: '%', color: '#ff9100', category: 'composicion' },
  { key: 'waist', label: 'Cintura', unit: 'cm', color: '#00e5ff', category: 'circunferencia' },
  { key: 'hips', label: 'Cadera', unit: 'cm', color: '#ff00ff', category: 'circunferencia' },
  { key: 'neck', label: 'Cuello', unit: 'cm', color: '#e5ba73', category: 'circunferencia' },
  { key: 'bicepsLeft', label: 'Bíceps Izq.', unit: 'cm', color: '#2979ff', category: 'circunferencia' },
  { key: 'bicepsRight', label: 'Bíceps Der.', unit: 'cm', color: '#ff5449', category: 'circunferencia' },
  { key: 'thighsLeft', label: 'Pierna Izq.', unit: 'cm', color: '#76ff03', category: 'circunferencia' },
  { key: 'thighsRight', label: 'Pierna Der.', unit: 'cm', color: '#8e8e93', category: 'circunferencia' },
];

const GRID_COLOR = '#27272a';
const TEXT_COLOR = '#a1a1aa';
const TOOLTIP_BG = '#1c1c1f';
const TOOLTIP_BORDER = '#27272a';

const tooltipStyle = {
  backgroundColor: TOOLTIP_BG,
  border: `1px solid ${TOOLTIP_BORDER}`,
  borderRadius: '8px',
  fontSize: '11px',
  color: '#e4e2e6',
  fontFamily: 'Geist, monospace',
};

const axisStyle = {
  fontSize: 10,
  fill: TEXT_COLOR,
  fontFamily: 'Geist, monospace',
};

interface CombinedEntry {
  date: string;
  weight?: number;
  bodyFat?: number;
  waist?: number;
  hips?: number;
  neck?: number;
  bicepsLeft?: number;
  bicepsRight?: number;
  thighsLeft?: number;
  thighsRight?: number;
}

function combineData(user: User): CombinedEntry[] {
  const map = new Map<string, CombinedEntry>();

  // Weight history
  (user.weightHistory || []).forEach(entry => {
    const existing = map.get(entry.date);
    if (existing) {
      existing.weight = entry.weight;
    } else {
      map.set(entry.date, { date: entry.date, weight: entry.weight });
    }
  });

  // Measurements history
  (user.measurementsHistory || []).forEach(entry => {
    const existing = map.get(entry.date);
    if (existing) {
      existing.bodyFat = entry.bodyFat;
      existing.waist = entry.waist || existing.waist;
      existing.hips = entry.hips || existing.hips;
      existing.neck = entry.neck || existing.neck;
      existing.bicepsLeft = entry.bicepsLeft || existing.bicepsLeft;
      existing.bicepsRight = entry.bicepsRight || existing.bicepsRight;
      existing.thighsLeft = entry.thighsLeft || existing.thighsLeft;
      existing.thighsRight = entry.thighsRight || existing.thighsRight;
    } else {
      map.set(entry.date, {
        date: entry.date,
        bodyFat: entry.bodyFat,
        waist: entry.waist,
        hips: entry.hips,
        neck: entry.neck,
        bicepsLeft: entry.bicepsLeft,
        bicepsRight: entry.bicepsRight,
        thighsLeft: entry.thighsLeft,
        thighsRight: entry.thighsRight,
      });
    }
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

interface ProgressLineChartProps {
  user: User;
  title?: string;
}

export const ProgressLineChart: React.FC<ProgressLineChartProps> = ({ user, title = 'Evolución del Atleta' }) => {
  const data = useMemo(() => combineData(user), [user]);

  // Determinar qué métricas tienen datos
  const availableMetrics = useMemo(() => {
    return METRICS.filter(m => data.some(d => (d as any)[m.key] !== undefined && (d as any)[m.key] !== 0));
  }, [data]);

  const [selectedKeys, setSelectedKeys] = useState<string[]>(() => {
    // Por defecto: Peso y % Grasa si existen, sino las primeras 2 disponibles
    const defaults: string[] = [];
    if (availableMetrics.some(m => m.key === 'weight')) defaults.push('weight');
    if (availableMetrics.some(m => m.key === 'bodyFat')) defaults.push('bodyFat');
    if (defaults.length === 0 && availableMetrics.length > 0) {
      defaults.push(availableMetrics[0].key);
      if (availableMetrics.length > 1) defaults.push(availableMetrics[1].key);
    }
    return defaults;
  });

  const toggleMetric = (key: string) => {
    setSelectedKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const selectedMetrics = METRICS.filter(m => selectedKeys.includes(m.key));

  if (data.length === 0) {
    return (
      <div className="bg-[#141416] border border-[#27272a] rounded-[16px] p-6 text-center">
        <p className="text-xs text-[#52525b]">Sin datos de progreso aún.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#141416] border border-[#27272a] rounded-[16px] p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#d4f826]" />
          {title}
        </h4>
        <span className="text-[9px] text-[#52525b]">{data.length} registros</span>
      </div>

      {/* Selector de métricas tipo chips */}
      <div className="flex flex-wrap gap-1.5">
        {availableMetrics.map(metric => {
          const isActive = selectedKeys.includes(metric.key);
          return (
            <button
              key={metric.key}
              onClick={() => toggleMetric(metric.key)}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-[6px] transition-all border ${
                isActive
                  ? 'text-black border-transparent'
                  : 'text-[#8e8e93] border-[#27272a] hover:border-[#3f3f46] hover:text-white'
              }`}
              style={isActive ? { backgroundColor: metric.color } : undefined}
            >
              {metric.label}
            </button>
          );
        })}
      </div>

      {/* Gráfico de líneas con puntos */}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
          <XAxis
            dataKey="date"
            tick={axisStyle}
            axisLine={{ stroke: GRID_COLOR }}
            tickLine={false}
          />
          <YAxis
            tick={axisStyle}
            axisLine={{ stroke: GRID_COLOR }}
            tickLine={false}
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ color: TEXT_COLOR }}
            formatter={(value: any, name: string) => {
              const metric = METRICS.find(m => m.label === name);
              return [`${value} ${metric?.unit || ''}`, name];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '10px', color: TEXT_COLOR, fontFamily: 'Geist, monospace' }}
          />
          {selectedMetrics.map(metric => (
            <Line
              key={metric.key}
              type="monotone"
              dataKey={metric.key}
              name={metric.label}
              stroke={metric.color}
              strokeWidth={2.5}
              dot={{ r: 4, fill: metric.color, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: metric.color, stroke: '#0a0a0c', strokeWidth: 2 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProgressLineChart;
