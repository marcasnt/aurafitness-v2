import React, { useState, useMemo } from 'react';
import { X, Dumbbell, Search } from 'lucide-react';
import { Exercise } from '../types/fitness';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (preset: Exercise) => void;
  presets: Exercise[];
  presetsLoading: boolean;
}

const CATEGORIES = [
  { id: 'all', label: 'Todos' },
  { id: 'Chest', label: 'Pecho' },
  { id: 'Back', label: 'Espalda' },
  { id: 'Legs', label: 'Piernas' },
  { id: 'Shoulders', label: 'Hombros' },
  { id: 'Biceps', label: 'Bíceps' },
  { id: 'Triceps', label: 'Tríceps' },
  { id: 'Arms', label: 'Brazos' },
  { id: 'Core', label: 'Core' },
  { id: 'Cardio', label: 'Cardio' },
  { id: 'Glutes', label: 'Glúteos' },
  { id: 'Forearms', label: 'Antebrazos' },
  { id: 'Traps', label: 'Trapecios' },
  { id: 'Full Body', label: 'Cuerpo Completo' },
  { id: 'Home Workout', label: 'En Casa' },
];

export const ExerciseSelectorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelect,
  presets,
  presetsLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const filtered = useMemo(() => {
    let list = presets;
    if (activeFilter !== 'all') {
      list = list.filter((p) => p.category === activeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [presets, activeFilter, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] transition-opacity" />

      {/* Card */}
      <div className="relative w-full max-w-3xl bg-[#141416] border border-[#27272a] rounded-[16px] shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#27272a] shrink-0">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-[#d4f826]" />
              Catálogo de Ejercicios
            </h3>
            <p className="text-[10px] text-[#8e8e93] mt-0.5">
              Selecciona un movimiento para cargar todos sus datos
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#27272a] text-[#8e8e93] hover:text-white hover:bg-[#3f3f46] transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search + Filters */}
        <div className="p-4 space-y-3 border-b border-[#27272a] shrink-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#52525b]" />
            <input
              type="text"
              placeholder="Buscar ejercicio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0a0c] border border-[#27272a] rounded-[12px] text-xs pl-9 pr-3 py-2.5 text-white placeholder:text-[#52525b] focus:outline-none focus:border-[#d4f826] transition-all"
              autoFocus
            />
          </div>

          {/* Category chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveFilter(cat.id)}
                className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-[8px] transition-all border ${
                  activeFilter === cat.id
                    ? 'bg-[#d4f826] text-black border-[#d4f826]'
                    : 'bg-[#1c1c1f] text-[#8e8e93] border-[#27272a] hover:text-white hover:border-[#3f3f46]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {presetsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <div className="w-6 h-6 border-2 border-[#d4f826] border-t-transparent rounded-full animate-spin" />
              <p className="text-[10px] text-[#8e8e93]">Cargando catálogo...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Dumbbell className="w-8 h-8 text-[#3f3f46]" />
              <p className="text-[10px] text-[#8e8e93]">
                {searchQuery
                  ? 'No se encontraron ejercicios con ese criterio'
                  : 'El catálogo está vacío'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filtered.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    onSelect(preset);
                    onClose();
                  }}
                  className="group bg-[#1c1c1f] border border-[#27272a] hover:border-[#d4f826] rounded-[12px] overflow-hidden transition-all active:scale-[0.98] text-left flex flex-col"
                  title={preset.name}
                >
                  {/* Thumbnail */}
                  <div className="relative h-24 sm:h-28 bg-[#0a0a0c] overflow-hidden">
                    {preset.imageUrl ? (
                      <img
                        src={preset.imageUrl}
                        alt={preset.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                        <Dumbbell className="w-6 h-6 text-[#3f3f46]" />
                        <span className="text-[8px] text-[#52525b] uppercase">Sin preview</span>
                      </div>
                    )}
                    {/* Category badge */}
                    <div className="absolute top-2 left-2">
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-[4px] bg-black/70 text-[#d4f826] border border-[#d4f826]/20">
                        {preset.category}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-2.5 flex flex-col gap-1">
                    <p className="text-[10px] font-bold text-white leading-tight line-clamp-2">
                      {preset.name}
                    </p>
                    <p className="text-[9px] text-[#8e8e93]">
                      {preset.sets}x{preset.reps} · {preset.weight}kg · {preset.restTime}s
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#27272a] shrink-0 flex justify-between items-center">
          <p className="text-[9px] text-[#52525b]">
            {filtered.length} ejercicio{filtered.length !== 1 ? 's' : ''}
          </p>
          <button
            onClick={onClose}
            className="text-[10px] text-[#8e8e93] hover:text-white px-3 py-1.5 rounded-[8px] hover:bg-[#27272a] transition-all"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
