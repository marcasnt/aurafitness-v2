/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          password_hash: string | null;
          role: 'coach' | 'client';
          avatar_url: string | null;
          goal: string | null;
          phone: string | null;
          gender: string | null;
          age: number | null;
          streak: number;
          adherence_rate: number;
          monthly_fee: number;
          next_payment_date: string | null;
          payment_status: 'paid' | 'pending' | 'overdue';
          weight_history: { date: string; weight: number }[];
          measurements_history: { date: string; neck: number; waist: number; hips: number; thighsLeft: number; thighsRight: number; bicepsLeft: number; bicepsRight: number; height: number; weight: number; bodyFat?: number }[];
          payment_history: { date: string; amount: number; status: string; method?: string }[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      routines: {
        Row: {
          id: string;
          client_id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['routines']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['routines']['Row']>;
      };
      exercises: {
        Row: {
          id: string;
          routine_id: string;
          name: string;
          category: string;
          sets: number;
          reps: string;
          weight: number;
          rest_time: number;
          notes: string | null;
          image_url: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['exercises']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['exercises']['Row']>;
      };
      workout_logs: {
        Row: {
          id: string;
          client_id: string;
          routine_id: string | null;
          routine_name: string | null;
          date: string;
          duration_minutes: number;
          feeling_score: number;
          coach_notes: string | null;
          exercises: {
            exerciseId: string;
            exerciseName: string;
            sets: { setNumber: number; reps: number; weight: number; completed: boolean }[];
          }[];
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['workout_logs']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['workout_logs']['Row']>;
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['messages']['Row']>;
      };
      payments: {
        Row: {
          id: string;
          client_id: string;
          amount: number;
          status: 'paid' | 'pending' | 'overdue';
          method: string | null;
          payment_date: string;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['payments']['Row']>;
      };
    };
  };
};