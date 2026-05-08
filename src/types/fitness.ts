export interface PaymentEntry {
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  method?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'coach' | 'client';
  avatar?: string;
  selfieUrl?: string;
  goal?: string;
  phone?: string;
  password?: string;
  streak: number;
  adherenceRate: number;
  weightHistory?: { date: string; weight: number }[];
  // Payment fields
  monthlyFee: number;
  nextPaymentDate: string; // YYYY-MM-DD
  paymentStatus: 'paid' | 'pending' | 'overdue';
  paymentHistory?: PaymentEntry[];
}

export interface Exercise {
  id: string;
  name: string;
  category: 'Chest' | 'Back' | 'Legs' | 'Shoulders' | 'Arms' | 'Core' | 'Cardio';
  sets: number;
  reps: string; // e.g., "10-12" or "4x8" or "As many reps as possible"
  weight: number; // in kg or lbs
  restTime: number; // in seconds
  notes?: string;
  imageUrl?: string; // Imagen o GIF demostrativo del ejercicio
}

export interface RoutineDay {
  id: string;
  clientId: string;
  name: string; // e.g., "Día 1: Empuje - Hipertrofia"
  description?: string;
  isActive: boolean;
  exercises: Exercise[];
  createdAt: string;
}

export interface SetLog {
  setNumber: number;
  reps: number;
  weight: number;
  completed: boolean;
}

export interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  sets: SetLog[];
}

export interface WorkoutLog {
  id: string;
  clientId: string;
  routineDayId: string;
  routineName: string;
  date: string; // YYYY-MM-DD
  durationMinutes: number;
  exercises: ExerciseLog[];
  feelingScore: number; // 1-5
  coachNotes?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}
