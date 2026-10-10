/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Drum, 
  Piano, 
  Waves, 
  Music, 
  Gauge, 
  Gamepad2, 
  Radio, 
  FileText 
} from 'lucide-react';
import { useController } from '../../contexts/ControllerContext.tsx';
import { cn } from '../../lib/utils.ts';

export function ControllerToastHUD() {
  const { activeToast } = useController();

  const getToastIcon = (type: string) => {
    switch (type) {
      case 'waypoint':
        return <MapPin className="w-4 h-4 text-[#FF4E00]" />;
      case 'tempo':
        return <Gauge className="w-4 h-4 text-orange-400" />;
      case 'audio':
        return <Music className="w-4 h-4 text-emerald-400" />;
      case 'page':
        return <FileText className="w-4 h-4 text-blue-400" />;
      default:
        return <Gamepad2 className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <AnimatePresence>
      {activeToast && (
        <motion.div
          key={activeToast.id}
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none select-none max-w-md"
        >
          <div className={cn(
            "flex items-center gap-2.5 px-4 py-2 rounded-2xl border shadow-2xl backdrop-blur-2xl text-xs font-bold",
            "bg-[#111114]/95 border-white/20 text-white shadow-black/60"
          )}>
            <div className="p-1.5 rounded-xl bg-white/10 shrink-0">
              {getToastIcon(activeToast.type)}
            </div>
            <div className="flex flex-col min-w-0 pr-1">
              <span className="font-black text-xs uppercase tracking-tight truncate text-white">
                {activeToast.title}
              </span>
              {activeToast.subtitle && (
                <span className="text-[10px] text-slate-300 font-mono font-normal truncate">
                  {activeToast.subtitle}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
