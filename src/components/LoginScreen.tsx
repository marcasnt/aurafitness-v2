import React, { useState } from 'react';
import { Dumbbell, ShieldCheck, User as UserIcon, Lock } from 'lucide-react';
import { User } from '../types/fitness';
import { authService } from '../lib/supabase-auth';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let user: User | null = null;
      if (email.toLowerCase() === 'marcasnt@gmail.com') {
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
      setError('Error de conexion. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const createRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const circle = document.createElement('span');
    const diameter = Math.max(rect.width, rect.height);
    const radius = diameter / 2;

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - rect.left - radius}px`;
    circle.style.top = `${event.clientY - rect.top - radius}px`;
    circle.className = 'absolute rounded-full bg-black/10 animate-ripple pointer-events-none';

    const existing = button.getElementsByClassName('animate-ripple')[0];
    if (existing) existing.remove();
    button.appendChild(circle);

    setTimeout(() => circle.remove(), 400);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4">
      {/* Card */}
      <div className="w-full max-w-[420px] bg-[#141416] rounded-[16px] p-6 sm:p-10 animate-fade-in-up">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-12 h-12 bg-[#1c1c1f] rounded-[12px] flex items-center justify-center mx-auto mb-5">
            <Dumbbell className="w-6 h-6 text-[#d4f826]" />
          </div>
          <h1 className="text-[28px] sm:text-[32px] font-extrabold tracking-[0.15em] text-white uppercase">
            AURA <span className="text-[#d4f826] font-light">//</span> ELITE
          </h1>
          <p className="text-xs text-[#8e8e93] mt-2 tracking-[0.1em] uppercase font-medium">
            Plataforma de Alto Rendimiento
          </p>
        </div>

        {/* Info chip */}
        <div className="bg-[#1c1c1f] rounded-[8px] px-4 py-3 mb-8 flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-[#d4f826] shrink-0 mt-0.5" />
          <p className="text-xs text-[#a1a1aa] leading-relaxed">
            <span className="text-white font-medium">Acceso exclusivo:</span> Ingresa con tus credenciales para gestionar clientes y rutinas.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div className="relative">
            <input
              type="email"
              id="login-email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              className="w-full bg-transparent border border-[#3f3f46] rounded-[8px] px-4 py-3.5 text-[16px] text-white focus:outline-none focus:border-[#d4f826] transition-colors duration-200"
            />
            <label
              htmlFor="login-email"
              className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                emailFocused || email
                  ? 'top-[5px] text-[11px] text-[#d4f826] bg-[#141416] px-1 -ml-0'
                  : 'top-3.5 text-[16px] text-[#8e8e93]'
              }`}
            >
              Correo Electronico
            </label>
            <UserIcon className="absolute right-4 top-4 w-4 h-4 text-[#3f3f46] pointer-events-none" />
          </div>

          {/* Password Input */}
          <div className="relative">
            <input
              type="password"
              id="login-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              className="w-full bg-transparent border border-[#3f3f46] rounded-[8px] px-4 py-3.5 text-[16px] text-white focus:outline-none focus:border-[#d4f826] transition-colors duration-200"
            />
            <label
              htmlFor="login-password"
              className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                passwordFocused || password
                  ? 'top-[5px] text-[11px] text-[#d4f826] bg-[#141416] px-1 -ml-0'
                  : 'top-3.5 text-[16px] text-[#8e8e93]'
              }`}
            >
              Contrasena
            </label>
            <Lock className="absolute right-4 top-4 w-4 h-4 text-[#3f3f46] pointer-events-none" />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-[#2d1b1b] border border-[#ff5449]/30 rounded-[8px] px-4 py-3 text-xs text-[#ff5449] animate-fade-in-down">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            onMouseDown={createRipple}
            className="relative w-full bg-[#d4f826] text-black font-semibold text-sm uppercase tracking-[0.05em] py-3.5 rounded-[28px] hover:bg-[#e2fa52] active:scale-[0.98] transition-all duration-150 overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin inline-block" />
            ) : (
              'Ingresar al Sistema'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-[#27272a] text-center">
          <p className="text-[10px] text-[#52525b] tracking-wide">
            Aura Fitness Elite v2 · Coach Marvin Martinez
          </p>
        </div>
      </div>
    </div>
  );
};
