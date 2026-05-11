import React, { useState, useEffect, useRef } from 'react';
import { Dumbbell, Timer, Flame, CheckCircle, TrendingUp, MessageSquare, ChevronDown, ChevronUp, Trophy, Send, Play, Pause, FastForward, Image as ImageIcon, Camera, TrendingDown, TrendingUp as TrendUpIcon } from 'lucide-react';
import { RulerIcon } from './RulerIcon';
import { User, RoutineDay, WorkoutLog, Message, MeasurementsEntry } from '../types/fitness';
import MeasurementsModal from './MeasurementsModal';
import { MeasurementCards, WorkoutHistoryChart } from './ProgressCharts';
import ProgressLineChart from './ProgressLineChart';
import { getBodyFatColor } from '../lib/bodyFatCalculator';

interface Props {
  client: User; coach: User | null; routines: RoutineDay[]; logs: WorkoutLog[]; messages: Message[];
  unreadMessages?: number;
  onAddLog: (l: WorkoutLog) => void; onSendMessage: (r: string, c: string) => void;
  onMarkMessagesRead?: (senderId: string) => void;
  onUpdateClientStreak: (id: string, s: number) => void; onAddWeightEntry: (id: string, w: number) => void;
  onAddMeasurementsEntry: (id: string, entry: MeasurementsEntry) => void;
  onUpdateClientAvatar: (id: string, file: File) => void;
  onLogout: () => void;
}

