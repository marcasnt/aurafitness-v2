import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, Calendar, MessageSquare, Plus, Search, Dumbbell, 
  TrendingUp, MessageCircle, Copy, Check, Trash2, Pencil,
  Phone, Shield, BarChart3, Flame,
  Camera, Image as ImageIcon, Upload, X, Link as LinkIcon, CreditCard
} from 'lucide-react';
import { User, RoutineDay, Exercise, Message } from '../types/fitness';
import { clientsService, exercisesService, storageService } from '../lib/supabase-auth';

interface CoachDashboardProps {
  coach: User;
  clients: User[];
  routines: RoutineDay[];
  messages: Message[];
  unreadMessages?: number;
  onAddClient: (newClient: Omit<User, 'id' | 'adherenceRate' | 'paymentStatus' | 'nextPaymentDate'> & { password: string }) => Promise<User | undefined>;
  onAddRoutineDay: (newRoutine: Omit<RoutineDay, 'id' | 'exercises' | 'createdAt'>) => void;
  onAddExercise: (routineDayId: string, exercise: Omit<Exercise, 'id'>) => void;
  onUpdateExercise: (routineDayId: string, exerciseId: string, updates: Partial<Exercise>) => void;
  onDeleteExercise: (routineDayId: string, exerciseId: string) => void;
  onDeleteClient: (clientId: string) => void;
  onUpdateClientPayment: (clientId: string, data: { nextPaymentDate: string; paymentStatus: 'paid' | 'pending' | 'overdue'; monthlyFee: number }) => void;
  onMarkPaymentPaid: (clientId: string) => void;
  onSendMessage: (receiverId: string, content: string) => void;
  onMarkMessagesRead?: (senderId: string) => void;
  onUploadClientAvatar: (clientId: string, file: File) => void;
  onLogout: () => void;
}

