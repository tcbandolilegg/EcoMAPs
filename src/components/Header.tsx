/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Recycle, MapPin, Info, Calendar, Globe, User as UserIcon, LogOut, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language } from '../types';
import { TRANSLATIONS } from '../translations';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import AuthModal from './AuthModal';

interface HeaderProps {
  lang: Language;
  onLanguageChange: (lang: Language) => void;
}

export default function Header({ lang, onLanguageChange }: HeaderProps) {
  const t = TRANSLATIONS[lang];
  const { user, profile, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-200">
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div 
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <Recycle className="text-emerald-600 w-8 h-8" />
          </motion.div>
          <span className="font-bold text-xl tracking-tight">{t.appName}</span>
        </div>
        
        <nav className="hidden lg:flex items-center gap-6">
          <a href="#map" className="text-sm font-medium hover:text-emerald-600 transition-colors flex items-center gap-1.5 shadow-sm px-3 py-1.5 rounded-full bg-white border border-neutral-100">
            <MapPin size={16} /> {t.navMap}
          </a>
          <a href="#schedule" className="text-sm font-medium hover:text-emerald-600 transition-colors flex items-center gap-1.5 shadow-sm px-3 py-1.5 rounded-full bg-white border border-neutral-100">
            <Calendar size={16} /> {t.navSchedule}
          </a>
          <a href="#tips" className="text-sm font-medium hover:text-emerald-600 transition-colors flex items-center gap-1.5 shadow-sm px-3 py-1.5 rounded-full bg-white border border-neutral-100">
            <Info size={16} /> {t.navEducation}
          </a>

          <div className="flex items-center gap-2 bg-neutral-100 p-1 rounded-full border border-neutral-200">
            <Globe size={14} className="ml-2 text-neutral-500" />
            {(['pt-BR', 'pt-PT', 'en'] as Language[]).map((l) => (
              <button
                key={l}
                onClick={() => onLanguageChange(l)}
                className={`text-[10px] font-bold px-2 py-1 rounded-full transition-all ${
                  lang === l ? 'bg-white text-emerald-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </nav>

        <div className="lg:hidden flex items-center gap-2">
          <select 
            value={lang}
            onChange={(e) => onLanguageChange(e.target.value as Language)}
            className="text-xs font-bold border-none bg-neutral-100 rounded-lg p-1 outline-none"
          >
            <option value="pt-BR">BR</option>
            <option value="pt-PT">PT</option>
            <option value="en">EN</option>
          </select>
          
          <div className="relative">
            {user ? (
              <>
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-10 h-10 rounded-full overflow-hidden border-2 border-emerald-500"
                >
                  <img src={user.photoURL || ''} alt="Profile" className="w-full h-full object-cover" />
                </button>
                <AnimatePresence>
                  {showProfileMenu && (
                    <>
                      <motion.div 
                        className="fixed inset-0 z-40 bg-black/20" 
                        onClick={() => setShowProfileMenu(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-neutral-100 overflow-hidden z-50"
                      >
                        <div className="p-4 border-b border-neutral-50 bg-neutral-50/50">
                          <p className="text-xs font-bold truncate">{profile?.firstName || user.displayName}</p>
                          <p className="text-[10px] text-neutral-500 truncate">{user.email}</p>
                        </div>
                        <button 
                          onClick={() => {
                            logout();
                            setShowProfileMenu(false);
                          }}
                          className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                        >
                          <LogOut size={16} /> Sair
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <button onClick={() => setIsAuthModalOpen(true)} className="p-2 text-neutral-600">
                <UserIcon size={24} />
              </button>
            )}
          </div>
        </div>

        {/* Desktop Profile / Login */}
        <div className="hidden lg:flex items-center gap-4 border-l border-neutral-100 pl-6">
          {user ? (
            <div className="relative">
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 bg-neutral-50 px-3 py-1.5 rounded-full border border-neutral-100 hover:bg-neutral-100 transition-colors"
              >
                <div className="text-right">
                  <p className="text-xs font-bold leading-none">{profile?.firstName || user.displayName}</p>
                  <p className="text-[10px] text-emerald-600 uppercase font-bold tracking-tighter">{profile?.role}</p>
                </div>
                <img src={user.photoURL || ''} alt="Profile" className="w-8 h-8 rounded-full border border-white" />
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                  <>
                    <motion.div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowProfileMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-neutral-100 overflow-hidden z-50"
                    >
                      <div className="p-4 border-b border-neutral-50 bg-neutral-50/50">
                        <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                      </div>
                      <button 
                        onClick={() => {
                          logout();
                          setShowProfileMenu(false);
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-neutral-50 flex items-center gap-2 transition-colors"
                      >
                        <LogOut size={16} /> Sair
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button 
              onClick={() => setIsAuthModalOpen(true)}
              className="bg-emerald-600 text-white px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-md active:scale-95"
            >
              <UserIcon size={16} /> Entrar
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
