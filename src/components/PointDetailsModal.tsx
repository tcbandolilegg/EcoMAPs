/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { X, CheckCircle2, MapPin, Info, User as UserIcon, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CollectionPoint, Language } from '../types';
import { TRANSLATIONS } from '../translations';
import { useAuth } from '../contexts/AuthContext';

interface PointDetailsModalProps {
  point: CollectionPoint | null;
  onClose: () => void;
  lang: Language;
}

export default function PointDetailsModal({ point, onClose, lang }: PointDetailsModalProps) {
  const t = TRANSLATIONS[lang];
  const { profile } = useAuth();

  return (
    <AnimatePresence>
      {point && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-emerald-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 rounded-xl text-white">
                  <MapPin size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-neutral-900">{point.name}</h2>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">{point.type}</span>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white rounded-full transition-colors text-neutral-400 hover:text-neutral-900"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {point.imageUrl && (
                <div className="w-full aspect-video rounded-2xl overflow-hidden mb-4 shadow-inner bg-neutral-100 border border-neutral-100">
                  <img src={point.imageUrl} alt={point.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}
              <div>
                <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Info size={14} /> {t.aboutLocation}
                </h3>
                <p className="text-neutral-700 leading-relaxed">
                  {point.description}
                </p>
                <p className="text-sm text-neutral-500 mt-2 italic">
                  {t.address}: {point.address}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-3">{t.acceptedItems}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {point.acceptedItems.map((item) => (
                    <div key={item} className="flex items-center gap-2 p-2 bg-neutral-50 rounded-lg text-sm text-neutral-700 border border-neutral-100">
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {profile?.role === 'admin' && point.createdBy && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <h3 className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-2">Informações de Auditoria (Admin)</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-amber-800">
                      <UserIcon size={14} />
                      <span>Incluído por: <strong>{point.createdByName || 'Sistema'}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-amber-800">
                      <Calendar size={14} />
                      <span>Data: <strong>{point.createdAt?.toDate ? point.createdAt.toDate().toLocaleString() : 'N/A'}</strong></span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-neutral-50 border-t border-neutral-100 flex gap-3">
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-white text-emerald-600 border border-emerald-600 font-bold py-3 rounded-xl hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
              >
                <MapPin size={18} />
                Como Chegar
              </a>
              <button 
                onClick={onClose}
                className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
              >
                {t.understood}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
