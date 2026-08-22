/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Globe, 
  Link as LinkIcon, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  FileCode, 
  FileMusic, 
  FileText, 
  Music, 
  Layers, 
  Clipboard, 
  RefreshCw, 
  ArrowRight,
  ExternalLink,
  Sparkles,
  Info
} from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { useTheme } from '../../contexts/ThemeContext.tsx';
import { useScores } from '../../contexts/ScoreContext.tsx';

interface LoadUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface SamplePreset {
  title: string;
  format: string;
  badgeColor: string;
  url: string;
  description: string;
  icon: React.ElementType;
}

const SAMPLE_PRESETS: SamplePreset[] = [
  {
    title: "The Butterfly (Slip Jig in Em)",
    format: "ABC / TheSession",
    badgeColor: "bg-orange-500/10 text-orange-500 border-orange-500/30",
    url: "https://thesession.org/tunes/10",
    description: "Traditional Irish Slip Jig from TheSession.org with instant audio rendering.",
    icon: FileCode
  },
  {
    title: "W.A. Mozart - An die Freude (K. 53)",
    format: "MusicXML (.xml)",
    badgeColor: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    url: "https://raw.githubusercontent.com/opensheetmusicdisplay/opensheetmusicdisplay/develop/test/data/MuzioClementi_SonatinaOpus36No1_Part1.xml",
    description: "Multi-stave piano sonatina in MusicXML score format.",
    icon: FileMusic
  },
  {
    title: "Traditional - Greensleeves (Lead Sheet)",
    format: "ChordPro (.cho)",
    badgeColor: "bg-red-500/10 text-[#FF4E00] border-red-500/30",
    url: "https://raw.githubusercontent.com/ChordPro/chordpro/master/lib/ChordPro/res/examples/greensleeves.cho",
    description: "Traditional folk tune with lyrics, chord grid, and key transposition.",
    icon: FileText
  },
  {
    title: "J.S. Bach - Invention No. 1 in C Major",
    format: "MusicXML (.xml)",
    badgeColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
    url: "https://raw.githubusercontent.com/opensheetmusicdisplay/opensheetmusicdisplay/develop/test/data/JohannSebastianBach_Air.xml",
    description: "Classical orchestral / keyboard score from OSMD music repository.",
    icon: Layers
  }
];

