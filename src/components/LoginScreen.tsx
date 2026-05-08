import React, { useState } from 'react';
import { Dumbbell, ShieldCheck, User as UserIcon, Lock, ArrowRight } from 'lucide-react';
import { User } from '../types/fitness';
import { authService } from '../lib/supabase-auth';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let user: User | null = null;

      if (email.toLowerCase() === 'coach@aurafitness.com') {
        user = await authService.loginCoach(email, password);
      } else {
        user = await authService.loginClient(email, password);
      }

      if (user) {
        onLoginSuccess(user);
      } else {
        setError('Credenciales incorrectas. Verifica tu correo y contraseña.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#d4f826] opacity-[0.03] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#bba15c] opacity-[0.03] rounded-full blur-[150px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#121214] border border-[#27272a] rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative z-10 transition-all duration-300 hover:border-[#3f3f46]">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-xl bg-gradient-to-br from-[#1e1e24] to-[#2a2a32] border border-[#3f3f46] text-[#d4f826] mb-3 shadow-md">
            <Dumbbell className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-widest text-white font-mono">
            AURA <span className="text-[#d4f826] font-sans font-light">//</span> ELITE
          </h1>
          <p className="text-[#a1a1aa] text-[10px] sm:text-xs uppercase tracking-widest mt-1">
            Plataforma de Alta Performance & Seguimiento
          </p>
        </div>

        <div className="bg-[#18181b] border-l-2 border-[#d4f826] p-3 rounded-r-lg mb-6 text-xs text-[#a1a1aa] flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-[#d4f826] shrink-0 mt-0.5" />
          <div>
            <span className="text-white font-semibold">Acceso exclusivo:</span> Ingresa con tus credenciales para gestionar clientes y rutinas.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#a1a1aa] mb-1.5 font-semibold">
              Correo Electrónico
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#71717a]">
                <UserIcon className="w-4 h-4" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="coach@aurafitness.com"
                required
                className="w-full bg-[#18181b] border border-[#27272a] rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#d4f826] focus:ring-1 focus:ring-[#d4f826] transition-all placeholder-[#52525b]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-[#a1a1aa] mb-1.5 font-semibold">
              Contraseña
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#71717a]">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full bg-[#18181b] border border-[#27272a] rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#d4f826] focus:ring-1 focus:ring-[#d4f826] transition-all placeholder-[#52525b]"
              />
            </div>
          </div>

          {error && (
            <div className="text-xs text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 p-3 rounded-xl font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#d4f826] text-black font-semibold text-sm py-3 px-4 rounded-xl hover:bg-[#e2fa52] focus:outline-none transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#d4f826]/10 font-mono tracking-wide mt-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>INGRESAR AL SISTEMA <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#27272a] text-center">
          <p className="text-[10px] text-[#52525b]">
            Aura Fitness Elite v2 · Coach Marvin Martinez
          </p>
        </div>
      </div>
    </div>
  );
};
