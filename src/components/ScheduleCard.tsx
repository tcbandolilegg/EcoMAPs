/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { Clock, Calendar as CalendarIcon, MapPin } from 'lucide-react';
import { CollectionSchedule, Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface ScheduleCardProps {
  key?: React.Key;
  schedule: CollectionSchedule;
  lang: Language;
}

export default function ScheduleCard({ schedule, lang }: ScheduleCardProps) {
  const t = TRANSLATIONS[lang];
  
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex flex-col gap-1">
          <a 
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${schedule.locality}${schedule.address ? `, ${schedule.address}` : ''}, ${schedule.city}, ${schedule.state}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 transition-colors group"
            title="Ver no Google Maps"
          >
            <MapPin size={18} className="group-hover:scale-110 transition-transform" />
            <h3 className="font-bold text-lg leading-tight group-hover:underline underline-offset-4">{schedule.locality}</h3>
          </a>
          {schedule.address && (
            <p className="text-xs text-neutral-400 ml-6 italic">{schedule.address}</p>
          )}
        </div>
        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${
          schedule.shift === 'Morning' ? 'bg-amber-100 text-amber-700' :
          schedule.shift === 'Afternoon' ? 'bg-blue-100 text-blue-700' :
          'bg-indigo-100 text-indigo-700'
        }`}>
          {schedule.shift === 'Morning' ? t.morning : 
           schedule.shift === 'Afternoon' ? t.afternoon : t.night}
        </span>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-neutral-600 text-sm">
          <CalendarIcon size={16} />
          <span>{schedule.days.join(', ')}</span>
        </div>
        <div className="flex items-center gap-2 text-neutral-600 text-sm">
          <Clock size={16} />
          <span>{schedule.timeRange}</span>
        </div>
      </div>
    </div>
  );
}