export default function LoadUrlModal({ isOpen, onClose, onSuccess }: LoadUrlModalProps) {
  const { resolvedTheme } = useTheme();
  const { loadFromUrl } = useScores();

  const [url, setUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setUrl('');
      setCustomTitle('');
      setIsLoading(false);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setUrl(text.trim());
          setError(null);
        }
      }
    } catch {
      // Clipboard permissions or not supported
    }
  };

  const handleLoad = async (targetUrl?: string, titleOverride?: string) => {
    const urlToLoad = (targetUrl || url).trim();
    if (!urlToLoad) {
      setError('Please enter or paste a valid score URL.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await loadFromUrl(urlToLoad, titleOverride || customTitle || undefined);
      if (result.success) {
        setIsLoading(false);
        onClose();
        if (onSuccess) onSuccess();
      } else {
        setIsLoading(false);
        setError(result.error || 'Failed to download or parse score from URL. Please check the address or file accessibility.');
      }
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred while fetching the URL.');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={cn(
            "relative w-full max-w-2xl rounded-3xl border shadow-2xl z-10 overflow-hidden flex flex-col max-h-[90vh] my-auto",
            resolvedTheme === 'dark' 
              ? "bg-[#121214] border-white/10 text-slate-100" 
              : "bg-white border-black/10 text-slate-900"
          )}
        >
          {/* Header */}
          <div className={cn(
            "px-6 py-5 border-b flex items-center justify-between shrink-0 sticky top-0 z-20 backdrop-blur-xl",
            resolvedTheme === 'dark' ? "bg-[#121214]/90 border-white/10" : "bg-white/90 border-black/5"
          )}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FF4E00] rounded-2xl flex items-center justify-center shadow-lg shadow-[#FF4E00]/25 shrink-0">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight uppercase flex items-center gap-2">
                  Load Score from <span className="text-[#FF4E00]">URL</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Fetch and render sheet music directly from the web
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className={cn(
                "p-2 rounded-xl transition-colors cursor-pointer",
                resolvedTheme === 'dark' ? "hover:bg-white/10 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"
              )}
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
            {/* URL Input Form */}
            <form onSubmit={(e) => { e.preventDefault(); handleLoad(); }} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Score Web Address (URL)</span>
                  <span className="text-[10px] lowercase font-mono opacity-70">
                    abc, xml, mxl, pdf, gp, chordpro, images
                  </span>
                </label>

                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                    <LinkIcon className="w-4 h-4" />
                  </div>

                  <input
                    ref={inputRef}
                    type="url"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="https://raw.githubusercontent.com/.../score.abc"
                    disabled={isLoading}
                    className={cn(
                      "w-full pl-10 pr-24 py-3 rounded-2xl border text-sm font-mono transition-all outline-none",
                      resolvedTheme === 'dark'
                        ? "bg-white/5 border-white/15 text-white placeholder:text-white/20 focus:border-[#FF4E00] focus:ring-2 focus:ring-[#FF4E00]/20"
                        : "bg-slate-50 border-black/10 text-slate-900 placeholder:text-slate-400 focus:border-[#FF4E00] focus:ring-2 focus:ring-[#FF4E00]/20",
                      error && "border-red-500/50 ring-2 ring-red-500/10"
                    )}
                  />

                  <div className="absolute right-2 flex items-center gap-1">
                    {url ? (
                      <button
                        type="button"
                        onClick={() => { setUrl(''); setError(null); }}
                        className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
                        title="Clear URL"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handlePaste}
                        className="px-2 py-1 rounded-lg bg-[#FF4E00]/10 hover:bg-[#FF4E00]/20 text-[#FF4E00] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                        title="Paste from clipboard"
                      >
                        <Clipboard className="w-3 h-3" />
                        <span>Paste</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Optional Custom Title */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs font-bold text-slate-500 hover:text-[#FF4E00] transition-colors flex items-center gap-1 mb-2 cursor-pointer"
                >
                  <span>{showAdvanced ? '− Hide Custom Title' : '+ Set Custom Title (Optional)'}</span>
                </button>

                {showAdvanced && (
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Enter custom score title (optional)"
                    disabled={isLoading}
                    className={cn(
                      "w-full px-4 py-2 rounded-xl border text-xs font-medium transition-all outline-none",
                      resolvedTheme === 'dark'
                        ? "bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-[#FF4E00]"
                        : "bg-slate-50 border-black/10 text-slate-900 placeholder:text-slate-400 focus:border-[#FF4E00]"
                    )}
                  />
                )}
              </div>

              {/* Error Alert */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold">Failed to load score</div>
                    <div className="text-[11px] opacity-90 leading-relaxed">{error}</div>
                    <div className="text-[10px] text-red-300/80 pt-0.5">
                      Tip: If loading from GitHub or Dropbox, ensure you use the Raw / Direct link or try one of the verified samples below.
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={isLoading || !url.trim()}
                  className={cn(
                    "flex-1 py-3 px-5 rounded-2xl font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer",
                    isLoading || !url.trim()
                      ? "opacity-50 cursor-not-allowed bg-[#FF4E00] text-white"
                      : "bg-[#FF4E00] hover:bg-[#e04500] text-white shadow-[#FF4E00]/25 active:scale-[0.98]"
                  )}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Downloading &amp; Parsing Score...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Fetch &amp; Open Score</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Curated Sample Presets */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#FF4E00] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Try a Sample Public Score
                </h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">1-Click Test</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SAMPLE_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setUrl(preset.url);
                      setCustomTitle(preset.title);
                      handleLoad(preset.url, preset.title);
                    }}
                    disabled={isLoading}
                    className={cn(
                      "p-3 rounded-2xl border text-left transition-all group flex flex-col justify-between gap-2 cursor-pointer",
                      resolvedTheme === 'dark'
                        ? "bg-white/[0.02] border-white/10 hover:border-orange-500/50 hover:bg-white/[0.05]"
                        : "bg-slate-50 border-slate-200 hover:border-orange-500/50 hover:bg-orange-50/30"
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <preset.icon className="w-3.5 h-3.5 text-[#FF4E00] shrink-0" />
                          <span className="text-xs font-bold uppercase tracking-tight truncate group-hover:text-[#FF4E00] transition-colors">
                            {preset.title}
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                        {preset.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-black/5 dark:border-white/5">
                      <span className={cn("text-[9px] font-bold font-mono px-2 py-0.5 rounded-md border", preset.badgeColor)}>
                        {preset.format}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-[#FF4E00] opacity-80 group-hover:opacity-100">
                        Load Score →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* URL Compatibility & Guide Card */}
            <div className={cn(
              "p-4 rounded-2xl border flex items-start gap-3",
              resolvedTheme === 'dark' ? "bg-white/[0.02] border-white/10 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
            )}>
              <Info className="w-4 h-4 text-[#FF4E00] shrink-0 mt-0.5" />
              <div className="text-[11px] space-y-1 leading-relaxed">
                <div className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px]">
                  Supported Hosting &amp; Automatic Conversion:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-500 dark:text-slate-400">
                  <li><strong className="text-slate-700 dark:text-slate-300">GitHub:</strong> Paste any standard GitHub file or Raw URL (auto-converted to raw format).</li>
                  <li><strong className="text-slate-700 dark:text-slate-300">TheSession.org:</strong> Paste tune page links (e.g. <code>thesession.org/tunes/10</code>).</li>
                  <li><strong className="text-slate-700 dark:text-slate-300">Dropbox &amp; Gist:</strong> Direct downloads are automatically resolved.</li>
                  <li><strong className="text-slate-700 dark:text-slate-300">CORS Support:</strong> Built-in fallback proxies handle cross-origin sheet music downloads.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={cn(
            "px-6 py-3.5 border-t flex items-center justify-between shrink-0 text-xs",
            resolvedTheme === 'dark' ? "bg-[#121214] border-white/10 text-slate-400" : "bg-slate-50 border-black/5 text-slate-500"
          )}>
            <div className="flex items-center gap-1.5 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Full local score caching &amp; instant playback</span>
            </div>

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
