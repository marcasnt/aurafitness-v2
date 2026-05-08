import { supabase } from './supabase';
import { User, RoutineDay, WorkoutLog, Message, Exercise as FitnessExercise } from '../types/fitness';
import { Database } from './supabase';
import bcrypt from 'bcryptjs';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Routine = Database['public']['Tables']['routines']['Row'];
type Exercise = Database['public']['Tables']['exercises']['Row'];

export const COACH_ID = '00000000-0000-0000-0000-000000000001';

const mapProfileToUser = (p: Profile): User => ({
  id: p.id,
  email: p.email,
  name: p.name,
  role: p.role,
  avatar: p.avatar_url || undefined,
  selfieUrl: p.avatar_url || undefined,
  goal: p.goal || undefined,
  phone: p.phone || undefined,
  streak: p.streak,
  adherenceRate: p.adherence_rate,
  monthlyFee: p.monthly_fee,
  nextPaymentDate: p.next_payment_date || '',
  paymentStatus: p.payment_status,
  paymentHistory: (p.payment_history || []) as { date: string; amount: number; status: 'paid' | 'pending' | 'overdue'; method?: string }[],
  weightHistory: p.weight_history,
});

const mapRoutineToRoutineDay = (r: Routine, exercises: Exercise[]): RoutineDay => ({
  id: r.id,
  clientId: r.client_id,
  name: r.name,
  description: r.description || undefined,
  isActive: r.is_active,
  exercises: exercises.map(e => ({
    id: e.id,
    name: e.name,
    category: e.category as RoutineDay['exercises'][0]['category'],
    sets: e.sets,
    reps: e.reps,
    weight: e.weight,
    restTime: e.rest_time,
    notes: e.notes || undefined,
    imageUrl: e.image_url || undefined,
  })),
  createdAt: r.created_at.split('T')[0],
});

export const authService = {
  async loginCoach(email: string, password: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('role', 'coach')
      .single();

    if (error || !data) return null;

    const match = await bcrypt.compare(password, data.password_hash);
    if (match) {
      return mapProfileToUser(data);
    }
    return null;
  },

  async loginClient(email: string, password: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('role', 'client')
      .single();

    if (error || !data) return null;

    const match = await bcrypt.compare(password, data.password_hash);
    if (match) {
      return mapProfileToUser(data);
    }
    return null;
  },

  async getCoach(): Promise<User | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'coach')
      .single();

    if (error || !data) return null;
    return mapProfileToUser(data);
  },

  async getClients(): Promise<User[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'client')
      .order('name');

    if (error) throw error;
    return (data || []).map(mapProfileToUser);
  },

  async getClient(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return mapProfileToUser(data);
  },
};

export const clientsService = {
  async getAll(): Promise<User[]> {
    return authService.getClients();
  },

  async create(client: Omit<User, 'id' | 'adherenceRate' | 'paymentStatus' | 'nextPaymentDate'> & { password: string }): Promise<User> {
    const passwordHash = await bcrypt.hash(client.password, 10);

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        email: client.email,
        name: client.name,
        password_hash: passwordHash,
        role: 'client',
        avatar_url: client.selfieUrl || client.avatar || null,
        goal: client.goal || null,
        phone: client.phone || null,
        streak: 0,
        adherence_rate: 100,
        monthly_fee: client.monthlyFee || 0,
        next_payment_date: new Date().toISOString().split('T')[0],
        payment_status: 'pending',
        weight_history: [],
        payment_history: [],
      })
      .select()
      .single();

    if (error) throw error;
    return mapProfileToUser(data);
  },

  async update(id: string, updates: Partial<User>): Promise<User> {
    const updateData: Partial<Profile> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.goal !== undefined) updateData.goal = updates.goal;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.streak !== undefined) updateData.streak = updates.streak;
    if (updates.avatar !== undefined || updates.selfieUrl !== undefined) {
      updateData.avatar_url = updates.selfieUrl || updates.avatar || null;
    }
    if (updates.monthlyFee !== undefined) updateData.monthly_fee = updates.monthlyFee;
    if (updates.nextPaymentDate !== undefined) updateData.next_payment_date = updates.nextPaymentDate;
    if (updates.paymentStatus !== undefined) updateData.payment_status = updates.paymentStatus;
    if (updates.paymentHistory !== undefined) updateData.payment_history = updates.paymentHistory;
    if (updates.weightHistory !== undefined) updateData.weight_history = updates.weightHistory;

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapProfileToUser(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) throw error;
  },

  async markPaymentPaid(id: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);

    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('monthly_fee, payment_history')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const newEntry = { date: today, amount: profile.monthly_fee, status: 'paid' as const, method: 'Confirmado en app' };
    const updatedHistory = [newEntry, ...(profile.payment_history || [])];

    const { error } = await supabase
      .from('profiles')
      .update({
        payment_status: 'paid',
        next_payment_date: nextMonth.toISOString().split('T')[0],
        payment_history: updatedHistory,
      })
      .eq('id', id);

    if (error) throw error;
  },
};

