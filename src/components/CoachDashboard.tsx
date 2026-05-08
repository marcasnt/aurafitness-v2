import React, { useState, useRef } from 'react';
import { 
  Users, Calendar, MessageSquare, Plus, Search, Dumbbell, 
  TrendingUp, MessageCircle, Copy, Check, Trash2, 
  Phone, Shield, BarChart3, Flame,
  Camera, Image as ImageIcon, Upload, X, Link as LinkIcon, CreditCard
} from 'lucide-react';
import { User, RoutineDay, Exercise, Message } from '../types/fitness';
import { PRESET_EXERCISES } from '../data/initialData';

interface CoachDashboardProps {
  coach: User;
  clients: User[];
  routines: RoutineDay[];
  messages: Message[];
  onAddClient: (newClient: Omit<User, 'id' | 'adherenceRate' | 'paymentStatus' | 'nextPaymentDate'> & { password: string }) => Promise<User | undefined>;
  onAddRoutineDay: (newRoutine: Omit<RoutineDay, 'id' | 'exercises' | 'createdAt'>) => void;
  onAddExercise: (routineDayId: string, exercise: Omit<Exercise, 'id'>) => void;
  onDeleteExercise: (routineDayId: string, exerciseId: string) => void;
  onDeleteClient: (clientId: string) => void;
  onUpdateClientPayment: (clientId: string, data: { nextPaymentDate: string; paymentStatus: 'paid' | 'pending' | 'overdue'; monthlyFee: number }) => void;
  onMarkPaymentPaid: (clientId: string) => void;
  onSendMessage: (receiverId: string, content: string) => void;
  onUploadClientAvatar: (clientId: string, file: File) => void;
  onLogout: () => void;
}

