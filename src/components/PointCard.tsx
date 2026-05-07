/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { MapPin, Info } from 'lucide-react';
import { CollectionPoint, Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface PointCardProps {
  key?: React.Key;
  point: CollectionPoint;
  onSelect: (point: CollectionPoint) => void;
  lang: Language;
}

export default function PointCard({ point, onSelect, lang }: PointCardProps) {
  const t = TRANSLATIONS[lang];
  
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 hover:shadow-md transition-shadow flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between mb-4">
          <div className="flex flex-col gap-1">
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 transition-colors group"
              title="Ver no Google Maps"
              onClick={(e) => e.stopPropagation()}
            >
              <MapPin size={18} className="group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-lg leading-tight group-hover:underline underline-offset-4">{point.name}</h3>
            </a>
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">{point.type}</span>
          </div>
        </div>
        
        <p className="text-sm text-neutral-500 mb-4 line-clamp-2">
          {point.description}
        </p>

        <div className="text-xs text-neutral-400 mb-4 italic">
          {point.neighborhood}, {point.city} - {point.state}
        </div>
      </div>
      
      <button 
        onClick={() => onSelect(point)}
        className="w-full flex items-center justify-center gap-2 text-sm font-bold bg-neutral-50 text-neutral-600 py-3 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-colors border border-neutral-100"
      >
        <Info size={16} />
        {t.viewDetails || 'Ver Detalhes'}
      </button>
    </div>
  );
}
