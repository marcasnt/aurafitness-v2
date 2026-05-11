import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { RulerIcon } from './RulerIcon';
import { MeasurementsEntry } from '../types/fitness';
import { calculateBodyFat, getBodyFatCategory, getBodyFatColor } from '../lib/bodyFatCalculator';

interface MeasurementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: MeasurementsEntry) => void;
  lastMeasurements?: MeasurementsEntry;
  clientName?: string;
  clientGender?: 'male' | 'female';
  clientAge?: number;
  onGenderChange?: (gender: 'male' | 'female') => void;
  onAgeChange?: (age: number) => void;
}

export default function MeasurementsModal({
  isOpen,
  onClose,
  onSave,
  lastMeasurements,
  clientName,
  clientGender,
  clientAge,
  onGenderChange,
  onAgeChange,
}: MeasurementsModalProps) {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [neck, setNeck] = useState('');
  const [waist, setWaist] = useState('');
  const [hips, setHips] = useState('');
  const [thighsLeft, setThighsLeft] = useState('');
  const [thighsRight, setThighsRight] = useState('');
  const [bicepsLeft, setBicepsLeft] = useState('');
  const [bicepsRight, setBicepsRight] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>(clientGender || 'male');
  const [age, setAge] = useState(String(clientAge || ''));

  useEffect(() => {
    if (isOpen && lastMeasurements) {
      setHeight(lastMeasurements.height ? String(lastMeasurements.height) : '');
      setWeight(lastMeasurements.weight ? String(lastMeasurements.weight) : '');
      setNeck(lastMeasurements.neck ? String(lastMeasurements.neck) : '');
      setWaist(lastMeasurements.waist ? String(lastMeasurements.waist) : '');
      setHips(lastMeasurements.hips ? String(lastMeasurements.hips) : '');
      setThighsLeft((lastMeasurements as any).thighsLeft ? String((lastMeasurements as any).thighsLeft) : '');
      setThighsRight((lastMeasurements as any).thighsRight ? String((lastMeasurements as any).thighsRight) : '');
      setBicepsLeft(lastMeasurements.bicepsLeft ? String(lastMeasurements.bicepsLeft) : '');
      setBicepsRight(lastMeasurements.bicepsRight ? String(lastMeasurements.bicepsRight) : '');
    } else if (isOpen) {
      setHeight(''); setWeight(''); setNeck(''); setWaist('');
      setHips(''); setThighsLeft(''); setThighsRight(''); setBicepsLeft(''); setBicepsRight('');
    }
    if (clientGender) setGender(clientGender);
    if (clientAge) setAge(String(clientAge));
  }, [isOpen, lastMeasurements, clientGender, clientAge]);

  const bodyFat = useMemo(() => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    const n = parseFloat(neck);
    const wa = parseFloat(waist);
    const hp = parseFloat(hips);
    const a = parseInt(age) || 25;
    if (!h || !n || !wa || !w || !a) return null;
    return calculateBodyFat({ gender, height: h, weight: w, age: a, neck: n, waist: wa, hips: hp || 0 });
  }, [gender, height, weight, age, neck, waist, hips]);

  const bodyFatCategory = bodyFat ? getBodyFatCategory(gender, bodyFat) : null;
  const bodyFatColor = bodyFat ? getBodyFatColor(bodyFat, gender) : '#8e8e93';

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entry: MeasurementsEntry = {
      date: new Date().toISOString().split('T')[0],
      height: parseFloat(height) || 0,
      weight: parseFloat(weight) || 0,
      neck: parseFloat(neck) || 0,
      waist: parseFloat(waist) || 0,
      hips: parseFloat(hips) || 0,
      thighsLeft: parseFloat(thighsLeft) || 0,
      thighsRight: parseFloat(thighsRight) || 0,
      bicepsLeft: parseFloat(bicepsLeft) || 0,
      bicepsRight: parseFloat(bicepsRight) || 0,
      bodyFat: bodyFat ?? undefined,
    };
    onSave(entry);
    onClose();
  };

  const inputClass = "w-full bg-[#18181b] border border-[#27272a] rounded-lg text-xs p-2.5 text-white focus:outline-none focus:border-[#d4f826] font-mono transition-colors";
  const labelClass = "block text-[9px] text-[#52525b] mb-0.5 font-mono uppercase tracking-wider";

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-[#141416] border border-[#27272a] rounded-[16px] w-full max-w-md p-5 md:p-6 relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-bold tracking-wider text-white uppercase">
            <span className="text-[#d4f826]">Registrar</span> Medidas
          </h3>
          <button onClick={onClose} className="text-[#52525b] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-[#8e8e93] mb-4">
          {clientName ? `Actualizando medidas de ${clientName}` : 'Actualiza tus medidas corporales para seguir tu progreso.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Gender selector */}
          <div>
            <label className={labelClass}>Género (para cálculo de % grasa)</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setGender('male'); onGenderChange?.('male'); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${gender === 'male' ? 'bg-[#d4f826] text-black' : 'bg-[#18181b] text-[#8e8e93] border border-[#27272a]'}`}
              >
                Hombre
              </button>
              <button
                type="button"
                onClick={() => { setGender('female'); onGenderChange?.('female'); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${gender === 'female' ? 'bg-[#d4f826] text-black' : 'bg-[#18181b] text-[#8e8e93] border border-[#27272a]'}`}
              >
                Mujer
              </button>
            </div>
          </div>

          {/* Age */}
          <div>
            <label className={labelClass}>Edad (años)</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="28"
              value={age}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9]/g, '');
                setAge(v);
                if (v) onAgeChange?.(parseInt(v));
              }}
              className={inputClass}
            />
          </div>

          <div className="flex items-center gap-2 mb-2">
            <RulerIcon className="w-4 h-4 text-[#d4f826]" />
            <span className="text-[10px] text-[#a1a1aa] font-mono uppercase tracking-wider">Datos Corporales</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={labelClass}>Altura (cm)</label>
              <input type="text" inputMode="numeric" placeholder="175" value={height} onChange={(e) => setHeight(e.target.value.replace(/[^0-9.]/g, ''))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Peso (kg)</label>
              <input type="text" inputMode="numeric" placeholder="75.5" value={weight} onChange={(e) => setWeight(e.target.value.replace(/[^0-9.]/g, ''))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Cuello (cm)</label>
              <input type="text" inputMode="numeric" placeholder="38" value={neck} onChange={(e) => setNeck(e.target.value.replace(/[^0-9.]/g, ''))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Cintura (cm)</label>
              <input type="text" inputMode="numeric" placeholder="82" value={waist} onChange={(e) => setWaist(e.target.value.replace(/[^0-9.]/g, ''))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Cadera (cm)</label>
              <input type="text" inputMode="numeric" placeholder="98" value={hips} onChange={(e) => setHips(e.target.value.replace(/[^0-9.]/g, ''))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Pierna Izq. (cm)</label>
              <input type="text" inputMode="numeric" placeholder="58" value={thighsLeft} onChange={(e) => setThighsLeft(e.target.value.replace(/[^0-9.]/g, ''))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Pierna Der. (cm)</label>
              <input type="text" inputMode="numeric" placeholder="58.5" value={thighsRight} onChange={(e) => setThighsRight(e.target.value.replace(/[^0-9.]/g, ''))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Bíceps Izq. (cm)</label>
              <input type="text" inputMode="numeric" placeholder="35" value={bicepsLeft} onChange={(e) => setBicepsLeft(e.target.value.replace(/[^0-9.]/g, ''))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Bíceps Der. (cm)</label>
              <input type="text" inputMode="numeric" placeholder="35.5" value={bicepsRight} onChange={(e) => setBicepsRight(e.target.value.replace(/[^0-9.]/g, ''))} className={inputClass} />
            </div>
          </div>

          {/* Body Fat Preview */}
          {bodyFat !== null && (
            <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-[9px] text-[#52525b] font-mono uppercase tracking-wider">% Grasa Corporal (aprox.)</p>
                <p className="text-lg font-bold mt-0.5" style={{ color: bodyFatColor }}>
                  {bodyFat}% <span className="text-[10px] text-[#8e8e93] font-normal">— {bodyFatCategory}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[8px] text-[#52525b]">Fórmula Híbrida</p>
                <p className="text-[8px] text-[#52525b]">Navy + Deurenberg</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={onClose} className="bg-transparent hover:bg-[#18181b] text-[#a1a1aa] text-xs font-semibold py-2 px-4 rounded-xl transition-all">
              Cancelar
            </button>
            <button type="submit" className="bg-[#d4f826] text-black font-bold text-xs py-2 px-4 rounded-xl hover:bg-[#e2fa52] transition-all font-mono">
              GUARDAR MEDIDAS
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
