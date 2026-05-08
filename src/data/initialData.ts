import { User, RoutineDay, WorkoutLog, Message } from '../types/fitness';

export const COACH_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'marcasnt@gmail.com',
  name: 'Marvin Martinez',
  role: 'coach',
  avatar: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=200',
  streak: 0,
  adherenceRate: 100,
  monthlyFee: 0,
  nextPaymentDate: '',
  paymentStatus: 'paid'
};

export const INITIAL_CLIENTS: User[] = [];
export const INITIAL_ROUTINES: RoutineDay[] = [];
export const INITIAL_LOGS: WorkoutLog[] = [];
export const INITIAL_MESSAGES: Message[] = [];

export const PRESET_EXERCISES = [
  { name: 'Press de Banca Plano con Barra', category: 'Chest' },
  { name: 'Press de Banca Inclinado con Mancuernas', category: 'Chest' },
  { name: 'Aperturas en Polea Baja', category: 'Chest' },
  { name: 'Dominadas Pronas (Lastradas)', category: 'Back' },
  { name: 'Remo con Barra Prono', category: 'Back' },
  { name: 'Jalón al Pecho', category: 'Back' },
  { name: 'Remo Gironda (Polea Baja)', category: 'Back' },
  { name: 'Sentadilla Libre con Barra Back', category: 'Legs' },
  { name: 'Prensa Atlética de 45 Grados', category: 'Legs' },
  { name: 'Sentadilla Búlgara', category: 'Legs' },
  { name: 'Hip Thrust de Élite', category: 'Legs' },
  { name: 'Peso Muerto Rumano', category: 'Legs' },
  { name: 'Press Militar de Pie', category: 'Shoulders' },
  { name: 'Elevaciones Laterales con Mancuerna', category: 'Shoulders' },
  { name: 'Pájaros en Polea Posterior', category: 'Shoulders' },
  { name: 'Curl de Bíceps con Barra Z', category: 'Arms' },
  { name: 'Curl Martillo Alterno', category: 'Arms' },
  { name: 'Fondos en Paralelas', category: 'Arms' },
  { name: 'Extensiones de Tríceps sobre la Cabeza', category: 'Arms' },
  { name: 'Abdominales en Polea Alta (Crunch)', category: 'Core' },
  { name: 'Plancha Isométrica con Lastre', category: 'Core' }
] as const;
