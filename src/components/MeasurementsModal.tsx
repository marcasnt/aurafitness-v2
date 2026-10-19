import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { RulerIcon } from './RulerIcon';
import { MeasurementsEntry, MeasurementsContext } from '../types/fitness';
import { calculateBodyFat, getBodyFatCategory, getBodyFatColor } from '../lib/bodyFatCalculator';

interface MeasurementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: MeasurementsEntry, context: MeasurementsContext) => Promise<boolean>;
  lastMeasurements?: MeasurementsEntry;
  clientName?: string;
  clientGender?: 'male' | 'female';
  clientAge?: number;
}

export default function MeasurementsModal({
  isOpen,
  onClose,
  onSave,
  lastMeasurements,
  clientName,
  clientGender,
  clientAge,
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
  const [gender, setGender] = useState<'male' | 'female' | null>(clientGender || null);
  const [age, setAge] = useState(String(clientAge || ''));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

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
    if (isOpen) {
      setGender(clientGender || null);
      setAge(clientAge ? String(clientAge) : '');
      setSaveError(false);
    }
    // Inicializar al abrir; cambios de género/edad guardados en el perfil no deben borrar el formulario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const bodyFat = useMemo(() => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    const n = parseFloat(neck);
    const wa = parseFloat(waist);
    const hp = parseFloat(hips);
    const a = parseInt(age);
    if (!gender || !h || !w || !a) return null;
    return calculateBodyFat({ gender, height: h, weight: w, age: a, neck: n || 0, waist: wa || 0, hips: hp || 0 });
  }, [gender, height, weight, age, neck, waist, hips]);

  const bodyFatCategory = bodyFat !== null && gender ? getBodyFatCategory(gender, bodyFat) : null;
  const bodyFatColor = bodyFat !== null && gender ? getBodyFatColor(bodyFat, gender) : '#8e8e93';

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gender || bodyFat === null || saving) return;
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
      bodyFat,
    };
    setSaving(true);
    setSaveError(false);
    try {
      if (await onSave(entry, { gender, age: parseInt(age) })) {
        onClose();
      } else {
        setSaveError(true);
      }
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
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
                onClick={() => setGender('male')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${gender === 'male' ? 'bg-[#d4f826] text-black' : 'bg-[#18181b] text-[#8e8e93] border border-[#27272a]'}`}
              >
                Hombre
              </button>
              <button
                type="button"
                onClick={() => setGender('female')}
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
              }}
              className={inputClass}
              required
              minLength={1}
            />
          </div>

          <div className="flex items-center gap-2 mb-2">
            <RulerIcon className="w-4 h-4 text-[#d4f826]" />
            <span className="text-[10px] text-[#a1a1aa] font-mono uppercase tracking-wider">Datos Corporales</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={labelClass}>Altura (cm)</label>
              <input type="text" inputMode="numeric" placeholder="175" value={height} onChange={(e) => setHeight(e.target.value.replace(/[^0-9.]/g, ''))} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Peso (kg)</label>
              <input type="text" inputMode="numeric" placeholder="75.5" value={weight} onChange={(e) => setWeight(e.target.value.replace(/[^0-9.]/g, ''))} className={inputClass} required />
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
          {bodyFat === null && (
            <p className="text-[10px] text-[#e5ba73]">Selecciona el género e indica edad, altura y peso para obtener el porcentaje aproximado.</p>
          )}
          {saveError && <p className="text-[10px] text-[#ff5449]">No se pudieron guardar las medidas. Intenta de nuevo.</p>}

          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={onClose} className="bg-transparent hover:bg-[#18181b] text-[#a1a1aa] text-xs font-semibold py-2 px-4 rounded-xl transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={bodyFat === null || saving} className="bg-[#d4f826] text-black font-bold text-xs py-2 px-4 rounded-xl hover:bg-[#e2fa52] transition-all font-mono disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'GUARDANDO...' : 'GUARDAR MEDIDAS'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