export const CoachDashboard: React.FC<CoachDashboardProps> = ({
  coach,
  clients,
  routines,
  messages,
  onAddClient,
  onAddRoutineDay,
  onAddExercise,
  onDeleteExercise,
  onDeleteClient,
  onUpdateClientPayment,
  onMarkPaymentPaid,
  onSendMessage,
  onUploadClientAvatar,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'clients' | 'messages'>('clients');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(clients[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientPasswords, setClientPasswords] = useState<Record<string, string>>({});
  
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
  const [exerciseRest, setExerciseRest] = useState(90);
  const [exerciseNotes, setExerciseNotes] = useState('');
  const [exerciseImageUrl, setExerciseImageUrl] = useState('');
  const [exerciseImageMode, setExerciseImageMode] = useState<'url' | 'upload'>('url');
  const exerciseImageInputRef = useRef<HTMLInputElement>(null);

  // WhatsApp Message State
  const [copiedClientId, setCopiedClientId] = useState<string | null>(null);

  // Chat message active text
  const [chatInput, setChatInput] = useState('');

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
  const handleAddExerciseToRoutine = (routineDayId: string) => {
    const finalName = selectedPreset || customExerciseName;
    if (!finalName) return;

    const newExercise = {
      name: finalName,
      category: exerciseCategory,
      sets: exerciseSets,
      reps: exerciseReps,
      weight: exerciseWeight,
      restTime: exerciseRest,
      notes: exerciseNotes,
      imageUrl: exerciseImageUrl || undefined
    };

    onAddExercise(routineDayId, newExercise);
    
    // Reset exercise input fields
    setCustomExerciseName('');
    setSelectedPreset('');
    setExerciseNotes('');
    setExerciseImageUrl('');
  };

  // Copy WhatsApp Access Credentials Link
  const copyWhatsAppCredentials = (client: User) => {
    const password = clientPasswords[client.id] || 'mamcyj11jm';
    const messageText = `¡Hola ${client.name}! 💪 Aquí tienes tus credenciales premium para ingresar a AURA Elite Coaching:\n\n🌐 Enlace: https://aura-fitness-elite.vercel.app\n📧 Usuario: ${client.email}\n🔑 Contraseña: ${password}\n\nIngresa hoy para completar y registrar tu plan de rutina asignada. ¡Vamos por la mejor versión! 🔥🏆`;
    
    navigator.clipboard.writeText(messageText);
    setCopiedClientId(client.id);
    setTimeout(() => setCopiedClientId(null), 3000);

    const cleanPhone = client.phone?.replace(/[+ ]/g, '') || '';
    if (cleanPhone) {
      window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`, '_blank');
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
    <div className="min-h-screen bg-[#0b0b0c] text-[#f4f4f5] flex flex-col font-sans selection:bg-[#d4f826] selection:text-black">
      
      {/* Premium Header */}
      <header className="border-b border-[#1f1f23] bg-[#121214] px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between sticky top-0 z-40 backdrop-blur-md bg-opacity-95 gap-2 sm:gap-0">
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="bg-gradient-to-br from-[#1e1e24] to-[#2b2b35] p-1.5 sm:p-2 rounded-xl border border-[#27272a] text-[#d4f826]">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-white font-mono tracking-wider font-bold text-sm sm:text-lg truncate">AURA EXPERT HUB</span>
              <span className="bg-[#d4f826]/10 text-[#d4f826] text-[9px] sm:text-[10px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded-full border border-[#d4f826]/20 shrink-0">COACH PRO</span>
            </div>
            <p className="text-[10px] sm:text-xs text-[#a1a1aa] truncate">{coach.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-end">
          <div className="flex bg-[#18181b] p-1 rounded-xl border border-[#27272a]">
            <button 
              onClick={() => setActiveTab('clients')}
              className={`flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-medium px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all ${activeTab === 'clients' ? 'bg-[#27272a] text-[#d4f826]' : 'text-[#a1a1aa] hover:text-white'}`}
            >
              <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Atletas</span><span className="sm:hidden">A</span>
            </button>
            <button 
              onClick={() => setActiveTab('messages')}
              className={`flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-medium px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all relative ${activeTab === 'messages' ? 'bg-[#27272a] text-[#d4f826]' : 'text-[#a1a1aa] hover:text-white'}`}
            >
              <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Mensajes</span><span className="sm:hidden">M</span>
              {messages.filter(m => !m.isRead && m.senderId !== coach.id).length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#ef4444] rounded-full animate-ping" />
              )}
            </button>
          </div>

          <button 
            onClick={onLogout}
            className="text-[10px] sm:text-xs bg-[#1f1f23] hover:bg-[#ef4444]/10 hover:text-[#ef4444] text-[#a1a1aa] px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-[#27272a] transition-all font-mono"
          >
            SALIR
          </button>
        </div>
      </header>

      {/* Hero Stats - Dynamic Calculations */}
      {(() => {
        const activeClients = clients.filter(c => c.streak > 0).length;
        const avgAdherence = clients.length > 0 ? Math.round(clients.reduce((s, c) => s + c.adherenceRate, 0) / clients.length) : 0;
        const activeRoutines = routines.filter(r => r.isActive).length;
        const totalRoutines = routines.length;
        const overdueCount = clients.filter(c => c.paymentStatus === 'overdue').length;
        const pendingCount = clients.filter(c => c.paymentStatus === 'pending').length;
        const totalRevenue = clients.reduce((s, c) => s + (c.monthlyFee || 0), 0);

        return (
        <section className="bg-[#121214] border-b border-[#1f1f23] px-3 sm:px-6 py-4 sm:py-6 grid grid-cols-2 md:grid-cols-6 gap-2 sm:gap-3">
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-3 flex flex-col items-center text-center">
            <Users className="w-4 h-4 text-[#a1a1aa] mb-1" />
            <h3 className="text-xl font-bold text-white font-mono">{clients.length}</h3>
            <p className="text-[9px] text-[#71717a] uppercase tracking-widest">Total Atletas</p>
          </div>
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-3 flex flex-col items-center text-center">
            <Users className="w-4 h-4 text-[#d4f826] mb-1" />
            <h3 className="text-xl font-bold text-[#d4f826] font-mono">{activeClients}</h3>
            <p className="text-[9px] text-[#71717a] uppercase tracking-widest">Activos (Racha+)</p>
          </div>
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-3 flex flex-col items-center text-center">
            <BarChart3 className="w-4 h-4 text-[#d4f826] mb-1" />
            <h3 className="text-xl font-bold text-[#d4f826] font-mono">{avgAdherence}%</h3>
            <p className="text-[9px] text-[#71717a] uppercase tracking-widest">Adherencia</p>
          </div>
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-3 flex flex-col items-center text-center">
            <Calendar className="w-4 h-4 text-white mb-1" />
            <h3 className="text-xl font-bold text-white font-mono">{activeRoutines}/{totalRoutines}</h3>
            <p className="text-[9px] text-[#71717a] uppercase tracking-widest">Rutinas Act/Total</p>
          </div>
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-3 flex flex-col items-center text-center">
            <Flame className="w-4 h-4 text-[#e5ba73] mb-1" />
            <h3 className="text-xl font-bold text-[#e5ba73] font-mono">{coach.streak}</h3>
            <p className="text-[9px] text-[#71717a] uppercase tracking-widest">Racha Coach</p>
          </div>
          <div className={`bg-[#18181b] border rounded-xl p-3 flex flex-col items-center text-center ${overdueCount > 0 ? 'border-[#ef4444]/50' : 'border-[#27272a]'}`}>
            <span className="text-xs mb-1">{overdueCount > 0 ? '🚨' : '✅'}</span>
            <h3 className="text-xl font-bold font-mono">{totalRevenue}€</h3>
            <p className="text-[9px] text-[#71717a] uppercase tracking-widest">Ingreso Mensual</p>
            {overdueCount > 0 && <span className="text-[8px] text-[#ef4444] font-mono font-bold">{overdueCount} Vencido{overdueCount>1?'s':''} · {pendingCount} Pendiente</span>}
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
            <div className="w-full md:w-80 border-r border-[#1f1f23] bg-[#0e0e10] flex flex-col shrink-0">
              <div className="p-4 border-b border-[#1f1f23] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs uppercase tracking-wider font-bold text-white font-mono">Tus Asesorados</h4>
                  <button 
                    onClick={() => setShowAddClientModal(true)}
                    className="bg-[#d4f826] text-black text-xs font-bold p-1.5 rounded-lg hover:bg-[#e2fa52] transition-all flex items-center gap-1 shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nuevo
                  </button>
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#52525b] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Buscar por nombre o correo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-xl text-xs pl-8 pr-3 py-2 text-white placeholder-[#52525b] focus:outline-none focus:border-[#d4f826] transition-all"
                  />
                </div>
              </div>

              {/* Athletes Scroll Feed */}
              <div className="flex-1 overflow-y-auto divide-y divide-[#1f1f23]">
                {filteredClients.map((client) => {
                  const isActive = client.id === selectedClientId;
                  const payBadge = client.paymentStatus === 'paid' ? 'bg-[#25d366]/10 text-[#25d366]' : client.paymentStatus === 'overdue' ? 'bg-[#ef4444]/10 text-[#ef4444]' : 'bg-[#e5ba73]/10 text-[#e5ba73]';
                  const payLabel = client.paymentStatus === 'paid' ? '✓ PAGADO' : client.paymentStatus === 'overdue' ? '⚠ VENCIDO' : '◷ PENDIENTE';
                  return (
                    <div key={client.id} className={`p-3 transition-all flex items-center justify-between group ${isActive ? 'bg-[#18181b] border-l-4 border-[#d4f826]' : 'hover:bg-[#121214]'}`}>
                      <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedClientId(client.id)}>
                        <div className="relative shrink-0">
                          <img src={client.selfieUrl || client.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100'} alt={client.name} className="w-10 h-10 rounded-full object-cover border-2 border-[#27272a]" />
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-white tracking-wide truncate">{client.name}</h5>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${payBadge}`}>{payLabel}</span>
                            {client.streak > 0 && <span className="text-[9px] text-[#e5ba73] font-mono">🔥 {client.streak}d</span>}
                            <span className="text-[9px] text-[#71717a] font-mono">€{client.monthlyFee}/mes</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); if(window.confirm(`⚠️ Eliminar a ${client.name}? Se borrarán rutinas, logs y mensajes.`)) onDeleteClient(client.id); }}
                        className="text-[#52525b] hover:text-[#ef4444] p-1.5 rounded-lg hover:bg-[#ef4444]/10 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                        title="Eliminar atleta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                {filteredClients.length === 0 && (
                  <div className="p-8 text-center text-xs text-[#52525b]">Ningún atleta coincide.</div>
                )}
              </div>
            </div>

            {/* Right Column: Selected Athlete Workspace */}
            <div className="flex-1 bg-[#121214] overflow-y-auto p-6 space-y-6">
              {selectedClient ? (
                <>
                  {/* Athlete Profile Banner */}
                  <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="absolute top-0 right-0 bg-gradient-to-l from-[#d4f826]/5 to-transparent w-48 h-full pointer-events-none" />
                    
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
                          className="w-16 h-16 rounded-full object-cover border-2 border-[#d4f826] transition-all group-hover:border-[#e2fa52]"
                        />
                        {/* Overlay de edición al hover */}
                        <div className="absolute inset-0 rounded-full bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                          <Camera className="w-4 h-4 text-[#d4f826]" />
                          <span className="text-[8px] text-white font-mono mt-0.5">CAMBIAR</span>
                        </div>
                        {/* Badge permanente */}
                        <div className="absolute -bottom-1 -right-1 bg-[#d4f826] rounded-full p-1 shadow-md">
                          <Camera className="w-3 h-3 text-black" />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold text-white font-mono tracking-wide">{selectedClient.name}</h2>
                          <span className="text-[10px] bg-[#d4f826]/10 text-[#d4f826] border border-[#d4f826]/20 font-mono px-2 py-0.5 rounded-full">
                            Plan Activo
                          </span>
                        </div>
                        <p className="text-xs text-[#a1a1aa] mt-1">
                          <strong className="text-white">Meta Élite:</strong> {selectedClient.goal}
                        </p>
                        <p className="text-[11px] text-[#71717a] mt-0.5 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#52525b]" /> {selectedClient.phone || 'Sin Teléfono'} • {selectedClient.email}
                        </p>
                      </div>
                    </div>

                    {/* WhatsApp Sender */}
                    <div className="bg-[#1f1f23] border border-[#27272a] rounded-xl p-3 shrink-0 flex flex-col space-y-2">
                      <div className="text-[10px] uppercase tracking-wider text-[#a1a1aa] font-mono font-bold flex items-center gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5 text-[#25d366]" /> ACCESO POR WHATSAPP
                      </div>
                      <p className="text-[11px] text-[#a1a1aa] max-w-xs">
                        Envía sus claves pre-generadas para que use su vista de cliente.
                      </p>
                      <button
                        onClick={() => copyWhatsAppCredentials(selectedClient)}
                        className="w-full bg-[#25d366] text-black font-bold text-xs py-2 px-3 rounded-lg hover:bg-[#20ba5a] transition-all flex items-center justify-center gap-1.5"
                      >
                        {copiedClientId === selectedClient.id ? (
                          <><Check className="w-3.5 h-3.5" /> ¡COPIADO & ENVIANDO!</>
                        ) : (
                          <><Copy className="w-3.5 h-3.5" /> ENVIAR ACCESOS POR WA</>
                        )}
                      </button>
                    </div>

                    {/* Payment Management Widget */}
                    <div className={`border rounded-xl p-3 shrink-0 flex flex-col space-y-2 ${selectedClient.paymentStatus === 'overdue' ? 'bg-[#ef4444]/5 border-[#ef4444]/30' : selectedClient.paymentStatus === 'pending' ? 'bg-[#e5ba73]/5 border-[#e5ba73]/30' : 'bg-[#25d366]/5 border-[#25d366]/30'}`}>
                      <div className="text-[10px] uppercase tracking-wider font-mono font-bold flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-white" /> GESTIÓN DE PAGO
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-[#a1a1aa]">Cuota mensual:</span>
                          <span className="text-white font-mono font-bold">€{selectedClient.monthlyFee}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-[#a1a1aa]">Próximo pago:</span>
                          <span className="text-white font-mono">{selectedClient.nextPaymentDate}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-[#a1a1aa]">Estado:</span>
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${selectedClient.paymentStatus === 'paid' ? 'bg-[#25d366]/10 text-[#25d366]' : selectedClient.paymentStatus === 'overdue' ? 'bg-[#ef4444]/10 text-[#ef4444]' : 'bg-[#e5ba73]/10 text-[#e5ba73]'}`}>
                            {selectedClient.paymentStatus === 'paid' ? '✓ PAGADO' : selectedClient.paymentStatus === 'overdue' ? '⚠ VENCIDO' : '◷ PENDIENTE'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 pt-1">
                        <button
                          onClick={() => onMarkPaymentPaid(selectedClient.id)}
                          className="flex-1 bg-[#25d366] text-black font-bold text-[10px] py-1.5 rounded-lg hover:bg-[#20ba5a] transition-all font-mono"
                        >
                          ✓ MARCAR PAGADO
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

                  {/* Routines Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-mono uppercase tracking-wider text-white font-bold flex items-center gap-2">
                          <Dumbbell className="w-4 h-4 text-[#d4f826]" /> Días de Rutina Programados
                        </h3>
                        <p className="text-xs text-[#71717a] mt-0.5">Estructura las sesiones de fuerza semanales para este usuario</p>
                      </div>
                      <button
                        onClick={() => setShowAddRoutineModal(true)}
                        className="bg-transparent border border-[#3f3f46] text-white hover:border-[#d4f826] hover:text-[#d4f826] text-xs font-semibold py-1.5 px-3 rounded-xl transition-all flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Agregar Día
                      </button>
                    </div>

                    {/* Routine Cards */}
                    <div className="space-y-6">
                      {clientRoutines.map((routine) => (
                        <div key={routine.id} className="bg-[#18181b] border border-[#27272a] rounded-2xl overflow-hidden shadow-sm">
                          {/* Routine Header */}
                          <div className="bg-[#1f1f23] p-4 border-b border-[#27272a] flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-white tracking-wide font-mono">{routine.name}</h4>
                                {routine.isActive ? (
                                  <span className="text-[9px] bg-[#d4f826]/10 text-[#d4f826] px-1.5 py-0.5 rounded font-mono">HOY EN CURSO</span>
                                ) : (
                                  <span className="text-[9px] bg-[#27272a] text-[#a1a1aa] px-1.5 py-0.5 rounded font-mono">RESERVA</span>
                                )}
                              </div>
                              {routine.description && (
                                <p className="text-xs text-[#a1a1aa] mt-0.5">{routine.description}</p>
                              )}
                            </div>
                            <span className="text-[10px] text-[#71717a] font-mono">Asignado: {routine.createdAt}</span>
                          </div>

                          {/* Exercise Cards with Images */}
                          <div className="p-4 space-y-3">
                            {routine.exercises.length === 0 ? (
                              <p className="text-xs text-[#52525b] italic p-2 text-center">No hay ejercicios cargados para este día.</p>
                            ) : (
                              <div className="grid gap-3">
                                {routine.exercises.map((ex, idx) => (
                                  <div key={ex.id} className="bg-[#121214] border border-[#27272a] rounded-xl overflow-hidden flex flex-col sm:flex-row">
                                    {/* Exercise Image */}
                                    {ex.imageUrl ? (
                                      <div className="sm:w-36 h-28 sm:h-auto relative overflow-hidden shrink-0 bg-[#18181b]">
                                        <img 
                                          src={ex.imageUrl} 
                                          alt={ex.name}
                                          className="w-full h-full object-cover"
                                        />
                                        <div className="absolute top-1.5 left-1.5 bg-black/70 text-[#d4f826] text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                                          #{idx + 1}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="sm:w-36 h-28 sm:h-auto relative overflow-hidden shrink-0 bg-gradient-to-br from-[#18181b] to-[#1f1f23] flex items-center justify-center">
                                        <Dumbbell className="w-8 h-8 text-[#27272a]" />
                                        <div className="absolute top-1.5 left-1.5 bg-black/70 text-[#d4f826] text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                                          #{idx + 1}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Exercise Details */}
                                    <div className="flex-1 p-3 flex flex-col justify-between">
                                      <div className="flex items-start justify-between gap-2">
                                        <div>
                                          <h5 className="text-xs font-bold text-white">{ex.name}</h5>
                                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <span className="bg-[#27272a] text-[#a1a1aa] text-[9px] px-1.5 py-0.5 rounded">{ex.category}</span>
                                            <span className="text-[10px] text-white font-mono">{ex.sets} × {ex.reps}</span>
                                            <span className="text-[10px] text-[#d4f826] font-mono font-bold">{ex.weight} kg</span>
                                            <span className="text-[10px] text-[#a1a1aa] font-mono">⏱ {ex.restTime}s</span>
                                          </div>
                                        </div>
                                        <button
                                          onClick={() => onDeleteExercise(routine.id, ex.id)}
                                          className="text-[#71717a] hover:text-[#ef4444] p-1 transition-all shrink-0"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                      {ex.notes && (
                                        <p className="text-[10px] text-[#e5ba73] italic mt-2">💡 {ex.notes}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Add Exercise Form */}
                            <div className="bg-[#121214] border border-[#27272a] rounded-xl p-4 mt-4 space-y-3">
                              <p className="text-[11px] font-mono uppercase tracking-wider text-[#d4f826] font-semibold flex items-center gap-1">
                                <Plus className="w-3 h-3" /> Cargar Nuevo Ejercicio
                              </p>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-[10px] text-[#a1a1aa] mb-1">Ejercicio Preestablecido</label>
                                  <select
                                    value={selectedPreset}
                                    onChange={(e) => {
                                      setSelectedPreset(e.target.value);
                                      if (e.target.value) setCustomExerciseName('');
                                    }}
                                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg text-xs p-2 focus:outline-none focus:border-[#d4f826] text-white"
                                  >
                                    <option value="">-- Elige Movimiento --</option>
                                    {PRESET_EXERCISES.map((p, idx) => (
                                      <option key={idx} value={p.name}>{p.name} ({p.category})</option>
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
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div>
                                  <label className="block text-[10px] text-[#a1a1aa] mb-1">Series</label>
                                  <input type="number" value={exerciseSets} onChange={(e) => setExerciseSets(Number(e.target.value))} className="w-full bg-[#18181b] border border-[#27272a] rounded-lg text-xs p-2 focus:outline-none focus:border-[#d4f826] text-white font-mono" />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-[#a1a1aa] mb-1">Rango Reps</label>
                                  <input type="text" value={exerciseReps} onChange={(e) => setExerciseReps(e.target.value)} className="w-full bg-[#18181b] border border-[#27272a] rounded-lg text-xs p-2 focus:outline-none focus:border-[#d4f826] text-white font-mono" />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-[#a1a1aa] mb-1">Peso (kg)</label>
                                  <input type="number" value={exerciseWeight} onChange={(e) => setExerciseWeight(Number(e.target.value))} className="w-full bg-[#18181b] border border-[#27272a] rounded-lg text-xs p-2 focus:outline-none focus:border-[#d4f826] text-white font-mono" />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-[#a1a1aa] mb-1">Descanso (s)</label>
                                  <input type="number" value={exerciseRest} onChange={(e) => setExerciseRest(Number(e.target.value))} className="w-full bg-[#18181b] border border-[#27272a] rounded-lg text-xs p-2 focus:outline-none focus:border-[#d4f826] text-white font-mono" />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] text-[#a1a1aa] mb-1">Notas del Coach</label>
                                <input type="text" placeholder="Ej: Mantener excéntrica lenta, RPE 9..." value={exerciseNotes} onChange={(e) => setExerciseNotes(e.target.value)} className="w-full bg-[#18181b] border border-[#27272a] rounded-lg text-xs p-2 focus:outline-none focus:border-[#d4f826] text-white" />
                              </div>

                              {/* IMAGE/GIF UPLOAD SECTION FOR EXERCISE */}
                              <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <label className="text-[10px] font-mono uppercase tracking-wider text-white font-semibold flex items-center gap-1.5">
                                    <ImageIcon className="w-3.5 h-3.5 text-[#d4f826]" /> Imagen o GIF del Ejercicio
                                  </label>
                                  <div className="flex bg-[#121214] rounded-lg p-0.5 border border-[#27272a]">
                                    <button
                                      type="button"
                                      onClick={() => setExerciseImageMode('url')}
                                      className={`text-[9px] px-2 py-1 rounded-md font-mono transition-all flex items-center gap-1 ${exerciseImageMode === 'url' ? 'bg-[#27272a] text-[#d4f826]' : 'text-[#71717a]'}`}
                                    >
                                      <LinkIcon className="w-3 h-3" /> URL
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setExerciseImageMode('upload')}
                                      className={`text-[9px] px-2 py-1 rounded-md font-mono transition-all flex items-center gap-1 ${exerciseImageMode === 'upload' ? 'bg-[#27272a] text-[#d4f826]' : 'text-[#71717a]'}`}
                                    >
                                      <Upload className="w-3 h-3" /> Archivo
                                    </button>
                                  </div>
                                </div>

                                {exerciseImageMode === 'url' ? (
                                  <input
                                    type="url"
                                    placeholder="https://... (URL de imagen o GIF animado)"
                                    value={exerciseImageUrl.startsWith('data:') ? '' : exerciseImageUrl}
                                    onChange={(e) => setExerciseImageUrl(e.target.value)}
                                    className="w-full bg-[#121214] border border-[#27272a] rounded-lg text-xs p-2 focus:outline-none focus:border-[#d4f826] text-white"
                                  />
                                ) : (
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
          <div className="flex-1 flex overflow-hidden bg-[#0e0e10]">
            <div className="w-80 border-r border-[#1f1f23] flex flex-col shrink-0">
              <div className="p-4 border-b border-[#1f1f23] text-xs font-mono font-bold tracking-wider text-white">
                CONVERSACIONES
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-[#1f1f23]">
                {clients.map(client => (
                  <div
                    key={client.id}
                    onClick={() => setSelectedClientId(client.id)}
                    className={`p-4 cursor-pointer flex items-center gap-3 transition-all ${client.id === selectedClientId ? 'bg-[#18181b]' : 'hover:bg-[#121214]'}`}
                  >
                    <img src={client.selfieUrl || client.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-white block truncate">{client.name}</span>
                        <span className="text-[9px] text-[#71717a] font-mono">En Línea</span>
                      </div>
                      <p className="text-[11px] text-[#a1a1aa] truncate mt-0.5">Ver chat y reportes</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 flex flex-col bg-[#121214]">
              {selectedClient ? (
                <>
                  <div className="p-4 border-b border-[#1f1f23] bg-[#18181b] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src={selectedClient.selfieUrl || selectedClient.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <span className="text-xs font-bold text-white block">{selectedClient.name}</span>
                        <span className="text-[10px] text-[#25d366] font-mono">Asesorado Premium Activo</span>
                      </div>
                    </div>
                    <span className="text-xs text-[#a1a1aa] font-mono">Canal Encriptado AURA</span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {activeChatMessages.map((msg) => {
                      const isCoach = msg.senderId === coach.id;
                      return (
                        <div key={msg.id} className={`flex ${isCoach ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-md p-3 rounded-2xl text-xs ${isCoach ? 'bg-[#27272a] text-white rounded-tr-none border border-[#3f3f46]' : 'bg-[#18181b] text-[#f4f4f5] rounded-tl-none border border-[#27272a]'}`}>
                            <p className="whitespace-pre-line">{msg.content}</p>
                            <span className="block text-[9px] text-[#71717a] mt-1 text-right font-mono">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {activeChatMessages.length === 0 && (
                      <div className="text-center p-12 text-[#52525b] text-xs italic">
                        No hay mensajes. Envía un saludo de motivación.
                      </div>
                    )}
                  </div>

                  <div className="p-4 border-t border-[#1f1f23] bg-[#18181b] flex gap-2">
                    <input
                      type="text"
                      placeholder={`Mensaje para ${selectedClient.name}...`}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                      className="flex-1 bg-[#121214] border border-[#27272a] rounded-xl text-xs px-4 py-2.5 text-white placeholder-[#52525b] focus:outline-none focus:border-[#d4f826]"
                    />
                    <button onClick={handleSendChat} className="bg-[#d4f826] text-black font-bold text-xs px-4 rounded-xl hover:bg-[#e2fa52] transition-all font-mono">
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#121214] border border-[#27272a] rounded-2xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold font-mono tracking-wider text-white mb-1 uppercase text-[#d4f826]">
              Alta de Nuevo Atleta Premium
            </h3>
            <p className="text-xs text-[#a1a1aa] mb-4">Crea la cuenta del cliente con foto de perfil para identificarlo.</p>

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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#121214] border border-[#27272a] rounded-2xl w-full max-w-md p-6 relative">
            <h3 className="text-base font-bold font-mono tracking-wider text-white mb-1 uppercase text-[#d4f826]">
              Crear Nuevo Bloque de Día de Rutina
            </h3>
            <p className="text-xs text-[#a1a1aa] mb-4">Añade una sesión a la semana del deportista.</p>

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

    </div>
  );
};
