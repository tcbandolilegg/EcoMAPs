/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect, useState } from 'react';
import { getRecyclingTips } from '../services/geminiService';
import { RecyclingTip, Language } from '../types';
import { Lightbulb, Leaf, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { TRANSLATIONS } from '../translations';

interface RecyclingTipsSectionProps {
  lang: Language;
}

export default function RecyclingTipsSection({ lang }: RecyclingTipsSectionProps) {
  const [tips, setTips] = useState<RecyclingTip[]>([]);
  const [loading, setLoading] = useState(true);
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    async function loadTips() {
      setLoading(true);
      const data = await getRecyclingTips(lang);
      setTips(data);
      setLoading(false);
    }
    loadTips();
  }, [lang]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin text-emerald-100 mb-4" size={32} />
        <p className="text-emerald-100/70 animate-pulse">{t.loadingAI}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tips.map((tip, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 }}
          className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 flex flex-col"
        >
          <div className="flex items-center gap-2 mb-3 text-emerald-700">
            <Lightbulb size={20} className="shrink-0" />
            <h4 className="font-bold">{tip.topic}</h4>
          </div>
          <p className="text-neutral-600 text-sm mb-4 flex-grow">
            {tip.content}
          </p>
          <div className="flex items-center gap-1.5 text-emerald-600 font-medium text-xs mt-auto">
            <Leaf size={14} />
            {tip.impactLabel}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