export const ClientDashboard: React.FC<Props> = ({ client, coach, routines, logs, messages, unreadMessages = 0, onAddLog, onSendMessage, onMarkMessagesRead, onUpdateClientStreak, onAddWeightEntry, onAddMeasurementsEntry, onUpdateClientAvatar, onLogout }) => {
  const [tab, setTab] = useState<'w'|'m'|'c'>('w');
  const [progressSubTab, setProgressSubTab] = useState<'summary'|'evolution'|'history'>('summary');
  const clientRoutines = routines.filter(r => r.clientId === client.id);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const ar = clientRoutines.find(r => r.id === selectedRoutineId) || clientRoutines[0] || null;
  const [expId, setExpId] = useState<string|null>(null);
  const [cs, setCs] = useState<Record<string,boolean>>({});
  const [lr, setLr] = useState<Record<string,number>>({});
  const [lw, setLw] = useState<Record<string,number>>({});

  // Timer de descanso
  const [ts, setTs] = useState(0);
  const [tm, setTm] = useState(90);
  const [ta, setTa] = useState(false);
  const [showTimer, setShowTimer] = useState(false);

  // Completion modal
  const [sm, setSm] = useState(false); const [dur, setDur] = useState(60); const [feel, setFeel] = useState(5);
  const [cmt, setCmt] = useState(''); const [ok, setOk] = useState(false);
  const [ci, setCi] = useState('');
  const [fi, setFi] = useState<string|null>(null);
  const [showMeasurementsModal, setShowMeasurementsModal] = useState(false);

  // Cambio de avatar del cliente
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (ar?.exercises?.length) setExpId(ar.exercises[0].id); }, [ar]);

  // Cuenta regresiva del timer
  useEffect(() => {
    let iv: any = null;
    if (ta && ts > 0) {
      iv = setInterval(() => setTs(p => p - 1), 1000);
    } else if (ts === 0 && ta) {
      setTa(false);
    }
    return () => clearInterval(iv);
  }, [ta, ts]);

  // Cuando llega a 0 ocultar el timer después de 1 segundo
  useEffect(() => {
    if (ts === 0 && showTimer) {
      const t = setTimeout(() => setShowTimer(false), 1200);
      return () => clearTimeout(t);
    }
  }, [ts, showTimer]);

  // Marcar mensajes como leídos al entrar al chat
  useEffect(() => {
    if (tab === 'c' && coach?.id && onMarkMessagesRead) {
      onMarkMessagesRead(coach.id);
    }
  }, [tab, coach?.id, onMarkMessagesRead]);

  const startTimer = (seconds: number) => {
    setTm(seconds);
    setTs(seconds);
    setTa(true);
    setShowTimer(true);
  };

  const skipTimer = () => {
    setTs(0);
    setTa(false);
    setTimeout(() => setShowTimer(false), 600);
  };

  const tog = (eid: string, si: number, rest: number, chk: boolean) => {
    const k = `${eid}-${si}`;
    setCs(p => ({...p,[k]:chk}));
    if (chk && rest > 0) startTimer(rest);
  };

  const gr = (ex: any, si: number) => {
    const k=`${ex.id}-${si}`;
    if(lr[k]!==undefined) return lr[k];
    if (ex.setDetails && ex.setDetails[si-1]) return ex.setDetails[si-1].reps;
    const p=parseInt(ex.reps); return isNaN(p)?10:p;
  };
  const gw = (ex: any, si: number) => {
    const k=`${ex.id}-${si}`;
    if(lw[k]!==undefined) return lw[k];
    if (ex.setDetails && ex.setDetails[si-1]) return ex.setDetails[si-1].weight;
    return ex.weight;
  };
  const gSets = (ex: any) => ex.setDetails ? ex.setDetails.length : ex.sets;

  const fin = (e: React.FormEvent) => {
    e.preventDefault(); if(!ar) return;
    const el = ar.exercises.map(ex => {
      const sets = gSets(ex);
      return { exerciseId:ex.id, exerciseName:ex.name, sets: Array.from({length:sets}).map((_,i)=>({setNumber:i+1,reps:gr(ex,i+1),weight:gw(ex,i+1),completed:cs[`${ex.id}-${i+1}`]||false})) };
    });
    onAddLog({id:`log-${Date.now()}`,clientId:client.id,routineDayId:ar.id,routineName:ar.name,date:new Date().toISOString().split('T')[0],durationMinutes:dur,exercises:el,feelingScore:feel,coachNotes:cmt?`Comentario: "${cmt}"`:undefined});
    onUpdateClientStreak(client.id,(client.streak||0)+1);
    if (coach) onSendMessage(coach.id,`Reporte: ${ar.name} | ${dur}min | Fatiga: ${feel}/5 | ${cmt||'OK'}`);
    setOk(true);
  };

  const resetRoutine = () => {
    setCs({});
    setSelectedRoutineId(null);
    setExpId(null);
    setSm(false);
    setOk(false);
    setDur(60);
    setFeel(5);
    setCmt('');
  };

  const handleSendChat = () => {
    if (!ci.trim() || !coach) return;
    onSendMessage(coach.id, ci.trim());
    setCi('');
    // Cerrar teclado móvil y restaurar viewport
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo(0, 0);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onUpdateClientAvatar(client.id, file);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  const ml = logs.filter(l=>l.clientId===client.id);
  const coachId = coach?.id || '';
  const cm = messages.filter(m=>(m.senderId===client.id&&m.receiverId===coachId)||(m.senderId===coachId&&m.receiverId===client.id)).sort((a,b)=>new Date(a.timestamp).getTime()-new Date(b.timestamp).getTime());
  const tp = tm>0?(ts/tm)*100:0;
  // SVG circular progress
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference - (tp / 100) * circumference;

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-[#e4e2e6] flex flex-col font-sans relative pb-16 md:pb-0">

      {/* Input oculto para cambio de foto */}
      <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />

      <header className="bg-[#141416] border-b border-[#27272a] px-5 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          {/* Avatar con opción de cambiar foto */}
          <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()} title="Cambiar mi foto de perfil">
            <img src={client.selfieUrl || client.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'} alt="" className="w-11 h-11 rounded-full object-cover border-2 border-[#d4f826] transition-all group-hover:border-[#e2fa52]" />
            <div className="absolute inset-0 rounded-full bg-[#0a0a0c]/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
              <Camera className="w-4 h-4 text-[#d4f826]" />
              <span className="text-[7px] text-white  font-bold mt-0.5">CAMBIAR</span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 bg-[#d4f826] rounded-full p-0.5 ">
              <Camera className="w-2.5 h-2.5 text-black" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold text-white truncate">{client.name}</h1>
              <span className="bg-[#e5ba73]/10 text-[#e5ba73] text-[9px] px-1.5 py-0.5 rounded-full  font-bold">ELITE</span>
            </div>
            <p className="text-[11px] text-[#8e8e93]">Coach: <span className="text-[#d4f826]">{coach?.name || 'Marvin'}</span> · <span className="text-[#8e8e93] text-[9px]">Toca foto para cambiarla</span></p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[#1c1c1f] border border-[#27272a] px-3 py-1 rounded-[12px] flex items-center gap-1.5"><Flame className="w-4 h-4 text-[#e5ba73] animate-bounce" /><span className="text-xs  font-bold text-white">{client.streak}D</span></div>
          <button onClick={onLogout} className="text-[11px]  bg-[#242428] hover:bg-[#ff5449]/10 text-[#8e8e93] hover:text-[#ef4444] px-2.5 py-1.5 rounded-[8px] border border-[#27272a] transition-all">SALIR</button>
        </div>
      </header>
      <nav className="bg-[#141416] border-b border-[#1f1f23] flex text-center">
        {(['w','m','c'] as const).map((t) => {
          const tabs = {
            w: { label: 'Rutina', Icon: Dumbbell },
            m: { label: 'Progreso', Icon: TrendingUp },
            c: { label: 'Coach', Icon: MessageSquare },
          };
          const { label, Icon } = tabs[t];
          const isActive = tab === t;
          return (
            <button key={t} onClick={()=>setTab(t)} className={`flex-1 py-3 text-xs uppercase tracking-wide  font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 relative ${isActive?'border-[#d4f826] text-[#d4f826] bg-[#1c1c1f]':'border-transparent text-[#8e8e93] hover:text-white'}`}>
              <Icon className="w-3.5 h-3.5"/>
              {label}
              {t === 'c' && unreadMessages > 0 && (
                <span className="absolute -top-1 right-2 sm:right-4 bg-[#ff5449] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px]">
                  {unreadMessages}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      {/* Barra de progreso lineal (siempre visible cuando hay timer activo o reciente) */}
      {showTimer && ts > 0 && (
        <div className="bg-[#141416] border-b border-[#27272a] px-4 py-2 relative overflow-hidden">
          <div className="absolute top-0 left-0 h-full bg-[#d4f826]/8 transition-all duration-1000 ease-linear pointer-events-none" style={{width:`${tp}%`}}/>
          <div className="flex items-center justify-between relative z-10 max-w-3xl mx-auto">
            <div className="flex items-center gap-2">
              <Timer className="w-3.5 h-3.5 text-[#d4f826]" />
              <span className="text-[10px]  font-bold text-[#8e8e93] uppercase tracking-wider">Descanso entre series</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm  font-extrabold text-white">{Math.floor(ts/60)}:{(ts%60).toString().padStart(2,'0')}</span>
              <button onClick={()=>setTa(!ta)} className="bg-[#27272a] p-1 rounded-[8px] text-white hover:text-[#d4f826] transition-all">{ta?<Pause className="w-3 h-3"/>:<Play className="w-3 h-3"/>}</button>
            </div>
          </div>
        </div>
      )}

      {/* TIMER CIRCULAR MODAL — se muestra al center al activarse */}
      {showTimer && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 bg-black/70 ${ts === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex flex-col items-center gap-6 text-center px-6">
            {/* Título */}
            <div>
              <p className="text-[10px] uppercase  tracking-widest text-[#d4f826] font-bold">RECUPERACIÓN ACTIVA</p>
              <p className="text-xs text-[#8e8e93] mt-1">Respira profundo · Próxima serie en breve</p>
            </div>

            {/* SVG Circular Progress */}
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
                {/* Track */}
                <circle cx="60" cy="60" r={radius} fill="none" stroke="#27272a" strokeWidth="6" />
                {/* Progress */}
                <circle
                  cx="60" cy="60" r={radius} fill="none"
                  stroke={ts <= 5 ? '#ef4444' : ts <= 15 ? '#e5ba73' : '#d4f826'}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDash}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>

              {/* Tiempo en el centro */}
              <div className="relative z-10 flex flex-col items-center">
                <span className={`text-5xl font-black  tracking-tight transition-colors ${ts <= 5 ? 'text-[#ef4444]' : ts <= 15 ? 'text-[#e5ba73]' : 'text-white'}`}>
                  {Math.floor(ts/60) > 0 ? `${Math.floor(ts/60)}:${(ts%60).toString().padStart(2,'0')}` : ts}
                </span>
                <span className="text-[10px] text-[#52525b]  mt-1">{Math.floor(ts/60) > 0 ? 'min' : 'seg'}</span>
              </div>
            </div>

            {/* Mensaje dinámico según tiempo */}
            <div className="bg-[#1c1c1f] border border-[#27272a] px-4 py-2 rounded-[12px]">
              <p className="text-xs  text-[#8e8e93]">
                {ts > 60 ? '💪 Descansa bien para máximo rendimiento' : ts > 20 ? '🔥 Casi listo · Prepárate mentalmente' : ts > 5 ? '⚡ ¡Vamos! · Carga el peso' : '🚀 ¡AHORA! · Siguiente serie'}
              </p>
            </div>

            {/* Botones de control */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTa(!ta)}
                className="bg-[#27272a] border border-[#3f3f46] text-white hover:text-[#d4f826] hover:border-[#d4f826] px-4 py-2 rounded-[12px] text-xs  font-bold transition-all flex items-center gap-2"
              >
                {ta ? <><Pause className="w-4 h-4"/> PAUSAR</> : <><Play className="w-4 h-4"/> REANUDAR</>}
              </button>
              <button
                onClick={skipTimer}
                className="bg-[#d4f826] text-black px-5 py-2 rounded-[28px] text-xs font-extrabold hover:bg-[#e2fa52] transition-all flex items-center gap-2 active:scale-[0.98]"
              >
                <FastForward className="w-4 h-4"/> SALTAR DESCANSO
              </button>
            </div>

            <p className="text-[9px] text-[#3f3f46] ">Pautado por Coach {coach?.name?.split(' ')[0] || 'Marvin'}: {tm}s de recuperación</p>
          </div>
        </div>
      )}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 md:p-6 space-y-6">
        {tab==='w'&&(<div className="space-y-4">
          {clientRoutines.length === 0 ? (
            <div className="bg-[#141416] border border-[#27272a] p-8 rounded-[16px] text-center text-xs text-[#8e8e93] italic">No tienes rutinas asignadas.</div>
          ) : selectedRoutineId === null ? (
            <>
              <div className="bg-[#1c1c1f] border border-[#27272a] p-4 rounded-[12px]">
                <span className="text-[10px] uppercase  tracking-widest text-[#d4f826] font-bold block">TUS RUTINAS</span>
                <h2 className="text-base font-extrabold text-white  mt-1">Selecciona una sesión</h2>
              </div>
              <div className="space-y-3">
                {clientRoutines.map(r => (
                  <div key={r.id} onClick={()=>{setSelectedRoutineId(r.id);setCs({});setExpId(null);}} className="bg-[#141416] border border-[#27272a] hover:border-[#d4f826] rounded-[12px] p-4 cursor-pointer transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-white">{r.name}</h3>
                        <p className="text-[11px] text-[#8e8e93] mt-0.5">{r.exercises.length} ejercicios • {r.description || 'Sin descripción'}</p>
                      </div>
                      <ChevronDown className="w-4 h-4 text-[#8e8e93] rotate-[-90deg]" />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : ar ? (
            <>
              <div className="bg-[#1c1c1f] border border-[#27272a] p-4 rounded-[12px]">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase  tracking-widest text-[#d4f826] font-bold block">SESIÓN EN CURSO</span>
                    <h2 className="text-base font-extrabold text-white  mt-1">{ar.name}</h2>
                  </div>
                  <button onClick={()=>{setSelectedRoutineId(null);setCs({});setExpId(null);}} className="text-[10px] text-[#8e8e93] hover:text-white underline ">Cambiar rutina</button>
                </div>
                {ar.description&&<p className="text-xs text-[#8e8e93] mt-1 italic">{ar.description}</p>}
              </div>
              <div className="space-y-3">{ar.exercises.map((ex,idx)=>{const ie=expId===ex.id;let dc=0;for(let s=1;s<=gSets(ex);s++){if(cs[`${ex.id}-${s}`])dc++;}const fl=dc===gSets(ex);return(<div key={ex.id} className={`bg-[#141416] border rounded-[12px] overflow-hidden transition-all ${fl?'border-[#25d366]/30 opacity-80':ie?'border-[#d4f826]/50':'border-[#27272a]'}`}><div onClick={()=>setExpId(ie?null:ex.id)} className="cursor-pointer hover:bg-[#1c1c1f] transition-all">{ex.imageUrl&&(<div className="relative h-36 sm:h-44 overflow-hidden bg-[#1c1c1f]" onClick={(e)=>{e.stopPropagation();setFi(ex.imageUrl!)}}><img src={ex.imageUrl} alt={ex.name} className="w-full h-full object-cover"/><div className="absolute inset-0 bg-gradient-to-t from-[#121214] via-transparent to-transparent"/><div className="absolute top-3 left-3 bg-black/70 text-[#d4f826] text-[10px]  font-bold px-2 py-1 rounded-[8px] border border-[#d4f826]/20">#{idx+1}</div><div className="absolute bottom-3 right-3 bg-[#0a0a0c]/80 text-white text-[9px]  px-2 py-1 rounded-[8px] flex items-center gap-1"><ImageIcon className="w-3 h-3"/>Ampliar</div><div className="absolute bottom-0 left-0 right-0 p-3"><h3 className="text-sm font-bold text-white">{ex.name}</h3><div className="flex items-center gap-3 mt-1"><span className="text-[10px] bg-[#d4f826]/20 text-[#d4f826] px-1.5 py-0.5 rounded  font-bold">{ex.setDetails ? `${ex.setDetails.length}x` : `${ex.sets}x`}{ex.reps}</span><span className="text-[10px] bg-[#242428] text-white px-1.5 py-0.5 rounded ">{ex.setDetails ? `${Math.min(...ex.setDetails.map((s:any)=>s.weight))}-${Math.max(...ex.setDetails.map((s:any)=>s.weight))}kg` : `${ex.weight}kg`}</span><span className="text-[10px] bg-[#242428] text-[#8e8e93] px-1.5 py-0.5 rounded ">{ex.restTime}s</span></div></div></div>)}<div className="p-4 flex items-center justify-between gap-2"><div className="flex items-center gap-3 min-w-0">{!ex.imageUrl&&<span className="w-7 h-7 rounded-full bg-[#1c1c1f] text-[#8e8e93] text-xs flex items-center justify-center  font-bold border border-[#27272a] shrink-0">{idx+1}</span>}<div className="min-w-0">{!ex.imageUrl&&(<>  <h3 className="text-xs md:text-sm font-bold text-white truncate">{ex.name}</h3><p className="text-[11px] text-[#8e8e93] mt-0.5"><span className="text-white ">{ex.sets} Series</span> - {ex.reps} - <span className="text-[#d4f826] ">{ex.setDetails ? `${Math.min(...ex.setDetails.map((s:any)=>s.weight))}-${Math.max(...ex.setDetails.map((s:any)=>s.weight))}kg` : `${ex.weight}kg`}</span></p></>)}{ex.imageUrl&&<p className="text-[10px] text-[#8e8e93]">{ie?'Ocultar series':'Ver series'}</p>}</div></div><div className="flex items-center gap-3">{dc>0&&<span className={`text-[10px]  px-2 py-0.5 rounded font-bold ${fl?'bg-[#25d366]/10 text-[#25d366]':'bg-[#e5ba73]/10 text-[#e5ba73]'}`}>{dc}/{gSets(ex)}</span>}{ie?<ChevronUp className="w-4 h-4 text-[#8e8e93]"/>:<ChevronDown className="w-4 h-4 text-[#8e8e93]"/>}</div></div></div>{ie&&(<div className="p-4 bg-[#0a0a0c] border-t border-[#1f1f23] space-y-3">{ex.notes&&<div className="bg-[#1c1c1f] border-l-2 border-[#e5ba73] p-2.5 rounded-r-lg text-[11px] text-[#e5ba73]">💡 <span className="font-semibold text-white">Coach:</span> {ex.notes}</div>}<div className="space-y-2"><div className="grid grid-cols-12 text-[10px] uppercase  tracking-wider text-[#52525b] font-bold pb-1 text-center"><div className="col-span-2 text-left pl-2">SERIE</div><div className="col-span-4">REPS</div><div className="col-span-4">PESO</div><div className="col-span-2">OK</div></div>{Array.from({length:gSets(ex)}).map((_,si)=>{const sn=si+1;const sk=`${ex.id}-${sn}`;const sd=cs[sk]||false;return(<div key={sn} className={`grid grid-cols-12 items-center py-2 rounded-[8px] border text-center transition-all ${sd?'bg-[#25d366]/5 border-[#25d366]/20':'bg-[#141416] border-[#27272a]'}`}><div className="col-span-2 text-left pl-4  font-bold text-xs text-white">#{sn}</div><div className="col-span-4 px-2"><input type="text" inputMode="numeric" pattern="[0-9]*" value={gr(ex,sn) || ''} disabled={sd} onChange={(e)=>{ const v = e.target.value.replace(/[^0-9]/g, ''); setLr(p=>({...p,[`${ex.id}-${sn}`]: v === '' ? 0 : Number(v)})); }} className="w-full bg-[#1c1c1f] border border-[#27272a] rounded-md text-xs py-1 px-2 text-center text-white  font-bold disabled:opacity-60 focus:border-[#d4f826] focus:outline-none"/></div><div className="col-span-4 px-2"><input type="text" inputMode="numeric" pattern="[0-9]*" value={gw(ex,sn) || ''} disabled={sd} onChange={(e)=>{ const v = e.target.value.replace(/[^0-9]/g, ''); setLw(p=>({...p,[`${ex.id}-${sn}`]: v === '' ? 0 : Number(v)})); }} className="w-full bg-[#1c1c1f] border border-[#27272a] rounded-md text-xs py-1 px-2 text-center text-white  font-bold disabled:opacity-60 focus:border-[#d4f826] focus:outline-none"/></div><div className="col-span-2 flex justify-center"><input type="checkbox" checked={sd} onChange={(e)=>tog(ex.id,sn,ex.restTime,e.target.checked)} className="w-5 h-5 rounded-md accent-[#d4f826] cursor-pointer"/></div></div>);})}</div><div className="text-[10px] text-[#8e8e93]  flex items-center justify-between pt-1"><span>Descanso: <strong className="text-white">{ex.restTime}s</strong></span><button onClick={()=>{setTm(ex.restTime);setTs(ex.restTime);setTa(true);}} className="text-[#d4f826] hover:underline">Iniciar Cronómetro</button></div></div>)}</div>);})}</div>
              <div className="pt-4"><button onClick={()=>setSm(true)} className="w-full bg-[#d4f826] text-black font-extrabold  tracking-widest text-xs py-4 rounded-[28px] hover:bg-[#e2fa52] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"><CheckCircle className="w-4 h-4"/>FINALIZAR SESIÓN</button></div>
            </>
          ) : (
            <div className="bg-[#141416] border border-[#27272a] p-8 rounded-[16px] text-center text-xs text-[#8e8e93] italic">Rutina no encontrada.</div>
          )}
        </div>)}
        {tab==='m'&&(
          <div className="space-y-4 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white uppercase tracking-wider">Tu <span className="text-[#d4f826]">Evolución</span></h2>
                <p className="text-[10px] text-[#8e8e93] mt-0.5">Seguimiento de medidas y rendimiento</p>
              </div>
              <button
                onClick={() => setShowMeasurementsModal(true)}
                className="bg-[#d4f826] text-black font-bold text-[10px] py-2 px-3 rounded-xl hover:bg-[#e2fa52] transition-all flex items-center gap-1.5"
              >
                <RulerIcon className="w-3.5 h-3.5" />
                Registrar Medidas
              </button>
            </div>

            {/* Sub-tabs */}
            <div className="flex bg-[#141416] border border-[#27272a] rounded-[12px] p-1">
              {([
                { id: 'summary', label: 'Resumen' },
                { id: 'evolution', label: 'Evolución' },
                { id: 'history', label: 'Historial' },
              ] as const).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setProgressSubTab(id)}
                  className={`flex-1 text-[11px] font-bold py-2 rounded-[8px] transition-all ${
                    progressSubTab === id
                      ? 'bg-[#1c1c1f] text-[#d4f826] border border-[#27272a]'
                      : 'text-[#8e8e93] hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Stats Cards — Resumen */}
            {progressSubTab === 'summary' && (
              <div className="space-y-4">
                <MeasurementCards
              latest={client.measurementsHistory?.[0]}
              previous={client.measurementsHistory?.[1]}
              gender={client.gender}
            />

              </div>
            )}

            {progressSubTab === 'evolution' && (
              <div className="space-y-4">
                <ProgressLineChart user={client} title="Tu Evolución" />
              </div>
            )}

            {progressSubTab === 'history' && (
            <div className="space-y-4">
              {/* Measurements History Table */}
              {client.measurementsHistory && client.measurementsHistory.length > 0 && (
                <div className="bg-[#141416] border border-[#27272a] rounded-[12px] p-4">
                  <h3 className="text-xs uppercase tracking-wider text-white font-bold mb-3 flex items-center gap-2">
                    <RulerIcon className="w-4 h-4 text-[#00e5ff]"/> Historial de Medidas
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="text-[#52525b] border-b border-[#27272a]">
                          <th className="text-left py-2 font-mono uppercase">Fecha</th>
                          <th className="text-right py-2 font-mono uppercase">Peso</th>
                          <th className="text-right py-2 font-mono uppercase">% Grasa</th>
                          <th className="text-right py-2 font-mono uppercase">Cintura</th>
                          <th className="text-right py-2 font-mono uppercase">Cadera</th>
                          <th className="text-right py-2 font-mono uppercase">Pierna Izq</th>
                          <th className="text-right py-2 font-mono uppercase">Pierna Der</th>
                          <th className="text-right py-2 font-mono uppercase">Bíceps Izq</th>
                          <th className="text-right py-2 font-mono uppercase">Bíceps Der</th>
                          <th className="text-right py-2 font-mono uppercase">Por</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#27272a]">
                        {client.measurementsHistory.map((m, i) => (
                          <tr key={i}>
                            <td className="py-2 text-[#8e8e93]">{m.date}</td>
                            <td className="py-2 text-right text-white font-bold">{m.weight || '--'} <span className="text-[#52525b] font-normal">kg</span></td>
                            <td className="py-2 text-right font-bold" style={{ color: m.bodyFat ? getBodyFatColor(m.bodyFat, client.gender || 'male') : '#8e8e93' }}>{m.bodyFat || '--'} <span className="text-[#52525b] font-normal">%</span></td>
                            <td className="py-2 text-right text-[#00e5ff]">{m.waist || '--'} <span className="text-[#52525b]">cm</span></td>
                            <td className="py-2 text-right text-[#ff00ff]">{m.hips || '--'} <span className="text-[#52525b]">cm</span></td>
                            <td className="py-2 text-right text-[#76ff03]">{(m as any).thighsLeft || '--'} <span className="text-[#52525b]">cm</span></td>
                            <td className="py-2 text-right text-[#00e5ff]">{(m as any).thighsRight || '--'} <span className="text-[#52525b]">cm</span></td>
                            <td className="py-2 text-right text-[#2979ff]">{m.bicepsLeft || '--'} <span className="text-[#52525b]">cm</span></td>
                            <td className="py-2 text-right text-[#ff5449]">{m.bicepsRight || '--'} <span className="text-[#52525b]">cm</span></td>
                            <td className="py-2 text-right">
                              <span className={`text-[8px] font-bold px-1 py-0.5 rounded-[4px] ${m.recordedBy === 'client' ? 'bg-[#00e5ff]/10 text-[#00e5ff]' : 'bg-[#d4f826]/10 text-[#d4f826]'}`}>
                                {m.recordedBy === 'client' ? 'CLI' : 'COA'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Workout History */}
              {ml.length > 0 && (
                <WorkoutHistoryChart
                  data={ml.map(l => ({ date: l.date, duration: l.durationMinutes, feeling: l.feelingScore }))}
                />
              )}

              {/* Session List */}
              <div className="bg-[#141416] border border-[#27272a] rounded-[12px] p-4">
                <h3 className="text-xs uppercase tracking-wider text-white font-bold flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-[#d4f826]"/> Sesiones Completadas
                </h3>
                <div className="space-y-3">
                  {ml.length===0?
                    <p className="text-xs text-[#52525b] p-4 text-center italic">💪 ¡Completa tu primer bloque!</p>
                    :ml.map(l=>(
                      <div key={l.id} className="bg-[#1c1c1f] border border-[#27272a] rounded-[12px] p-3 flex justify-between items-center text-xs">
                        <div>
                          <span className="text-[9px] text-[#8e8e93] block">{l.date}</span>
                          <h4 className="text-xs font-bold text-white mt-0.5">{l.routineName}</h4>
                          <p className="text-[11px] text-[#8e8e93] mt-0.5">{l.durationMinutes} min</p>
                        </div>
                        <span className="text-xs bg-[#d4f826]/10 text-[#d4f826] px-2 py-1 rounded font-bold">{l.feelingScore}/5</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
            )}
          </div>
        )}
        {tab==='c'&&(<div className="bg-[#141416] border border-[#27272a] rounded-[12px] overflow-hidden flex flex-col h-[calc(100dvh-14rem)] md:h-[480px]"><div className="bg-[#1c1c1f] p-4 border-b border-[#27272a] flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-[#25d366] rounded-full animate-ping"/><span className="text-xs  font-bold text-white uppercase">COACH {coach?.name?.toUpperCase() || 'MARVIN'}</span></div><span className="text-[10px] bg-[#27272a] text-[#8e8e93] px-2 py-0.5 rounded ">24/7</span></div><div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0a0a0c]">{cm.map(m=>{const me=m.senderId===client.id;return(<div key={m.id} className={`flex ${me?'justify-end':'justify-start'}`}><div className={`max-w-xs p-3 rounded-[12px] text-xs ${me?'bg-[#27272a] text-white rounded-tr-none border border-[#3f3f46]':'bg-[#1c1c1f] text-[#e4e2e6] rounded-tl-none border border-[#27272a]'}`}><p className="whitespace-pre-line">{m.content}</p><span className="block text-[8px] text-[#8e8e93] mt-1 text-right ">{new Date(m.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span></div></div>);})}{cm.length===0&&<div className="text-center p-12 text-[#52525b] text-xs italic">Envía un mensaje a tu coach.</div>}</div><div className="p-3 bg-[#1c1c1f] border-t border-[#27272a] flex gap-2"><input type="text" placeholder="Escribe al coach..." value={ci} onChange={(e)=>setCi(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter') handleSendChat();}} className="flex-1 bg-[#141416] border border-[#27272a] rounded-[8px] text-xs px-4 py-2 text-white focus:outline-none focus:border-[#d4f826]"/><button onClick={handleSendChat} className="bg-[#d4f826] text-black font-bold p-2 rounded-[28px] hover:bg-[#e2fa52] transition-all active:scale-95"><Send className="w-4 h-4"/></button></div></div>)}
      </main>

      <MeasurementsModal
        isOpen={showMeasurementsModal}
        onClose={() => setShowMeasurementsModal(false)}
        onSave={(entry) => onAddMeasurementsEntry(client.id, entry)}
        lastMeasurements={client.measurementsHistory?.[0]}
        clientGender={client.gender}
        clientAge={client.age}
        onAgeChange={(age) => {
          // Client cannot update their own age directly via this modal without onUpdateClient
          // We leave this empty or pass undefined - the modal will use its internal state
        }}
      />

      {sm&&(<div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"><div className="bg-[#141416] border border-[#27272a] rounded-[16px] w-full max-w-md p-4 md:p-6 relative">{!ok?(<><div className="text-center mb-4"><div className="inline-flex p-2.5 bg-[#d4f826]/10 text-[#d4f826] rounded-[12px] border border-[#d4f826]/20 mb-2"><Trophy className="w-5 h-5"/></div><h3 className="text-base font-bold  text-white uppercase">Confirmar Bitácora</h3></div><form onSubmit={fin} className="space-y-4"><div><label className="block text-[11px] text-[#8e8e93]  uppercase mb-1">Duración (min)</label><input type="text" inputMode="numeric" pattern="[0-9]*" value={dur || ''} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setDur(v === '' ? 0 : Number(v)); }} className="w-full bg-[#1c1c1f] border border-[#27272a] rounded-[12px] text-xs p-2.5 text-white "/></div><div><label className="block text-[11px] text-[#8e8e93]  uppercase mb-1">Esfuerzo (RPE)</label><select value={feel} onChange={(e)=>setFeel(Number(e.target.value))} className="w-full bg-[#1c1c1f] border border-[#27272a] rounded-[12px] text-xs p-2.5 text-white "><option value="5">5/5 Máximo</option><option value="4">4/5 Muy bueno</option><option value="3">3/5 Moderado</option><option value="2">2/5 Descarga</option><option value="1">1/5 Liviano</option></select></div><div><label className="block text-[11px] text-[#8e8e93]  uppercase mb-1">Comentarios</label><textarea placeholder="Notas para el coach..." value={cmt} onChange={(e)=>setCmt(e.target.value)} rows={3} className="w-full bg-[#1c1c1f] border border-[#27272a] rounded-[8px] text-xs p-2.5 text-white"/></div><div className="flex gap-2 pt-2"><button type="button" onClick={()=>setSm(false)} className="flex-1 text-[#8e8e93] text-xs py-2.5 rounded-[8px] hover:bg-[#242428] transition-all active:scale-[0.98]">Volver</button><button type="submit" className="flex-1 bg-[#d4f826] text-black font-extrabold text-xs py-2.5 rounded-[28px] hover:bg-[#e2fa52] transition-all active:scale-[0.98] ">ENVIAR</button></div></form></>):(<div className="text-center py-6 space-y-4"><div className="w-14 h-14 bg-[#25d366]/20 text-[#25d366] rounded-full flex items-center justify-center mx-auto border border-[#25d366]/30"><Trophy className="w-7 h-7"/></div><h3 className="text-lg font-bold  text-white uppercase">¡ENTRENAMIENTO SUBIDO!</h3><p className="text-xs text-[#8e8e93]">Reporte enviado al Coach Marvin.</p><button onClick={resetRoutine} className="w-full bg-[#d4f826] text-black font-bold text-xs py-2.5 rounded-[12px] ">VOLVER A RUTINAS</button></div>)}</div></div>)}
      {fi&&(<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={()=>setFi(null)}><div className="relative max-w-2xl w-full"><img src={fi} alt="Ejercicio" className="w-full rounded-[16px]"/><button onClick={()=>setFi(null)} className="absolute top-3 right-3 bg-black/70 text-white rounded-full p-2 hover:bg-[#ff5449] transition-all"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button><div className="absolute bottom-3 left-3 right-3 bg-black/70 rounded-[12px] p-3 text-center"><p className="text-xs text-[#d4f826]  font-bold">IMAGEN DEMOSTRATIVA</p><p className="text-[10px] text-[#8e8e93] mt-0.5">Toca fuera para cerrar</p></div></div></div>)}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#141416] border-t border-[#27272a] grid grid-cols-3 text-center text-[10px] text-[#8e8e93] py-1.5 pb-4 z-40">
        <button onClick={()=>setTab('w')} className={`flex flex-col items-center gap-0.5 ${tab==='w'?'text-[#d4f826]':''}`}><Dumbbell className="w-4 h-4"/><span>Rutina</span></button>
        <button onClick={()=>setTab('m')} className={`flex flex-col items-center gap-0.5 ${tab==='m'?'text-[#d4f826]':''}`}><TrendingUp className="w-4 h-4"/><span>Progreso</span></button>
        <button onClick={()=>setTab('c')} className={`flex flex-col items-center gap-0.5 relative ${tab==='c'?'text-[#d4f826]':''}`}>
          <MessageSquare className="w-4 h-4"/>
          <span>Coach</span>
          {unreadMessages > 0 && (
            <span className="absolute -top-1 right-2 bg-[#ff5449] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px]">
              {unreadMessages}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
