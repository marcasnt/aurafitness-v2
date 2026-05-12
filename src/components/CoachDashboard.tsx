import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, Calendar, MessageSquare, Plus, Search, Dumbbell, 
  TrendingUp, MessageCircle, Copy, Check, Trash2, Pencil,
  Phone, Shield, BarChart3, Flame, Timer,
  Camera, Image as ImageIcon, Upload, X, Link as LinkIcon, CreditCard,
  User as UserIcon, ClipboardList, ChevronDown, ChevronUp, ArrowUp, ArrowDown
} from 'lucide-react';
import { RulerIcon } from './RulerIcon';
import { User, RoutineDay, Exercise, Message, MeasurementsEntry } from '../types/fitness';
import { clientsService, exercisesService, storageService } from '../lib/supabase-auth';
import MeasurementsModal from './MeasurementsModal';
import { MeasurementCards } from './ProgressCharts';
import ProgressLineChart from './ProgressLineChart';
import { ExerciseSelectorModal } from './ExerciseSelectorModal';
import { calculateBodyFat, getBodyFatColor } from '../lib/bodyFatCalculator';

interface CoachDashboardProps {
  coach: User;
  clients: User[];
  routines: RoutineDay[];
  messages: Message[];
  unreadMessages?: number;
  onAddClient: (newClient: Omit<User, 'id' | 'adherenceRate' | 'paymentStatus' | 'nextPaymentDate'> & { password: string; initialMeasurements?: MeasurementsEntry; firstPaymentDate?: string }) => Promise<User | undefined>;
  onAddRoutineDay: (newRoutine: Omit<RoutineDay, 'id' | 'exercises' | 'createdAt'>) => void;
  onAddExercise: (routineDayId: string, exercise: Omit<Exercise, 'id'>) => void;
  onUpdateExercise: (routineDayId: string, exerciseId: string, updates: Partial<Exercise>) => void;
  onReorderExercises: (routineDayId: string, exerciseId: string, direction: 'up' | 'down') => void;
  onDeleteExercise: (routineDayId: string, exerciseId: string) => void;
  onDeleteClient: (clientId: string) => void;
  onUpdateClientPayment: (clientId: string, data: { nextPaymentDate: string; paymentStatus: 'paid' | 'pending' | 'overdue'; monthlyFee: number }) => void;
  onMarkPaymentPaid: (clientId: string) => void;
  onSendMessage: (receiverId: string, content: string) => void;
  onMarkMessagesRead?: (senderId: string) => void;
  onUploadClientAvatar: (clientId: string, file: File) => void;
  onUpdateClient: (clientId: string, updates: Partial<User>) => void;
  onAddMeasurementsEntry: (clientId: string, entry: MeasurementsEntry) => void;
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
  onReorderExercises,
  onDeleteExercise,
  onDeleteClient,
  onUpdateClientPayment,
  onMarkPaymentPaid,
  onSendMessage,
  onMarkMessagesRead,
  onUploadClientAvatar,
  onUpdateClient,
  onAddMeasurementsEntry,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'clients' | 'messages'>('clients');
  const [clientWorkspaceTab, setClientWorkspaceTab] = useState<'profile' | 'routines' | 'progress'>('profile');
  const [selectedClientId, setSelectedClientIdState] = useState<string | null>(clients[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientPasswords, setClientPasswords] = useState<Record<string, string>>({});
  // Guarda el ID de un cliente recien creado para seleccionarlo cuando aparezca en props.clients
  const [pendingSelectClientId, setPendingSelectClientId] = useState<string | null>(null);
  // Accordion: solo un día de rutina expandido a la vez
  const [expandedRoutineId, setExpandedRoutineId] = useState<string | null>(null);
  // Edición inline de datos personales
  const [editingField, setEditingField] = useState<'name' | 'email' | 'phone' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const setSelectedClientId = (id: string | null) => {
    setSelectedClientIdState(id);
    if (id && onMarkMessagesRead) {
      onMarkMessagesRead(id);
    }
  };

  // Sincronizar pendingSelectClientId: cuando clients incluya al ID pendiente, seleccionarlo
  useEffect(() => {
    if (pendingSelectClientId && clients.some(c => c.id === pendingSelectClientId)) {
      setSelectedClientId(pendingSelectClientId);
      setPendingSelectClientId(null);
    }
  }, [clients, pendingSelectClientId]);

  // Si selectedClientId apunta a un cliente que ya no existe, resetear a null o al primero
  useEffect(() => {
    if (selectedClientId && !clients.some(c => c.id === selectedClientId)) {
      setSelectedClientIdState(clients[0]?.id || null);
    }
  }, [clients, selectedClientId]);
  
  // Modals / Form States
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPassword, setNewClientPassword] = useState('');
  const [newClientGoal, setNewClientGoal] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientSelfiePreview, setNewClientSelfiePreview] = useState<string>('');
  const [newClientSelfieFile, setNewClientSelfieFile] = useState<File | null>(null);
  const [newClientFee, setNewClientFee] = useState(120);
  const [newClientPaymentDate, setNewClientPaymentDate] = useState('');
  const [newClientHeight, setNewClientHeight] = useState('');
  const [newClientWeight, setNewClientWeight] = useState('');
  const [newClientNeck, setNewClientNeck] = useState('');
  const [newClientWaist, setNewClientWaist] = useState('');
  const [newClientHips, setNewClientHips] = useState('');
  const [newClientThighsLeft, setNewClientThighsLeft] = useState('');
  const [newClientThighsRight, setNewClientThighsRight] = useState('');
  const [newClientBicepsLeft, setNewClientBicepsLeft] = useState('');
  const [newClientBicepsRight, setNewClientBicepsRight] = useState('');
  const [newClientGender, setNewClientGender] = useState<'male' | 'female'>('male');
  const [newClientAge, setNewClientAge] = useState('');
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const editAvatarInputRef = useRef<HTMLInputElement>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [avatarLightbox, setAvatarLightbox] = useState(false);

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

  // Exercise Selector Modal State
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [showEditExerciseSelector, setShowEditExerciseSelector] = useState(false);

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
  const [editSelectedPreset, setEditSelectedPreset] = useState('');
  const [editCustomExerciseName, setEditCustomExerciseName] = useState('');
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

  // Measurements modal
  const [showMeasurementsModal, setShowMeasurementsModal] = useState(false);
  const [measurementsClientId, setMeasurementsClientId] = useState<string | null>(null);

  // Payment edit state
  const [editingPaymentIndex, setEditingPaymentIndex] = useState<number | null>(null);
  const [editPaymentDate, setEditPaymentDate] = useState('');
  const [editPaymentAmount, setEditPaymentAmount] = useState('');
  const [editPaymentStatus, setEditPaymentStatus] = useState<'paid' | 'pending' | 'overdue'>('paid');
  const [editPaymentMethod, setEditPaymentMethod] = useState('');

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
    // Limpiar blob URL anterior si existe
    if (newClientSelfiePreview && newClientSelfiePreview.startsWith('blob:')) {
      URL.revokeObjectURL(newClientSelfiePreview);
    }
    const url = URL.createObjectURL(file);
    setNewClientSelfieFile(file);
    setNewClientSelfiePreview(url);
  };

  // Handle editar avatar de cliente ya registrado
  const handleEditClientAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClientId) return;
    if (editAvatarPreview && editAvatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(editAvatarPreview);
    }
    const url = URL.createObjectURL(file);
    setEditAvatarFile(file);
    setEditAvatarPreview(url);
    if (editAvatarInputRef.current) editAvatarInputRef.current.value = '';
  };

  const confirmEditAvatar = () => {
    if (editAvatarFile && selectedClientId) {
      onUploadClientAvatar(selectedClientId, editAvatarFile);
    }
    if (editAvatarPreview && editAvatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(editAvatarPreview);
    }
    setEditAvatarPreview(null);
    setEditAvatarFile(null);
  };

  const cancelEditAvatar = () => {
    if (editAvatarPreview && editAvatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(editAvatarPreview);
    }
    setEditAvatarPreview(null);
    setEditAvatarFile(null);
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
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newClientEmail || !newClientPassword) return;

    const today = new Date().toISOString().split('T')[0];
    const weightVal = parseFloat(newClientWeight) || 75;

    const heightVal = parseFloat(newClientHeight) || 0;
    const neckVal = parseFloat(newClientNeck) || 0;
    const waistVal = parseFloat(newClientWaist) || 0;
    const hipsVal = parseFloat(newClientHips) || 0;
    const ageVal = parseInt(newClientAge) || 25;

    const bodyFat = calculateBodyFat({
      gender: newClientGender,
      height: heightVal,
      weight: weightVal,
      age: ageVal,
      neck: neckVal,
      waist: waistVal,
      hips: hipsVal,
    });

    const initialMeasurements = {
      date: today,
      height: heightVal,
      weight: weightVal,
      neck: neckVal,
      waist: waistVal,
      hips: hipsVal,
      thighsLeft: parseFloat(newClientThighsLeft) || 0,
      thighsRight: parseFloat(newClientThighsRight) || 0,
      bicepsLeft: parseFloat(newClientBicepsLeft) || 0,
      bicepsRight: parseFloat(newClientBicepsRight) || 0,
      bodyFat: bodyFat ?? undefined,
    };

    const newClient = {
      name: newClientName,
      email: newClientEmail,
      password: newClientPassword,
      role: 'client' as const,
      goal: newClientGoal || 'Hipertrofia General',
      phone: newClientPhone || '',
      gender: newClientGender,
      age: ageVal,
      streak: 0,
      avatar: '',
      selfieUrl: '',
      monthlyFee: newClientFee,
      weightHistory: [{ date: today, weight: weightVal }],
      initialMeasurements,
      firstPaymentDate: newClientPaymentDate || '',
    };

    try {
      const created = await onAddClient(newClient);
      if (created?.id) {
        setClientPasswords(prev => ({ ...prev, [created.id]: newClientPassword }));
        // No seleccionar inmediatamente: esperar a que clients se actualice via props
        setPendingSelectClientId(created.id);

        // Si hay foto seleccionada, subirla a Supabase Storage con el ID del cliente creado
        if (newClientSelfieFile) {
          try {
            const publicUrl = await storageService.uploadAvatar(created.id, newClientSelfieFile);
            await onUpdateClient(created.id, { avatar: publicUrl, selfieUrl: publicUrl });
          } catch (uploadErr: any) {
            console.error('Error subiendo avatar:', uploadErr);
            alert('Cliente creado, pero error al subir foto: ' + (uploadErr.message || 'desconocido'));
          }
        }
      }
    } catch (err: any) {
      console.error('Error creando cliente:', err);
      alert('Error al crear cliente: ' + (err.message || 'desconocido'));
    } finally {
      // Limpiar blob URL de memoria
      if (newClientSelfiePreview && newClientSelfiePreview.startsWith('blob:')) {
        URL.revokeObjectURL(newClientSelfiePreview);
      }
      // Reset fields
      setNewClientName('');
      setNewClientEmail('');
      setNewClientPassword('');
      setNewClientGoal('');
      setNewClientPhone('');
      setNewClientSelfiePreview('');
      setNewClientSelfieFile(null);
      setNewClientFee(120);
      setNewClientPaymentDate('');
      setShowAddClientModal(false);
    }
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
    const finalName = customExerciseName.trim();
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

  // Handle preset selection from modal (CREATE form)
  const handleSelectPreset = (preset: Exercise) => {
    setCustomExerciseName(preset.name);
    setExerciseCategory(preset.category);
    setExerciseSets(preset.sets);
    setExerciseReps(preset.reps);
    setExerciseWeight(preset.weight);
    if (preset.setDetails && preset.setDetails.length > 0) {
      setExerciseSetDetails(preset.setDetails);
    } else {
      const arr = Array.from({ length: preset.sets }, () => ({
        reps: parseInt(preset.reps) || 10,
        weight: preset.weight,
      }));
      setExerciseSetDetails(arr);
    }
    setExerciseRest(preset.restTime);
    setExerciseNotes(preset.notes || '');
    setExerciseImageUrl(preset.imageUrl || '');
    setExerciseImageFile(null);
    if (exerciseImageInputRef.current) exerciseImageInputRef.current.value = '';
  };

  // Handle preset selection from modal (EDIT form)
  const handleSelectEditPreset = (preset: Exercise) => {
    setEditCustomExerciseName(preset.name);
    setEditExerciseCategory(preset.category);
    setEditExerciseSets(preset.sets);
    setEditExerciseReps(preset.reps);
    setEditExerciseWeight(preset.weight);
    if (preset.setDetails && preset.setDetails.length > 0) {
      setEditExerciseSetDetails(preset.setDetails);
    } else {
      const arr = Array.from({ length: preset.sets }, () => ({
        reps: parseInt(preset.reps) || 10,
        weight: preset.weight,
      }));
      setEditExerciseSetDetails(arr);
    }
    setEditExerciseRest(preset.restTime);
    setEditExerciseNotes(preset.notes || '');
    setEditExerciseImageUrl(preset.imageUrl || '');
    setEditExerciseImageFile(null);
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
    setEditCustomExerciseName(exercise.name);
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

    const finalName = editCustomExerciseName.trim() || editExerciseName;

    const updates: Partial<Exercise> = {};
    if (finalName !== exercise.name) updates.name = finalName;
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
    setEditCustomExerciseName('');
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

  // Guardar edición inline de datos personales
  const saveEdit = async () => {
    if (!selectedClient || !editingField) return;
    setEditSaving(true);
    try {
      await onUpdateClient(selectedClient.id, { [editingField]: editValue.trim() });
      setEditingField(null);
    } catch (e) {
      // el error ya se muestra en App.tsx
    } finally {
      setEditSaving(false);
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

  // Payment editing handlers
  const openEditPayment = (index: number) => {
    if (!selectedClient) return;
    const entry = selectedClient.paymentHistory?.[index];
    if (!entry) return;
    setEditingPaymentIndex(index);
    setEditPaymentDate(entry.date);
    setEditPaymentAmount(entry.amount.toString());
    setEditPaymentStatus(entry.status);
    setEditPaymentMethod(entry.method || '');
  };

  const savePaymentEdit = () => {
    if (!selectedClient || editingPaymentIndex === null) return;
    const updatedHistory = [...(selectedClient.paymentHistory || [])];
    updatedHistory[editingPaymentIndex] = {
      date: editPaymentDate,
      amount: parseFloat(editPaymentAmount) || 0,
      status: editPaymentStatus,
      method: editPaymentMethod || 'Manual',
    };
    onUpdateClient(selectedClient.id, { paymentHistory: updatedHistory });
    setEditingPaymentIndex(null);
  };

  const deletePaymentEntry = (index: number) => {
    if (!selectedClient) return;
    if (!window.confirm('¿Eliminar este registro de pago?')) return;
    const updatedHistory = [...(selectedClient.paymentHistory || [])];
    updatedHistory.splice(index, 1);
    onUpdateClient(selectedClient.id, { paymentHistory: updatedHistory });
    if (editingPaymentIndex === index) setEditingPaymentIndex(null);
  };

  const addPaymentEntry = () => {
    if (!selectedClient) return;
    const today = new Date().toISOString().split('T')[0];
    const newEntry = {
      date: today,
      amount: selectedClient.monthlyFee,
      status: 'paid' as const,
      method: 'Manual',
    };
    const updatedHistory = [newEntry, ...(selectedClient.paymentHistory || [])];
    onUpdateClient(selectedClient.id, { paymentHistory: updatedHistory });
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
                  {/* Workspace Tabs */}
                  <div className="flex bg-[#141416] border border-[#27272a] rounded-[12px] p-1 mb-4">
                    {([
                      { id: 'profile', label: 'Perfil', Icon: UserIcon },
                      { id: 'routines', label: 'Rutinas', Icon: ClipboardList },
                      { id: 'progress', label: 'Progreso', Icon: TrendingUp },
                    ] as const).map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        onClick={() => setClientWorkspaceTab(id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold py-2 rounded-[8px] transition-all ${
                          clientWorkspaceTab === id
                            ? 'bg-[#1c1c1f] text-[#d4f826] border border-[#27272a]'
                            : 'text-[#8e8e93] hover:text-white'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>

                  {clientWorkspaceTab === 'profile' && (
                  <div className="space-y-6">
                    {/* Athlete Profile Header */}
                    <div className="bg-[#141416] border border-[#27272a] rounded-[16px] p-5 md:p-6">
                      {/* Input oculto para editar foto del cliente */}
                      <input
                        ref={editAvatarInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleEditClientAvatar}
                        className="hidden"
                      />

                      <div className="flex items-start gap-4">
                        <div className="relative">
                          <div className="relative group cursor-pointer shrink-0" onClick={() => !editAvatarPreview && setAvatarLightbox(true)} title="Ver foto ampliada">
                            <img
                              src={editAvatarPreview || selectedClient.selfieUrl || selectedClient.avatar}
                              alt={selectedClient.name}
                              className={`w-16 h-16 rounded-full object-cover border-2 ${editAvatarPreview ? 'border-[#e5ba73]' : 'border-[#d4f826]'}`}
                            />
                            {!editAvatarPreview && (
                              <div className="absolute inset-0 rounded-full bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                <Camera className="w-5 h-5 text-[#d4f826]" />
                                <span className="text-[8px] text-white mt-0.5">VER</span>
                              </div>
                            )}
                          </div>
                          {!editAvatarPreview && (
                            <button
                              onClick={() => editAvatarInputRef.current?.click()}
                              className="absolute -bottom-1 -right-1 bg-[#d4f826] rounded-full p-1 hover:bg-[#e2fa52] transition-colors z-10"
                              title="Cambiar foto"
                            >
                              <Camera className="w-3 h-3 text-black" />
                            </button>
                          )}
                          {editAvatarPreview && (
                            <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-[#141416] border border-[#27272a] rounded-[8px] p-1 shadow-lg z-50">
                              <button onClick={confirmEditAvatar} className="text-[#25d366] hover:bg-[#25d366]/10 p-1 rounded-[4px] transition-all" title="Confirmar">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={cancelEditAvatar} className="text-[#ff5449] hover:bg-[#ff5449]/10 p-1 rounded-[4px] transition-all" title="Cancelar">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {editingField === 'name' ? (
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  disabled={editSaving}
                                  className="flex-1 min-w-0 bg-[#18181b] border border-[#27272a] rounded-[8px] text-sm font-extrabold text-white px-2.5 py-1 focus:outline-none focus:border-[#d4f826] disabled:opacity-50"
                                  autoFocus
                                />
                                <button onClick={saveEdit} disabled={editSaving} className="text-[#25d366] hover:text-white p-1 rounded-[6px] hover:bg-[#25d366]/20 transition-all">
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setEditingField(null)} disabled={editSaving} className="text-[#ff5449] hover:text-white p-1 rounded-[6px] hover:bg-[#ff5449]/20 transition-all">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="group flex items-center gap-1.5">
                                <h2 className="text-xl font-extrabold text-white">{selectedClient.name}</h2>
                                <button
                                  onClick={() => { setEditingField('name'); setEditValue(selectedClient.name); }}
                                  className="opacity-0 group-hover:opacity-100 text-[#52525b] hover:text-[#d4f826] p-0.5 rounded-[4px] hover:bg-[#d4f826]/10 transition-all"
                                  title="Editar nombre"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                            <span className="text-[10px] bg-[#d4f826]/10 text-[#d4f826] border border-[#d4f826]/20 px-2.5 py-1 rounded-full font-bold">
                              Plan Activo
                            </span>
                          </div>
                          <p className="text-xs text-[#8e8e93] mt-1.5">
                            <span className="text-white font-semibold">Meta:</span> {selectedClient.goal}
                          </p>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            {editingField === 'phone' ? (
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <Phone className="w-3 h-3 text-[#3f3f46] shrink-0" />
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  disabled={editSaving}
                                  className="flex-1 min-w-0 bg-[#18181b] border border-[#27272a] rounded-[6px] text-[11px] text-white px-2 py-0.5 focus:outline-none focus:border-[#d4f826] disabled:opacity-50"
                                  autoFocus
                                />
                                <button onClick={saveEdit} disabled={editSaving} className="text-[#25d366] hover:text-white p-0.5 rounded-[4px] hover:bg-[#25d366]/20 transition-all">
                                  <Check className="w-3 h-3" />
                                </button>
                                <button onClick={() => setEditingField(null)} disabled={editSaving} className="text-[#ff5449] hover:text-white p-0.5 rounded-[4px] hover:bg-[#ff5449]/20 transition-all">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="group flex items-center gap-1">
                                <p className="text-[11px] text-[#8e8e93] flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-[#3f3f46] shrink-0" /> {selectedClient.phone || 'Sin Teléfono'}
                                </p>
                                <button
                                  onClick={() => { setEditingField('phone'); setEditValue(selectedClient.phone || ''); }}
                                  className="opacity-0 group-hover:opacity-100 text-[#52525b] hover:text-[#d4f826] p-0.5 rounded-[4px] hover:bg-[#d4f826]/10 transition-all"
                                  title="Editar teléfono"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                            <span className="text-[#3f3f46]">·</span>
                            {editingField === 'email' ? (
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  disabled={editSaving}
                                  className="flex-1 min-w-0 bg-[#18181b] border border-[#27272a] rounded-[6px] text-[11px] text-white px-2 py-0.5 focus:outline-none focus:border-[#d4f826] disabled:opacity-50"
                                  autoFocus
                                />
                                <button onClick={saveEdit} disabled={editSaving} className="text-[#25d366] hover:text-white p-0.5 rounded-[4px] hover:bg-[#25d366]/20 transition-all">
                                  <Check className="w-3 h-3" />
                                </button>
                                <button onClick={() => setEditingField(null)} disabled={editSaving} className="text-[#ff5449] hover:text-white p-0.5 rounded-[4px] hover:bg-[#ff5449]/20 transition-all">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="group flex items-center gap-1">
                                <p className="text-[11px] text-[#8e8e93] break-all">{selectedClient.email}</p>
                                <button
                                  onClick={() => { setEditingField('email'); setEditValue(selectedClient.email); }}
                                  className="opacity-0 group-hover:opacity-100 text-[#52525b] hover:text-[#d4f826] p-0.5 rounded-[4px] hover:bg-[#d4f826]/10 transition-all"
                                  title="Editar email"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Acciones Rápidas — Grid de 2 columnas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* WhatsApp & Credenciales */}
                      <div className="bg-[#141416] border border-[#27272a] rounded-[16px] p-5 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#25d366]/10 flex items-center justify-center">
                            <MessageCircle className="w-4 h-4 text-[#25d366]" />
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider">WhatsApp</h3>
                            <p className="text-[10px] text-[#8e8e93]">Envío de credenciales y accesos</p>
                          </div>
                        </div>
                        <button
                          onClick={() => copyWhatsAppCredentials(selectedClient)}
                          className="w-full bg-[#25d366] text-black font-bold text-xs py-3 px-4 rounded-[12px] hover:bg-[#20ba5a] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                          {copiedClientId === selectedClient.id ? (
                            <><Check className="w-4 h-4" /> COPIADO AL PORTAPAPELES</>
                          ) : (
                            <><Copy className="w-4 h-4" /> ENVIAR ACCESOS</>
                          )}
                        </button>
                        <button
                          onClick={() => handleResetPassword(selectedClient)}
                          className="w-full bg-transparent text-[#d4f826] border border-[#3f3f46] font-bold text-xs py-2.5 px-4 rounded-[12px] hover:bg-[#3f3f46] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                          <Shield className="w-4 h-4" /> GENERAR NUEVA CONTRASEÑA
                        </button>
                      </div>

                      {/* Gestión de Pagos */}
                      <div className={`bg-[#141416] border rounded-[16px] p-5 flex flex-col gap-3 ${selectedClient.paymentStatus === 'overdue' ? 'border-[#ff5449]/30' : selectedClient.paymentStatus === 'pending' ? 'border-[#e5ba73]/30' : 'border-[#27272a]'}`}>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#27272a] flex items-center justify-center">
                            <CreditCard className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Gestión de Pago</h3>
                            <p className="text-[10px] text-[#8e8e93]">Control de cuotas y vencimientos</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-[#0a0a0c] rounded-[12px] p-3 text-center border border-[#27272a]">
                            <p className="text-[10px] text-[#8e8e93] uppercase">Cuota</p>
                            <p className="text-sm font-extrabold text-white mt-1">€{selectedClient.monthlyFee}</p>
                          </div>
                          <div className="bg-[#0a0a0c] rounded-[12px] p-3 text-center border border-[#27272a]">
                            <p className="text-[10px] text-[#8e8e93] uppercase">Próximo</p>
                            <p className="text-xs font-bold text-white mt-1">{selectedClient.nextPaymentDate}</p>
                          </div>
                          <div className="bg-[#0a0a0c] rounded-[12px] p-3 text-center border border-[#27272a]">
                            <p className="text-[10px] text-[#8e8e93] uppercase">Estado</p>
                            <span className={`inline-block text-[10px] font-bold px-2 py-1 rounded-[6px] mt-1 ${selectedClient.paymentStatus === 'paid' ? 'bg-[#25d366]/10 text-[#25d366]' : selectedClient.paymentStatus === 'overdue' ? 'bg-[#ff5449]/10 text-[#ff5449]' : 'bg-[#e5ba73]/10 text-[#e5ba73]'}`}>
                              {selectedClient.paymentStatus === 'paid' ? 'PAGADO' : selectedClient.paymentStatus === 'overdue' ? 'VENCIDO' : 'PENDIENTE'}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => onMarkPaymentPaid(selectedClient.id)}
                            className="flex-1 bg-[#25d366] text-black font-bold text-[10px] py-2.5 rounded-[12px] hover:bg-[#20ba5a] active:scale-[0.98] transition-all"
                          >
                            MARCAR PAGADO
                          </button>
                          <button
                            onClick={() => {
                              const newDate = prompt('Nueva fecha de pago (YYYY-MM-DD):', selectedClient.nextPaymentDate);
                              if (newDate) onUpdateClientPayment(selectedClient.id, { nextPaymentDate: newDate, paymentStatus: selectedClient.paymentStatus, monthlyFee: selectedClient.monthlyFee });
                            }}
                            className="bg-[#27272a] text-white hover:bg-[#3f3f46] text-[10px] px-4 py-2.5 rounded-[12px] transition-all font-bold"
                          >
                            ✏ FECHA
                          </button>
                          <button
                            onClick={() => {
                              const newFee = prompt('Nueva cuota mensual (€):', selectedClient.monthlyFee.toString());
                              if (newFee && !isNaN(Number(newFee))) onUpdateClientPayment(selectedClient.id, { nextPaymentDate: selectedClient.nextPaymentDate, paymentStatus: selectedClient.paymentStatus, monthlyFee: Number(newFee) });
                            }}
                            className="bg-[#27272a] text-white hover:bg-[#3f3f46] text-[10px] px-4 py-2.5 rounded-[12px] transition-all font-bold"
                          >
                            € CUOTA
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Historial de Pagos — Ancho completo */}
                    <div className="bg-[#141416] border border-[#27272a] rounded-[16px] p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <ClipboardList className="w-4 h-4 text-[#d4f826]" />
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Historial Completo de Pagos</h3>
                        </div>
                        <button
                          onClick={addPaymentEntry}
                          className="text-[10px] bg-[#d4f826]/10 text-[#d4f826] border border-[#d4f826]/20 px-3 py-1.5 rounded-[8px] font-bold hover:bg-[#d4f826]/20 transition-all flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> AGREGAR
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="text-[#52525b] border-b border-[#27272a]">
                              <th className="text-left py-2 font-mono uppercase">Fecha</th>
                              <th className="text-right py-2 font-mono uppercase">Monto</th>
                              <th className="text-right py-2 font-mono uppercase">Estado</th>
                              <th className="text-right py-2 font-mono uppercase">Método</th>
                              <th className="text-right py-2 font-mono uppercase w-16"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#27272a]">
                            {selectedClient.paymentHistory?.map((ph, i) => (
                              editingPaymentIndex === i ? (
                                <tr key={i} className="bg-[#1c1c1f]">
                                  <td className="py-2">
                                    <input
                                      type="date"
                                      value={editPaymentDate}
                                      onChange={(e) => setEditPaymentDate(e.target.value)}
                                      className="w-full bg-[#0a0a0c] border border-[#27272a] rounded-[6px] text-[11px] px-2 py-1 text-white"
                                    />
                                  </td>
                                  <td className="py-2">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={editPaymentAmount}
                                      onChange={(e) => setEditPaymentAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                                      className="w-full bg-[#0a0a0c] border border-[#27272a] rounded-[6px] text-[11px] px-2 py-1 text-white text-right"
                                    />
                                  </td>
                                  <td className="py-2">
                                    <select
                                      value={editPaymentStatus}
                                      onChange={(e) => setEditPaymentStatus(e.target.value as any)}
                                      className="w-full bg-[#0a0a0c] border border-[#27272a] rounded-[6px] text-[11px] px-2 py-1 text-white"
                                    >
                                      <option value="paid">PAGADO</option>
                                      <option value="pending">PENDIENTE</option>
                                      <option value="overdue">VENCIDO</option>
                                    </select>
                                  </td>
                                  <td className="py-2">
                                    <input
                                      type="text"
                                      value={editPaymentMethod}
                                      onChange={(e) => setEditPaymentMethod(e.target.value)}
                                      className="w-full bg-[#0a0a0c] border border-[#27272a] rounded-[6px] text-[11px] px-2 py-1 text-white"
                                    />
                                  </td>
                                  <td className="py-2">
                                    <div className="flex items-center gap-1 justify-end">
                                      <button onClick={savePaymentEdit} className="text-[#25d366] hover:text-white p-1 rounded-[4px] hover:bg-[#25d366]/20 transition-all"><Check className="w-3.5 h-3.5"/></button>
                                      <button onClick={() => setEditingPaymentIndex(null)} className="text-[#ff5449] hover:text-white p-1 rounded-[4px] hover:bg-[#ff5449]/20 transition-all"><X className="w-3.5 h-3.5"/></button>
                                    </div>
                                  </td>
                                </tr>
                              ) : (
                                <tr key={i} className="hover:bg-[#1c1c1f]/50 transition-colors">
                                  <td className="py-2.5 text-[#a1a1aa] font-mono">{ph.date}</td>
                                  <td className="py-2.5 text-right text-white font-bold">€{ph.amount}</td>
                                  <td className="py-2.5 text-right">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-[6px] ${ph.status === 'paid' ? 'bg-[#25d366]/10 text-[#25d366]' : ph.status === 'overdue' ? 'bg-[#ff5449]/10 text-[#ff5449]' : 'bg-[#e5ba73]/10 text-[#e5ba73]'}`}>
                                      {ph.status === 'paid' ? 'PAGADO' : ph.status === 'overdue' ? 'VENCIDO' : 'PENDIENTE'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 text-right text-[#8e8e93]">{ph.method || '--'}</td>
                                  <td className="py-2.5">
                                    <div className="flex items-center gap-1 justify-end">
                                      <button onClick={() => openEditPayment(i)} className="text-[#3f3f46] hover:text-[#d4f826] p-1 rounded-[4px] hover:bg-[#d4f826]/10 transition-all"><Pencil className="w-3.5 h-3.5"/></button>
                                      <button onClick={() => deletePaymentEntry(i)} className="text-[#3f3f46] hover:text-[#ff5449] p-1 rounded-[4px] hover:bg-[#ff5449]/10 transition-all"><Trash2 className="w-3.5 h-3.5"/></button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            ))}
                            {(!selectedClient.paymentHistory || selectedClient.paymentHistory.length === 0) && (
                              <tr>
                                <td colSpan={5} className="py-4 text-center text-[#52525b] text-[11px]">Sin registros de pago.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  )}

                  {clientWorkspaceTab === 'routines' && (
                  <div className="space-y-4">
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
                          {/* Routine Header — Clickable Accordion */}
                          <button
                            onClick={() => setExpandedRoutineId(prev => prev === routine.id ? null : routine.id)}
                            className="w-full bg-[#1c1c1f] p-4 border-b border-[#27272a] flex items-center justify-between flex-wrap gap-2 text-left hover:bg-[#242428] transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {expandedRoutineId === routine.id ? (
                                <ChevronUp className="w-4 h-4 text-[#d4f826] shrink-0" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-[#52525b] shrink-0" />
                              )}
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
                                <p className="text-[10px] text-[#52525b] mt-1">
                                  {routine.exercises.length} ejercicio{routine.exercises.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] text-[#8e8e93]">Asignado: {routine.createdAt}</span>
                          </button>

                          {/* Exercise Cards with Images — Collapsible */}
                          {expandedRoutineId === routine.id && (
                          <div className="p-4 space-y-3">
                            {routine.exercises.length === 0 ? (
                              <p className="text-xs text-[#52525b] italic p-2 text-center">No hay ejercicios cargados para este dia.</p>
                            ) : (
                              <div className="grid gap-3">
                                {routine.exercises.slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((ex, idx, arr) => (
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
                                            onClick={() => onReorderExercises(routine.id, ex.id, 'up')}
                                            disabled={idx === 0}
                                            className="text-[#3f3f46] hover:text-[#d4f826] disabled:text-[#18181b] disabled:hover:text-[#18181b] p-1 rounded-[6px] hover:bg-[#d4f826]/10 transition-all"
                                            title="Mover arriba"
                                          >
                                            <ArrowUp className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => onReorderExercises(routine.id, ex.id, 'down')}
                                            disabled={idx === arr.length - 1}
                                            className="text-[#3f3f46] hover:text-[#d4f826] disabled:text-[#18181b] disabled:hover:text-[#18181b] p-1 rounded-[6px] hover:bg-[#d4f826]/10 transition-all"
                                            title="Mover abajo"
                                          >
                                            <ArrowDown className="w-3.5 h-3.5" />
                                          </button>
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

                              {/* Fila 1: Catálogo + Nombre + Categoría */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-[10px] text-[#a1a1aa] mb-1">Catálogo</label>
                                  <button
                                    type="button"
                                    onClick={() => setShowExerciseSelector(true)}
                                    className="w-full bg-[#18181b] border border-[#d4f826]/30 hover:border-[#d4f826] hover:bg-[#d4f826]/5 rounded-lg text-xs p-2 text-[#d4f826] flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                                  >
                                    <Search className="w-3 h-3" />
                                    {customExerciseName ? 'Cambiar ejercicio' : 'Abrir Catálogo'}
                                  </button>
                                </div>
                                <div>
                                  <label className="block text-[10px] text-[#a1a1aa] mb-1">Nombre del ejercicio</label>
                                  <input
                                    type="text"
                                    placeholder="Ej: Sentadilla profunda"
                                    value={customExerciseName}
                                    onChange={(e) => setCustomExerciseName(e.target.value)}
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
                                    <option value="Biceps">Bíceps</option>
                                    <option value="Triceps">Tríceps</option>
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

                              {/* Toolbar Series + Descanso */}
                              <div className="bg-[#18181b] border border-[#27272a] rounded-[12px] p-3 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <label className="text-[10px] text-[#a1a1aa] font-bold">Series</label>
                                    <div className="flex items-center gap-1.5 bg-[#0a0a0c] rounded-[8px] p-0.5 border border-[#27272a]">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (exerciseSetDetails.length > 1) {
                                            const next = exerciseSetDetails.slice(0, -1);
                                            setExerciseSetDetails(next);
                                            setExerciseSets(next.length);
                                          }
                                        }}
                                        className="w-7 h-7 flex items-center justify-center bg-[#27272a] text-[#8e8e93] rounded-[6px] text-xs hover:text-white active:scale-95 transition-all"
                                      >
                                        −
                                      </button>
                                      <span className="text-xs text-white font-bold w-5 text-center">{exerciseSetDetails.length}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const last = exerciseSetDetails[exerciseSetDetails.length - 1] || { reps: 10, weight: 20 };
                                          const next = [...exerciseSetDetails, { reps: last.reps, weight: last.weight }];
                                          setExerciseSetDetails(next);
                                          setExerciseSets(next.length);
                                        }}
                                        className="w-7 h-7 flex items-center justify-center bg-[#27272a] text-[#d4f826] rounded-[6px] text-xs hover:bg-[#3f3f46] active:scale-95 transition-all"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <Timer className="w-3.5 h-3.5 text-[#8e8e93]" />
                                    <label className="text-[10px] text-[#a1a1aa] font-bold">Descanso</label>
                                    <div className="flex items-center bg-[#0a0a0c] rounded-[8px] border border-[#27272a] overflow-hidden">
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={exerciseRest || ''}
                                        onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setExerciseRest(v === '' ? 0 : Number(v)); }}
                                        className="w-14 bg-transparent text-xs p-1.5 text-white text-center focus:outline-none"
                                      />
                                      <span className="text-[9px] text-[#8e8e93] pr-2">s</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Grid de series */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                  {exerciseSetDetails.map((s, i) => (
                                    <div key={i} className="bg-[#141416] border border-[#27272a] rounded-[8px] p-2 flex items-center gap-2">
                                      <span className="text-[9px] text-[#8e8e93] font-bold w-4 text-center">{i + 1}</span>
                                      <div className="flex-1 flex flex-col gap-1">
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="text" inputMode="numeric" pattern="[0-9]*" placeholder="Reps" value={s.reps || ''} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); const next = [...exerciseSetDetails]; next[i] = { ...next[i], reps: v === '' ? 0 : Number(v) }; setExerciseSetDetails(next); }}
                                            className="w-full bg-[#0a0a0c] border border-[#27272a] rounded-[6px] text-[10px] p-1 text-white focus:outline-none focus:border-[#d4f826] text-center"
                                          />
                                          <span className="text-[8px] text-[#8e8e93]">reps</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="text" inputMode="numeric" pattern="[0-9]*" placeholder="Peso" value={s.weight || ''} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); const next = [...exerciseSetDetails]; next[i] = { ...next[i], weight: v === '' ? 0 : Number(v) }; setExerciseSetDetails(next); }}
                                            className="w-full bg-[#0a0a0c] border border-[#27272a] rounded-[6px] text-[10px] p-1 text-white focus:outline-none focus:border-[#d4f826] text-center"
                                          />
                                          <span className="text-[8px] text-[#8e8e93]">kg</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
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
                          )}
                        </div>
                      ))}

                      {clientRoutines.length === 0 && (
                        <div className="bg-[#18181b] border border-[#27272a] border-dashed rounded-2xl p-8 text-center text-xs text-[#71717a]">
                          Este atleta no tiene días de entrenamiento asignados. Usa el botón para crear su primer plan.
                        </div>
                      )}
                    </div>
                  </div>
                  </div>
                  )}

                  {clientWorkspaceTab === 'progress' && (
                  <div className="space-y-4">
                  {/* Progress Dashboard */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs uppercase tracking-wider text-white font-mono font-bold flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#d4f826]" /> Progreso del Atleta
                      </h4>
                      <button
                        onClick={() => { setMeasurementsClientId(selectedClient.id); setShowMeasurementsModal(true); }}
                        className="bg-[#d4f826] text-black font-bold text-[10px] py-1.5 px-3 rounded-xl hover:bg-[#e2fa52] transition-all flex items-center gap-1.5"
                      >
                        <RulerIcon className="w-3 h-3" />
                        Actualizar Medidas
                      </button>
                    </div>

                    <MeasurementCards
                      latest={selectedClient.measurementsHistory?.[0]}
                      previous={selectedClient.measurementsHistory?.[1]}
                      gender={selectedClient.gender}
                    />

                    <ProgressLineChart user={selectedClient} title="Evolución del Atleta" />

                    {/* Weight History Grid */}
                    <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4">
                      <h4 className="text-[10px] uppercase tracking-wider text-[#a1a1aa] font-mono font-bold mb-3">
                        Registros de Peso
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {selectedClient.weightHistory?.map((entry, idx) => (
                          <div key={idx} className="bg-[#121214] p-3 rounded-xl border border-[#27272a] text-center">
                            <p className="text-[10px] text-[#71717a]">{entry.date}</p>
                            <p className="text-sm font-bold text-[#d4f826] font-mono mt-1">{entry.weight} kg</p>
                          </div>
                        )) || <p className="text-xs text-[#52525b]">No hay registros.</p>}
                      </div>
                    </div>

                    {/* Measurements History Table */}
                    {selectedClient.measurementsHistory && selectedClient.measurementsHistory.length > 0 && (
                      <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4">
                        <h4 className="text-[10px] uppercase tracking-wider text-[#a1a1aa] font-mono font-bold mb-3 flex items-center gap-2">
                          <RulerIcon className="w-3.5 h-3.5" /> Historial de Medidas
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[10px]">
                            <thead>
                              <tr className="text-[#52525b] border-b border-[#27272a]">
                                <th className="text-left py-2 font-mono uppercase">Fecha</th>
                                <th className="text-right py-2 font-mono uppercase">Peso</th>
                                <th className="text-right py-2 font-mono uppercase">% Grasa</th>
                                <th className="text-right py-2 font-mono uppercase">Cintura</th>
                                <th className="text-right py-2 font-mono uppercase">Cadera</th>
                                <th className="text-right py-2 font-mono uppercase">Cuello</th>
                                <th className="text-right py-2 font-mono uppercase">Pierna Izq</th>
                                <th className="text-right py-2 font-mono uppercase">Pierna Der</th>
                                <th className="text-right py-2 font-mono uppercase">Bíceps Izq</th>
                                <th className="text-right py-2 font-mono uppercase">Bíceps Der</th>
                                <th className="text-right py-2 font-mono uppercase">Por</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#27272a]">
                              {selectedClient.measurementsHistory.map((m, i) => (
                                <tr key={i}>
                                  <td className="py-2 text-[#8e8e93]">{m.date}</td>
                                  <td className="py-2 text-right text-white font-bold">{m.weight || '--'} <span className="text-[#52525b] font-normal">kg</span></td>
                                  <td className="py-2 text-right font-bold" style={{ color: m.bodyFat ? getBodyFatColor(m.bodyFat, selectedClient.gender || 'male') : '#8e8e93' }}>{m.bodyFat || '--'} <span className="text-[#52525b] font-normal">%</span></td>
                                  <td className="py-2 text-right text-[#00e5ff]">{m.waist || '--'} <span className="text-[#52525b]">cm</span></td>
                                  <td className="py-2 text-right text-[#ff00ff]">{m.hips || '--'} <span className="text-[#52525b]">cm</span></td>
                                  <td className="py-2 text-right text-[#e5ba73]">{m.neck || '--'} <span className="text-[#52525b]">cm</span></td>
                                  <td className="py-2 text-right text-[#76ff03]">{m.thighsLeft || '--'} <span className="text-[#52525b]">cm</span></td>
                                  <td className="py-2 text-right text-[#00e5ff]">{m.thighsRight || '--'} <span className="text-[#52525b]">cm</span></td>
                                  <td className="py-2 text-right text-[#2979ff]">{m.bicepsLeft || '--'} <span className="text-[#52525b]">cm</span></td>
                                  <td className="py-2 text-right text-[#ff5449]">{m.bicepsRight || '--'} <span className="text-[#52525b]">cm</span></td>
                                  <td className="py-2 text-right">
                                    <span className={`text-[8px] font-bold px-1 py-0.5 rounded-[4px] ${m.recordedBy === 'client' ? 'bg-[#00e5ff]/10 text-[#00e5ff]' : 'bg-[#d4f826]/10 text-[#d4f826]'}`}>
                                      {m.recordedBy === 'client' ? 'CLI' : 'COA'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                  </div>
                  )}
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
                  <input type="text" inputMode="numeric" pattern="[0-9]*" value={newClientFee || ''} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setNewClientFee(v === '' ? 0 : Number(v)); }} className="w-full bg-[#18181b] border border-[#27272a] rounded-xl text-xs p-2.5 text-white focus:outline-none focus:border-[#d4f826] font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] text-[#a1a1aa] mb-1 font-mono uppercase font-semibold">Fecha 1er Pago</label>
                  <input type="date" value={newClientPaymentDate} onChange={(e) => setNewClientPaymentDate(e.target.value)} className="w-full bg-[#18181b] border border-[#27272a] rounded-xl text-xs p-2.5 text-white focus:outline-none focus:border-[#d4f826] font-mono" />
                </div>
              </div>

              <div className="border-t border-[#27272a] pt-3 mt-1">
                <label className="block text-[10px] text-[#a1a1aa] mb-2 font-mono uppercase font-semibold tracking-wider">Medidas Corporales Iniciales (cm)</label>
                <div className="mb-2.5">
                  <label className="block text-[9px] text-[#52525b] mb-0.5 font-mono uppercase">Género (para cálculo de % grasa)</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewClientGender('male')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newClientGender === 'male' ? 'bg-[#d4f826] text-black' : 'bg-[#18181b] text-[#8e8e93] border border-[#27272a]'}`}
                    >
                      Hombre
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewClientGender('female')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newClientGender === 'female' ? 'bg-[#d4f826] text-black' : 'bg-[#18181b] text-[#8e8e93] border border-[#27272a]'}`}
                    >
                      Mujer
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[9px] text-[#52525b] mb-0.5 font-mono uppercase">Edad (años)</label>
                    <input type="text" inputMode="numeric" placeholder="28" value={newClientAge} onChange={(e) => setNewClientAge(e.target.value.replace(/[^0-9]/g, ''))} className="w-full bg-[#18181b] border border-[#27272a] rounded-lg text-xs p-2 text-white focus:outline-none focus:border-[#d4f826] font-mono" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-[#52525b] mb-0.5 font-mono uppercase">Altura (cm)</label>
                    <input type="text" inputMode="numeric" placeholder="175" value={newClientHeight} onChange={(e) => setNewClientHeight(e.target.value.replace(/[^0-9.]/g, ''))} className="w-full bg-[#18181b] border border-[#27272a] rounded-lg text-xs p-2 text-white focus:outline-none focus:border-[#d4f826] font-mono" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-[#52525b] mb-0.5 font-mono uppercase">Peso (kg)</label>
                    <input type="text" inputMode="numeric" placeholder="75.5" value={newClientWeight} onChange={(e) => setNewClientWeight(e.target.value.replace(/[^0-9.]/g, ''))} className="w-full bg-[#18181b] border border-[#27272a] rounded-lg text-xs p-2 text-white focus:outline-none focus:border-[#d4f826] font-mono" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-[#52525b] mb-0.5 font-mono uppercase">Cuello</label>
                    <input type="text" inputMode="numeric" placeholder="38" value={newClientNeck} onChange={(e) => setNewClientNeck(e.target.value.replace(/[^0-9.]/g, ''))} className="w-full bg-[#18181b] border border-[#27272a] rounded-lg text-xs p-2 text-white focus:outline-none focus:border-[#d4f826] font-mono" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-[#52525b] mb-0.5 font-mono uppercase">Cintura</label>
                    <input type="text" inputMode="numeric" placeholder="82" value={newClientWaist} onChange={(e) => setNewClientWaist(e.target.value.replace(/[^0-9.]/g, ''))} className="w-full bg-[#18181b] border border-[#27272a] rounded-lg text-xs p-2 text-white focus:outline-none focus:border-[#d4f826] font-mono" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-[#52525b] mb-0.5 font-mono uppercase">Cadera</label>
                    <input type="text" inputMode="numeric" placeholder="98" value={newClientHips} onChange={(e) => setNewClientHips(e.target.value.replace(/[^0-9.]/g, ''))} className="w-full bg-[#18181b] border border-[#27272a] rounded-lg text-xs p-2 text-white focus:outline-none focus:border-[#d4f826] font-mono" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-[#52525b] mb-0.5 font-mono uppercase">Pierna Izq.</label>
                    <input type="text" inputMode="numeric" placeholder="58" value={newClientThighsLeft} onChange={(e) => setNewClientThighsLeft(e.target.value.replace(/[^0-9.]/g, ''))} className="w-full bg-[#18181b] border border-[#27272a] rounded-lg text-xs p-2 text-white focus:outline-none focus:border-[#d4f826] font-mono" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-[#52525b] mb-0.5 font-mono uppercase">Pierna Der.</label>
                    <input type="text" inputMode="numeric" placeholder="58.5" value={newClientThighsRight} onChange={(e) => setNewClientThighsRight(e.target.value.replace(/[^0-9.]/g, ''))} className="w-full bg-[#18181b] border border-[#27272a] rounded-lg text-xs p-2 text-white focus:outline-none focus:border-[#d4f826] font-mono" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-[#52525b] mb-0.5 font-mono uppercase">Bíceps Izq.</label>
                    <input type="text" inputMode="numeric" placeholder="35" value={newClientBicepsLeft} onChange={(e) => setNewClientBicepsLeft(e.target.value.replace(/[^0-9.]/g, ''))} className="w-full bg-[#18181b] border border-[#27272a] rounded-lg text-xs p-2 text-white focus:outline-none focus:border-[#d4f826] font-mono" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-[#52525b] mb-0.5 font-mono uppercase">Bíceps Der.</label>
                    <input type="text" inputMode="numeric" placeholder="35.5" value={newClientBicepsRight} onChange={(e) => setNewClientBicepsRight(e.target.value.replace(/[^0-9.]/g, ''))} className="w-full bg-[#18181b] border border-[#27272a] rounded-lg text-xs p-2 text-white focus:outline-none focus:border-[#d4f826] font-mono" />
                  </div>
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
              {/* Fila 1: Catálogo + Nombre + Categoría */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-[#a1a1aa] mb-1">Catálogo</label>
                  <button
                    type="button"
                    onClick={() => setShowEditExerciseSelector(true)}
                    className="w-full bg-[#18181b] border border-[#d4f826]/30 hover:border-[#d4f826] hover:bg-[#d4f826]/5 rounded-lg text-xs p-2 text-[#d4f826] flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                  >
                    <Search className="w-3 h-3" />
                    {editCustomExerciseName ? 'Cambiar ejercicio' : 'Abrir Catálogo'}
                  </button>
                </div>
                <div>
                  <label className="block text-[10px] text-[#a1a1aa] mb-1">Nombre del ejercicio</label>
                  <input
                    type="text"
                    placeholder="Ej: Sentadilla profunda"
                    value={editCustomExerciseName}
                    onChange={(e) => setEditCustomExerciseName(e.target.value)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg text-xs p-2 focus:outline-none focus:border-[#d4f826] text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#a1a1aa] mb-1">Grupo Muscular</label>
                  <select
                    value={editExerciseCategory}
                    onChange={(e) => setEditExerciseCategory(e.target.value as Exercise['category'])}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg text-xs p-2 focus:outline-none focus:border-[#d4f826] text-white"
                  >
                    <option value="Chest">Pecho</option>
                    <option value="Back">Espalda</option>
                    <option value="Legs">Piernas</option>
                    <option value="Shoulders">Hombros</option>
                    <option value="Biceps">Bíceps</option>
                    <option value="Triceps">Tríceps</option>
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

              {/* Toolbar Series + Descanso */}
              <div className="bg-[#18181b] border border-[#27272a] rounded-[12px] p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <label className="text-[10px] text-[#a1a1aa] font-bold">Series</label>
                    <div className="flex items-center gap-1.5 bg-[#0a0a0c] rounded-[8px] p-0.5 border border-[#27272a]">
                      <button
                        type="button"
                        onClick={() => {
                          if (editExerciseSetDetails.length > 1) {
                            const next = editExerciseSetDetails.slice(0, -1);
                            setEditExerciseSetDetails(next);
                            setEditExerciseSets(next.length);
                          }
                        }}
                        className="w-7 h-7 flex items-center justify-center bg-[#27272a] text-[#8e8e93] rounded-[6px] text-xs hover:text-white active:scale-95 transition-all"
                      >
                        −
                      </button>
                      <span className="text-xs text-white font-bold w-5 text-center">{editExerciseSetDetails.length}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const last = editExerciseSetDetails[editExerciseSetDetails.length - 1] || { reps: 10, weight: 20 };
                          const next = [...editExerciseSetDetails, { reps: last.reps, weight: last.weight }];
                          setEditExerciseSetDetails(next);
                          setEditExerciseSets(next.length);
                        }}
                        className="w-7 h-7 flex items-center justify-center bg-[#27272a] text-[#d4f826] rounded-[6px] text-xs hover:bg-[#3f3f46] active:scale-95 transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Timer className="w-3.5 h-3.5 text-[#8e8e93]" />
                    <label className="text-[10px] text-[#a1a1aa] font-bold">Descanso</label>
                    <div className="flex items-center bg-[#0a0a0c] rounded-[8px] border border-[#27272a] overflow-hidden">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={editExerciseRest || ''}
                        onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setEditExerciseRest(v === '' ? 0 : Number(v)); }}
                        className="w-14 bg-transparent text-xs p-1.5 text-white text-center focus:outline-none"
                      />
                      <span className="text-[9px] text-[#8e8e93] pr-2">s</span>
                    </div>
                  </div>
                </div>

                {/* Grid de series */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {editExerciseSetDetails.map((s, i) => (
                    <div key={i} className="bg-[#141416] border border-[#27272a] rounded-[8px] p-2 flex items-center gap-2">
                      <span className="text-[9px] text-[#8e8e93] font-bold w-4 text-center">{i + 1}</span>
                      <div className="flex-1 flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <input
                            type="text" inputMode="numeric" pattern="[0-9]*" placeholder="Reps" value={s.reps || ''} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); const next = [...editExerciseSetDetails]; next[i] = { ...next[i], reps: v === '' ? 0 : Number(v) }; setEditExerciseSetDetails(next); }}
                            className="w-full bg-[#0a0a0c] border border-[#27272a] rounded-[6px] text-[10px] p-1 text-white focus:outline-none focus:border-[#d4f826] text-center"
                          />
                          <span className="text-[8px] text-[#8e8e93]">reps</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="text" inputMode="numeric" pattern="[0-9]*" placeholder="Peso" value={s.weight || ''} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); const next = [...editExerciseSetDetails]; next[i] = { ...next[i], weight: v === '' ? 0 : Number(v) }; setEditExerciseSetDetails(next); }}
                            className="w-full bg-[#0a0a0c] border border-[#27272a] rounded-[6px] text-[10px] p-1 text-white focus:outline-none focus:border-[#d4f826] text-center"
                          />
                          <span className="text-[8px] text-[#8e8e93]">kg</span>
                        </div>
                      </div>
                    </div>
                  ))}
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

      <MeasurementsModal
        isOpen={showMeasurementsModal}
        onClose={() => setShowMeasurementsModal(false)}
        onSave={(entry) => {
          if (measurementsClientId) {
            onAddMeasurementsEntry(measurementsClientId, entry);
          }
        }}
        lastMeasurements={clients.find(c => c.id === measurementsClientId)?.measurementsHistory?.[0]}
        clientName={clients.find(c => c.id === measurementsClientId)?.name}
        clientGender={clients.find(c => c.id === measurementsClientId)?.gender}
        onGenderChange={(g) => {
          if (measurementsClientId) {
            onUpdateClient(measurementsClientId, { gender: g });
          }
        }}
        clientAge={clients.find(c => c.id === measurementsClientId)?.age}
        onAgeChange={(a) => {
          if (measurementsClientId) {
            onUpdateClient(measurementsClientId, { age: a });
          }
        }}
      />

      {/* Modales del catálogo de ejercicios */}
      <ExerciseSelectorModal
        isOpen={showExerciseSelector}
        onClose={() => setShowExerciseSelector(false)}
        onSelect={handleSelectPreset}
        presets={globalPresets}
        presetsLoading={presetsLoading}
      />
      <ExerciseSelectorModal
        isOpen={showEditExerciseSelector}
        onClose={() => setShowEditExerciseSelector(false)}
        onSelect={handleSelectEditPreset}
        presets={globalPresets}
        presetsLoading={presetsLoading}
      />

      {/* Avatar Lightbox */}
      {selectedClient && avatarLightbox && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6" onClick={() => setAvatarLightbox(false)}>
          <div className="relative max-w-[420px] w-full">
            <img
              src={selectedClient.selfieUrl || selectedClient.avatar}
              alt={selectedClient.name}
              className="w-full rounded-[16px] object-contain border-4 border-[#d4f826]"
            />
            <button
              onClick={() => setAvatarLightbox(false)}
              className="absolute -top-3 -right-3 bg-black/70 text-white rounded-full p-2 hover:bg-[#ff5449] transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
