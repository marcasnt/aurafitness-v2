import { useState, useEffect, useCallback, useRef } from 'react';
import { User, RoutineDay, WorkoutLog, Message, Exercise } from './types/fitness';
import { LoginScreen } from './components/LoginScreen';
import { CoachDashboard } from './components/CoachDashboard';
import { ClientDashboard } from './components/ClientDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { supabase } from './lib/supabase';
import { getAutoPaymentStatus } from './lib/dateHelpers';
import {
  authService,
  clientsService,
  routinesService,
  exercisesService,
  logsService,
  messagesService,
  storageService,
} from './lib/supabase-auth';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [clients, setClients] = useState<User[]>([]);
  const [routines, setRoutines] = useState<RoutineDay[]>([]);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coachProfile, setCoachProfile] = useState<User | null>(null);
  const mountedRef = useRef(true);

  const showError = useCallback((msg: string) => {
    if (!mountedRef.current) return;
    setError(msg);
    setTimeout(() => { if (mountedRef.current) setError(null); }, 4000);
  }, []);

  const loadClients = useCallback(async () => {
    try {
      const data = await clientsService.getAll();
      if (mountedRef.current) setClients(data);
    } catch (e: any) {
      console.error('Error loading clients:', e);
      showError('Error cargando clientes: ' + (e.message || 'desconocido'));
    }
  }, [showError]);

  const loadRoutines = useCallback(async (clientId?: string) => {
    try {
      if (clientId) {
        const data = await routinesService.getByClient(clientId);
        if (mountedRef.current) setRoutines(data);
        return data;
      }
      if (currentUser?.role === 'coach') {
        const allRoutines: RoutineDay[] = [];
        const currentClients = await clientsService.getAll();
        if (mountedRef.current) setClients(currentClients);
        for (const client of currentClients) {
          try {
            const cr = await routinesService.getByClient(client.id);
            allRoutines.push(...cr);
          } catch (err) {
            console.warn(`Error loading routines for ${client.id}:`, err);
          }
        }
        if (mountedRef.current) setRoutines(allRoutines);
        return allRoutines;
      }
      return [];
    } catch (e: any) {
      console.error('Error loading routines:', e);
      showError('Error cargando rutinas: ' + (e.message || 'desconocido'));
      return [];
    }
  }, [currentUser, showError]);

  const loadMessages = useCallback(async () => {
    if (!currentUser) return;
    try {
      let allMessages: Message[] = [];
      if (currentUser.role === 'coach') {
        const currentClients = await clientsService.getAll();
        if (mountedRef.current) setClients(currentClients);
        for (const client of currentClients) {
          try {
            const cm = await messagesService.getByClient(client.id, currentUser.id);
            allMessages.push(...cm);
          } catch (err) {
            console.warn(`Error loading messages for ${client.id}:`, err);
          }
        }
      } else {
        const coach = await authService.getCoach();
        if (coach && mountedRef.current) {
          setCoachProfile(coach);
          const cm = await messagesService.getByClient(currentUser.id, coach.id);
          allMessages = cm;
        }
      }
      if (mountedRef.current) {
        setMessages(allMessages);
        // Contar mensajes no leídos dirigidos al usuario actual
        const unread = allMessages.filter(m => m.receiverId === currentUser.id && !m.isRead).length;
        setUnreadMessages(unread);
      }
    } catch (e: any) {
      console.error('Error loading messages:', e);
      showError('Error cargando mensajes: ' + (e.message || 'desconocido'));
    }
  }, [currentUser, showError]);

  useEffect(() => {
    mountedRef.current = true;
    const initSession = async () => {
      try {
        const timeout = setTimeout(() => {
          if (mountedRef.current) setLoading(false);
        }, 3000);

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await authService.getClient(session.user.id);
          if (profile && mountedRef.current) {
            setCurrentUser(profile);
          }
        } else {
          // Intentar restaurar sesion custom desde sessionStorage
          try {
            const raw = sessionStorage.getItem('aura_session');
            if (raw) {
              const stored = JSON.parse(raw);
              const profile = await authService.getClient(stored.userId);
              if (profile && mountedRef.current) {
                setCurrentUser(profile);
              }
            }
          } catch (e) {
            console.error('Session restore error:', e);
          }
        }
        clearTimeout(timeout);
      } catch (e) {
        console.error('Session check error:', e);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };
    initSession();
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'coach') {
      loadClients();
    }
  }, [currentUser, loadClients]);

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'client') {
      loadRoutines(currentUser.id);
      loadMessages();
    } else if (clients.length > 0) {
      loadRoutines();
      loadMessages();
    }
  }, [currentUser, clients.length, loadRoutines, loadMessages]);

  useEffect(() => {
    if (currentUser?.role === 'client') {
      logsService.getByClient(currentUser.id).then(data => {
        if (mountedRef.current) setLogs(data);
      }).catch(console.error);
    }
  }, [currentUser]);

  // Polling de mensajes cada 15 segundos para notificaciones en tiempo real
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      loadMessages();
    }, 15000);
    return () => clearInterval(interval);
  }, [currentUser, loadMessages]);

  // Auto-detección de estados de pago: ejecuta al cargar y cada 60 segundos
  const autoUpdatePaymentStatuses = useCallback(async () => {
    if (currentUser?.role !== 'coach') return;
    for (const client of clients) {
      const computed = getAutoPaymentStatus(client.nextPaymentDate);
      if (computed !== client.paymentStatus) {
        try {
          const updated = await clientsService.update(client.id, { paymentStatus: computed });
          if (mountedRef.current) {
            setClients(prev => prev.map(c => c.id === client.id ? updated : c));
          }
        } catch (e: any) {
          console.error('Auto payment status error for', client.id, e);
        }
      }
    }
  }, [currentUser, clients]);

  useEffect(() => {
    autoUpdatePaymentStatuses();
    const interval = setInterval(autoUpdatePaymentStatuses, 60000);
    return () => clearInterval(interval);
  }, [autoUpdatePaymentStatuses]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    try {
      sessionStorage.setItem('aura_session', JSON.stringify({ userId: user.id, role: user.role }));
    } catch {
      // ignorar errores de storage
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    try {
      sessionStorage.removeItem('aura_session');
    } catch {
      // ignorar
    }
    setCurrentUser(null);
    setClients([]);
    setRoutines([]);
    setLogs([]);
    setMessages([]);
    setCoachProfile(null);
  };

  const handleAddClient = async (newClient: Omit<User, 'id' | 'adherenceRate' | 'paymentStatus' | 'nextPaymentDate'> & { password: string; initialMeasurements?: import('./types/fitness').MeasurementsEntry; firstPaymentDate?: string }): Promise<User | undefined> => {
    try {
      const created = await clientsService.create(newClient);
      if (mountedRef.current) setClients(prev => [created, ...prev]);
      return created;
    } catch (e: any) {
      console.error('Error adding client:', e);
      showError('Error al crear cliente: ' + (e.message || 'desconocido'));
      return undefined;
    }
  };

  const handleUpdateClient = async (clientId: string, updates: Partial<User>) => {
    try {
      const updated = await clientsService.update(clientId, updates);
      if (mountedRef.current) setClients(prev => prev.map(c => c.id === clientId ? updated : c));
      if (currentUser?.id === clientId) {
        setCurrentUser(updated);
      }
    } catch (e: any) {
      console.error('Error updating client:', e);
      showError('Error al actualizar cliente: ' + (e.message || 'desconocido'));
    }
  };

  const handleAddRoutineDay = async (newRoutine: Omit<RoutineDay, 'id' | 'exercises' | 'createdAt'>) => {
    try {
      const created = await routinesService.create(newRoutine);
      if (mountedRef.current) setRoutines(prev => [...prev, created]);
    } catch (e: any) {
      console.error('Error adding routine:', e);
      showError('Error al crear rutina: ' + (e.message || 'desconocido'));
    }
  };

  const handleAddExercise = async (routineDayId: string, exercise: Omit<Exercise, 'id'>) => {
    try {
      await exercisesService.create(routineDayId, exercise);
      const clientId = routines.find(r => r.id === routineDayId)?.clientId;
      if (clientId) {
        const updated = await routinesService.getByClient(clientId);
        if (mountedRef.current) setRoutines(prev => prev.map(r => {
          const found = updated.find(u => u.id === r.id);
          return found ? found : r;
        }));
      }
    } catch (e: any) {
      console.error('Error adding exercise:', e);
      showError('Error al agregar ejercicio: ' + (e.message || 'desconocido'));
    }
  };

  const handleUpdateExercise = async (routineDayId: string, exerciseId: string, updates: Partial<Exercise>) => {
    try {
      await exercisesService.update(exerciseId, updates);
      const clientId = routines.find(r => r.id === routineDayId)?.clientId;
      if (clientId) {
        const updated = await routinesService.getByClient(clientId);
        if (mountedRef.current) setRoutines(prev => prev.map(r => {
          const found = updated.find(u => u.id === r.id);
          return found ? found : r;
        }));
      }
    } catch (e: any) {
      console.error('Error updating exercise:', e);
      showError('Error al actualizar ejercicio: ' + (e.message || 'desconocido'));
    }
  };

  const handleReorderExercises = async (routineDayId: string, exerciseId: string, direction: 'up' | 'down') => {
    try {
      const routine = routines.find(r => r.id === routineDayId);
      if (!routine) return;

      // Ordenar por sortOrder actual
      const exercises = [...routine.exercises].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

      // Agrupar en bloques: supersets se mueven como unidad
      const groups: { type: 'superset' | 'single'; group?: string; exercises: typeof exercises }[] = [];
      for (const ex of exercises) {
        if (ex.supersetGroup) {
          const last = groups[groups.length - 1];
          if (last && last.type === 'superset' && last.group === ex.supersetGroup) {
            last.exercises.push(ex);
          } else {
            groups.push({ type: 'superset', group: ex.supersetGroup, exercises: [ex] });
          }
        } else {
          groups.push({ type: 'single', exercises: [ex] });
        }
      }

      // Encontrar el grupo que contiene el ejercicio
      const groupIdx = groups.findIndex(g => g.exercises.some(e => e.id === exerciseId));
      if (groupIdx === -1) return;

      const swapIdx = direction === 'up' ? groupIdx - 1 : groupIdx + 1;
      if (swapIdx < 0 || swapIdx >= groups.length) return;

      // Intercambiar grupos completos
      const newGroups = [...groups];
      const temp = newGroups[groupIdx];
      newGroups[groupIdx] = newGroups[swapIdx];
      newGroups[swapIdx] = temp;

      // Aplanar y reasignar sortOrder secuencial (0, 1, 2, 3...)
      const reordered: { id: string; sortOrder: number }[] = [];
      let order = 0;
      for (const group of newGroups) {
        for (const ex of group.exercises) {
          reordered.push({ id: ex.id, sortOrder: order++ });
        }
      }

      // Actualizar todos en paralelo
      await Promise.all(reordered.map(r => exercisesService.update(r.id, { sortOrder: r.sortOrder })));

      // Refrescar rutinas desde DB
      const clientId = routine.clientId;
      const updated = await routinesService.getByClient(clientId);
      if (mountedRef.current) setRoutines(prev => prev.map(r => {
        const found = updated.find(u => u.id === r.id);
        return found ? found : r;
      }));
    } catch (e: any) {
      console.error('Error reordering exercises:', e);
      showError('Error al reordenar ejercicios: ' + (e.message || 'desconocido'));
    }
  };

  const handleDeleteExercise = async (routineDayId: string, exerciseId: string) => {
    try {
      await exercisesService.delete(exerciseId);
      if (mountedRef.current) setRoutines(prev => prev.map(r => {
        if (r.id === routineDayId) {
          return { ...r, exercises: r.exercises.filter(e => e.id !== exerciseId) };
        }
        return r;
      }));
    } catch (e: any) {
      console.error('Error deleting exercise:', e);
      showError('Error al eliminar ejercicio');
    }
  };

  const handleSendMessage = async (receiverId: string, content: string) => {
    if (!currentUser) return;
    try {
      const newMsg = await messagesService.send(receiverId, content, currentUser.id);
      if (mountedRef.current) setMessages(prev => [...prev, newMsg]);
    } catch (e: any) {
      console.error('Error sending message:', e);
      showError('Error al enviar mensaje');
    }
  };

  const handleMarkMessagesRead = async (senderId: string) => {
    if (!currentUser) return;
    try {
      await messagesService.markAsRead(currentUser.id, senderId);
      if (mountedRef.current) {
        setMessages(prev => prev.map(m => (m.senderId === senderId && m.receiverId === currentUser.id ? { ...m, isRead: true } : m)));
        setUnreadMessages(prev => Math.max(0, prev - messages.filter(m => m.senderId === senderId && m.receiverId === currentUser.id && !m.isRead).length));
      }
    } catch (e: any) {
      console.error('Error marking messages as read:', e);
    }
  };

  const handleAddLog = async (newLog: WorkoutLog) => {
    if (!currentUser) return;
    try {
      const created = await logsService.create(newLog);
      if (mountedRef.current) setLogs(prev => [created, ...prev]);

      if (currentUser.role === 'client') {
        const newStreak = (currentUser.streak || 0) + 1;
        await clientsService.update(currentUser.id, { streak: newStreak });
        setCurrentUser(prev => prev ? { ...prev, streak: newStreak } : null);
        if (mountedRef.current) setClients(prev => prev.map(c => c.id === currentUser.id ? { ...c, streak: newStreak } : c));
      }
    } catch (e: any) {
      console.error('Error adding log:', e);
      showError('Error al guardar bitácora');
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este atleta? Se borrarán todas sus rutinas, logs y mensajes.')) return;
    try {
      setLoading(true);
      await clientsService.delete(clientId);
      if (mountedRef.current) {
        setClients(prev => prev.filter(c => c.id !== clientId));
        setRoutines(prev => prev.filter(r => r.clientId !== clientId));
        setLogs(prev => prev.filter(l => l.clientId !== clientId));
        setMessages(prev => prev.filter(m => m.senderId !== clientId && m.receiverId !== clientId));
      }
    } catch (e: any) {
      console.error('Error deleting client:', e);
      showError('Error al eliminar cliente: ' + (e.message || 'desconocido'));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const handleUpdateClientPayment = async (clientId: string, data: { nextPaymentDate: string; paymentStatus: 'paid' | 'pending' | 'overdue'; monthlyFee: number }) => {
    try {
      const client = clients.find(c => c.id === clientId);
      if (!client) return;

      const today = new Date().toISOString().split('T')[0];
      const newEntry = { date: today, amount: data.monthlyFee, status: 'paid' as const, method: 'Confirmado en app' };
      const updatedHistory = [newEntry, ...(client.paymentHistory || [])];

      const updated = await clientsService.update(clientId, {
        nextPaymentDate: data.nextPaymentDate,
        paymentStatus: data.paymentStatus,
        monthlyFee: data.monthlyFee,
        paymentHistory: updatedHistory,
      });

      if (mountedRef.current) setClients(prev => prev.map(c => c.id === clientId ? updated : c));
    } catch (e: any) {
      console.error('Error updating payment:', e);
      showError('Error al actualizar pago');
    }
  };

  const handleMarkPaymentPaid = async (clientId: string) => {
    try {
      await clientsService.markPaymentPaid(clientId);
      const updatedClient = await authService.getClient(clientId);
      if (updatedClient && mountedRef.current) {
        setClients(prev => prev.map(c => c.id === clientId ? updatedClient : c));
      }
    } catch (e: any) {
      console.error('Error marking payment:', e);
      showError('Error al marcar pago');
    }
  };

  const handleAddWeightEntry = async (clientId: string, weight: number) => {
    if (!currentUser) return;
    const dateStr = new Date().toISOString().split('T')[0];
    const currentHistory = currentUser.weightHistory || [];
    const newHistory = [{ date: dateStr, weight }, ...currentHistory];

    try {
      const updated = await clientsService.update(clientId, { weightHistory: newHistory });
      if (mountedRef.current) setClients(prev => prev.map(c => c.id === clientId ? updated : c));
      if (currentUser.id === clientId) {
        setCurrentUser(updated);
      }
    } catch (e: any) {
      console.error('Error adding weight entry:', e);
      showError('Error al guardar peso');
    }
  };

  const handleAddMeasurementsEntry = async (clientId: string, entry: import('./types/fitness').MeasurementsEntry) => {
    if (!currentUser) return;
    const client = clients.find(c => c.id === clientId);
    const currentHistory = client?.measurementsHistory || [];

    // Agregar quién registró la entrada
    const entryWithRecorder = {
      ...entry,
      recordedBy: currentUser.id === clientId ? 'client' as const : 'coach' as const,
    };

    // Sobrescribir si ya existe entrada del mismo día (misma fecha)
    const existingIndex = currentHistory.findIndex(m => m.date === entry.date);
    let newHistory: import('./types/fitness').MeasurementsEntry[];
    if (existingIndex >= 0) {
      newHistory = [...currentHistory];
      newHistory[existingIndex] = entryWithRecorder;
    } else {
      newHistory = [entryWithRecorder, ...currentHistory];
    }

    // Auto-sync weightHistory desde las medidas (peso no redundante)
    const currentWeightHistory = client?.weightHistory || [];
    const weightEntry = { date: entry.date, weight: entry.weight };
    const weightIndex = currentWeightHistory.findIndex(w => w.date === entry.date);
    let newWeightHistory: { date: string; weight: number }[];
    if (weightIndex >= 0) {
      newWeightHistory = [...currentWeightHistory];
      newWeightHistory[weightIndex] = weightEntry;
    } else {
      newWeightHistory = [weightEntry, ...currentWeightHistory];
    }

    try {
      const updated = await clientsService.update(clientId, {
        measurementsHistory: newHistory,
        weightHistory: newWeightHistory,
      });
      if (mountedRef.current) setClients(prev => prev.map(c => c.id === clientId ? updated : c));
      if (currentUser.id === clientId) {
        setCurrentUser(updated);
      }
    } catch (e: any) {
      console.error('Error adding measurements entry:', e);
      showError('Error al guardar medidas');
    }
  };

  const handleUploadClientAvatar = async (clientId: string, file: File) => {
    try {
      const url = await storageService.uploadAvatar(clientId, file);
      await handleUpdateClient(clientId, { avatar: url, selfieUrl: url });
    } catch (e: any) {
      console.error('Error uploading avatar:', e);
      showError('Error subiendo foto: ' + (e.message || 'desconocido'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] text-[#e4e2e6] flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#d4f826] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#8e8e93]">Conectando con tu dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#0a0a0c] text-[#e4e2e6] flex flex-col justify-between">
        {error && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#ff5449] text-white text-xs px-4 py-2 rounded-[12px] animate-in fade-in slide-in-from-top-2 duration-300 max-w-[90vw] break-words">
            {error}
          </div>
        )}

        <div className="flex-1">
          {!currentUser ? (
            <LoginScreen onLoginSuccess={handleLoginSuccess} />
          ) : currentUser.role === 'coach' ? (
            <CoachDashboard
              coach={currentUser}
              clients={clients}
              routines={routines}
              messages={messages}
              unreadMessages={unreadMessages}
              onAddClient={handleAddClient}
              onUploadClientAvatar={handleUploadClientAvatar}
              onAddRoutineDay={handleAddRoutineDay}
              onAddExercise={handleAddExercise}
              onUpdateExercise={handleUpdateExercise}
              onReorderExercises={handleReorderExercises}
              onDeleteExercise={handleDeleteExercise}
              onDeleteClient={handleDeleteClient}
              onUpdateClientPayment={handleUpdateClientPayment}
              onMarkPaymentPaid={handleMarkPaymentPaid}
              onSendMessage={handleSendMessage}
              onMarkMessagesRead={handleMarkMessagesRead}
              onUpdateClient={handleUpdateClient}
              onAddMeasurementsEntry={handleAddMeasurementsEntry}
              onLogout={handleLogout}
            />
          ) : (
            <ClientDashboard
              client={currentUser}
              coach={coachProfile}
              routines={routines}
              logs={logs}
              messages={messages}
              unreadMessages={unreadMessages}
              onAddLog={handleAddLog}
              onSendMessage={handleSendMessage}
              onMarkMessagesRead={handleMarkMessagesRead}
              onUpdateClientStreak={async (id, streak) => {
                try {
                  const updated = await clientsService.update(id, { streak });
                  if (mountedRef.current) setClients(prev => prev.map(c => c.id === id ? updated : c));
                } catch (e: any) {
                  console.error('Error updating streak:', e);
                  showError('Error actualizando racha');
                }
              }}
              onAddWeightEntry={handleAddWeightEntry}
              onAddMeasurementsEntry={handleAddMeasurementsEntry}
              onUpdateClientAvatar={async (id, file) => {
                try {
                  const url = await storageService.uploadAvatar(id, file);
                  const updated = await clientsService.update(id, { selfieUrl: url, avatar: url });
                  if (mountedRef.current) setClients(prev => prev.map(c => c.id === id ? updated : c));
                  if (currentUser.id === id) setCurrentUser(updated);
                } catch (e: any) {
                  console.error('Error updating avatar:', e);
                  showError('Error actualizando foto');
                }
              }}
              onLogout={handleLogout}
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
