import { supabase } from './supabase';
import { User, RoutineDay, WorkoutLog, Message, Exercise as FitnessExercise } from '../types/fitness';
import { Database } from './supabase';
import { addOneMonth } from './dateHelpers';
import bcrypt from 'bcryptjs';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Routine = Database['public']['Tables']['routines']['Row'];
type Exercise = Database['public']['Tables']['exercises']['Row'];

export const COACH_ID = '00000000-0000-0000-0000-000000000001';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200';

const mapProfileToUser = (p: Profile): User => ({
  id: p.id,
  email: p.email,
  name: p.name,
  role: p.role,
  avatar: p.avatar_url || DEFAULT_AVATAR,
  selfieUrl: p.avatar_url || DEFAULT_AVATAR,
  goal: p.goal || undefined,
  phone: p.phone || undefined,
  gender: p.gender as 'male' | 'female' | undefined,
  age: p.age || undefined,
  streak: p.streak,
  adherenceRate: p.adherence_rate,
  monthlyFee: p.monthly_fee,
  nextPaymentDate: p.next_payment_date || '',
  paymentStatus: p.payment_status,
  paymentHistory: (p.payment_history || []) as { date: string; amount: number; status: 'paid' | 'pending' | 'overdue'; method?: string }[],
  weightHistory: p.weight_history,
  measurementsHistory: p.measurements_history,
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
    sortOrder: e.sort_order,
    supersetGroup: e.superset_group || undefined,
    supersetOrder: e.superset_order,
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
      .ilike('email', email)
      .eq('role', 'client')
      .single();

    if (error) {
      console.warn('loginClient error:', error.message, 'email queried:', email);
      return null;
    }
    if (!data) return null;

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

  async create(client: Omit<User, 'id' | 'adherenceRate' | 'paymentStatus' | 'nextPaymentDate'> & { password: string; initialMeasurements?: import('../types/fitness').MeasurementsEntry; firstPaymentDate?: string }): Promise<User> {
    const passwordHash = await bcrypt.hash(client.password, 10);

    const today = new Date().toISOString().split('T')[0];
    const measurementsHistory = client.initialMeasurements ? [client.initialMeasurements] : [];

    // Payment logic: if firstPaymentDate provided, treat as already paid
    const firstPaymentDate = client.firstPaymentDate || '';
    const hasFirstPayment = !!firstPaymentDate;
    const nextPaymentDate = hasFirstPayment ? addOneMonth(firstPaymentDate) : today;
    const paymentStatus: 'paid' | 'pending' = hasFirstPayment ? 'paid' : 'pending';
    const paymentHistory = hasFirstPayment ? [{
      date: firstPaymentDate,
      amount: client.monthlyFee || 0,
      status: 'paid' as const,
      method: 'Registro inicial',
    }] : [];

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
        gender: client.gender || null,
        age: client.age || null,
        streak: 0,
        adherence_rate: 100,
        monthly_fee: client.monthlyFee || 0,
        next_payment_date: nextPaymentDate,
        payment_status: paymentStatus,
        weight_history: client.weightHistory || [],
        payment_history: paymentHistory,
        measurements_history: measurementsHistory,
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
    if (updates.gender !== undefined) updateData.gender = updates.gender;
    if (updates.age !== undefined) updateData.age = updates.age;
    if (updates.streak !== undefined) updateData.streak = updates.streak;
    if (updates.avatar !== undefined || updates.selfieUrl !== undefined) {
      updateData.avatar_url = updates.selfieUrl || updates.avatar || null;
    }
    if (updates.monthlyFee !== undefined) updateData.monthly_fee = updates.monthlyFee;
    if (updates.nextPaymentDate !== undefined) updateData.next_payment_date = updates.nextPaymentDate;
    if (updates.paymentStatus !== undefined) updateData.payment_status = updates.paymentStatus;
    if (updates.paymentHistory !== undefined) updateData.payment_history = updates.paymentHistory;
    if (updates.weightHistory !== undefined) updateData.weight_history = updates.weightHistory;
    if (updates.measurementsHistory !== undefined) updateData.measurements_history = updates.measurementsHistory;

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

    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('monthly_fee, payment_history, next_payment_date')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const currentNextDate = profile.next_payment_date || today;
    const newNextDate = addOneMonth(currentNextDate);

    const newEntry = { date: today, amount: profile.monthly_fee, status: 'paid' as const, method: 'Confirmado en app' };
    const updatedHistory = [newEntry, ...(profile.payment_history || [])];

    const { error } = await supabase
      .from('profiles')
      .update({
        payment_status: 'paid',
        next_payment_date: newNextDate,
        payment_history: updatedHistory,
      })
      .eq('id', id);

    if (error) throw error;

    // Tambien insertar en tabla payments para historial formal
    const { error: payError } = await supabase
      .from('payments')
      .insert({
        client_id: id,
        amount: profile.monthly_fee,
        status: 'paid',
        method: 'Confirmado en app',
        payment_date: today,
      });

    if (payError) console.error('Error inserting payment record:', payError);
  },

  async resetPassword(id: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const { error } = await supabase
      .from('profiles')
      .update({ password_hash: passwordHash })
      .eq('id', id);
    if (error) throw error;
  },

  async verifyAndResetPassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('password_hash')
      .eq('id', id)
      .single();

    if (fetchError || !data) throw new Error('Usuario no encontrado');

    const match = await bcrypt.compare(currentPassword, data.password_hash);
    if (!match) throw new Error('Contraseña actual incorrecta');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const { error } = await supabase
      .from('profiles')
      .update({ password_hash: passwordHash })
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
    // Obtener el max sort_order existente para esta rutina
    const { data: existing, error: fetchError } = await supabase
      .from('exercises')
      .select('sort_order')
      .eq('routine_id', routineId)
      .order('sort_order', { ascending: false })
      .limit(1);

    if (fetchError) throw fetchError;

    const nextSortOrder = (existing && existing.length > 0 ? existing[0].sort_order : -1) + 1;

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
        sort_order: nextSortOrder,
        superset_group: exercise.supersetGroup || null,
        superset_order: exercise.supersetOrder || 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<FitnessExercise>): Promise<void> {
    const updateData: Partial<Exercise> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.sets !== undefined) updateData.sets = updates.sets;
    if (updates.reps !== undefined) updateData.reps = updates.reps;
    if (updates.weight !== undefined) updateData.weight = updates.weight;
    if (updates.restTime !== undefined) updateData.rest_time = updates.restTime;
    if (updates.notes !== undefined) updateData.notes = updates.notes || null;
    if (updates.imageUrl !== undefined) updateData.image_url = updates.imageUrl || null;
    if (updates.sortOrder !== undefined) updateData.sort_order = updates.sortOrder;
    if (updates.supersetGroup !== undefined) updateData.superset_group = updates.supersetGroup || null;
    if (updates.supersetOrder !== undefined) updateData.superset_order = updates.supersetOrder;

    const { error } = await supabase.from('exercises').update(updateData).eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('exercises').delete().eq('id', id);
    if (error) throw error;
  },

  async getGlobalPresets(): Promise<Exercise[]> {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .is('routine_id', null)
      .order('name');

    if (error) throw error;
    return data || [];
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

    // Notificar al coach por email si el mensaje viene de un cliente
    try {
      const { data: coachProfile } = await supabase
        .from('profiles')
        .select('email, name')
        .eq('id', receiverId)
        .eq('role', 'coach')
        .maybeSingle();

      if (coachProfile?.email) {
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', senderId)
          .maybeSingle();

        notifyService.notifyCoachNewMessage(
          coachProfile.email,
          senderProfile?.name || 'Cliente',
          content
        );
      }
    } catch (e) {
      console.warn('Notification skip:', e);
    }

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

export const notifyService = {
  async notifyCoachNewMessage(coachEmail: string, senderName: string, content: string): Promise<void> {
    try {
      // Usamos auth custom, por lo que supabase.auth.getSession() siempre es null.
      // Usamos el anon key directamente para invocar la Edge Function.
      const token = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-coach-email`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: coachEmail,
          subject: `Nuevo mensaje de ${senderName}`,
          text: `Tienes un nuevo mensaje de ${senderName} en AURA Fitness Elite:\n\n${content}`,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn('Email notification failed:', err);
      } else {
        console.log('Email notification sent to coach');
      }
    } catch (e) {
      console.warn('Email notification error:', e);
    }
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
      .from('exercise-images')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('exercise-images').getPublicUrl(path);
    return data.publicUrl;
  },
};
