import React, { useState, useEffect, useRef } from 'react';
import { Dumbbell, Timer, Flame, CheckCircle, TrendingUp, MessageSquare, ChevronDown, ChevronUp, Trophy, Send, Scale, Plus, Play, Pause, FastForward, Image as ImageIcon, Camera } from 'lucide-react';
import { User, RoutineDay, WorkoutLog, Message } from '../types/fitness';

interface Props {
  client: User; coach: User | null; routines: RoutineDay[]; logs: WorkoutLog[]; messages: Message[];
  unreadMessages?: number;
  onAddLog: (l: WorkoutLog) => void; onSendMessage: (r: string, c: string) => void;
  onUpdateClientStreak: (id: string, s: number) => void; onAddWeightEntry: (id: string, w: number) => void;
  onUpdateClientAvatar: (id: string, file: File) => void;
  onLogout: () => void;
}

export const ClientDashboard: React.FC<Props> = ({ client, coach, routines, logs, messages, unreadMessages = 0, onAddLog, onSendMessage, onUpdateClientStreak, onAddWeightEntry, onUpdateClientAvatar, onLogout }) => {
  const [tab, setTab] = useState<'w'|'m'|'c'>('w');
  const ar = routines.find(r => r.clientId === client.id && r.isActive) || routines.find(r => r.clientId === client.id);
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
  const [nw, setNw] = useState(''); const [ci, setCi] = useState('');
  const [fi, setFi] = useState<string|null>(null);

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

  const gr = (ex: any, si: number) => { const k=`${ex.id}-${si}`; if(lr[k]!==undefined) return lr[k]; const p=parseInt(ex.reps); return isNaN(p)?10:p; };
  const gw = (ex: any, si: number) => { const k=`${ex.id}-${si}`; return lw[k]!==undefined?lw[k]:ex.weight; };

  const fin = (e: React.FormEvent) => {
    e.preventDefault(); if(!ar) return;
    const el = ar.exercises.map(ex => ({ exerciseId:ex.id, exerciseName:ex.name, sets: Array.from({length:ex.sets}).map((_,i)=>({setNumber:i+1,reps:gr(ex,i+1),weight:gw(ex,i+1),completed:cs[`${ex.id}-${i+1}`]||false})) }));
    onAddLog({id:`log-${Date.now()}`,clientId:client.id,routineDayId:ar.id,routineName:ar.name,date:new Date().toISOString().split('T')[0],durationMinutes:dur,exercises:el,feelingScore:feel,coachNotes:cmt?`Comentario: "${cmt}"`:undefined});
    onUpdateClientStreak(client.id,(client.streak||0)+1);
    if (coach) onSendMessage(coach.id,`Reporte: ${ar.name} | ${dur}min | Fatiga: ${feel}/5 | ${cmt||'OK'}`);
    setOk(true);
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
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col font-sans relative pb-16 md:pb-0">

      {/* Input oculto para cambio de foto */}
      <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />

      <header className="bg-[#121214] border-b border-[#27272a] px-5 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          {/* Avatar con opción de cambiar foto */}
          <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()} title="Cambiar mi foto de perfil">
            <img src={client.selfieUrl || client.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'} alt="" className="w-11 h-11 rounded-full object-cover border-2 border-[#d4f826] transition-all group-hover:border-[#e2fa52]" />
            <div className="absolute inset-0 rounded-full bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
              <Camera className="w-4 h-4 text-[#d4f826]" />
              <span className="text-[7px] text-white font-mono font-bold mt-0.5">CAMBIAR</span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 bg-[#d4f826] rounded-full p-0.5 shadow-md">
              <Camera className="w-2.5 h-2.5 text-black" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold text-white">{client.name}</h1>
              <span className="bg-[#e5ba73]/10 text-[#e5ba73] text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold">ELITE</span>
            </div>
            <p className="text-[11px] text-[#a1a1aa]">Coach: <span className="text-[#d4f826]">{coach?.name || 'Marvin'}</span> · <span className="text-[#71717a] text-[9px]">Toca foto para cambiarla</span></p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[#18181b] border border-[#27272a] px-3 py-1 rounded-xl flex items-center gap-1.5"><Flame className="w-4 h-4 text-[#e5ba73] animate-bounce" /><span className="text-xs font-mono font-bold text-white">{client.streak}D</span></div>
          <button onClick={onLogout} className="text-[11px] font-mono bg-[#1f1f23] hover:bg-[#ef4444]/10 text-[#a1a1aa] hover:text-[#ef4444] px-2.5 py-1.5 rounded-lg border border-[#27272a] transition-all">SALIR</button>
        </div>
      </header>
      <nav className="bg-[#121214] border-b border-[#1f1f23] flex text-center">
        {(['w','m','c'] as const).map((t) => {
          const tabs = {
            w: { label: 'Rutina', Icon: Dumbbell },
            m: { label: 'Progreso', Icon: TrendingUp },
            c: { label: 'Coach', Icon: MessageSquare },
          };
          const { label, Icon } = tabs[t];
          const isActive = tab === t;
          return (
            <button key={t} onClick={()=>setTab(t)} className={`flex-1 py-3 text-xs uppercase tracking-widest font-mono font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 relative ${isActive?'border-[#d4f826] text-[#d4f826] bg-[#18181b]':'border-transparent text-[#71717a] hover:text-white'}`}>
              <Icon className="w-3.5 h-3.5"/>
              {label}
              {t === 'c' && unreadMessages > 0 && (
                <span className="absolute -top-1 right-2 sm:right-4 bg-[#ef4444] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px]">
                  {unreadMessages}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      {/* Barra de progreso lineal (siempre visible cuando hay timer activo o reciente) */}
      {showTimer && ts > 0 && (
        <div className="bg-[#121214] border-b border-[#27272a] px-4 py-2 relative overflow-hidden">
          <div className="absolute top-0 left-0 h-full bg-[#d4f826]/8 transition-all duration-1000 ease-linear pointer-events-none" style={{width:`${tp}%`}}/>
          <div className="flex items-center justify-between relative z-10 max-w-3xl mx-auto">
            <div className="flex items-center gap-2">
              <Timer className="w-3.5 h-3.5 text-[#d4f826]" />
              <span className="text-[10px] font-mono font-bold text-[#a1a1aa] uppercase tracking-wider">Descanso entre series</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-extrabold text-white">{Math.floor(ts/60)}:{(ts%60).toString().padStart(2,'0')}</span>
              <button onClick={()=>setTa(!ta)} className="bg-[#27272a] p-1 rounded-lg text-white hover:text-[#d4f826] transition-all">{ta?<Pause className="w-3 h-3"/>:<Play className="w-3 h-3"/>}</button>
            </div>
          </div>
        </div>
      )}

      {/* TIMER CIRCULAR MODAL — se muestra al center al activarse */}
      {showTimer && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${ts === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} style={{background:'rgba(0,0,0,0.88)', backdropFilter:'blur(12px)'}}>
          <div className="flex flex-col items-center gap-6 text-center px-6">
            {/* Título */}
            <div>
              <p className="text-[10px] uppercase font-mono tracking-widest text-[#d4f826] font-bold">RECUPERACIÓN ACTIVA</p>
              <p className="text-xs text-[#a1a1aa] mt-1">Respira profundo · Próxima serie en breve</p>
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
                <span className={`text-5xl font-black font-mono tracking-tight transition-colors ${ts <= 5 ? 'text-[#ef4444]' : ts <= 15 ? 'text-[#e5ba73]' : 'text-white'}`}>
                  {Math.floor(ts/60) > 0 ? `${Math.floor(ts/60)}:${(ts%60).toString().padStart(2,'0')}` : ts}
                </span>
                <span className="text-[10px] text-[#52525b] font-mono mt-1">{Math.floor(ts/60) > 0 ? 'min' : 'seg'}</span>
              </div>
            </div>

            {/* Mensaje dinámico según tiempo */}
            <div className="bg-[#18181b] border border-[#27272a] px-4 py-2 rounded-xl">
              <p className="text-xs font-mono text-[#a1a1aa]">
                {ts > 60 ? '💪 Descansa bien para máximo rendimiento' : ts > 20 ? '🔥 Casi listo · Prepárate mentalmente' : ts > 5 ? '⚡ ¡Vamos! · Carga el peso' : '🚀 ¡AHORA! · Siguiente serie'}
              </p>
            </div>

            {/* Botones de control */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTa(!ta)}
                className="bg-[#27272a] border border-[#3f3f46] text-white hover:text-[#d4f826] hover:border-[#d4f826] px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2"
              >
                {ta ? <><Pause className="w-4 h-4"/> PAUSAR</> : <><Play className="w-4 h-4"/> REANUDAR</>}
              </button>
              <button
                onClick={skipTimer}
                className="bg-[#d4f826] text-black px-5 py-2 rounded-xl text-xs font-mono font-extrabold hover:bg-[#e2fa52] transition-all flex items-center gap-2 shadow-lg shadow-[#d4f826]/20"
              >
                <FastForward className="w-4 h-4"/> SALTAR DESCANSO
              </button>
            </div>

            <p className="text-[9px] text-[#3f3f46] font-mono">Pautado por Coach {coach?.name?.split(' ')[0] || 'Marvin'}: {tm}s de recuperación</p>
          </div>
        </div>
      )}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 md:p-6 space-y-6">
        {tab==='w'&&(<div className="space-y-4">{ar?(<><div className="bg-[#18181b] border border-[#27272a] p-4 rounded-xl"><span className="text-[10px] uppercase font-mono tracking-widest text-[#d4f826] font-bold block">SESIÓN PROGRAMADA</span><h2 className="text-base font-extrabold text-white font-mono mt-1">{ar.name}</h2>{ar.description&&<p className="text-xs text-[#a1a1aa] mt-1 italic">{ar.description}</p>}</div><div className="space-y-3">{ar.exercises.map((ex,idx)=>{const ie=expId===ex.id;let dc=0;for(let s=1;s<=ex.sets;s++){if(cs[`${ex.id}-${s}`])dc++;}const fl=dc===ex.sets;return(<div key={ex.id} className={`bg-[#121214] border rounded-xl overflow-hidden transition-all ${fl?'border-[#25d366]/40 opacity-80':ie?'border-[#d4f826]/50 shadow-md shadow-[#d4f826]/5':'border-[#27272a]'}`}><div onClick={()=>setExpId(ie?null:ex.id)} className="cursor-pointer hover:bg-[#18181b] transition-all">{ex.imageUrl&&(<div className="relative h-36 sm:h-44 overflow-hidden bg-[#18181b]" onClick={(e)=>{e.stopPropagation();setFi(ex.imageUrl!)}}><img src={ex.imageUrl} alt={ex.name} className="w-full h-full object-cover"/><div className="absolute inset-0 bg-gradient-to-t from-[#121214] via-transparent to-transparent"/><div className="absolute top-3 left-3 bg-black/70 text-[#d4f826] text-[10px] font-mono font-bold px-2 py-1 rounded-lg border border-[#d4f826]/20">#{idx+1}</div><div className="absolute bottom-3 right-3 bg-black/60 text-white text-[9px] font-mono px-2 py-1 rounded-lg flex items-center gap-1"><ImageIcon className="w-3 h-3"/>Ampliar</div><div className="absolute bottom-0 left-0 right-0 p-3"><h3 className="text-sm font-bold text-white drop-shadow-lg">{ex.name}</h3><div className="flex items-center gap-3 mt-1"><span className="text-[10px] bg-[#d4f826]/20 text-[#d4f826] px-1.5 py-0.5 rounded font-mono font-bold">{ex.sets}x{ex.reps}</span><span className="text-[10px] bg-white/10 text-white px-1.5 py-0.5 rounded font-mono">{ex.weight}kg</span><span className="text-[10px] bg-white/10 text-[#a1a1aa] px-1.5 py-0.5 rounded font-mono">{ex.restTime}s</span></div></div></div>)}<div className="p-4 flex items-center justify-between"><div className="flex items-center gap-3">{!ex.imageUrl&&<span className="w-7 h-7 rounded-full bg-[#1e1e24] text-[#a1a1aa] text-xs flex items-center justify-center font-mono font-bold border border-[#27272a]">{idx+1}</span>}<div>{!ex.imageUrl&&(<>  <h3 className="text-xs md:text-sm font-bold text-white">{ex.name}</h3><p className="text-[11px] text-[#a1a1aa] mt-0.5"><span className="text-white font-mono">{ex.sets} Series</span> - {ex.reps} - <span className="text-[#d4f826] font-mono">{ex.weight}kg</span></p></>)}{ex.imageUrl&&<p className="text-[10px] text-[#71717a]">{ie?'Ocultar series':'Ver series'}</p>}</div></div><div className="flex items-center gap-3">{dc>0&&<span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${fl?'bg-[#25d366]/10 text-[#25d366]':'bg-[#e5ba73]/10 text-[#e5ba73]'}`}>{dc}/{ex.sets}</span>}{ie?<ChevronUp className="w-4 h-4 text-[#71717a]"/>:<ChevronDown className="w-4 h-4 text-[#71717a]"/>}</div></div></div>{ie&&(<div className="p-4 bg-[#0e0e10] border-t border-[#1f1f23] space-y-3">{ex.notes&&<div className="bg-[#18181b] border-l-2 border-[#e5ba73] p-2.5 rounded-r-lg text-[11px] text-[#e5ba73]">💡 <span className="font-semibold text-white">Coach:</span> {ex.notes}</div>}<div className="space-y-2"><div className="grid grid-cols-12 text-[10px] uppercase font-mono tracking-wider text-[#52525b] font-bold pb-1 text-center"><div className="col-span-2 text-left pl-2">SERIE</div><div className="col-span-4">REPS</div><div className="col-span-4">PESO</div><div className="col-span-2">OK</div></div>{Array.from({length:ex.sets}).map((_,si)=>{const sn=si+1;const sk=`${ex.id}-${sn}`;const sd=cs[sk]||false;return(<div key={sn} className={`grid grid-cols-12 items-center py-2 rounded-lg border text-center transition-all ${sd?'bg-[#25d366]/5 border-[#25d366]/20':'bg-[#121214] border-[#27272a]'}`}><div className="col-span-2 text-left pl-4 font-mono font-bold text-xs text-white">#{sn}</div><div className="col-span-4 px-2"><input type="number" value={gr(ex,sn)} disabled={sd} onChange={(e)=>setLr(p=>({...p,[`${ex.id}-${sn}`]:Number(e.target.value)}))} className="w-full bg-[#18181b] border border-[#27272a] rounded-md text-xs py-1 px-2 text-center text-white font-mono font-bold disabled:opacity-60 focus:border-[#d4f826] focus:outline-none"/></div><div className="col-span-4 px-2"><input type="number" value={gw(ex,sn)} disabled={sd} onChange={(e)=>setLw(p=>({...p,[`${ex.id}-${sn}`]:Number(e.target.value)}))} className="w-full bg-[#18181b] border border-[#27272a] rounded-md text-xs py-1 px-2 text-center text-white font-mono font-bold disabled:opacity-60 focus:border-[#d4f826] focus:outline-none"/></div><div className="col-span-2 flex justify-center"><input type="checkbox" checked={sd} onChange={(e)=>tog(ex.id,sn,ex.restTime,e.target.checked)} className="w-5 h-5 rounded-md accent-[#d4f826] cursor-pointer"/></div></div>);})}</div><div className="text-[10px] text-[#71717a] font-mono flex items-center justify-between pt-1"><span>Descanso: <strong className="text-white">{ex.restTime}s</strong></span><button onClick={()=>{setTm(ex.restTime);setTs(ex.restTime);setTa(true);}} className="text-[#d4f826] hover:underline">Iniciar Cronómetro</button></div></div>)}</div>);})}</div><div className="pt-4"><button onClick={()=>setSm(true)} className="w-full bg-[#d4f826] text-black font-extrabold font-mono tracking-widest text-xs py-4 rounded-xl hover:bg-[#e2fa52] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#d4f826]/10"><CheckCircle className="w-4 h-4"/>FINALIZAR SESIÓN</button></div></>):(<div className="bg-[#121214] border border-[#27272a] p-8 rounded-2xl text-center text-xs text-[#a1a1aa] italic">No tienes rutina activa.</div>)}</div>)}
        {tab==='m'&&(<div className="space-y-6"><div className="bg-[#121214] border border-[#27272a] rounded-xl p-5"><h3 className="text-xs uppercase font-mono tracking-wider text-white font-bold flex items-center gap-2 mb-2"><Scale className="w-4 h-4 text-[#e5ba73]"/>Registrar Peso</h3><form onSubmit={(e)=>{e.preventDefault();const p=parseFloat(nw);if(!isNaN(p)&&p>0){onAddWeightEntry(client.id,p);setNw('');}}} className="flex gap-3"><div className="relative flex-1"><input type="number" step="0.1" placeholder="78.5" required value={nw} onChange={(e)=>setNw(e.target.value)} className="w-full bg-[#18181b] border border-[#27272a] rounded-xl text-xs px-4 py-2.5 text-white focus:outline-none focus:border-[#d4f826] font-mono"/><span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-[#52525b] font-bold">KG</span></div><button type="submit" className="bg-[#27272a] text-white hover:text-black hover:bg-[#d4f826] border border-[#3f3f46] font-mono text-xs font-bold px-4 rounded-xl transition-all flex items-center gap-1"><Plus className="w-3.5 h-3.5"/></button></form></div><div className="bg-[#121214] border border-[#27272a] rounded-xl p-5"><h3 className="text-xs uppercase font-mono tracking-wider text-white font-bold mb-3">Historial de Peso</h3><div className="divide-y divide-[#27272a]">{client.weightHistory?.map((en,i)=>(<div key={i} className="py-2.5 flex justify-between items-center text-xs"><span className="text-[#a1a1aa] font-mono">{en.date}</span><span className="text-white font-bold font-mono text-sm bg-[#18181b] px-3 py-1 rounded-lg border border-[#27272a]">{en.weight} kg</span></div>))||<p className="text-xs text-[#52525b] italic">Sin registros.</p>}</div></div><div className="bg-[#121214] border border-[#27272a] rounded-xl p-5"><h3 className="text-xs uppercase font-mono tracking-wider text-white font-bold flex items-center gap-2 mb-3"><Trophy className="w-4 h-4 text-[#d4f826]"/>Sesiones</h3><div className="space-y-3">{ml.length===0?<p className="text-xs text-[#52525b] p-4 text-center italic">¡Completa tu primer bloque!</p>:ml.map(l=>(<div key={l.id} className="bg-[#18181b] border border-[#27272a] rounded-xl p-3 flex justify-between items-center text-xs"><div><span className="text-[9px] font-mono text-[#71717a] block">{l.date}</span><h4 className="text-xs font-bold text-white font-mono mt-0.5">{l.routineName}</h4><p className="text-[11px] text-[#a1a1aa] mt-0.5">{l.durationMinutes} min</p></div><span className="text-xs bg-[#d4f826]/10 text-[#d4f826] px-2 py-1 rounded font-mono font-bold">{l.feelingScore}/5</span></div>))}</div></div></div>)}
        {tab==='c'&&(<div className="bg-[#121214] border border-[#27272a] rounded-xl overflow-hidden flex flex-col h-[480px]"><div className="bg-[#18181b] p-4 border-b border-[#27272a] flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-[#25d366] rounded-full animate-ping"/><span className="text-xs font-mono font-bold text-white uppercase">COACH {coach?.name?.toUpperCase() || 'MARVIN'}</span></div><span className="text-[10px] bg-[#27272a] text-[#a1a1aa] px-2 py-0.5 rounded font-mono">24/7</span></div><div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0e0e10]">{cm.map(m=>{const me=m.senderId===client.id;return(<div key={m.id} className={`flex ${me?'justify-end':'justify-start'}`}><div className={`max-w-xs p-3 rounded-xl text-xs ${me?'bg-[#27272a] text-white rounded-tr-none border border-[#3f3f46]':'bg-[#18181b] text-[#f4f4f5] rounded-tl-none border border-[#27272a]'}`}><p className="whitespace-pre-line">{m.content}</p><span className="block text-[8px] text-[#71717a] mt-1 text-right font-mono">{new Date(m.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span></div></div>);})}{cm.length===0&&<div className="text-center p-12 text-[#52525b] text-xs italic">Envía un mensaje a tu coach.</div>}</div><div className="p-3 bg-[#18181b] border-t border-[#27272a] flex gap-2"><input type="text" placeholder="Escribe al coach..." value={ci} onChange={(e)=>setCi(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter'&&ci.trim()){if(coach){onSendMessage(coach.id,ci.trim());}setCi('');}}} className="flex-1 bg-[#121214] border border-[#27272a] rounded-xl text-xs px-4 py-2 text-white focus:outline-none focus:border-[#d4f826]"/><button onClick={()=>{if(ci.trim()&&coach){onSendMessage(coach.id,ci.trim());}setCi('');}} className="bg-[#d4f826] text-black font-bold p-2 rounded-xl hover:bg-[#e2fa52] transition-all"><Send className="w-4 h-4"/></button></div></div>)}
      </main>
      {sm&&(<div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50"><div className="bg-[#121214] border border-[#27272a] rounded-2xl w-full max-w-md p-6 relative">{!ok?(<><div className="text-center mb-4"><div className="inline-flex p-2.5 bg-[#d4f826]/10 text-[#d4f826] rounded-xl border border-[#d4f826]/20 mb-2"><Trophy className="w-5 h-5"/></div><h3 className="text-base font-bold font-mono text-white uppercase">Confirmar Bitácora</h3></div><form onSubmit={fin} className="space-y-4"><div><label className="block text-[11px] text-[#a1a1aa] font-mono uppercase mb-1">Duración (min)</label><input type="number" required value={dur} onChange={(e)=>setDur(Number(e.target.value))} className="w-full bg-[#18181b] border border-[#27272a] rounded-xl text-xs p-2.5 text-white font-mono"/></div><div><label className="block text-[11px] text-[#a1a1aa] font-mono uppercase mb-1">Esfuerzo (RPE)</label><select value={feel} onChange={(e)=>setFeel(Number(e.target.value))} className="w-full bg-[#18181b] border border-[#27272a] rounded-xl text-xs p-2.5 text-white font-mono"><option value="5">5/5 Máximo</option><option value="4">4/5 Muy bueno</option><option value="3">3/5 Moderado</option><option value="2">2/5 Descarga</option><option value="1">1/5 Liviano</option></select></div><div><label className="block text-[11px] text-[#a1a1aa] font-mono uppercase mb-1">Comentarios</label><textarea placeholder="Notas para el coach..." value={cmt} onChange={(e)=>setCmt(e.target.value)} rows={3} className="w-full bg-[#18181b] border border-[#27272a] rounded-xl text-xs p-2.5 text-white"/></div><div className="flex gap-2 pt-2"><button type="button" onClick={()=>setSm(false)} className="flex-1 text-[#a1a1aa] text-xs py-2.5 rounded-xl">Volver</button><button type="submit" className="flex-1 bg-[#d4f826] text-black font-extrabold text-xs py-2.5 rounded-xl font-mono">ENVIAR</button></div></form></>):(<div className="text-center py-6 space-y-4"><div className="w-14 h-14 bg-[#25d366]/20 text-[#25d366] rounded-full flex items-center justify-center mx-auto border border-[#25d366]/40"><Trophy className="w-7 h-7"/></div><h3 className="text-lg font-bold font-mono text-white uppercase">¡ENTRENAMIENTO SUBIDO!</h3><p className="text-xs text-[#a1a1aa]">Reporte enviado al Coach Marcus.</p><button onClick={()=>{setSm(false);setOk(false);setTab('m');}} className="w-full bg-white text-black font-bold text-xs py-2.5 rounded-xl font-mono">VER ESTADÍSTICAS</button></div>)}</div></div>)}
      {fi&&(<div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-50 p-4" onClick={()=>setFi(null)}><div className="relative max-w-2xl w-full"><img src={fi} alt="Ejercicio" className="w-full rounded-2xl shadow-2xl"/><button onClick={()=>setFi(null)} className="absolute top-3 right-3 bg-black/70 text-white rounded-full p-2 hover:bg-[#ef4444] transition-all"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button><div className="absolute bottom-3 left-3 right-3 bg-black/70 backdrop-blur-sm rounded-xl p-3 text-center"><p className="text-xs text-[#d4f826] font-mono font-bold">IMAGEN DEMOSTRATIVA</p><p className="text-[10px] text-[#a1a1aa] mt-0.5">Toca fuera para cerrar</p></div></div></div>)}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#121214] border-t border-[#27272a] grid grid-cols-3 text-center text-[10px] text-[#71717a] py-1.5 z-40">
        <button onClick={()=>setTab('w')} className={`flex flex-col items-center gap-0.5 ${tab==='w'?'text-[#d4f826]':''}`}><Dumbbell className="w-4 h-4"/><span>Rutina</span></button>
        <button onClick={()=>setTab('m')} className={`flex flex-col items-center gap-0.5 ${tab==='m'?'text-[#d4f826]':''}`}><TrendingUp className="w-4 h-4"/><span>Pesos</span></button>
        <button onClick={()=>setTab('c')} className={`flex flex-col items-center gap-0.5 relative ${tab==='c'?'text-[#d4f826]':''}`}>
          <MessageSquare className="w-4 h-4"/>
          <span>Coach</span>
          {unreadMessages > 0 && (
            <span className="absolute -top-1 right-2 bg-[#ef4444] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px]">
              {unreadMessages}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
