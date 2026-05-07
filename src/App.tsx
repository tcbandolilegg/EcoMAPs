/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import MapComponent from './components/MapComponent';
import ScheduleCard from './components/ScheduleCard';
import RecyclingTipsSection from './components/RecyclingTips';
import PointDetailsModal from './components/PointDetailsModal';
import PointCard from './components/PointCard';
import Management from './components/Management';
import { MOCK_POINTS, MOCK_SCHEDULES } from './data/mockData';
import { Search, MapPin, Leaf, ArrowRight, Recycle, Filter, Loader2, Facebook, Instagram, Globe, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CollectionPoint, Language, RecyclingRoute } from './types';
import { TRANSLATIONS } from './translations';
import { fetchStates, fetchCitiesByState, IBGEState, IBGECity } from './services/locationService';
import { useAuth } from './contexts/AuthContext';
import { db, collection, onSnapshot, query, orderBy, where, handleFirestoreError, OperationType } from './lib/firebase';

export default function App() {
  const { user, profile } = useAuth();
  const [lang, setLang] = useState<Language>('pt-BR');
  const [searchTerm, setSearchTerm] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [permissionError, setPermissionError] = useState<{title: string, message: string} | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<CollectionPoint | null>(null);
  const [firestorePoints, setFirestorePoints] = useState<CollectionPoint[]>([]);
  const [firestoreRoutes, setFirestoreRoutes] = useState<RecyclingRoute[]>([]);

  // IBGE Data
  const [allStates, setAllStates] = useState<IBGEState[]>([]);
  const [citiesInState, setCitiesInState] = useState<IBGECity[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  // Filters
  const [filterState, setFilterState] = useState('All');
  const [filterCity, setFilterCity] = useState('All');
  const [filterNeighborhood, setFilterNeighborhood] = useState('All');

  const t = TRANSLATIONS[lang];

  // Fetch Firestore Points
  useEffect(() => {
    if (user === undefined) return; // Wait for initial auth state

    let q;
    const isMasterAdmin = user?.email?.toLowerCase() === 'tcbandolilegg@gmail.com';
    const canSeeAll = isMasterAdmin || profile?.role === 'admin' || profile?.role === 'moderator';

    if (canSeeAll) {
      // Admins/Moderators can see everything
      q = query(
        collection(db, 'collectionPoints'),
        orderBy('createdAt', 'desc')
      );
    } else {
      // Regular users only see 'active' points. 
      // Important: This matches the Firestore rule 'allow list: if (resource.data.status == "active")'
      q = query(
        collection(db, 'collectionPoints'), 
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CollectionPoint));
      console.log(`Loaded ${data.length} points from Firestore`);
      setFirestorePoints(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'collectionPoints');
    });
    return () => unsubscribe();
  }, [user, profile]);

  // Fetch Firestore Routes
  useEffect(() => {
    const q = query(collection(db, 'recyclingRoutes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFirestoreRoutes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecyclingRoute)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'recyclingRoutes');
    });
    return () => unsubscribe();
  }, []);

  const allPoints = useMemo(() => {
    const raw = [...MOCK_POINTS, ...firestorePoints];
    const isMasterAdmin = user?.email?.toLowerCase() === 'tcbandolilegg@gmail.com';
    // Regular users only see 'active' points or their own points. Admins see everything.
    if (isMasterAdmin || profile?.role === 'admin') return raw;
    return raw.filter(p => !p.status || p.status === 'active' || p.createdBy === user?.uid);
  }, [firestorePoints, profile, user]);

  // Fetch States on mount
  useEffect(() => {
    fetchStates().then(setAllStates);
  }, []);

  // Fetch Cities when state changes
  useEffect(() => {
    if (filterState !== 'All') {
      const state = allStates.find(s => s.nome === filterState);
      if (state) {
        setLoadingCities(true);
        fetchCitiesByState(state.sigla).then(cities => {
          setCitiesInState(cities);
          setLoadingCities(false);
        });
      }
    } else {
      setCitiesInState([]);
    }
  }, [filterState, allStates]);

  const neighborhoods = useMemo(() => {
    // Collect neighborhoods from points
    const pointsNeighborhoods = (filterCity === 'All' ? allPoints : allPoints.filter(p => p.city === filterCity))
      .map(p => p.neighborhood.trim())
      .filter(n => n !== '');
    
    // Collect neighborhoods from routes
    const routesInLocale = firestoreRoutes.filter(r => 
      (filterState === 'All' || r.state === filterState) && 
      (filterCity === 'All' || r.city === filterCity)
    );
    const routesNeighborhoods = routesInLocale
      .map(r => r.neighborhood.trim())
      .filter(n => n !== '');

    const mockRoutesInLocale = MOCK_SCHEDULES.filter(s => 
      (filterState === 'All' || s.state === filterState) && 
      (filterCity === 'All' || s.city === filterCity)
    );
    const mockNeighborhoods = mockRoutesInLocale
      .map(s => s.locality.trim())
      .filter(n => n !== '');

    const merged = Array.from(new Set([...pointsNeighborhoods, ...routesNeighborhoods, ...mockNeighborhoods]));
    return merged.sort();
  }, [filterState, filterCity, allPoints, firestoreRoutes]);

  const filteredPoints = useMemo(() => {
    return allPoints.filter(p => {
      const matchState = filterState === 'All' || p.state === filterState;
      const matchCity = filterCity === 'All' || p.city === filterCity;
      const matchNeighborhood = filterNeighborhood === 'All' || p.neighborhood === filterNeighborhood;
      return matchState && matchCity && matchNeighborhood;
    });
  }, [filterState, filterCity, filterNeighborhood, allPoints]);

  const filteredSchedules = useMemo(() => {
    const combined = [
      ...MOCK_SCHEDULES.map(s => ({ ...s, address: s.address || '' })),
      ...firestoreRoutes.map(r => ({
        id: r.id!,
        locality: r.neighborhood,
        address: r.street,
        state: r.state,
        city: r.city,
        days: r.days,
        timeRange: r.period === 'manhã' ? '07:00 - 12:00' : (r.period === 'tarde' ? '13:00 - 18:00' : '19:00 - 22:00'),
        shift: (r.period === 'manhã' ? 'Morning' : (r.period === 'tarde' ? 'Afternoon' : 'Night')) as any
      }))
    ];

    return combined.filter(s => {
      // Use searchTerm for loose matching OR filterNeighborhood for exact matching
      const matchSearch = !searchTerm || s.locality.toLowerCase().includes(searchTerm.toLowerCase());
      const matchNeighborhood = filterNeighborhood === 'All' || s.locality === filterNeighborhood;
      const matchState = filterState === 'All' || s.state === filterState;
      const matchCity = filterCity === 'All' || s.city === filterCity;
      
      return matchSearch && matchNeighborhood && matchState && matchCity;
    });
  }, [searchTerm, filterState, filterCity, filterNeighborhood, firestoreRoutes]);

  const handleGetLocation = () => {
    console.log("Requesting geolocation...");
    setLoadingLocation(true);
    
    if (!navigator.geolocation) {
      alert("Seu navegador não suporta geolocalização.");
      setLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("Location obtained:", position.coords.latitude, position.coords.longitude);
        setUserLocation([position.coords.latitude, position.coords.longitude]);
        setLoadingLocation(false);
      },
      (error) => {
        console.error("Geolocation Error:", error.code, error.message);
        setLoadingLocation(false);
        
        if (error.code === 1) { // PERMISSION_DENIED
          setPermissionError({
            title: "Acesso ao GPS Negado",
            message: "Sem a autorização o sistema ficará instável."
          });
        } else {
          let msg = "Não foi possível obter sua localização.";
          if (error.code === 2) msg = "Localização indisponível no momento.";
          else if (error.code === 3) msg = "Tempo esgotado ao tentar obter localização.";
          alert(msg);
        }
      },
      { 
        enableHighAccuracy: false, // Less accurate but faster and more likely to succeed
        timeout: 15000, // Longer timeout for the user to respond to the prompt
        maximumAge: 60000 
      }
    );
  };

  return (
    <div className="min-h-screen pb-20">
      <Header lang={lang} onLanguageChange={setLang} />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-bold mb-6"
          >
            <Leaf size={16} />
            <span>{t.tagline}</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold text-neutral-900 mb-6 tracking-tight"
          >
            {t.heroTitle.split(',')[0]}, <br />
            <span className="text-emerald-600">{t.heroTitle.split(',')[1]}</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-neutral-500 max-w-2xl mx-auto text-lg mb-10"
          >
            {t.heroSubtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button 
              onClick={handleGetLocation}
              disabled={loadingLocation}
              className="w-full sm:w-auto bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg hover:shadow-emerald-200/50 disabled:opacity-50"
            >
              {loadingLocation ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Localizando...
                </>
              ) : (
                <>
                  <MapPin size={20} />
                  {t.btnLocalize}
                </>
              )}
            </button>
            <a 
              href="#schedule"
              className="w-full sm:w-auto bg-white text-neutral-900 border border-neutral-200 px-8 py-4 rounded-2xl font-bold hover:bg-neutral-50 transition-all flex items-center justify-center gap-2"
            >
              {t.btnSchedule}
              <ArrowRight size={20} />
            </a>
          </motion.div>
        </div>
      </section>

      {/* Filters & Map Section */}
      <section id="map" className="px-4 py-20 bg-neutral-100/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6 mb-10">
            <div>
              <h2 className="text-3xl font-bold mb-2">{t.mapTitle}</h2>
              <p className="text-neutral-500">{t.mapSubtitle}</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border border-neutral-200 shadow-sm w-full lg:w-auto">
              <div className="flex items-center gap-2 text-neutral-400 px-2 py-1 border-r border-neutral-100 pr-4 mr-2">
                <Filter size={16} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Filtros</span>
              </div>
              
              <div className="flex flex-col gap-1 min-w-[120px]">
                <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-tighter">{t.filterState}</label>
                <select 
                  className="text-xs font-medium outline-none bg-transparent cursor-pointer"
                  value={filterState}
                  onChange={(e) => {
                    setFilterState(e.target.value);
                    setFilterCity('All');
                    setFilterNeighborhood('All');
                  }}
                >
                  <option key="all-states-top" value="All">{t.all}</option>
                  {allStates.map(s => <option key={`state-top-${s.id}`} value={s.nome}>{s.nome}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1 min-w-[120px] relative">
                <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-tighter">{t.filterCity}</label>
                <div className="flex items-center">
                  <select 
                    className="text-xs font-medium outline-none bg-transparent cursor-pointer w-full"
                    value={filterCity}
                    onChange={(e) => {
                      setFilterCity(e.target.value);
                      setFilterNeighborhood('All');
                    }}
                    disabled={filterState === 'All' || loadingCities}
                  >
                    <option key="all-cities-top" value="All">{t.all}</option>
                    {citiesInState.map(c => <option key={`city-top-${c.id}`} value={c.nome}>{c.nome}</option>)}
                  </select>
                  {loadingCities && <Loader2 size={10} className="animate-spin absolute right-0" />}
                </div>
              </div>

              <div className="flex flex-col gap-1 min-w-[120px]">
                <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-tighter">{t.filterNeighborhood}</label>
                <select 
                  className="text-xs font-medium outline-none bg-transparent cursor-pointer"
                  value={filterNeighborhood}
                  onChange={(e) => setFilterNeighborhood(e.target.value)}
                  disabled={filterCity === 'All' || neighborhoods.length === 0}
                >
                  <option key="all-neighborhoods" value="All">{t.all}</option>
                  {neighborhoods.map(n => <option key={`n-${n}`} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
          </div>
          
          <MapComponent 
            points={filteredPoints} 
            userLocation={userLocation} 
            onPointSelect={setSelectedPoint} 
          />

          {/* Collection Points Grid */}
          <div className="mt-12">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-1 w-8 bg-emerald-600 rounded-full"></div>
              <h3 className="text-xl font-bold">{t.pointsFound || 'Pontos de Coleta Encontrados'}</h3>
              <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full font-bold">
                {filteredPoints.length}
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredPoints.map(point => (
                <PointCard 
                  key={point.id} 
                  point={point} 
                  lang={lang} 
                  onSelect={setSelectedPoint}
                />
              ))}
              {filteredPoints.length === 0 && (
                <div className="col-span-full py-12 text-center bg-neutral-50 rounded-3xl border border-dashed border-neutral-300">
                  <p className="text-neutral-400">Nenhum ponto de coleta encontrado nesta região.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Management Section (Only for Auth Users) */}
      {user && (
        <Management points={firestorePoints} />
      )}

      {/* Schedule Section */}
      <section id="schedule" className="px-4 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t.scheduleTitle}</h2>
            <p className="text-neutral-500 mb-8">{t.scheduleSubtitle}</p>
            
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-8">
              {/* Quick Filters for Routes */}
              <div className="flex flex-wrap items-center justify-center gap-3 p-2 bg-neutral-50 rounded-2xl border border-neutral-100">
                <div className="flex flex-col items-start px-3 py-1 border-r border-neutral-200">
                  <label className="text-[9px] font-bold text-neutral-400 uppercase">{t.filterState}</label>
                  <select 
                    className="text-xs font-bold bg-transparent outline-none cursor-pointer text-emerald-600"
                    value={filterState}
                    onChange={(e) => {
                      setFilterState(e.target.value);
                      setFilterCity('All');
                      setFilterNeighborhood('All');
                      setSearchTerm('');
                    }}
                  >
                    <option key="sched-all-states" value="All">{t.all}</option>
                    {allStates.map(s => <option key={`sched-state-${s.id}`} value={s.nome}>{s.nome}</option>)}
                  </select>
                </div>
                <div className="flex flex-col items-start px-3 py-1 border-r border-neutral-200">
                  <label className="text-[9px] font-bold text-neutral-400 uppercase">{t.filterCity}</label>
                  <select 
                    className="text-xs font-bold bg-transparent outline-none cursor-pointer text-emerald-600"
                    value={filterCity}
                    onChange={(e) => {
                      setFilterCity(e.target.value);
                      setFilterNeighborhood('All');
                      setSearchTerm('');
                    }}
                    disabled={filterState === 'All'}
                  >
                    <option key="sched-all-cities" value="All">{t.all}</option>
                    {citiesInState.map(c => <option key={`sched-city-${c.id}`} value={c.nome}>{c.nome}</option>)}
                  </select>
                </div>
                <div className="flex flex-col items-start px-3 py-1">
                  <label className="text-[9px] font-bold text-neutral-400 uppercase">{t.filterNeighborhood}</label>
                  <select 
                    className="text-xs font-bold bg-transparent outline-none cursor-pointer text-emerald-600"
                    value={filterNeighborhood}
                    onChange={(e) => {
                      setFilterNeighborhood(e.target.value);
                      setSearchTerm(e.target.value === 'All' ? '' : e.target.value);
                    }}
                    disabled={filterCity === 'All' || neighborhoods.length === 0}
                  >
                    <option key="sched-all-neighborhoods" value="All">{t.all}</option>
                    {neighborhoods.map(n => <option key={`sched-n-${n}`} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="relative max-w-md mx-auto group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
              <input 
                type="text" 
                list="neighborhood-suggestions-schedule"
                placeholder={t.searchPlaceholder}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-neutral-200 bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  // Update neighborhood filter if exact match found
                  if (neighborhoods.includes(e.target.value)) {
                    setFilterNeighborhood(e.target.value);
                  }
                }}
              />
              <datalist id="neighborhood-suggestions-schedule">
                {neighborhoods.map(n => <option key={`suggest-${n}`} value={n} />)}
              </datalist>
              {searchTerm && (
                <button 
                  onClick={() => { setSearchTerm(''); setFilterNeighborhood('All'); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-1 rounded-full hover:bg-neutral-100 transition-colors"
                >
                  <ArrowRight size={16} className="rotate-180" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredSchedules.map(schedule => (
              <ScheduleCard key={schedule.id} schedule={schedule} lang={lang} />
            ))}
            {filteredSchedules.length === 0 && (
              <div className="col-span-full py-20 text-center bg-neutral-50 rounded-3xl border border-dashed border-neutral-300">
                <p className="text-neutral-400">Nenhuma localidade encontrada com os filtros selecionados.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Tips Section */}
      <section id="tips" className="px-4 py-20 bg-emerald-900 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-600/20 blur-[100px] rounded-full -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600/10 blur-[100px] rounded-full -ml-48 -mb-48"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">{t.tipsTitle}</h2>
            <p className="text-emerald-100/70 max-w-2xl mx-auto">{t.tipsSubtitle}</p>
          </div>
          
          <RecyclingTipsSection lang={lang} />
          
          <div className="mt-20 p-8 rounded-3xl bg-white/10 backdrop-blur-md border border-white/10 flex flex-col md:flex-row items-center gap-8">
            <div className="shrink-0 w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center">
              <Recycle size={48} className="text-white" />
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-bold mb-2">Já parou para pensar?</h3>
              <p className="text-emerald-100/70 leading-relaxed">
                Um único litro de óleo de cozinha descartado incorretamente pode contaminar até 25 mil litros de água potável. O EcoMap ajuda você a encontrar o destino correto para cada grama de resíduo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-20 pb-10 border-t border-neutral-200 text-center">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Recycle className="text-emerald-600 w-6 h-6" />
            <span className="font-bold text-lg">{t.appName}</span>
          </div>
          <div className="flex items-center justify-center gap-6 mb-6">
            <motion.a 
              href="https://www.facebook.com/AscenderIdeias" 
              target="_blank" 
              rel="noopener noreferrer"
              whileHover={{ y: -2 }}
              className="text-neutral-400 hover:text-emerald-600 transition-colors"
            >
              <Facebook size={20} />
            </motion.a>
            <motion.a 
              href="https://www.instagram.com/ascenderideias/" 
              target="_blank" 
              rel="noopener noreferrer"
              whileHover={{ y: -2 }}
              className="text-neutral-400 hover:text-emerald-600 transition-colors"
            >
              <Instagram size={20} />
            </motion.a>
            <motion.a 
              href="https://www.ascenderideias.com.br" 
              target="_blank" 
              rel="noopener noreferrer"
              whileHover={{ y: -2 }}
              className="text-neutral-400 hover:text-emerald-600 transition-colors"
            >
              <Globe size={20} />
            </motion.a>
          </div>
          <p className="text-neutral-500 text-sm">
            © 2026 {t.appName}. <br />
            Construindo cidades resilientes e sustentáveis. <br />
            <span className="text-xs mt-2 block">Mais um projeto <a href="https://www.ascenderideias.com.br" target="_blank" rel="noopener noreferrer" className="font-bold hover:text-emerald-600 transition-colors">ASCENDER IDEIAS</a></span>
          </p>
        </div>
      </footer>

      <PointDetailsModal 
        point={selectedPoint} 
        onClose={() => setSelectedPoint(null)} 
        lang={lang}
      />

      {/* Permission Alert Modal */}
      <AnimatePresence>
        {permissionError && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-sm w-full border-2 border-red-500"
            >
              <div className="bg-red-500 p-6 text-white text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin size={32} />
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
                      setPermissionError(null);
                      handleGetLocation();
                    }}
                    className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                  >
                    <MapPin size={18} />
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
    </div>
  );
}