export const routinesService = {
  async getByClient(clientId: string): Promise<RoutineDay[]> {
    const { data: routines, error } = await supabase
      .from('routines')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at');

    if (error) throw error;

    const result: RoutineDay[] = [];
    for (const r of routines || []) {
      const { data: exercises } = await supabase
        .from('exercises')
        .select('*')
        .eq('routine_id', r.id)
        .order('sort_order');

      result.push(mapRoutineToRoutineDay(r, exercises || []));
    }
    return result;
  },

  async create(routine: Omit<RoutineDay, 'id' | 'exercises' | 'createdAt'>): Promise<RoutineDay> {
    const { data: routines, error: countError } = await supabase
      .from('routines')
      .select('id')
      .eq('client_id', routine.clientId);

    const isFirst = !countError && (routines?.length || 0) === 0;

    const { data, error } = await supabase
      .from('routines')
      .insert({
        client_id: routine.clientId,
        name: routine.name,
        description: routine.description || null,
        is_active: isFirst || routine.isActive,
      })
      .select()
      .single();

    if (error) throw error;
    return mapRoutineToRoutineDay(data, []);
  },

  async update(id: string, updates: Partial<RoutineDay>): Promise<void> {
    const updateData: Partial<Routine> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    const { error } = await supabase.from('routines').update(updateData).eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('routines').delete().eq('id', id);
    if (error) throw error;
  },
};

export const exercisesService = {
  async getByRoutine(routineId: string): Promise<Exercise[]> {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('routine_id', routineId)
      .order('sort_order');

    if (error) throw error;
    return data || [];
  },

  async create(routineId: string, exercise: Omit<FitnessExercise, 'id'>): Promise<Exercise> {
    const { data, error } = await supabase
      .from('exercises')
      .insert({
        routine_id: routineId,
        name: exercise.name,
        category: exercise.category,
        sets: exercise.sets,
        reps: exercise.reps,
        weight: exercise.weight,
        rest_time: exercise.restTime,
        notes: exercise.notes || null,
        image_url: exercise.imageUrl || null,
        sort_order: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('exercises').delete().eq('id', id);
    if (error) throw error;
  },
};

export const logsService = {
  async getByClient(clientId: string): Promise<WorkoutLog[]> {
    const { data, error } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false });

    if (error) throw error;

    return (data || []).map((l): WorkoutLog => ({
      id: l.id,
      clientId: l.client_id,
      routineDayId: l.routine_id || '',
      routineName: l.routine_name || '',
      date: l.date,
      durationMinutes: l.duration_minutes,
      exercises: l.exercises,
      feelingScore: l.feeling_score,
      coachNotes: l.coach_notes || undefined,
    }));
  },

  async create(log: Omit<WorkoutLog, 'id'>): Promise<WorkoutLog> {
    const { data, error } = await supabase
      .from('workout_logs')
      .insert({
        client_id: log.clientId,
        routine_id: log.routineDayId || null,
        routine_name: log.routineName,
        date: log.date,
        duration_minutes: log.durationMinutes,
        feeling_score: log.feelingScore,
        coach_notes: log.coachNotes || null,
        exercises: log.exercises,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      clientId: data.client_id,
      routineDayId: data.routine_id || '',
      routineName: data.routine_name || '',
      date: data.date,
      durationMinutes: data.duration_minutes,
      exercises: data.exercises,
      feelingScore: data.feeling_score,
      coachNotes: data.coach_notes || undefined,
    };
  },
};

export const messagesService = {
  async getByClient(clientId: string, coachId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${clientId},receiver_id.eq.${coachId}),and(sender_id.eq.${coachId},receiver_id.eq.${clientId})`)
      .order('created_at');

    if (error) throw error;
    return (data || []).map((m): Message => ({
      id: m.id,
      senderId: m.sender_id,
      receiverId: m.receiver_id,
      content: m.content,
      timestamp: m.created_at,
      isRead: m.is_read,
    }));
  },

  async send(receiverId: string, content: string, senderId: string): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      senderId: data.sender_id,
      receiverId: data.receiver_id,
      content: data.content,
      timestamp: data.created_at,
      isRead: data.is_read,
    };
  },

  async markAsRead(receiverId: string, senderId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', receiverId)
      .eq('sender_id', senderId)
      .eq('is_read', false);

    if (error) console.error('Error marking messages as read:', error);
  },
};

export const storageService = {
  async uploadAvatar(userId: string, file: File): Promise<string> {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `avatars/${userId}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  },

  async uploadExerciseImage(routineId: string, file: File): Promise<string> {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `exercises/${routineId}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  },
};