export const CoachDashboard: React.FC<CoachDashboardProps> = ({
  coach,
  clients,
  routines,
  messages,
  unreadMessages = 0,
  onAddClient,
  onAddRoutineDay,
  onAddExercise,
  onUpdateExercise,
  onDeleteExercise,
  onDeleteClient,
  onUpdateClientPayment,
  onMarkPaymentPaid,
  onSendMessage,
  onMarkMessagesRead,
  onUploadClientAvatar,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'clients' | 'messages'>('clients');
  const [selectedClientId, setSelectedClientIdState] = useState<string | null>(clients[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientPasswords, setClientPasswords] = useState<Record<string, string>>({});

  const setSelectedClientId = (id: string | null) => {
    setSelectedClientIdState(id);
    if (id && onMarkMessagesRead) {
      onMarkMessagesRead(id);
    }
  };
  
  // Modals / Form States
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPassword, setNewClientPassword] = useState('');
  const [newClientGoal, setNewClientGoal] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientSelfiePreview, setNewClientSelfiePreview] = useState<string>('');
  const [newClientFee, setNewClientFee] = useState(120);
  const [newClientPaymentDate, setNewClientPaymentDate] = useState('');
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const editAvatarInputRef = useRef<HTMLInputElement>(null);

  const [showAddRoutineModal, setShowAddRoutineModal] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState('');
  const [newRoutineDesc, setNewRoutineDesc] = useState('');

  // Exercise Form State
  const [selectedPreset, setSelectedPreset] = useState('');
  const [customExerciseName, setCustomExerciseName] = useState('');
  const [exerciseCategory, setExerciseCategory] = useState<Exercise['category']>('Chest');
  const [exerciseSets, setExerciseSets] = useState(4);
  const [exerciseReps, setExerciseReps] = useState('10-12');
  const [exerciseWeight, setExerciseWeight] = useState(20);
  const [exerciseSetDetails, setExerciseSetDetails] = useState<{ reps: number; weight: number }[]>([
    { reps: 15, weight: 15 },
    { reps: 12, weight: 20 },
    { reps: 10, weight: 25 },
    { reps: 8, weight: 30 },
  ]);
  const [exerciseRest, setExerciseRest] = useState(90);
  const [exerciseNotes, setExerciseNotes] = useState('');
  const [exerciseImageUrl, setExerciseImageUrl] = useState('');
  const [exerciseImageFile, setExerciseImageFile] = useState<File | null>(null);
  const [exerciseImageMode, setExerciseImageMode] = useState<'url' | 'upload' | 'catalog'>('url');
  const [catalogSearch, setCatalogSearch] = useState('');
  const exerciseImageInputRef = useRef<HTMLInputElement>(null);

  // WhatsApp Message State
  const [copiedClientId, setCopiedClientId] = useState<string | null>(null);

  // Global exercise presets from Supabase
  const [globalPresets, setGlobalPresets] = useState<Exercise[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(false);

  // Exercise Edit State
  const [editingExercise, setEditingExercise] = useState<{
    exercise: Exercise;
    routineId: string;
  } | null>(null);
  const [editExerciseName, setEditExerciseName] = useState('');
  const [editExerciseCategory, setEditExerciseCategory] = useState<Exercise['category']>('Chest');
  const [editExerciseSets, setEditExerciseSets] = useState(4);
  const [editExerciseReps, setEditExerciseReps] = useState('10-12');
  const [editExerciseWeight, setEditExerciseWeight] = useState(20);
  const [editExerciseRest, setEditExerciseRest] = useState(90);
  const [editExerciseNotes, setEditExerciseNotes] = useState('');
  const [editExerciseImageUrl, setEditExerciseImageUrl] = useState('');
  const [editExerciseImageMode, setEditExerciseImageMode] = useState<'url' | 'upload' | 'catalog'>('url');
  const [editExerciseImageFile, setEditExerciseImageFile] = useState<File | null>(null);
  const [editExerciseSetDetails, setEditExerciseSetDetails] = useState<{ reps: number; weight: number }[]>([]);

  // Chat message active text
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    let mounted = true;
    setPresetsLoading(true);
    exercisesService.getGlobalPresets()
      .then(data => {
        if (!mounted) return;
        const mapped: Exercise[] = data.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category as Exercise['category'],
          sets: p.sets,
          reps: p.reps,
          weight: p.weight,
          restTime: p.rest_time,
          notes: p.notes || undefined,
          imageUrl: p.image_url || undefined,
        }));
        setGlobalPresets(mapped);
      })
      .catch(err => console.warn('Error cargando presets:', err))
      .finally(() => { if (mounted) setPresetsLoading(false); });
    return () => { mounted = false; };
  }, []);

  // Filtered lists
  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const clientRoutines = routines.filter(r => r.clientId === selectedClientId);
  
  // Handle selfie upload (crear nuevo cliente)
  const handleSelfieUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setNewClientSelfiePreview(url);
  };

  // Handle editar avatar de cliente ya registrado
  const handleEditClientAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClientId) return;
    onUploadClientAvatar(selectedClientId, file);
    if (editAvatarInputRef.current) editAvatarInputRef.current.value = '';
  };

  // Handle exercise image upload
  const handleExerciseImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExerciseImageFile(file);
    const url = URL.createObjectURL(file);
    setExerciseImageUrl(url);
  };
  
  // Handle creating client
  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newClientEmail || !newClientPassword) return;

    const newClient = {
      name: newClientName,
      email: newClientEmail,
      password: newClientPassword,
      role: 'client' as const,
      goal: newClientGoal || 'Hipertrofia General',
      phone: newClientPhone || '',
      streak: 0,
      avatar: newClientSelfiePreview || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200`,
      selfieUrl: newClientSelfiePreview || '',
      monthlyFee: newClientFee,
      weightHistory: [{ date: new Date().toISOString().split('T')[0], weight: 75 }]
    };

    onAddClient(newClient).then((created: User | undefined) => {
      if (created?.id) {
        setClientPasswords(prev => ({ ...prev, [created.id]: newClientPassword }));
        setSelectedClientId(created.id);
      }
    });

    // Reset fields
    setNewClientName('');
    setNewClientEmail('');
    setNewClientPassword('');
    setNewClientGoal('');
    setNewClientPhone('');
    setNewClientSelfiePreview('');
    setNewClientFee(120);
    setNewClientPaymentDate('');
    setShowAddClientModal(false);
  };

  // Handle creating routine day
  const handleCreateRoutineDay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !newRoutineName) return;

    const newRoutine = {
      clientId: selectedClientId,
      name: newRoutineName,
      description: newRoutineDesc,
      isActive: clientRoutines.length === 0,
    };

    onAddRoutineDay(newRoutine);
    setNewRoutineName('');
    setNewRoutineDesc('');
    setShowAddRoutineModal(false);
  };

  // Handle adding exercise
  const handleAddExerciseToRoutine = async (routineDayId: string) => {
    const finalName = selectedPreset || customExerciseName;
    if (!finalName) return;

    let finalImageUrl = exerciseImageUrl;

    // Si hay un archivo local seleccionado, subirlo a Supabase Storage
    if (exerciseImageMode === 'upload' && exerciseImageFile) {
      try {
        finalImageUrl = await storageService.uploadExerciseImage(routineDayId, exerciseImageFile);
      } catch (err: any) {
        alert('Error al subir imagen: ' + (err.message || 'desconocido'));
        return;
      }
    }

    const newExercise = {
      name: finalName,
      category: exerciseCategory,
      sets: exerciseSets,
      reps: exerciseReps,
      weight: exerciseWeight,
      setDetails: exerciseSetDetails,
      restTime: exerciseRest,
      notes: exerciseNotes,
      imageUrl: finalImageUrl || undefined
    };

    onAddExercise(routineDayId, newExercise);

    // Reset exercise input fields
    setCustomExerciseName('');
    setSelectedPreset('');
    setExerciseNotes('');
    setExerciseSetDetails([
      { reps: 15, weight: 15 },
      { reps: 12, weight: 20 },
      { reps: 10, weight: 25 },
      { reps: 8, weight: 30 },
    ]);
    setExerciseSets(4);
    setExerciseImageUrl('');
    setExerciseImageFile(null);
    if (exerciseImageInputRef.current) exerciseImageInputRef.current.value = '';
  };

  // Handle edit exercise image upload
  const handleEditExerciseImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditExerciseImageFile(file);
    const url = URL.createObjectURL(file);
    setEditExerciseImageUrl(url);
  };

  // Handle editing exercise
  const openEditExerciseModal = (routineId: string, exercise: Exercise) => {
    setEditingExercise({ exercise, routineId });
    setEditExerciseName(exercise.name);
    setEditExerciseCategory(exercise.category);
    setEditExerciseSets(exercise.sets);
    setEditExerciseReps(exercise.reps);
    setEditExerciseWeight(exercise.weight);
    if (exercise.setDetails && exercise.setDetails.length > 0) {
      setEditExerciseSetDetails(exercise.setDetails);
    } else {
      setEditExerciseSetDetails(
        Array.from({ length: exercise.sets }, () => ({
          reps: parseInt(exercise.reps) || 10,
          weight: exercise.weight,
        }))
      );
    }
    setEditExerciseRest(exercise.restTime);
    setEditExerciseNotes(exercise.notes || '');
    setEditExerciseImageUrl(exercise.imageUrl || '');
    setEditExerciseImageMode(exercise.imageUrl ? 'url' : 'url');
    setEditExerciseImageFile(null);
    if (exerciseImageInputRef.current) exerciseImageInputRef.current.value = '';
  };

  const handleSaveExerciseEdit = async () => {
    if (!editingExercise) return;
    const { exercise, routineId } = editingExercise;

    let finalImageUrl = editExerciseImageUrl;
    if (editExerciseImageMode === 'upload' && editExerciseImageFile) {
      try {
        finalImageUrl = await storageService.uploadExerciseImage(routineId, editExerciseImageFile);
      } catch (err: any) {
        alert('Error al subir imagen: ' + (err.message || 'desconocido'));
        return;
      }
    }

    const updates: Partial<Exercise> = {};
    if (editExerciseName !== exercise.name) updates.name = editExerciseName;
    if (editExerciseCategory !== exercise.category) updates.category = editExerciseCategory;
    if (editExerciseSets !== exercise.sets) updates.sets = editExerciseSets;
    if (editExerciseReps !== exercise.reps) updates.reps = editExerciseReps;
    if (editExerciseWeight !== exercise.weight) updates.weight = editExerciseWeight;
    if (editExerciseRest !== exercise.restTime) updates.restTime = editExerciseRest;
    if (editExerciseNotes !== (exercise.notes || '')) updates.notes = editExerciseNotes;
    if (finalImageUrl !== (exercise.imageUrl || '')) updates.imageUrl = finalImageUrl;
    const origSetDetails = JSON.stringify(exercise.setDetails || []);
    const newSetDetails = JSON.stringify(editExerciseSetDetails);
    if (newSetDetails !== origSetDetails) updates.setDetails = editExerciseSetDetails;

    if (Object.keys(updates).length > 0) {
      onUpdateExercise(routineId, exercise.id, updates);
    }
    setEditingExercise(null);
    setEditExerciseImageFile(null);
    setEditExerciseImageMode('url');
    setEditExerciseSetDetails([]);
    if (exerciseImageInputRef.current) exerciseImageInputRef.current.value = '';
  };

  // Copy WhatsApp Access Credentials Link
  const copyWhatsAppCredentials = (client: User, customPassword?: string) => {
    const password = customPassword || clientPasswords[client.id];
    const passwordLine = password
      ? `🔑 Contraseña: ${password}`
      : `🔑 Contraseña: (Consulta con tu coach)`;
    const messageText = `¡Hola ${client.name}! 💪 Aquí tienes tus credenciales premium para ingresar a AURA Elite Coaching:\n\n🌐 Enlace: https://aura-fitness-elite.vercel.app\n📧 Usuario: ${client.email}\n${passwordLine}\n\nIngresa hoy para completar y registrar tu plan de rutina asignada. ¡Vamos por la mejor versión! 🔥🏆`;
    
    navigator.clipboard.writeText(messageText);
    setCopiedClientId(client.id);
    setTimeout(() => setCopiedClientId(null), 3000);

    const cleanPhone = client.phone?.replace(/[+ ]/g, '') || '';
    if (cleanPhone) {
      window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`, '_blank');
    }
  };

  // Generate a new random password for a client
  const handleResetPassword = async (client: User) => {
    const newPassword = Math.random().toString(36).slice(2, 10);
    try {
      await clientsService.resetPassword(client.id, newPassword);
      setClientPasswords(prev => ({ ...prev, [client.id]: newPassword }));
      copyWhatsAppCredentials(client, newPassword);
    } catch (e: any) {
      alert('Error al regenerar contraseña: ' + (e.message || 'desconocido'));
    }
  };

  // Send message from Coach
  const handleSendChat = () => {
    if (!selectedClientId || !chatInput.trim()) return;
    onSendMessage(selectedClientId, chatInput.trim());
    setChatInput('');
  };

  const activeChatMessages = messages.filter(
    m => (m.senderId === coach.id && m.receiverId === selectedClientId) || 
         (m.senderId === selectedClientId && m.receiverId === coach.id)
  ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-[#e4e2e6] flex flex-col selection:bg-[#d4f826] selection:text-black">

      {/* Material App Bar */}
      <header className="bg-[#141416] border-b border-[#27272a] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1c1c1f] rounded-[12px] flex items-center justify-center border border-[#27272a]">
            <Shield className="w-5 h-5 text-[#d4f826]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-sm sm:text-base tracking-wide">AURA EXPERT HUB</span>
              <span className="bg-[#d4f826]/10 text-[#d4f826] text-[9px] font-bold px-2 py-0.5 rounded-full border border-[#d4f826]/20">COACH PRO</span>
            </div>
            <p className="text-[10px] text-[#8e8e93]">{coach.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Material Tabs */}
          <div className="flex bg-[#0a0a0c] p-1 rounded-[8px]">
            <button
              onClick={() => setActiveTab('clients')}
              className={`relative flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-[6px] transition-all ${
                activeTab === 'clients'
                  ? 'text-[#d4f826]'
                  : 'text-[#8e8e93] hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Atletas</span>
              {activeTab === 'clients' && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#d4f826] rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`relative flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-[6px] transition-all ${
                activeTab === 'messages'
                  ? 'text-[#d4f826]'
                  : 'text-[#8e8e93] hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mensajes</span>
              {unreadMessages > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#ff5449] text-white text-[8px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {unreadMessages}
                </span>
              )}
              {activeTab === 'messages' && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#d4f826] rounded-full" />
              )}
            </button>
          </div>

          <button
            onClick={onLogout}
            className="text-[11px] text-[#8e8e93] hover:text-[#ff5449] px-3 py-2 rounded-[8px] hover:bg-[#ff5449]/10 transition-all"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Hero Stats - Material Surface Cards */}
      {(() => {
        const activeClients = clients.filter(c => c.streak > 0).length;
        const avgAdherence = clients.length > 0 ? Math.round(clients.reduce((s, c) => s + c.adherenceRate, 0) / clients.length) : 0;
        const activeRoutines = routines.filter(r => r.isActive).length;
        const totalRoutines = routines.length;
        const overdueCount = clients.filter(c => c.paymentStatus === 'overdue').length;
        const pendingCount = clients.filter(c => c.paymentStatus === 'pending').length;
        const totalRevenue = clients.reduce((s, c) => s + (c.monthlyFee || 0), 0);

        return (
        <section className="bg-[#0a0a0c] border-b border-[#27272a] px-4 sm:px-6 py-4 sm:py-5 grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-[#141416] border border-[#27272a] rounded-[16px] p-4 flex flex-col items-center text-center">
            <Users className="w-4 h-4 text-[#8e8e93] mb-2" />
            <h3 className="text-2xl font-bold text-white">{clients.length}</h3>
            <p className="text-[10px] text-[#8e8e93] uppercase tracking-wider mt-1">Total Atletas</p>
          </div>
          <div className="bg-[#141416] border border-[#27272a] rounded-[16px] p-4 flex flex-col items-center text-center">
            <Users className="w-4 h-4 text-[#d4f826] mb-2" />
            <h3 className="text-2xl font-bold text-[#d4f826]">{activeClients}</h3>
            <p className="text-[10px] text-[#8e8e93] uppercase tracking-wider mt-1">Activos</p>
          </div>
          <div className="bg-[#141416] border border-[#27272a] rounded-[16px] p-4 flex flex-col items-center text-center">
            <BarChart3 className="w-4 h-4 text-[#d4f826] mb-2" />
            <h3 className="text-2xl font-bold text-[#d4f826]">{avgAdherence}%</h3>
            <p className="text-[10px] text-[#8e8e93] uppercase tracking-wider mt-1">Adherencia</p>
          </div>
          <div className="bg-[#141416] border border-[#27272a] rounded-[16px] p-4 flex flex-col items-center text-center">
            <Calendar className="w-4 h-4 text-white mb-2" />
            <h3 className="text-2xl font-bold text-white">{activeRoutines}/{totalRoutines}</h3>
            <p className="text-[10px] text-[#8e8e93] uppercase tracking-wider mt-1">Rutinas</p>
          </div>
          <div className="bg-[#141416] border border-[#27272a] rounded-[16px] p-4 flex flex-col items-center text-center">
            <Flame className="w-4 h-4 text-[#e5ba73] mb-2" />
            <h3 className="text-2xl font-bold text-[#e5ba73]">{coach.streak}</h3>
            <p className="text-[10px] text-[#8e8e93] uppercase tracking-wider mt-1">Racha Coach</p>
          </div>
          <div className={`bg-[#141416] border rounded-[16px] p-4 flex flex-col items-center text-center ${overdueCount > 0 ? 'border-[#ff5449]/30' : 'border-[#27272a]'}`}>
            <CreditCard className={`w-4 h-4 mb-2 ${overdueCount > 0 ? 'text-[#ff5449]' : 'text-[#8e8e93]'}`} />
            <h3 className="text-2xl font-bold text-white">{totalRevenue}€</h3>
            <p className="text-[10px] text-[#8e8e93] uppercase tracking-wider mt-1">Ingreso Mensual</p>
            {overdueCount > 0 && <span className="text-[9px] text-[#ff5449] mt-1">{overdueCount} Vencido{overdueCount>1?'s':''} · {pendingCount} Pendiente</span>}
          </div>
        </section>
        );
      })()}

      {/* Main Container */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* TAB: ATHLETES MANAGEMENT */}
        {activeTab === 'clients' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* Left Column: Client List */}
            <div className="w-full md:w-80 border-r border-[#27272a] bg-[#0a0a0c] flex flex-col shrink-0 max-h-[50vh] md:max-h-none">
              <div className="p-4 border-b border-[#27272a] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] uppercase tracking-wider font-bold text-white">Tus Asesorados</h4>
                  <button
                    onClick={() => setShowAddClientModal(true)}
                    className="bg-[#d4f826] text-black text-[11px] font-semibold px-3 py-1.5 rounded-[28px] hover:bg-[#e2fa52] active:scale-[0.98] transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nuevo
                  </button>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 text-[#3f3f46] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o correo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#141416] border border-[#27272a] rounded-[8px] text-xs pl-9 pr-3 py-2.5 text-white placeholder-[#8e8e93] focus:outline-none focus:border-[#d4f826] transition-colors"
                  />
                </div>
              </div>

              {/* Athletes Scroll Feed */}
              <div className="flex-1 overflow-y-auto">
                {filteredClients.map((client) => {
                  const isActive = client.id === selectedClientId;
                  const payBadge = client.paymentStatus === 'paid' ? 'bg-[#25d366]/10 text-[#25d366]' : client.paymentStatus === 'overdue' ? 'bg-[#ff5449]/10 text-[#ff5449]' : 'bg-[#e5ba73]/10 text-[#e5ba73]';
                  const payLabel = client.paymentStatus === 'paid' ? 'PAGADO' : client.paymentStatus === 'overdue' ? 'VENCIDO' : 'PENDIENTE';
                  return (
                    <div key={client.id} className={`p-3 transition-colors flex items-center justify-between group border-b border-[#27272a] ${isActive ? 'bg-[#1c1c1f]' : 'hover:bg-[#141416]'}`}>
                      <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedClientId(client.id)}>
                        <div className="relative shrink-0">
                          <img src={client.selfieUrl || client.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100'} alt={client.name} className="w-10 h-10 rounded-full object-cover border-2 border-[#27272a]" />
                          {isActive && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#d4f826] rounded-full border-2 border-[#0a0a0c]" />}
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-white truncate">{client.name}</h5>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-[4px] ${payBadge}`}>{payLabel}</span>
                            {client.streak > 0 && <span className="text-[9px] text-[#e5ba73]">{client.streak}d</span>}
                            <span className="text-[9px] text-[#8e8e93]">€{client.monthlyFee}/mes</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); if(window.confirm(`Eliminar a ${client.name}? Se borraran rutinas, logs y mensajes.`)) onDeleteClient(client.id); }}
                        className="text-[#3f3f46] hover:text-[#ff5449] p-1.5 rounded-[8px] hover:bg-[#ff5449]/10 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                        title="Eliminar atleta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                {filteredClients.length === 0 && (
                  <div className="p-8 text-center text-xs text-[#52525b]">Ningun atleta coincide.</div>
                )}
              </div>
            </div>

            {/* Right Column: Selected Athlete Workspace */}
            <div className="flex-1 bg-[#0a0a0c] overflow-y-auto p-4 md:p-6 space-y-6">
              {selectedClient ? (
                <>
                  {/* Athlete Profile Banner */}
                  <div className="bg-[#141416] border border-[#27272a] rounded-[16px] p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
                    {/* Input oculto para editar foto del cliente */}
                    <input
                      ref={editAvatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleEditClientAvatar}
                      className="hidden"
                    />

                    <div className="flex items-center gap-4">
                      <div className="relative group cursor-pointer" onClick={() => editAvatarInputRef.current?.click()} title="Cambiar foto del cliente">
                        <img
                          src={selectedClient.selfieUrl || selectedClient.avatar}
                          alt={selectedClient.name}
                          className="w-14 h-14 rounded-full object-cover border-2 border-[#d4f826]"
                        />
                        <div className="absolute inset-0 rounded-full bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                          <Camera className="w-4 h-4 text-[#d4f826]" />
                          <span className="text-[8px] text-white mt-0.5">CAMBIAR</span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-[#d4f826] rounded-full p-1">
                          <Camera className="w-3 h-3 text-black" />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-lg font-bold text-white">{selectedClient.name}</h2>
                          <span className="text-[9px] bg-[#d4f826]/10 text-[#d4f826] border border-[#d4f826]/20 px-2 py-0.5 rounded-full">
                            Plan Activo
                          </span>
                        </div>
                        <p className="text-xs text-[#8e8e93] mt-1">
                          <span className="text-white">Meta:</span> {selectedClient.goal}
                        </p>
                        <p className="text-[11px] text-[#8e8e93] mt-0.5 flex items-center gap-1 flex-wrap break-all">
                          <Phone className="w-3 h-3 text-[#3f3f46] shrink-0" /> {selectedClient.phone || 'Sin Telefono'} · <span className="break-all">{selectedClient.email}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* WhatsApp Sender */}
                      <div className="bg-[#1c1c1f] border border-[#27272a] rounded-[12px] p-3 shrink-0 flex flex-col space-y-2">
                        <div className="text-[10px] uppercase tracking-wider text-[#8e8e93] font-bold flex items-center gap-1.5">
                          <MessageCircle className="w-3.5 h-3.5 text-[#25d366]" /> WHATSAPP
                        </div>
                        <button
                          onClick={() => copyWhatsAppCredentials(selectedClient)}
                          className="w-full bg-[#25d366] text-black font-bold text-[11px] py-2 px-3 rounded-[8px] hover:bg-[#20ba5a] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                        >
                          {copiedClientId === selectedClient.id ? (
                            <><Check className="w-3.5 h-3.5" /> COPIADO</>
                          ) : (
                            <><Copy className="w-3.5 h-3.5" /> ENVIAR ACCESOS</>
                          )}
                        </button>
                        <button
                          onClick={() => handleResetPassword(selectedClient)}
                          className="w-full bg-transparent text-[#d4f826] border border-[#3f3f46] font-bold text-[10px] py-1.5 px-3 rounded-[8px] hover:bg-[#3f3f46] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                        >
                          <Shield className="w-3 h-3" /> NUEVA CONTRASENA
                        </button>
                      </div>

                      {/* Payment Management Widget */}
                      <div className={`bg-[#141416] border rounded-[12px] p-3 shrink-0 flex flex-col space-y-2 ${selectedClient.paymentStatus === 'overdue' ? 'border-[#ff5449]/30' : selectedClient.paymentStatus === 'pending' ? 'border-[#e5ba73]/30' : 'border-[#27272a]'}`}>
                        <div className="text-[10px] uppercase tracking-wider font-bold flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-white" /> PAGO
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-[#8e8e93]">Cuota:</span>
                            <span className="text-white font-bold">€{selectedClient.monthlyFee}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-[#8e8e93]">Proximo:</span>
                            <span className="text-white">{selectedClient.nextPaymentDate}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-[#8e8e93]">Estado:</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] ${selectedClient.paymentStatus === 'paid' ? 'bg-[#25d366]/10 text-[#25d366]' : selectedClient.paymentStatus === 'overdue' ? 'bg-[#ff5449]/10 text-[#ff5449]' : 'bg-[#e5ba73]/10 text-[#e5ba73]'}`}>
                              {selectedClient.paymentStatus === 'paid' ? 'PAGADO' : selectedClient.paymentStatus === 'overdue' ? 'VENCIDO' : 'PENDIENTE'}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <button
                            onClick={() => onMarkPaymentPaid(selectedClient.id)}
                            className="flex-1 bg-[#25d366] text-black font-bold text-[10px] py-1.5 rounded-[8px] hover:bg-[#20ba5a] active:scale-[0.98] transition-all"
                          >
                            MARCAR PAGADO
                          </button>
                          <button
                            onClick={() => {
                              const newDate = prompt('Nueva fecha de pago (YYYY-MM-DD):', selectedClient.nextPaymentDate);
                            if (newDate) onUpdateClientPayment(selectedClient.id, { nextPaymentDate: newDate, paymentStatus: selectedClient.paymentStatus, monthlyFee: selectedClient.monthlyFee });
                          }}
                          className="bg-[#27272a] text-white hover:bg-[#3f3f46] text-[10px] px-3 py-1.5 rounded-lg transition-all font-mono"
                        >
                          ✏ FECHA
                        </button>
                        <button
                          onClick={() => {
                            const newFee = prompt('Nueva cuota mensual (€):', selectedClient.monthlyFee.toString());
                            if (newFee && !isNaN(Number(newFee))) onUpdateClientPayment(selectedClient.id, { nextPaymentDate: selectedClient.nextPaymentDate, paymentStatus: selectedClient.paymentStatus, monthlyFee: Number(newFee) });
                          }}
                          className="bg-[#27272a] text-white hover:bg-[#3f3f46] text-[10px] px-3 py-1.5 rounded-lg transition-all font-mono"
                        >
                          € CUOTA
                        </button>
                      </div>
                      {/* Payment history mini list */}
                      {selectedClient.paymentHistory && selectedClient.paymentHistory.length > 0 && (
                        <div className="border-t border-[#27272a] pt-2">
                          <p className="text-[9px] text-[#71717a] uppercase font-mono font-bold mb-1">Historial de Pagos</p>
                          <div className="space-y-0.5">
                            {selectedClient.paymentHistory.slice(0, 3).map((ph, i) => (
                              <div key={i} className="flex justify-between text-[10px]">
                                <span className="text-[#a1a1aa] font-mono">{ph.date}</span>
                                <span className={`font-mono font-bold ${ph.status === 'paid' ? 'text-[#25d366]' : ph.status === 'overdue' ? 'text-[#ef4444]' : 'text-[#e5ba73]'}`}>
                                  €{ph.amount} {ph.status === 'paid' ? '✓' : ph.status === 'overdue' ? '⚠' : '◷'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                  {/* Routines Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm uppercase tracking-wider text-white font-bold flex items-center gap-2">
                          <Dumbbell className="w-4 h-4 text-[#d4f826]" /> Dias de Rutina
                        </h3>
                        <p className="text-xs text-[#8e8e93] mt-0.5">Estructura las sesiones semanales</p>
                      </div>
                      <button
                        onClick={() => setShowAddRoutineModal(true)}
                        className="bg-transparent border border-[#3f3f46] text-white hover:border-[#d4f826] hover:text-[#d4f826] text-[11px] font-semibold py-1.5 px-3 rounded-[28px] transition-all flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Agregar Dia
                      </button>
                    </div>

                    {/* Routine Cards */}
                    <div className="space-y-5">
                      {clientRoutines.map((routine) => (
                        <div key={routine.id} className="bg-[#141416] border border-[#27272a] rounded-[16px] overflow-hidden">
                          {/* Routine Header */}
                          <div className="bg-[#1c1c1f] p-4 border-b border-[#27272a] flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-white">{routine.name}</h4>
                                {routine.isActive ? (
                                  <span className="text-[9px] bg-[#d4f826]/10 text-[#d4f826] px-1.5 py-0.5 rounded-full">ACTIVO</span>
                                ) : (
                                  <span className="text-[9px] bg-[#27272a] text-[#8e8e93] px-1.5 py-0.5 rounded-full">RESERVA</span>
                                )}
                              </div>
                              {routine.description && (
                                <p className="text-xs text-[#8e8e93] mt-0.5">{routine.description}</p>
                              )}
                            </div>
                            <span className="text-[10px] text-[#8e8e93]">Asignado: {routine.createdAt}</span>
                          </div>

                          {/* Exercise Cards with Images */}
                          <div className="p-4 space-y-3">
                            {routine.exercises.length === 0 ? (
                              <p className="text-xs text-[#52525b] italic p-2 text-center">No hay ejercicios cargados para este dia.</p>
                            ) : (
                              <div className="grid gap-3">
                                {routine.exercises.map((ex, idx) => (
                                  <div key={ex.id} className="bg-[#0a0a0c] border border-[#27272a] rounded-[12px] overflow-hidden flex flex-col sm:flex-row">
                                    {/* Exercise Image */}
                                    {ex.imageUrl ? (
                                      <div className="sm:w-36 h-28 sm:h-auto relative overflow-hidden shrink-0 bg-[#141416]">
                                        <img
                                          src={ex.imageUrl}
                                          alt={ex.name}
                                          className="w-full h-full object-cover"
                                        />
                                        <div className="absolute top-1.5 left-1.5 bg-black/70 text-[#d4f826] text-[9px] font-bold px-1.5 py-0.5 rounded-[4px]">
                                          #{idx + 1}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="sm:w-36 h-28 sm:h-auto relative overflow-hidden shrink-0 bg-[#141416] flex items-center justify-center">
                                        <Dumbbell className="w-8 h-8 text-[#27272a]" />
                                        <div className="absolute top-1.5 left-1.5 bg-black/70 text-[#d4f826] text-[9px] font-bold px-1.5 py-0.5 rounded-[4px]">
                                          #{idx + 1}
                                        </div>
                                      </div>
                                    )}

                                    {/* Exercise Details */}
                                    <div className="flex-1 p-3 flex flex-col justify-between">
                                      <div className="flex items-start justify-between gap-2">
                                        <div>
                                          <h5 className="text-xs font-bold text-white truncate">{ex.name}</h5>
                                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <span className="bg-[#1c1c1f] text-[#8e8e93] text-[9px] px-1.5 py-0.5 rounded-[4px]">{ex.category}</span>
                                            <span className="text-[10px] text-white">{ex.sets} x {ex.reps}</span>
                                            <span className="text-[10px] text-[#d4f826] font-bold">{ex.weight} kg</span>
                                            <span className="text-[10px] text-[#8e8e93]">{ex.restTime}s</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            onClick={() => openEditExerciseModal(routine.id, ex)}
                                            className="text-[#3f3f46] hover:text-[#d4f826] p-1 rounded-[6px] hover:bg-[#d4f826]/10 transition-all"
                                            title="Editar ejercicio"
                                          >
                                            <Pencil className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => onDeleteExercise(routine.id, ex.id)}
                                            className="text-[#3f3f46] hover:text-[#ff5449] p-1 rounded-[6px] hover:bg-[#ff5449]/10 transition-all"
                                            title="Eliminar ejercicio"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                      {ex.notes && (
                                        <p className="text-[10px] text-[#e5ba73] mt-2">{ex.notes}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Add Exercise Form */}
                            <div className="bg-[#141416] border border-[#27272a] rounded-[12px] p-4 mt-4 space-y-3">
                              <p className="text-[11px] uppercase tracking-wider text-[#d4f826] font-semibold flex items-center gap-1">
                                <Plus className="w-3 h-3" /> Cargar Nuevo Ejercicio
                              </p>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-[10px] text-[#a1a1aa] mb-1">Ejercicio Preestablecido</label>
                                  <select
                                    value={selectedPreset}
                                    onChange={(e) => {
                                      const name = e.target.value;
                                      setSelectedPreset(name);
                                      if (name) setCustomExerciseName('');
                                      const preset = globalPresets.find(p => p.name === name);
                                      if (preset) {
                                        setExerciseCategory(preset.category);
                                        setExerciseSets(preset.sets);
                                        setExerciseReps(preset.reps);
                                        setExerciseWeight(preset.weight);
                                        if (preset.setDetails && preset.setDetails.length > 0) {
                                          setExerciseSetDetails(preset.setDetails);
                                        } else {
                                          // Generar setDetails plano desde fallback
                                          const arr = Array.from({ length: preset.sets }, () => ({
                                            reps: parseInt(preset.reps) || 10,
                                            weight: preset.weight,
                                          }));
                                          setExerciseSetDetails(arr);
                                        }
                                        setExerciseRest(preset.restTime);
                                        setExerciseNotes(preset.notes || '');
                                        setExerciseImageUrl(preset.imageUrl || '');
                                      }
                                      setExerciseImageFile(null);
                                      if (exerciseImageInputRef.current) exerciseImageInputRef.current.value = '';
                                    }}
                                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg text-xs p-2 focus:outline-none focus:border-[#d4f826] text-white"
                                  >
                                    <option value="">-- Elige Movimiento --</option>
                                    {presetsLoading && <option value="" disabled>Cargando catálogo...</option>}
                                    {globalPresets.map((p) => (
                                      <option key={p.id} value={p.name}>{p.name} ({p.category})</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] text-[#a1a1aa] mb-1">O nombre personalizado</label>
                                  <input
                                    type="text"
                                    placeholder="Ej: Sentadilla profunda"
                                    value={customExerciseName}
                                    onChange={(e) => {
                                      setCustomExerciseName(e.target.value);
                                      if (e.target.value) setSelectedPreset('');
                                    }}
                                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg text-xs p-2 focus:outline-none focus:border-[#d4f826] text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-[#a1a1aa] mb-1">Grupo Muscular</label>
                                  <select
                                    value={exerciseCategory}
                                    onChange={(e) => setExerciseCategory(e.target.value as any)}
                                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg text-xs p-2 focus:outline-none focus:border-[#d4f826] text-white"
                                  >
                                    <option value="Chest">Pecho</option>
                                    <option value="Back">Espalda</option>
                                    <option value="Legs">Piernas</option>
                                    <option value="Shoulders">Hombros</option>
                                    <option value="Arms">Brazos</option>
                                    <option value="Core">Core</option>
                                    <option value="Cardio">Cardio</option>
                                    <option value="Traps">Trapecios</option>
                                    <option value="Glutes">Glúteos</option>
                                    <option value="Forearms">Antebrazos</option>
                                    <option value="Full Body">Cuerpo Completo</option>
                                    <option value="Home Workout">En Casa</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div className="md:col-span-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="block text-[10px] text-[#a1a1aa]">Series Individuales (Reps · Peso)</label>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (exerciseSetDetails.length > 1) {
                                            const next = exerciseSetDetails.slice(0, -1);
                                            setExerciseSetDetails(next);
                                            setExerciseSets(next.length);
                                          }
                                        }}
                                        className="w-5 h-5 flex items-center justify-center bg-[#27272a] text-[#8e8e93] rounded-[4px] text-[10px] hover:text-white active:scale-95 transition-all"
                                      >
                                        −
                                      </button>
                                      <span className="text-[10px] text-white font-bold w-4 text-center">{exerciseSetDetails.length}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const last = exerciseSetDetails[exerciseSetDetails.length - 1] || { reps: 10, weight: 20 };
                                          const next = [...exerciseSetDetails, { reps: last.reps, weight: last.weight }];
                                          setExerciseSetDetails(next);
                                          setExerciseSets(next.length);
                                        }}
                                        className="w-5 h-5 flex items-center justify-center bg-[#27272a] text-[#d4f826] rounded-[4px] text-[10px] hover:bg-[#3f3f46] active:scale-95 transition-all"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                  <div className="space-y-1.5">
                                    {exerciseSetDetails.map((s, i) => (
                                      <div key={i} className="flex items-center gap-2">
                                        <span className="text-[9px] text-[#8e8e93] w-5 text-right font-bold">{i + 1}</span>
                                        <input
                                          type="number"
                                          placeholder="Reps"
                                          value={s.reps}
                                          onChange={(e) => {
                                            const next = [...exerciseSetDetails];
                                            next[i] = { ...next[i], reps: Number(e.target.value) };
                                            setExerciseSetDetails(next);
                                          }}
                                          className="w-16 bg-[#18181b] border border-[#27272a] rounded-[8px] text-xs p-1.5 text-white focus:outline-none focus:border-[#d4f826] text-center"
                                        />
                                        <span className="text-[9px] text-[#8e8e93]">reps</span>
                                        <input
                                          type="number"
                                          placeholder="Peso"
                                          value={s.weight}
                                          onChange={(e) => {
                                            const next = [...exerciseSetDetails];
                                            next[i] = { ...next[i], weight: Number(e.target.value) };
                                            setExerciseSetDetails(next);
                                          }}
                                          className="w-16 bg-[#18181b] border border-[#27272a] rounded-[8px] text-xs p-1.5 text-white focus:outline-none focus:border-[#d4f826] text-center"
                                        />
                                        <span className="text-[9px] text-[#8e8e93]">kg</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-[10px] text-[#a1a1aa] mb-1">Descanso (s)</label>
                                  <input type="number" value={exerciseRest} onChange={(e) => setExerciseRest(Number(e.target.value))} className="w-full bg-[#18181b] border border-[#27272a] rounded-lg text-xs p-2 focus:outline-none focus:border-[#d4f826] text-white" />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] text-[#a1a1aa] mb-1">Notas del Coach</label>
                                <input type="text" placeholder="Ej: Mantener excéntrica lenta, RPE 9..." value={exerciseNotes} onChange={(e) => setExerciseNotes(e.target.value)} className="w-full bg-[#18181b] border border-[#27272a] rounded-lg text-xs p-2 focus:outline-none focus:border-[#d4f826] text-white" />
                              </div>

                              {/* IMAGE/GIF HYBRID SELECTOR */}
                              <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <label className="text-[10px] font-mono uppercase tracking-wider text-white font-semibold flex items-center gap-1.5">
                                    <ImageIcon className="w-3.5 h-3.5 text-[#d4f826]" /> Imagen o GIF del Ejercicio
                                  </label>
                                  <div className="flex bg-[#121214] rounded-lg p-0.5 border border-[#27272a]">
                                    <button
                                      type="button"
                                      onClick={() => { setExerciseImageMode('url'); setExerciseImageFile(null); setExerciseImageUrl(''); if (exerciseImageInputRef.current) exerciseImageInputRef.current.value = ''; }}
                                      className={`text-[9px] px-2 py-1 rounded-md font-mono transition-all flex items-center gap-1 ${exerciseImageMode === 'url' ? 'bg-[#27272a] text-[#d4f826]' : 'text-[#71717a]'}`}
                                    >
                                      <LinkIcon className="w-3 h-3" /> URL
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { setExerciseImageMode('upload'); setExerciseImageFile(null); setExerciseImageUrl(''); if (exerciseImageInputRef.current) exerciseImageInputRef.current.value = ''; }}
                                      className={`text-[9px] px-2 py-1 rounded-md font-mono transition-all flex items-center gap-1 ${exerciseImageMode === 'upload' ? 'bg-[#27272a] text-[#d4f826]' : 'text-[#71717a]'}`}
                                    >
                                      <Upload className="w-3 h-3" /> Archivo
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { setExerciseImageMode('catalog'); setExerciseImageFile(null); setExerciseImageUrl(''); if (exerciseImageInputRef.current) exerciseImageInputRef.current.value = ''; }}
                                      className={`text-[9px] px-2 py-1 rounded-md font-mono transition-all flex items-center gap-1 ${exerciseImageMode === 'catalog' ? 'bg-[#27272a] text-[#d4f826]' : 'text-[#71717a]'}`}
                                    >
                                      <Search className="w-3 h-3" /> Catálogo
                                    </button>
                                  </div>
                                </div>

                                {exerciseImageMode === 'url' && (
                                  <input
                                    type="url"
                                    placeholder="https://... (URL de imagen o GIF animado)"
                                    value={exerciseImageUrl.startsWith('data:') ? '' : exerciseImageUrl}
                                    onChange={(e) => setExerciseImageUrl(e.target.value)}
                                    className="w-full bg-[#121214] border border-[#27272a] rounded-lg text-xs p-2 focus:outline-none focus:border-[#d4f826] text-white"
                                  />
                                )}

                                {exerciseImageMode === 'upload' && (
                                  <div>
                                    <input
                                      ref={exerciseImageInputRef}
                                      type="file"
                                      accept="image/*,.gif"
                                      onChange={handleExerciseImageUpload}
                                      className="hidden"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => exerciseImageInputRef.current?.click()}
                                      className="w-full bg-[#121214] border border-dashed border-[#3f3f46] hover:border-[#d4f826] rounded-lg text-xs p-3 text-[#a1a1aa] hover:text-[#d4f826] transition-all flex items-center justify-center gap-2"
                                    >
                                      <Upload className="w-4 h-4" /> Subir Imagen o GIF desde tu dispositivo
                                    </button>
                                  </div>
                                )}

                                {exerciseImageMode === 'catalog' && (
                                  <div className="space-y-2">
                                    <input
                                      type="text"
                                      placeholder="Buscar en catálogo..."
                                      value={catalogSearch}
                                      onChange={(e) => setCatalogSearch(e.target.value)}
                                      className="w-full bg-[#121214] border border-[#27272a] rounded-lg text-xs p-2 focus:outline-none focus:border-[#d4f826] text-white"
                                    />
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                                      {globalPresets
                                        .filter(p => p.imageUrl && p.name.toLowerCase().includes(catalogSearch.toLowerCase()))
                                        .map(p => (
                                          <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => { setExerciseImageUrl(p.imageUrl || ''); setExerciseImageMode('url'); }}
                                            className="relative rounded-lg overflow-hidden border border-[#27272a] hover:border-[#d4f826] transition-all group"
                                            title={p.name}
                                          >
                                            <img src={p.imageUrl} alt={p.name} className="w-full h-16 object-cover" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                              <span className="text-[8px] text-[#d4f826] font-mono text-center px-1">{p.name}</span>
                                            </div>
                                          </button>
                                        ))}
                                      {globalPresets.filter(p => p.imageUrl).length === 0 && (
                                        <p className="col-span-full text-[10px] text-[#71717a] text-center py-2">El catálogo aún no tiene GIFs. Pega una URL o sube tu propia imagen.</p>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Preview */}
                                {exerciseImageUrl && (
                                  <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-[#27272a]">
                                    <img src={exerciseImageUrl} alt="Preview" className="w-full h-full object-cover" />
                                    <button
                                      type="button"
                                      onClick={() => setExerciseImageUrl('')}
                                      className="absolute top-0.5 right-0.5 bg-black/70 rounded-full p-0.5 text-[#ef4444] hover:text-white"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-center text-[#d4f826] font-mono py-0.5">PREVIEW</div>
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleAddExerciseToRoutine(routine.id)}
                                className="bg-[#121214] text-[#d4f826] border border-[#d4f826] hover:bg-[#d4f826] hover:text-black font-bold text-xs py-2 px-4 rounded-xl transition-all w-full flex items-center justify-center gap-1"
                              >
                                Insertar Movimiento a la Lista
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {clientRoutines.length === 0 && (
                        <div className="bg-[#18181b] border border-[#27272a] border-dashed rounded-2xl p-8 text-center text-xs text-[#71717a]">
                          Este atleta no tiene días de entrenamiento asignados. Usa el botón para crear su primer plan.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Weight History */}
                  <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4">
                    <h4 className="text-xs uppercase tracking-wider text-white font-mono font-bold flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-[#e5ba73]" /> Historial de Peso Corporal
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {selectedClient.weightHistory?.map((entry, idx) => (
                        <div key={idx} className="bg-[#121214] p-3 rounded-xl border border-[#27272a] text-center">
                          <p className="text-[10px] text-[#71717a]">{entry.date}</p>
                          <p className="text-sm font-bold text-[#e5ba73] font-mono mt-1">{entry.weight} kg</p>
                        </div>
                      )) || <p className="text-xs text-[#52525b]">No hay registros.</p>}
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 text-[#52525b]">
                  <Users className="w-12 h-12 mb-3 stroke-1" />
                  <p className="text-sm font-mono">Selecciona un atleta para auditar su plan.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: MESSAGES */}
        {activeTab === 'messages' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#0a0a0c]">
            <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-[#27272a] flex flex-col shrink-0 max-h-[40vh] md:max-h-none">
              <div className="p-4 border-b border-[#27272a] text-xs font-bold tracking-wider text-white">
                CONVERSACIONES
              </div>
              <div className="flex-1 overflow-y-auto">
                {clients.map(client => (
                  <div
                    key={client.id}
                    onClick={() => setSelectedClientId(client.id)}
                    className={`p-4 cursor-pointer flex items-center gap-3 transition-colors border-b border-[#27272a] ${client.id === selectedClientId ? 'bg-[#1c1c1f]' : 'hover:bg-[#141416]'}`}
                  >
                    <img src={client.selfieUrl || client.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-[#27272a]" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-white block truncate">{client.name}</span>
                        <span className="text-[9px] text-[#8e8e93]">En Linea</span>
                      </div>
                      <p className="text-[11px] text-[#8e8e93] truncate mt-0.5">Ver chat y reportes</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 flex flex-col bg-[#0a0a0c]">
              {selectedClient ? (
                <>
                  <div className="p-4 border-b border-[#27272a] bg-[#141416] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src={selectedClient.selfieUrl || selectedClient.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-[#27272a]" />
                      <div>
                        <span className="text-xs font-bold text-white block">{selectedClient.name}</span>
                        <span className="text-[10px] text-[#25d366]">Asesorado Premium</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#8e8e93]">Canal AURA</span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {activeChatMessages.map((msg) => {
                      const isCoach = msg.senderId === coach.id;
                      return (
                        <div key={msg.id} className={`flex ${isCoach ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75vw] md:max-w-md p-3 rounded-2xl text-xs ${isCoach ? 'bg-[#27272a] text-white rounded-tr-none border border-[#3f3f46]' : 'bg-[#141416] text-[#e4e2e6] rounded-tl-none border border-[#27272a]'}`}>
                            <p className="whitespace-pre-line">{msg.content}</p>
                            <span className="block text-[9px] text-[#8e8e93] mt-1 text-right">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {activeChatMessages.length === 0 && (
                      <div className="text-center p-12 text-[#52525b] text-xs">
                        No hay mensajes. Envia un saludo de motivacion.
                      </div>
                    )}
                  </div>

                  <div className="p-4 border-t border-[#27272a] bg-[#141416] flex gap-2">
                    <input
                      type="text"
                      placeholder={`Mensaje para ${selectedClient.name}...`}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                      className="flex-1 bg-[#0a0a0c] border border-[#27272a] rounded-[8px] text-xs px-4 py-2.5 text-white placeholder-[#8e8e93] focus:outline-none focus:border-[#d4f826] transition-colors"
                    />
                    <button onClick={handleSendChat} className="bg-[#d4f826] text-black font-bold text-xs px-4 rounded-[28px] hover:bg-[#e2fa52] active:scale-[0.98] transition-all">
                      ENVIAR
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-[#52525b]">
                  Selecciona un cliente para ver la central de mensajes.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* MODAL: CREATE CLIENT WITH SELFIE */}
      {showAddClientModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#141416] border border-[#27272a] rounded-[16px] w-full max-w-md p-5 md:p-6 relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold tracking-wider text-white mb-1 uppercase">
              <span className="text-[#d4f826]">Alta</span> de Nuevo Atleta
            </h3>
            <p className="text-xs text-[#8e8e93] mb-4">Crea la cuenta del cliente con foto de perfil.</p>

            <form onSubmit={handleCreateClient} className="space-y-3.5">
              
              {/* SELFIE UPLOAD SECTION */}
              <div className="flex flex-col items-center space-y-3">
                <div className="relative group">
                  <div className={`w-24 h-24 rounded-full overflow-hidden border-2 ${newClientSelfiePreview ? 'border-[#d4f826]' : 'border-[#27272a] border-dashed'} bg-[#18181b] flex items-center justify-center`}>
                    {newClientSelfiePreview ? (
                      <img src={newClientSelfiePreview} alt="Selfie" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <Camera className="w-8 h-8 text-[#3f3f46] mx-auto" />
                        <span className="text-[8px] text-[#52525b] block mt-0.5">FOTO</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Upload overlay */}
                  <div 
                    onClick={() => selfieInputRef.current?.click()}
                    className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  >
                    <div className="text-center">
                      <Upload className="w-5 h-5 text-[#d4f826] mx-auto" />
                      <span className="text-[8px] text-white font-mono block mt-0.5">SUBIR</span>
                    </div>
                  </div>

                  {/* Remove button */}
                  {newClientSelfiePreview && (
                    <button
                      type="button"
                      onClick={() => { setNewClientSelfiePreview(''); }}
                      className="absolute -top-1 -right-1 bg-[#ef4444] rounded-full p-1 text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <input
                  ref={selfieInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSelfieUpload}
                  className="hidden"
                />

                <div className="text-center">
                  <p className="text-[10px] text-[#a1a1aa] font-mono">
                    {newClientSelfiePreview ? '✅ Foto cargada correctamente' : '📸 Haz clic para subir la selfie del cliente'}
                  </p>
                  <p className="text-[9px] text-[#52525b] mt-0.5">JPG, PNG o GIF • Se guardará en su perfil</p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[#a1a1aa] mb-1 font-mono uppercase font-semibold">Nombre Completo</label>
                <input type="text" required placeholder="Ej: Carlos Mendoza" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} className="w-full bg-[#18181b] border border-[#27272a] rounded-xl text-xs p-2.5 text-white focus:outline-none focus:border-[#d4f826]" />
              </div>

              <div>
                <label className="block text-[11px] text-[#a1a1aa] mb-1 font-mono uppercase font-semibold">Correo Electrónico</label>
                <input type="email" required placeholder="carlos@ejemplo.com" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} className="w-full bg-[#18181b] border border-[#27272a] rounded-xl text-xs p-2.5 text-white focus:outline-none focus:border-[#d4f826]" />
              </div>

              <div>
                <label className="block text-[11px] text-[#a1a1aa] mb-1 font-mono uppercase font-semibold">Contraseña Premium</label>
                <input type="text" required placeholder="Ej: fit2026_carlos" value={newClientPassword} onChange={(e) => setNewClientPassword(e.target.value)} className="w-full bg-[#18181b] border border-[#27272a] rounded-xl text-xs p-2.5 text-white focus:outline-none focus:border-[#d4f826] font-mono" />
              </div>

              <div>
                <label className="block text-[11px] text-[#a1a1aa] mb-1 font-mono uppercase font-semibold">Meta de Entrenamiento</label>
                <input type="text" placeholder="Ej: Hipertrofia & Fuerza" value={newClientGoal} onChange={(e) => setNewClientGoal(e.target.value)} className="w-full bg-[#18181b] border border-[#27272a] rounded-xl text-xs p-2.5 text-white focus:outline-none focus:border-[#d4f826]" />
              </div>

              <div>
                <label className="block text-[11px] text-[#a1a1aa] mb-1 font-mono uppercase font-semibold">Teléfono (Con Código País)</label>
                <input type="text" placeholder="Ej: +34611223344" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} className="w-full bg-[#18181b] border border-[#27272a] rounded-xl text-xs p-2.5 text-white focus:outline-none focus:border-[#d4f826] font-mono" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[#a1a1aa] mb-1 font-mono uppercase font-semibold flex items-center gap-1"><CreditCard className="w-3 h-3"/> Cuota Mensual (€)</label>
                  <input type="number" min="0" value={newClientFee} onChange={(e) => setNewClientFee(Number(e.target.value))} className="w-full bg-[#18181b] border border-[#27272a] rounded-xl text-xs p-2.5 text-white focus:outline-none focus:border-[#d4f826] font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] text-[#a1a1aa] mb-1 font-mono uppercase font-semibold">Fecha 1er Pago</label>
                  <input type="date" value={newClientPaymentDate} onChange={(e) => setNewClientPaymentDate(e.target.value)} className="w-full bg-[#18181b] border border-[#27272a] rounded-xl text-xs p-2.5 text-white focus:outline-none focus:border-[#d4f826] font-mono" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => { setShowAddClientModal(false); setNewClientSelfiePreview(''); }} className="bg-transparent hover:bg-[#18181b] text-[#a1a1aa] text-xs font-semibold py-2 px-4 rounded-xl transition-all">
                  Cancelar
                </button>
                <button type="submit" className="bg-[#d4f826] text-black font-bold text-xs py-2 px-4 rounded-xl hover:bg-[#e2fa52] transition-all font-mono">
                  GUARDAR ATLETA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE ROUTINE DAY */}
      {showAddRoutineModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#141416] border border-[#27272a] rounded-[16px] w-full max-w-md p-5 md:p-6 relative">
            <h3 className="text-base font-bold tracking-wider text-white mb-1 uppercase">
              <span className="text-[#d4f826]">Crear</span> Nuevo Dia de Rutina
            </h3>
            <p className="text-xs text-[#8e8e93] mb-4">Anade una sesion a la semana del deportista.</p>

            <form onSubmit={handleCreateRoutineDay} className="space-y-4">
              <div>
                <label className="block text-[11px] text-[#a1a1aa] mb-1 font-mono uppercase font-semibold">Nombre del Día / Enfoque</label>
                <input type="text" required placeholder="Ej: Día 1: Tracción y Densidad" value={newRoutineName} onChange={(e) => setNewRoutineName(e.target.value)} className="w-full bg-[#18181b] border border-[#27272a] rounded-xl text-xs p-2.5 text-white focus:outline-none focus:border-[#d4f826]" />
              </div>
              <div>
                <label className="block text-[11px] text-[#a1a1aa] mb-1 font-mono uppercase font-semibold">Descripción (Opcional)</label>
                <textarea placeholder="Ej: Énfasis en dorsales anchos..." value={newRoutineDesc} onChange={(e) => setNewRoutineDesc(e.target.value)} rows={3} className="w-full bg-[#18181b] border border-[#27272a] rounded-xl text-xs p-2.5 text-white focus:outline-none focus:border-[#d4f826]" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddRoutineModal(false)} className="bg-transparent hover:bg-[#18181b] text-[#a1a1aa] text-xs font-semibold py-2 px-4 rounded-xl transition-all">
                  Cancelar
                </button>
                <button type="submit" className="bg-[#d4f826] text-black font-bold text-xs py-2 px-4 rounded-xl hover:bg-[#e2fa52] transition-all font-mono">
                  CREAR SESIÓN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT EXERCISE */}
      {editingExercise && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#141416] border border-[#27272a] rounded-[16px] w-full max-w-md p-5 md:p-6 relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold tracking-wider text-white mb-1 uppercase">
              <span className="text-[#d4f826]">Editar</span> Ejercicio
            </h3>
            <p className="text-xs text-[#8e8e93] mb-4">Modifica cualquier campo del ejercicio.</p>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-[#a1a1aa] mb-1 font-mono uppercase font-semibold">Nombre del Ejercicio</label>
                <input
                  type="text"
                  value={editExerciseName}
                  onChange={(e) => setEditExerciseName(e.target.value)}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-xl text-xs p-2.5 text-white focus:outline-none focus:border-[#d4f826]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#a1a1aa] mb-1 font-mono uppercase font-semibold">Grupo Muscular</label>
                <select
                  value={editExerciseCategory}
                  onChange={(e) => setEditExerciseCategory(e.target.value as Exercise['category'])}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-xl text-xs p-2.5 text-white focus:outline-none focus:border-[#d4f826]"
                >
                  <option value="Chest">Pecho</option>
                  <option value="Back">Espalda</option>
                  <option value="Legs">Piernas</option>
                  <option value="Shoulders">Hombros</option>
                  <option value="Arms">Brazos</option>
                  <option value="Core">Core</option>
                  <option value="Cardio">Cardio</option>
                  <option value="Traps">Trapecios</option>
                  <option value="Glutes">Glúteos</option>
                  <option value="Forearms">Antebrazos</option>
                  <option value="Full Body">Cuerpo Completo</option>
                  <option value="Home Workout">En Casa</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] text-[#a1a1aa]">Series Individuales (Reps · Peso)</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (editExerciseSetDetails.length > 1) {
                            const next = editExerciseSetDetails.slice(0, -1);
                            setEditExerciseSetDetails(next);
                            setEditExerciseSets(next.length);
                          }
                        }}
                        className="w-5 h-5 flex items-center justify-center bg-[#27272a] text-[#8e8e93] rounded-[4px] text-[10px] hover:text-white active:scale-95 transition-all"
                      >
                        −
                      </button>
                      <span className="text-[10px] text-white font-bold w-4 text-center">{editExerciseSetDetails.length}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const last = editExerciseSetDetails[editExerciseSetDetails.length - 1] || { reps: 10, weight: 20 };
                          const next = [...editExerciseSetDetails, { reps: last.reps, weight: last.weight }];
                          setEditExerciseSetDetails(next);
                          setEditExerciseSets(next.length);
                        }}
                        className="w-5 h-5 flex items-center justify-center bg-[#27272a] text-[#d4f826] rounded-[4px] text-[10px] hover:bg-[#3f3f46] active:scale-95 transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {editExerciseSetDetails.map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[9px] text-[#8e8e93] w-5 text-right font-bold">{i + 1}</span>
                        <input
                          type="number"
                          placeholder="Reps"
                          value={s.reps}
                          onChange={(e) => {
                            const next = [...editExerciseSetDetails];
                            next[i] = { ...next[i], reps: Number(e.target.value) };
                            setEditExerciseSetDetails(next);
                          }}
                          className="w-16 bg-[#18181b] border border-[#27272a] rounded-[8px] text-xs p-1.5 text-white focus:outline-none focus:border-[#d4f826] text-center"
                        />
                        <span className="text-[9px] text-[#8e8e93]">reps</span>
                        <input
                          type="number"
                          placeholder="Peso"
                          value={s.weight}
                          onChange={(e) => {
                            const next = [...editExerciseSetDetails];
                            next[i] = { ...next[i], weight: Number(e.target.value) };
                            setEditExerciseSetDetails(next);
                          }}
                          className="w-16 bg-[#18181b] border border-[#27272a] rounded-[8px] text-xs p-1.5 text-white focus:outline-none focus:border-[#d4f826] text-center"
                        />
                        <span className="text-[9px] text-[#8e8e93]">kg</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-[#a1a1aa] mb-1">Descanso (s)</label>
                  <input type="number" value={editExerciseRest} onChange={(e) => setEditExerciseRest(Number(e.target.value))} className="w-full bg-[#18181b] border border-[#27272a] rounded-xl text-xs p-2.5 text-white focus:outline-none focus:border-[#d4f826]" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-[#a1a1aa] mb-1 font-mono uppercase font-semibold">Notas del Coach</label>
                <input type="text" value={editExerciseNotes} onChange={(e) => setEditExerciseNotes(e.target.value)} placeholder="Ej: Mantener excéntrica lenta, RPE 9..." className="w-full bg-[#18181b] border border-[#27272a] rounded-xl text-xs p-2.5 text-white focus:outline-none focus:border-[#d4f826]" />
              </div>

              {/* IMAGE/GIF HYBRID SELECTOR */}
              <div className="bg-[#18181b] border border-[#27272a] rounded-[12px] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase tracking-wider text-white font-semibold flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[#d4f826]" /> Imagen o GIF del Ejercicio
                  </label>
                  <div className="flex bg-[#121214] rounded-[8px] p-0.5 border border-[#27272a]">
                    <button
                      type="button"
                      onClick={() => { setEditExerciseImageMode('url'); setEditExerciseImageFile(null); if (exerciseImageInputRef.current) exerciseImageInputRef.current.value = ''; }}
                      className={`text-[9px] px-2 py-1 rounded-[4px] transition-all flex items-center gap-1 ${editExerciseImageMode === 'url' ? 'bg-[#27272a] text-[#d4f826]' : 'text-[#8e8e93]'}`}
                    >
                      <LinkIcon className="w-3 h-3" /> URL
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditExerciseImageMode('upload'); setEditExerciseImageFile(null); setEditExerciseImageUrl(''); if (exerciseImageInputRef.current) exerciseImageInputRef.current.value = ''; }}
                      className={`text-[9px] px-2 py-1 rounded-[4px] transition-all flex items-center gap-1 ${editExerciseImageMode === 'upload' ? 'bg-[#27272a] text-[#d4f826]' : 'text-[#8e8e93]'}`}
                    >
                      <Upload className="w-3 h-3" /> Archivo
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditExerciseImageMode('catalog'); setEditExerciseImageFile(null); setEditExerciseImageUrl(''); if (exerciseImageInputRef.current) exerciseImageInputRef.current.value = ''; }}
                      className={`text-[9px] px-2 py-1 rounded-[4px] transition-all flex items-center gap-1 ${editExerciseImageMode === 'catalog' ? 'bg-[#27272a] text-[#d4f826]' : 'text-[#8e8e93]'}`}
                    >
                      <Search className="w-3 h-3" /> Catálogo
                    </button>
                  </div>
                </div>

                {editExerciseImageMode === 'url' && (
                  <input
                    type="url"
                    placeholder="https://... (URL de imagen o GIF animado)"
                    value={editExerciseImageUrl.startsWith('data:') || editExerciseImageUrl.startsWith('blob:') ? '' : editExerciseImageUrl}
                    onChange={(e) => setEditExerciseImageUrl(e.target.value)}
                    className="w-full bg-[#121214] border border-[#27272a] rounded-[8px] text-xs p-2 focus:outline-none focus:border-[#d4f826] text-white"
                  />
                )}

                {editExerciseImageMode === 'upload' && (
                  <div>
                    <input
                      ref={exerciseImageInputRef}
                      type="file"
                      accept="image/*,.gif"
                      onChange={handleEditExerciseImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => exerciseImageInputRef.current?.click()}
                      className="w-full bg-[#121214] border border-dashed border-[#3f3f46] hover:border-[#d4f826] rounded-[8px] text-xs p-3 text-[#8e8e93] hover:text-[#d4f826] transition-all flex items-center justify-center gap-2"
                    >
                      <Upload className="w-4 h-4" /> Subir Imagen o GIF desde tu dispositivo
                    </button>
                  </div>
                )}

                {editExerciseImageMode === 'catalog' && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Buscar en catálogo..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      className="w-full bg-[#121214] border border-[#27272a] rounded-[8px] text-xs p-2 focus:outline-none focus:border-[#d4f826] text-white"
                    />
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                      {globalPresets
                        .filter(p => p.imageUrl && p.name.toLowerCase().includes(catalogSearch.toLowerCase()))
                        .map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => { setEditExerciseImageUrl(p.imageUrl || ''); setEditExerciseImageMode('url'); }}
                            className="relative rounded-[8px] overflow-hidden border border-[#27272a] hover:border-[#d4f826] transition-all group"
                            title={p.name}
                          >
                            <img src={p.imageUrl} alt={p.name} className="w-full h-16 object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                              <span className="text-[8px] text-[#d4f826] text-center px-1">{p.name}</span>
                            </div>
                          </button>
                        ))}
                      {globalPresets.filter(p => p.imageUrl).length === 0 && (
                        <p className="col-span-full text-[10px] text-[#8e8e93] text-center py-2">El catálogo aún no tiene GIFs. Pega una URL o sube tu propia imagen.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Preview */}
                {editExerciseImageUrl && (
                  <div className="relative w-24 h-24 rounded-[8px] overflow-hidden border border-[#27272a]">
                    <img src={editExerciseImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setEditExerciseImageUrl('')}
                      className="absolute top-0.5 right-0.5 bg-black/70 rounded-full p-0.5 text-[#ff5449] hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingExercise(null)}
                  className="bg-transparent hover:bg-[#18181b] text-[#a1a1aa] text-xs font-semibold py-2 px-4 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveExerciseEdit}
                  className="bg-[#d4f826] text-black font-bold text-xs py-2 px-4 rounded-xl hover:bg-[#e2fa52] transition-all font-mono"
                >
                  GUARDAR CAMBIOS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
