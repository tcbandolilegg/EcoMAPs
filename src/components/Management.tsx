/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useRef } from 'react';
import { Plus, Table, History, User as UserIcon, Calendar, CheckCircle2, Trash2, Camera, MapPin as MapPinIcon, ShieldCheck, XCircle, LogOut, Edit, Users, Flag, Truck, Search, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db, collection, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, onSnapshot, query, orderBy, setDoc, getDoc, where, getDocs, handleFirestoreError, OperationType } from '../lib/firebase';
import { CollectionPoint, UserProfile, RecyclingRoute } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { fetchAddressByCEP } from '../services/locationService';

export default function Management({ points }: { points: CollectionPoint[] }) {
  const { user, profile, logout } = useAuth();
  
  const isMasterAdmin = user?.email?.toLowerCase() === 'tcbandolilegg@gmail.com';
  const isAdmin = isMasterAdmin || profile?.role === 'admin';
  const isModerator = profile?.role === 'moderator';
  const canAudit = isAdmin || isModerator;
  const canManageRoutes = isAdmin || isModerator;

  const [activeTab, setActiveTab] = useState<'add' | 'audit' | 'users' | 'routes'>(canAudit ? 'audit' : 'add');
  const [users, setUsers] = useState<(UserProfile & { id: string })[]>([]);
  const [routes, setRoutes] = useState<RecyclingRoute[]>([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [isEditingRoute, setIsEditingRoute] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [userFormData, setUserFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'user' as 'user' | 'moderator' | 'admin',
    state: '',
    city: '',
    neighborhood: '',
    street: '',
    number: '',
    complement: '',
    cep: ''
  });
  const [routeFormData, setRouteFormData] = useState({
    cep: '',
    state: '',
    city: '',
    neighborhood: '',
    street: '',
    days: [] as string[],
    period: 'manhã' as 'manhã' | 'tarde' | 'noite'
  });
  const [loading, setLoading] = useState(false);
  const [loadingGPS, setLoadingGPS] = useState(false);
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [permissionError, setPermissionError] = useState<{title: string, message: string, icon: 'gps' | 'camera'} | null>(null);
  const [success, setSuccess] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPointId, setEditingPointId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    id: string;
    name: string;
    type: 'point' | 'user';
  }>({ show: false, id: '', name: '', type: 'point' });
  const [reportModal, setReportModal] = useState<{
    show: boolean;
    pointId: string;
    pointName: string;
  }>({ show: false, pointId: '', pointName: '' });
  const [reportReason, setReportReason] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    cep: '',
    address: '',
    lat: '',
    lng: '',
    state: '',
    city: '',
    neighborhood: '',
    type: 'PEV' as 'PEV' | 'Ecoponto' | 'Cooperativa',
    acceptedItems: '',
    description: ''
  });

  const getGeolocation = React.useCallback(async (isAuto = false) => {
    if (!navigator.geolocation) {
      if (!isAuto) alert("Seu navegador não suporta geolocalização.");
      return;
    }

    setLoadingGPS(true);
    
    const successCallback = (position: GeolocationPosition) => {
      setFormData(prev => ({
        ...prev,
        lat: position.coords.latitude.toString(),
        lng: position.coords.longitude.toString()
      }));
      setLoadingGPS(false);
      if (!isAuto) {
         alert("Localização capturada com sucesso e preenchida no formulário!");
      }
      console.log("GPS Location updated:", position.coords.latitude, position.coords.longitude);
    };

    const errorCallback = (err: GeolocationPositionError) => {
      setLoadingGPS(false);
      console.error(`Geolocation error (Code ${err.code}): ${err.message}`);
      
      if (err.code === 1) { // PERMISSION_DENIED
        setPermissionError({
          title: "Acesso ao GPS Negado",
          message: "Sem a autorização o sistema ficará instável.",
          icon: 'gps'
        });
      } else if (!isAuto) {
        alert(`Erro ao obter localização: ${err.message || 'Erro desconhecido'} (Código: ${err.code})`);
      }
    };

    const options = {
      enableHighAccuracy: true,
      timeout: 15000, 
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
  }, []);

  // Automatically get location when form is shown
  React.useEffect(() => {
    // REMOVED automatic geolocation request on mount to avoid Permission Policy errors in iframes
    // and to respect user gesture requirements.
    /*
    let timer: NodeJS.Timeout;
    if (activeTab === 'add' && user && !formData.lat && !loadingGPS) {
      timer = setTimeout(() => {
        console.log("Triggering auto-geolocation...");
        getGeolocation(true);
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
    */
  }, [activeTab, user, formData.lat, getGeolocation, loadingGPS]);

  // Fetch users for admin
  React.useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    });
    return () => unsubscribe();
  }, [isAdmin]);

  // Fetch routes
  React.useEffect(() => {
    const q = query(collection(db, 'recyclingRoutes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRoutes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    });
    return () => unsubscribe();
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initial permission requests on mount
  React.useEffect(() => {
    // REMOVED automatic permission requests to avoid "Permissions Policy" errors in nested iframes.
    // Permissions should strictly be requested upon user interaction (button click).
    /*
    const requestPermissions = async () => {
      // 1. Ask for Location after a small delay
      setTimeout(() => {
        if (navigator.geolocation) {
          getGeolocation(true);
        }
      }, 500);

      // 2. Ask for Camera after another delay
      setTimeout(async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(track => track.stop());
          console.log("Camera permission check successful");
        } catch (e) {
          console.log("Camera permission denied or not available:", e);
        }
      }, 1500);
    };

    if (activeTab === 'add') {
      requestPermissions();
    }
    */
  }, [activeTab, getGeolocation]);

  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const startCamera = async () => {
    setCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera access denied:", err);
      setCapturing(false);
      // Check if permission was denied
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError({
          title: "Acesso à Câmera Negado",
          message: "Sem a autorização o sistema ficará instável.",
          icon: 'camera'
        });
      } else {
        alert("Não foi possível acessar a câmera.");
      }
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.7);
        setCapturedImage(dataUrl);
        
        // Stop camera stream
        const stream = videoRef.current.srcObject as MediaStream | null;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        setCapturing(false);
      }
    }
  };

  if (!user) return null;

  const handleSearchCEP = async (type: 'point' | 'route' | 'user') => {
    const cep = type === 'point' ? formData.cep : (type === 'route' ? routeFormData.cep : userFormData.cep);
    if (cep.replace(/\D/g, '').length !== 8) return;
    
    setLoadingCEP(true);
    try {
      const address = await fetchAddressByCEP(cep);
      if (address) {
        if (type === 'point') {
          setFormData(prev => ({
            ...prev,
            state: address.state,
            city: address.city,
            neighborhood: address.neighborhood || prev.neighborhood,
            address: address.street ? `${address.street}, ` : prev.address,
            lat: address.location?.coordinates.latitude || prev.lat,
            lng: address.location?.coordinates.longitude || prev.lng
          }));
        } else if (type === 'route') {
          setRouteFormData(prev => ({
            ...prev,
            state: address.state,
            city: address.city,
            neighborhood: address.neighborhood || prev.neighborhood,
            street: address.street || prev.street
          }));
        } else {
          setUserFormData(prev => ({
            ...prev,
            state: address.state,
            city: address.city,
            neighborhood: address.neighborhood || prev.neighborhood,
            street: address.street || prev.street
          }));
        }
      } else {
        alert("CEP não encontrado.");
      }
    } catch (error) {
      console.error("Error searching CEP:", error);
    } finally {
      setLoadingCEP(false);
    }
  };

  const handleAddPoint = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const collectionName = 'collectionPoints';
    try {
      const data = {
        ...formData,
        lat: parseFloat(formData.lat),
        lng: parseFloat(formData.lng),
        acceptedItems: formData.acceptedItems.split(',').map(i => i.trim()),
        imageUrl: capturedImage || ''
      };

      if (isEditing && editingPointId) {
        await updateDoc(doc(db, collectionName, editingPointId), {
          ...data,
          updatedAt: serverTimestamp()
        });
        setSuccess(true);
        cancelEditing();
      } else {
        const isAdminStatus = profile?.role === 'admin';
        await addDoc(collection(db, collectionName), {
          ...data,
          createdBy: user.uid,
          createdByName: user.displayName || profile?.firstName,
          createdAt: serverTimestamp(),
          status: isAdminStatus ? 'active' : 'pending'
        });
        setSuccess(true);
        setFormData({
          name: '', cep: '', address: '', lat: '', lng: '', state: '', city: '', neighborhood: '', type: 'PEV', acceptedItems: '', description: ''
        });
        setCapturedImage(null);
      }
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, isEditing ? OperationType.UPDATE : OperationType.CREATE, isEditing ? `${collectionName}/${editingPointId}` : collectionName);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (point: CollectionPoint) => {
    setIsEditing(true);
    setEditingPointId(point.id);
    setFormData({
      name: point.name,
      cep: point.cep || '',
      address: point.address,
      lat: point.lat.toString(),
      lng: point.lng.toString(),
      state: point.state,
      city: point.city,
      neighborhood: point.neighborhood,
      type: point.type,
      acceptedItems: point.acceptedItems.join(', '),
      description: point.description
    });
    setCapturedImage(point.imageUrl || null);
    setActiveTab('add');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditingPointId(null);
    setFormData({
      name: '', cep: '', address: '', lat: '', lng: '', state: '', city: '', neighborhood: '', type: 'PEV', acceptedItems: '', description: ''
    });
    setCapturedImage(null);
  };

  const handleDeletePoint = (pointId: string, pointName: string) => {
    setDeleteConfirm({ show: true, id: pointId, name: pointName, type: 'point' });
  };

  const handleDeleteUser = (userId: string, userEmail: string | null) => {
    if (userId === user?.uid) {
      alert("Você não pode excluir sua própria conta aqui.");
      return;
    }
    setDeleteConfirm({ show: true, id: userId, name: userEmail || userId, type: 'user' });
  };

  const confirmDelete = async () => {
    const { id, type } = deleteConfirm;
    const collectionName = type === 'point' ? 'collectionPoints' : (type === 'user' ? 'users' : 'recyclingRoutes');
    setLoading(true);
    try {
      await deleteDoc(doc(db, collectionName, id));
      setDeleteConfirm(prev => ({ ...prev, show: false }));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const collectionName = 'users';
    try {
      const emailId = userFormData.email.toLowerCase().trim();
      
      if (isEditingUser && editingUserId) {
        await updateDoc(doc(db, collectionName, editingUserId), {
          ...userFormData,
          updatedAt: serverTimestamp(),
        });
        setSuccess(true);
        cancelEditingUser();
      } else {
        // Check if email already exists (as ID or in field)
        const emailDoc = await getDoc(doc(db, collectionName, emailId));
        if (emailDoc.exists()) {
          alert("Este e-mail já está cadastrado.");
          setLoading(false);
          return;
        }

        const q = query(collection(db, collectionName), where('email', '==', emailId));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          alert("Este e-mail já está cadastrado.");
          setLoading(false);
          return;
        }

        await setDoc(doc(db, collectionName, emailId), {
          ...userFormData,
          email: emailId,
          createdAt: serverTimestamp(),
        });
        setSuccess(true);
        cancelEditingUser();
      }
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, isEditingUser ? OperationType.UPDATE : OperationType.CREATE, isEditingUser ? `${collectionName}/${editingUserId}` : `${collectionName}/${userFormData.email.toLowerCase().trim()}`);
    } finally {
      setLoading(false);
    }
  };

  const startEditingUser = (u: UserProfile & { id: string }) => {
    setIsEditingUser(true);
    setEditingUserId(u.id);
    setUserFormData({
      email: u.email || '',
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      role: u.role || 'user',
      state: u.state || '',
      city: u.city || '',
      neighborhood: u.neighborhood || '',
      street: u.street || '',
      number: u.number || '',
      complement: u.complement || '',
      cep: u.cep || ''
    });
    setShowUserForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditingUser = () => {
    setIsEditingUser(false);
    setEditingUserId(null);
    setShowUserForm(false);
    setUserFormData({ email: '', firstName: '', lastName: '', role: 'user', state: '', city: '', neighborhood: '', street: '', number: '', complement: '', cep: '' });
  };

  const handleApprovePoint = async (pointId: string) => {
    const collectionName = 'collectionPoints';
    try {
      await updateDoc(doc(db, collectionName, pointId), {
        status: 'active'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${pointId}`);
    }
  };

  const handleRejectPoint = async (pointId: string) => {
    if (!window.confirm("Deseja rejeitar/desativar este ponto de coleta?")) return;
    const collectionName = 'collectionPoints';
    try {
      await updateDoc(doc(db, collectionName, pointId), {
        status: 'rejected',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${pointId}`);
    }
  };

  const handleTogglePointStatus = async (pointId: string, newStatus: 'active' | 'rejected') => {
    const collectionName = 'collectionPoints';
    try {
      await updateDoc(doc(db, collectionName, pointId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${pointId}`);
    }
  };

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeFormData.days.length) {
      alert("Selecione pelo menos um dia da semana.");
      return;
    }
    setLoading(true);
    const collectionName = 'recyclingRoutes';
    try {
      if (isEditingRoute && editingRouteId) {
        await updateDoc(doc(db, collectionName, editingRouteId), {
          ...routeFormData,
          updatedAt: serverTimestamp()
        });
        setSuccess(true);
        cancelEditingRoute();
      } else {
        await addDoc(collection(db, collectionName), {
          ...routeFormData,
          createdBy: user?.uid,
          createdByName: user?.displayName || profile?.firstName || 'Anônimo',
          createdAt: serverTimestamp()
        });
        setSuccess(true);
        cancelEditingRoute();
      }
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, isEditingRoute ? OperationType.UPDATE : OperationType.CREATE, isEditingRoute ? `${collectionName}/${editingRouteId}` : collectionName);
    } finally {
      setLoading(false);
    }
  };

  const startEditingRoute = (r: RecyclingRoute) => {
    setIsEditingRoute(true);
    setEditingRouteId(r.id!);
    setRouteFormData({
      cep: r.cep || '',
      state: r.state,
      city: r.city,
      neighborhood: r.neighborhood,
      street: r.street || '',
      days: r.days,
      period: r.period
    });
    setShowRouteForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditingRoute = () => {
    setIsEditingRoute(false);
    setEditingRouteId(null);
    setShowRouteForm(false);
    setRouteFormData({ cep: '', state: '', city: '', neighborhood: '', street: '', days: [], period: 'manhã' });
  };

  const handleDeleteRoute = (routeId: string, routeName: string) => {
    setDeleteConfirm({ show: true, id: routeId, name: routeName, type: 'route' as any });
  };

  const toggleDay = (day: string) => {
    setRouteFormData(prev => ({
      ...prev,
      days: prev.days.includes(day) 
        ? prev.days.filter(d => d !== day) 
        : [...prev.days, day]
    }));
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason.trim()) return;
    setLoading(true);
    const collectionName = 'reports';
    try {
      await addDoc(collection(db, collectionName), {
        pointId: reportModal.pointId,
        pointName: reportModal.pointName,
        reportedBy: user?.uid,
        reportedByName: user?.displayName || profile?.firstName || 'Anônimo',
        reason: reportReason,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setReportModal({ show: false, pointId: '', pointName: '' });
      setReportReason('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, collectionName);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="px-4 py-20 bg-neutral-50 border-y border-neutral-200 relative">
      <AnimatePresence>
        {deleteConfirm.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setDeleteConfirm(prev => ({ ...prev, show: false }))}
                className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <XCircle size={20} />
              </button>
              
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6">
                <Trash2 size={32} />
              </div>
              
              <h3 className="text-xl font-bold mb-2">Confirmar Exclusão</h3>
              <p className="text-neutral-500 text-sm mb-8 leading-relaxed">
                Tem certeza que deseja excluir {deleteConfirm.type === 'point' ? 'o ponto' : 'o usuário'} <span className="font-bold text-neutral-900 block mt-1">"{deleteConfirm.name}"?</span>
                {deleteConfirm.type === 'user' && <span className="mt-2 block text-xs italic">Os pontos criados por este usuário não serão removidos.</span>}
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirm(prev => ({ ...prev, show: false }))}
                  className="flex-1 px-4 py-3 bg-neutral-100 text-neutral-600 rounded-xl font-bold hover:bg-neutral-200 transition-all text-sm"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all text-sm disabled:opacity-50"
                >
                  {loading ? "Processando..." : "Confirmar"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {reportModal.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setReportModal({ show: false, pointId: '', pointName: '' })}
                className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <XCircle size={20} />
              </button>
              
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
                <Flag size={32} />
              </div>
              
              <h3 className="text-xl font-bold mb-2">Denunciar Ponto</h3>
              <p className="text-neutral-500 text-sm mb-4 leading-relaxed">
                Você esta denunciando o ponto: <span className="font-bold text-neutral-900">"{reportModal.pointName}"</span>
              </p>

              <form onSubmit={handleReport} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Motivo da Denúncia</label>
                  <textarea 
                    required
                    value={reportReason}
                    onChange={e => setReportReason(e.target.value)}
                    className="w-full p-3 rounded-xl bg-neutral-50 border border-neutral-100 outline-none focus:ring-2 focus:ring-amber-500 text-sm min-h-[100px]"
                    placeholder="Descreva o motivo desta denúncia (ex: local inexistente, informações falsas...)"
                  />
                </div>
                
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setReportModal({ show: false, pointId: '', pointName: '' })}
                    className="flex-1 px-4 py-3 bg-neutral-100 text-neutral-600 rounded-xl font-bold hover:bg-neutral-200 transition-all text-sm"
                  >
                    Voltar
                  </button>
                  <button 
                    type="submit"
                    disabled={loading || !reportReason.trim()}
                    className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-all text-sm disabled:opacity-50"
                  >
                    {loading ? "Enviando..." : "Enviar"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed bottom-10 left-1/2 z-[100] bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold whitespace-nowrap"
          >
            <CheckCircle2 size={20} />
            {profile?.role === 'admin' ? 'Ponto cadastrado!' : 'Ponto enviado para validação!'}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-600 rounded-2xl text-white">
                  {activeTab === 'audit' ? <History size={24} /> : (activeTab === 'users' ? <Users size={24} /> : (activeTab === 'routes' ? <Truck size={24} /> : (isEditing ? <Edit size={24} /> : <Plus size={24} />)))}
                </div>
                <div>
                  <h2 className="text-3xl font-bold">
                    {activeTab === 'users' ? 'Gestão de Usuários' : (activeTab === 'routes' ? 'Gestão de Rotas' : (isEditing ? 'Editar Ponto' : 'Gerenciamento'))}
                  </h2>
                  <p className="text-neutral-500">
                    {activeTab === 'users' ? 'Gerencie permissões e usuários do sistema.' : (activeTab === 'routes' ? 'Gerencie o cronograma de coleta por bairro.' : (isEditing ? `Modificando: ${formData.name}` : `Área restrita para ${profile?.role === 'admin' ? 'Administradores' : 'Moderadores'}.`))}
                  </p>
                </div>
              </div>
          
          <button 
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-red-100"
          >
            <LogOut size={16} /> Encerrar Sessão
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex gap-2 bg-neutral-200/50 p-1 rounded-xl w-fit">
            {canAudit && (
              <button 
                onClick={() => { setActiveTab('audit'); cancelEditing(); }}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'audit' ? 'bg-white shadow-sm' : 'text-neutral-500'}`}
              >
                Auditoria de Pontos
              </button>
            )}
            {isAdmin && (
              <button 
                onClick={() => { setActiveTab('users'); cancelEditing(); }}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-white shadow-sm' : 'text-neutral-500'}`}
              >
                Usuários
              </button>
            )}
            {canManageRoutes && (
              <button 
                onClick={() => { setActiveTab('routes'); cancelEditing(); cancelEditingUser(); }}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'routes' ? 'bg-white shadow-sm' : 'text-neutral-500'}`}
              >
                Rotas de Coleta
              </button>
            )}
            <button 
              onClick={() => { setActiveTab('add'); cancelEditing(); }}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'add' ? 'bg-white shadow-sm' : 'text-neutral-500'}`}
            >
              {isEditing ? 'Editando Ponto' : 'Novo Ponto'}
            </button>
          </div>

          {isEditing && (
            <button 
              onClick={cancelEditing}
              className="px-6 py-2 bg-neutral-200 text-neutral-600 rounded-xl text-sm font-bold hover:bg-neutral-300 transition-all"
            >
              Cancelar Edição
            </button>
          )}
        </div>

        {activeTab === 'add' ? (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100 max-w-2xl">
            <form onSubmit={handleAddPoint} className="space-y-6">
              {/* Photo Capture Section */}
              <div className="space-y-4">
                <label className="block text-xs font-bold text-neutral-400 uppercase">Foto do Local</label>
                {!capturing && !capturedImage && (
                  <button 
                    type="button" 
                    onClick={startCamera}
                    className="w-full aspect-video rounded-3xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-2 text-neutral-400 hover:text-emerald-600 hover:border-emerald-600 transition-all"
                  >
                    <Camera size={32} />
                    <span className="font-bold">Abrir Câmera</span>
                  </button>
                )}
                {capturing && (
                  <div className="relative aspect-video rounded-3xl overflow-hidden bg-black">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <button 
                      type="button" 
                      onClick={capturePhoto}
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-emerald-600 text-white rounded-full font-bold shadow-lg"
                    >
                      Capturar Foto
                    </button>
                  </div>
                )}
                {capturedImage && (
                  <div className="relative aspect-video rounded-3xl overflow-hidden group">
                    <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                    <button 
                      type="button" 
                      onClick={() => setCapturedImage(null)}
                      className="absolute top-4 right-4 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-full">
                  <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Nome do Ponto</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 rounded-xl bg-neutral-50 border border-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Ex: Ecoponto Central" />
                </div>

                <div className="col-span-full">
                  <label className="block text-xs font-bold text-neutral-400 uppercase mb-1 flex items-center justify-between">
                    <span>CEP</span>
                    {loadingCEP && <Loader2 size={12} className="animate-spin text-emerald-600" />}
                  </label>
                  <div className="flex gap-2">
                    <input 
                      value={formData.cep} 
                      onChange={e => setFormData({...formData, cep: e.target.value})} 
                      onBlur={() => handleSearchCEP('point')}
                      className="flex-1 p-3 rounded-xl bg-neutral-50 border border-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500" 
                      placeholder="00000-000" 
                    />
                    <button 
                      type="button"
                      onClick={() => handleSearchCEP('point')}
                      className="p-3 bg-emerald-100 text-emerald-600 rounded-xl hover:bg-emerald-200 transition-colors"
                    >
                      <Search size={20} />
                    </button>
                  </div>
                </div>
                
                <div className="col-span-full">
                  <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Endereço Completo</label>
                  <input required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full p-3 rounded-xl bg-neutral-50 border border-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Rua, Número, Bairro" />
                </div>
                
                <div className="col-span-full space-y-2">
                  <label className="block text-xs font-bold text-neutral-400 uppercase mb-1 flex items-center justify-between">
                    <span>Localização (GPS)</span>
                    {loadingGPS && <span className="text-emerald-600 animate-pulse normal-case font-medium">Buscando coordenadas...</span>}
                  </label>
                  <div className="flex gap-2">
                    <input required type="number" step="any" value={formData.lat} onChange={e => setFormData({...formData, lat: e.target.value})} className="flex-1 p-3 rounded-xl bg-neutral-50 border border-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Latitude" />
                    <input required type="number" step="any" value={formData.lng} onChange={e => setFormData({...formData, lng: e.target.value})} className="flex-1 p-3 rounded-xl bg-neutral-50 border border-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Longitude" />
                    <button 
                      type="button" 
                      onClick={getGeolocation}
                      disabled={loadingGPS}
                      className={`p-3 rounded-xl transition-colors ${loadingGPS ? 'bg-neutral-100 text-neutral-400' : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'}`}
                      title="Obter GPS Atual"
                    >
                      <MapPinIcon size={20} className={loadingGPS ? 'animate-bounce' : ''} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Estado</label>
                  <input required value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} className="w-full p-3 rounded-xl bg-neutral-50 border border-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Cidade</label>
                  <input required value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full p-3 rounded-xl bg-neutral-50 border border-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="col-span-full">
                  <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Bairro</label>
                  <input required value={formData.neighborhood} onChange={e => setFormData({...formData, neighborhood: e.target.value})} className="w-full p-3 rounded-xl bg-neutral-50 border border-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="col-span-full">
                  <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Itens (separados por vírgula)</label>
                  <input value={formData.acceptedItems} onChange={e => setFormData({...formData, acceptedItems: e.target.value})} className="w-full p-3 rounded-xl bg-neutral-50 border border-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Plástico, Vidro, Papel" />
                </div>
                <div className="col-span-full">
                  <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Descrição</label>
                  <textarea 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    className="w-full p-3 rounded-xl bg-neutral-50 border border-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500 min-h-[80px]" 
                    placeholder="Informações adicionais sobre o ponto..."
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
              >
                {loading ? "Processando..." : (success ? <><CheckCircle2 /> Sucesso!</> : (isEditing ? "Atualizar Ponto" : "Cadastrar Ponto"))}
              </button>
            </form>
          </div>
        ) : activeTab === 'routes' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xl font-bold">Rotas Cadastradas</h3>
              <button 
                onClick={() => isEditingRoute ? cancelEditingRoute() : setShowRouteForm(!showRouteForm)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all"
              >
                <Plus size={16} /> {showRouteForm || isEditingRoute ? "Cancelar" : "Nova Rota"}
              </button>
            </div>

            {showRouteForm && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm overflow-hidden"
              >
                <form onSubmit={handleAddRoute} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="md:col-span-full">
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1 flex items-center justify-between">
                      <span>Buscar por CEP</span>
                      {loadingCEP && <Loader2 size={10} className="animate-spin text-emerald-600" />}
                    </label>
                    <div className="flex gap-2">
                      <input 
                        value={routeFormData.cep} 
                        onChange={e => setRouteFormData({...routeFormData, cep: e.target.value})} 
                        onBlur={() => handleSearchCEP('route')}
                        className="flex-1 p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500 text-sm" 
                        placeholder="00000-000" 
                      />
                      <button 
                        type="button"
                        onClick={() => handleSearchCEP('route')}
                        className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl hover:bg-emerald-200 transition-colors"
                      >
                        <Search size={18} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Estado</label>
                    <input required value={routeFormData.state} onChange={e => setRouteFormData({...routeFormData, state: e.target.value})} className="w-full p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500 text-sm" placeholder="Ex: SP" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Município</label>
                    <input required value={routeFormData.city} onChange={e => setRouteFormData({...routeFormData, city: e.target.value})} className="w-full p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500 text-sm" placeholder="Ex: São Paulo" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Bairro</label>
                    <input required value={routeFormData.neighborhood} onChange={e => setRouteFormData({...routeFormData, neighborhood: e.target.value})} className="w-full p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500 text-sm" placeholder="Ex: Jardim Paulista" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Logradouro / Observação de Endereço</label>
                    <input value={routeFormData.street} onChange={e => setRouteFormData({...routeFormData, street: e.target.value})} className="w-full p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500 text-sm" placeholder="Ex: Toda a extensão da Rua Principal" />
                  </div>
                  
                  <div className="md:col-span-2 lg:col-span-1">
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-2">Período</label>
                    <div className="flex gap-2">
                      {(['manhã', 'tarde', 'noite'] as const).map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setRouteFormData({...routeFormData, period: p})}
                          className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${routeFormData.period === p ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-neutral-100 text-neutral-500 hover:bg-neutral-50'}`}
                        >
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-2">Dias da Semana</label>
                    <div className="flex flex-wrap gap-2">
                      {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map(day => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`py-2 px-3 rounded-xl border text-[10px] font-bold uppercase transition-all ${routeFormData.days.includes(day) ? 'bg-emerald-100 border-emerald-600 text-emerald-700' : 'border-neutral-100 text-neutral-400 hover:bg-neutral-50'}`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-full flex justify-end">
                    <button 
                      type="submit" 
                      disabled={loading}
                      className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all"
                    >
                      {loading ? "Processando..." : (isEditingRoute ? "Atualizar Rota" : "Salvar Rota")}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            <div className="bg-white rounded-3xl overflow-hidden border border-neutral-100 shadow-sm overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-neutral-50 text-neutral-400 text-[10px] uppercase tracking-widest">
                    <th className="px-6 py-4">Bairro / Local</th>
                    <th className="px-6 py-4">Endereço</th>
                    <th className="px-6 py-4">Cidade - Estado</th>
                    <th className="px-6 py-4">Dias</th>
                    <th className="px-6 py-4">Período</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {routes.map(r => (
                    <tr key={r.id} className="text-sm">
                      <td className="px-6 py-4">
                        <div className="font-bold">{r.neighborhood}</div>
                      </td>
                      <td className="px-6 py-4 text-xs text-neutral-500">
                        {r.street || '-'}
                      </td>
                      <td className="px-6 py-4 text-neutral-500">
                        {r.city} - {r.state}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {r.days.map(d => (
                            <span key={d} className="px-1.5 py-0.5 bg-neutral-100 text-neutral-600 rounded text-[10px] font-medium">
                              {d.slice(0, 3)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          r.period === 'manhã' ? 'bg-amber-100 text-amber-700' :
                          r.period === 'tarde' ? 'bg-orange-100 text-orange-700' :
                          'bg-indigo-100 text-indigo-700'
                        }`}>
                          {r.period}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => startEditingRoute(r)}
                            className="p-2 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Editar Rota"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteRoute(r.id!, r.neighborhood)}
                            className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir Rota"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {routes.length === 0 && (
                <div className="p-20 text-center text-neutral-400">
                  Nenhuma rota cadastrada.
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'users' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xl font-bold">Base de Usuários</h3>
              <button 
                onClick={() => isEditingUser ? cancelEditingUser() : setShowUserForm(!showUserForm)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all"
              >
                <Plus size={16} /> {showUserForm || isEditingUser ? "Cancelar" : "Novo Usuário"}
              </button>
            </div>

            {showUserForm && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm overflow-hidden"
              >
                <form onSubmit={handleAddUser} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                       <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">E-mail</label>
                       <input required type="email" value={userFormData.email} onChange={e => setUserFormData({...userFormData, email: e.target.value})} className="w-full p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Nome</label>
                      <input required value={userFormData.firstName} onChange={e => setUserFormData({...userFormData, firstName: e.target.value})} className="w-full p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Sobrenome</label>
                      <input required value={userFormData.lastName} onChange={e => setUserFormData({...userFormData, lastName: e.target.value})} className="w-full p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1 flex items-center justify-between">
                        <span>CEP</span>
                        {loadingCEP && <Loader2 size={10} className="animate-spin text-emerald-600" />}
                      </label>
                      <div className="flex gap-2">
                        <input 
                          required
                          value={userFormData.cep} 
                          onChange={e => setUserFormData({...userFormData, cep: e.target.value})} 
                          onBlur={() => handleSearchCEP('user')}
                          className="flex-1 p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500 text-sm" 
                          placeholder="00000-000" 
                        />
                        <button 
                          type="button"
                          onClick={() => handleSearchCEP('user')}
                          className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl hover:bg-emerald-200 transition-colors"
                        >
                          <Search size={18} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Estado</label>
                      <input required value={userFormData.state} onChange={e => setUserFormData({...userFormData, state: e.target.value})} className="w-full p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Cidade</label>
                      <input required value={userFormData.city} onChange={e => setUserFormData({...userFormData, city: e.target.value})} className="w-full p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Bairro</label>
                      <input required value={userFormData.neighborhood} onChange={e => setUserFormData({...userFormData, neighborhood: e.target.value})} className="w-full p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Logradouro</label>
                      <input required value={userFormData.street} onChange={e => setUserFormData({...userFormData, street: e.target.value})} className="w-full p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Número</label>
                      <input required value={userFormData.number} onChange={e => setUserFormData({...userFormData, number: e.target.value})} className="w-full p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Papel</label>
                      <select value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value as any})} className="w-full p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500 text-sm">
                        <option value="user">Usuário Comum</option>
                        <option value="moderator">Moderador</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                  </div>

                  <div>
                     <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Complemento</label>
                     <input value={userFormData.complement} onChange={e => setUserFormData({...userFormData, complement: e.target.value})} className="w-full p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                  </div>

                  <div className="flex justify-end pt-4">
                    <button 
                      type="submit" 
                      disabled={loading}
                      className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all"
                    >
                      {loading ? "Processando..." : (isEditingUser ? "Atualizar Perfil" : "Salvar Perfil")}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            <div className="bg-white rounded-3xl overflow-hidden border border-neutral-100 shadow-sm overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-neutral-50 text-neutral-400 text-[10px] uppercase tracking-widest">
                    <th className="px-6 py-4">Usuário</th>
                    <th className="px-6 py-4">Papel</th>
                    <th className="px-6 py-4">Localização</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {users.map(u => (
                  <tr key={u.id} className="text-sm">
                    <td className="px-6 py-4">
                      <div className="font-bold">{u.firstName} {u.lastName}</div>
                      <div className="text-xs text-neutral-400">{u.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                        u.role === 'moderator' ? 'bg-blue-100 text-blue-700' : 
                        'bg-neutral-100 text-neutral-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-neutral-500">
                      {u.city ? `${u.city} - ${u.state}` : 'Não informado'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => startEditingUser(u)}
                          className="p-2 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Editar Usuário"
                        >
                          <Edit size={16} />
                        </button>
                        {u.id !== user?.uid && (
                          <button 
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100 text-xs font-bold"
                            title="Excluir Usuário"
                          >
                            <Trash2 size={14} />
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        ) : (
          <div className="bg-white rounded-3xl overflow-hidden border border-neutral-100 shadow-sm overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                  <tr className="bg-neutral-50 text-neutral-400 text-[10px] uppercase tracking-widest">
                    <th className="px-6 py-4">Ponto</th>
                    <th className="px-6 py-4">Endereço</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Localização</th>
                    <th className="px-6 py-4">Incluído por</th>
                    <th className="px-6 py-4">Data</th>
                    {(isAdmin || canAudit) && <th className="px-6 py-4 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {points.sort((a, b) => {
                    if (a.status === 'pending' && b.status !== 'pending') return -1;
                    if (a.status !== 'pending' && b.status === 'pending') return 1;
                    return 0;
                  }).map(p => {
                    const isOwner = p.createdBy === user?.uid;
                    const isMock = !p.createdBy;
                    return (
                    <tr key={p.id} className={`text-sm ${p.status === 'pending' ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="font-bold">{p.name}</div>
                        {p.imageUrl && <div className="text-[10px] text-emerald-600 font-bold mt-1">✓ Possui Foto</div>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-neutral-500 max-w-[150px] truncate" title={p.address}>
                          {p.address}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          p.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 
                          p.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {p.status || 'active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-neutral-500">{p.city} - {p.state}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <UserIcon size={14} className="text-neutral-400" />
                          <span className="text-xs font-medium">{p.createdByName || 'Sistema'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-neutral-400">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} />
                          <span className="text-xs">{p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </td>
                      {(isAdmin || isOwner) && !isMock && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isAdmin && p.status === 'pending' && (
                              <>
                                <button 
                                  onClick={() => handleApprovePoint(p.id)}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-100"
                                  title="Aprovar Ponto"
                                >
                                  <ShieldCheck size={16} />
                                </button>
                                <button 
                                  onClick={() => handleRejectPoint(p.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
                                  title="Rejeitar Ponto"
                                >
                                  <XCircle size={16} />
                                </button>
                              </>
                            )}
                            {isAdmin && p.status === 'active' && (
                              <button 
                                onClick={() => handleTogglePointStatus(p.id, 'rejected')}
                                className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-amber-100"
                                title="Desativar Ponto"
                              >
                                <XCircle size={16} />
                              </button>
                            )}
                            {isAdmin && p.status === 'rejected' && (
                              <button 
                                onClick={() => handleTogglePointStatus(p.id, 'active')}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-100"
                                title="Ativar Ponto"
                              >
                                <ShieldCheck size={16} />
                              </button>
                            )}
                          <button 
                            onClick={() => startEditing(p)}
                            className="p-2 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Editar Ponto"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => setReportModal({ show: true, pointId: p.id, pointName: p.name })}
                            className="p-2 text-neutral-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Denunciar Ponto"
                          >
                            <Flag size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeletePoint(p.id, p.name)}
                            className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir Definitivamente"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                    {isMock && <td className="px-6 py-4 text-right text-neutral-300 italic text-[10px]">Ponto Fixo</td>}
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Permission Alert Modal */}
      <AnimatePresence>
        {permissionError && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-sm w-full border-2 border-red-500"
            >
              <div className="bg-red-500 p-6 text-white text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  {permissionError.icon === 'gps' ? <MapPinIcon size={32} /> : <Camera size={32} />}
                </div>
                <h3 className="text-xl font-bold">{permissionError.title}</h3>
              </div>
              <div className="p-8 text-center">
                <p className="text-neutral-600 mb-2 font-bold">
                  {permissionError.message}
                </p>
                <p className="text-xs text-neutral-400 mb-8 leading-relaxed">
                  Para autorizar, clique no botão abaixo. Caso o bloqueio persista, clique no ícone de <strong>cadeado</strong> na barra de endereços e altere a permissão. Você também pode tentar abrir o App em uma nova aba.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      const type = permissionError.icon;
                      setPermissionError(null);
                      if (type === 'gps') getGeolocation();
                      else startCamera();
                    }}
                    className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                  >
                    {permissionError.icon === 'gps' ? <MapPinIcon size={18} /> : <Camera size={18} />}
                    Autorizar Acesso
                  </button>
                  <button
                    onClick={() => setPermissionError(null)}
                    className="w-full bg-neutral-100 text-neutral-600 font-bold py-3 rounded-2xl hover:bg-neutral-200 transition-colors text-sm"
                  >
                    Agora não
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
