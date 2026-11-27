/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Interactive Shakuhachi Notation Reference (尺八譜図典).
 * Covers Kinko-ryu (琴古流) & Tozan-ryu (都山流) 5-hole fingerings,
 * Meri/Kari & Pitch Bends (萎し / 擦り / メリ込み / 落とし),
 * Honkyoku techniques & Jin Nyodo (神如道) annotations, and Metrical vs Free Rhythm.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, Search, X } from 'lucide-react';
import {
  ShakuhachiBendType,
  ShakuhachiMeriKari,
  ShakuhachiPitchName,
  ShakuhachiSchool,
  ShakuhachiTechnique
} from '../../lib/musojianpu/types.ts';
import {
  SHAKUHACHI_BEND_LABELS,
  SHAKUHACHI_FINGERING_TABLE,
  SHAKUHACHI_LENGTHS,
  SHAKUHACHI_MERIKARI_LABELS,
  SHAKUHACHI_TECHNIQUE_LABELS
} from '../../lib/musojianpu/shakuhachi.ts';
import {
  SHAKUHACHI_SERIF_FONT,
  ShakuhachiBendIcon,
  ShakuhachiHoleDiagram
} from './ShakuhachiGlyph.tsx';
import { cn } from '../../lib/utils.ts';

export interface ShakuhachiReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  school: ShakuhachiSchool;
  onInsertToken: (token: string, isModifier: boolean) => void;
}

type RefTab = 'fingerings' | 'bends' | 'honkyoku' | 'rhythm';

const FINGERING_ORDER: ShakuhachiPitchName[] = [
  'ro', 'tsu', 're', 'chi', 'ri', 'ha', 'hi', 'u', 'i', 'ru', 'pi', 'ta'
];

const BEND_ORDER: ShakuhachiBendType[] = [
  'nayashi', 'suri-up', 'suri-down', 'merikomi', 'sori', 'otoshi'
];

const MERIKARI_ORDER: ShakuhachiMeriKari[] = [
  'meri', 'chumeri', 'daimeri', 'kari'
];

const TECHNIQUE_ORDER: ShakuhachiTechnique[] = [
  'atari', 'uchi', 'oshi', 'yuri', 'yokoyuri', 'tateyuri', 'mawashi',
  'korokoro', 'karakara', 'komi', 'muraiki', 'tamane', 'kiri', 'breath', 'ma'
];

const JIN_NYODO_PRESETS = [
  { jp: '静かに息を澄ませて', en: 'Quietly, clarifying the breath tone', token: '"静かに息を澄ませて"' },
  { jp: 'ムラ息から次第に澄む', en: 'Begin with airy muraiki, gradually clarifying', token: '"ムラ息から次第に澄む"' },
  { jp: '次第に弱く消えるように', en: 'Gradually fade away into silence', token: '"次第に弱く消えるように"' },
  { jp: '深くメリ込む', en: 'Sink deeply into meri', token: '"深くメリ込む"' },
  { jp: '余韻を聴く', en: 'Listen to the lingering resonance', token: '"余韻を聴く"' },
  { jp: '深い間をとる', en: 'Hold a deep contemplative silence (ma)', token: '"深い間をとる"' },
  { jp: '強く吹き込む', en: 'Blow strongly with core breath support', token: '"強く吹き込む"' },
  { jp: 'やや速く軽やかに', en: 'Slightly faster and lightly', token: '"やや速く軽やかに"' }
];

export function ShakuhachiReferenceModal({
  isOpen,
  onClose,
  isDark,
  school,
  onInsertToken
}: ShakuhachiReferenceModalProps) {
  const [activeTab, setActiveTab] = useState<RefTab>('fingerings');
  const [query, setQuery] = useState('');
  const [justInserted, setJustInserted] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const trimmedQuery = query.trim().toLowerCase();

  const searchItems = useMemo(() => {
    if (!trimmedQuery) return [];
    const results: Array<{
      id: string;
      title: string;
      sub: string;
      desc: string;
      token: string;
      isModifier: boolean;
      badge: string;
    }> = [];

    for (const pid of FINGERING_ORDER) {
      const m = SHAKUHACHI_FINGERING_TABLE[pid];
      const hay = `${m.kinko} ${m.tozan} ${m.romaji} ${m.pitch18} ${m.description}`.toLowerCase();
      if (hay.includes(trimmedQuery)) {
        const tok = school === 'tozan' ? m.tozan : m.kinko;
        results.push({
          id: `f-${pid}`,
          title: `${m.kinko} / ${m.tozan}`,
          sub: `${m.romaji} · 1.8尺 ${m.pitch18}`,
          desc: m.description,
          token: tok,
          isModifier: false,
          badge: 'Fingering'
        });
      }
    }

    for (const bid of BEND_ORDER) {
      const b = SHAKUHACHI_BEND_LABELS[bid];
      const hay = `${b.jp} ${b.romaji} ${b.en} ${bid}`.toLowerCase();
      if (hay.includes(trimmedQuery)) {
        results.push({
          id: `b-${bid}`,
          title: b.jp,
          sub: b.romaji,
          desc: b.en,
          token: b.jp,
          isModifier: true,
          badge: 'Bend'
        });
      }
    }

    for (const tid of TECHNIQUE_ORDER) {
      const t = SHAKUHACHI_TECHNIQUE_LABELS[tid];
      const hay = `${t.jp} ${t.romaji} ${t.en} ${tid}`.toLowerCase();
      if (hay.includes(trimmedQuery)) {
        results.push({
          id: `t-${tid}`,
          title: t.jp,
          sub: t.romaji,
          desc: t.en,
          token: tid === 'breath' ? '息' : tid === 'ma' ? '間' : t.jp,
          isModifier: tid !== 'ma' && tid !== 'breath',
          badge: 'Technique'
        });
      }
    }

    for (const p of JIN_NYODO_PRESETS) {
      const hay = `${p.jp} ${p.en} jin nyodo`.toLowerCase();
      if (hay.includes(trimmedQuery)) {
        results.push({
          id: `j-${p.jp}`,
          title: p.jp,
          sub: 'Jin Nyodo Annotation',
          desc: p.en,
          token: p.token,
          isModifier: true,
          badge: 'Annotation'
        });
      }
    }

    return results;
  }, [trimmedQuery, school]);

  if (!isOpen) return null;

  const handleInsert = (token: string, isModifier: boolean) => {
    onInsertToken(token, isModifier);
    setJustInserted(token);
    window.setTimeout(() => {
      setJustInserted(prev => (prev === token ? null : prev));
    }, 1500);
  };

  const paperCardClass = isDark
    ? 'bg-[#1D2026] border-white/[0.08] hover:border-[#E05A2B]/50 text-neutral-100'
    : 'bg-[#FBF8F1] border-[#8C6D46]/20 hover:border-[#C23E1E]/50 text-[#1B1814]';
  const subtleTextClass = isDark ? 'text-neutral-400' : 'text-neutral-600';
  const inkClass = isDark ? 'text-neutral-100' : 'text-[#1A1612]';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-3 sm:p-5"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Shakuhachi Notation Reference"
    >
      <div
        onClick={e => e.stopPropagation()}
        className={cn(
          'w-full max-w-4xl max-h-[88vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden',
          isDark
            ? 'bg-[#15171C] border-white/[0.1] text-neutral-100'
            : 'bg-[#FAF7F0] border-[#8C6D46]/25 text-[#1A1612]'
        )}
      >
        {/* Modal Header */}
        <div
          className={cn(
            'px-5 py-4 border-b flex flex-wrap items-center justify-between gap-3 shrink-0',
            isDark ? 'border-white/[0.08] bg-[#181B21]' : 'border-[#8C6D46]/15 bg-[#F5EFE2]'
          )}
        >
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-[#E05A2B] shrink-0" />
            <div>
              <div className="flex items-baseline gap-2.5">
                <h2
                  className="text-base sm:text-lg font-bold tracking-wide"
                  style={{ fontFamily: SHAKUHACHI_SERIF_FONT }}
                >
                  尺八譜図典
                </h2>
                <span className={cn('text-xs font-medium', subtleTextClass)}>
                  Shakuhachi Notation Reference · Kinko-ryū &amp; Tozan-ryū
                </span>
              </div>
              <p className={cn('text-xs mt-0.5', subtleTextClass)}>
                Click any card to insert its fingering, pitch bend, technique, or Jin Nyodo annotation into your score.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className={cn('w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none', subtleTextClass)} />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Filter ロ, nayashi, muraiki..."
                className={cn(
                  'h-8 w-44 sm:w-56 pl-8 pr-7 rounded-lg border text-xs outline-none focus:border-[#E05A2B]',
                  isDark
                    ? 'bg-white/[0.04] border-white/10 text-neutral-100 placeholder:text-neutral-500'
                    : 'bg-white border-[#8C6D46]/25 text-neutral-900 placeholder:text-neutral-400'
                )}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 cursor-pointer"
                  aria-label="Clear filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className={cn(
                'p-1.5 rounded-lg transition-colors cursor-pointer',
                isDark ? 'hover:bg-white/10 text-neutral-400 hover:text-white' : 'hover:bg-black/5 text-neutral-600 hover:text-black'
              )}
              aria-label="Close reference"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        {!trimmedQuery && (
          <div
            className={cn(
              'px-5 pt-3 pb-2.5 border-b flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0',
              isDark ? 'border-white/[0.06] bg-[#15171C]' : 'border-[#8C6D46]/12 bg-[#FAF7F0]'
            )}
          >
            {(
              [
                { id: 'fingerings', label: 'Fingerings 運指表 (琴古/都山)' },
                { id: 'bends', label: 'Meri & Pitch Bends メリ・萎し・擦り' },
                { id: 'honkyoku', label: 'Honkyoku & Jin Nyodo 本曲・傍注' },
                { id: 'rhythm', label: 'Rhythm & Reading 拍子・散拍' }
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer',
                  activeTab === tab.id
                    ? 'bg-[#E05A2B] text-white'
                    : isDark
                      ? 'text-neutral-400 hover:text-neutral-100 hover:bg-white/[0.05]'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-black/[0.05]'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 custom-scrollbar">
          {trimmedQuery ? (
            <div className="space-y-3">
              <div className={cn('text-xs font-medium', subtleTextClass)}>
                {searchItems.length} matching {searchItems.length === 1 ? 'entry' : 'entries'} for “{query}”
              </div>
              {searchItems.length === 0 ? (
                <div className={cn('py-10 text-center text-sm', subtleTextClass)}>
                  No Shakuhachi notation entries matched. Try searching ロ, リ, ハ, nayashi, yuri, muraiki, or otoshi.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {searchItems.map(item => {
                    const isAdded = justInserted === item.token;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleInsert(item.token, item.isModifier)}
                        className={cn('text-left rounded-xl border p-3.5 transition-colors cursor-pointer', paperCardClass)}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="flex items-baseline gap-2">
                            <span style={{ fontFamily: SHAKUHACHI_SERIF_FONT }} className="text-base font-bold">
                              {item.title}
                            </span>
                            <span className={cn('text-xs', subtleTextClass)}>{item.sub}</span>
                          </div>
                          <span className={cn('text-[11px] font-mono', isAdded ? 'text-emerald-500 font-semibold' : 'text-[#E05A2B]')}>
                            {isAdded ? 'Added' : `{${item.token}}`}
                          </span>
                        </div>
                        <p className={cn('mt-1 text-xs leading-relaxed', subtleTextClass)}>{item.desc}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : activeTab === 'fingerings' ? (
            <>
              <div>
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                  <h3 className="text-sm font-bold">Five-Hole Fingerings · Kinko-ryū (琴古流) vs Tozan-ryū (都山流)</h3>
                  <span className={cn('text-xs', subtleTextClass)}>
                    Top hole = thumb (裏孔 5) · Bottom 4 = front holes (4–1)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {FINGERING_ORDER.map(pid => {
                    const meta = SHAKUHACHI_FINGERING_TABLE[pid];
                    const insertTok = school === 'tozan' ? meta.tozan : meta.kinko;
                    const isInserted = justInserted === insertTok;
                    const differs = meta.kinko !== meta.tozan;
                    return (
                      <button
                        key={pid}
                        type="button"
                        onClick={() => handleInsert(insertTok, false)}
                        className={cn(
                          'group text-left rounded-xl border p-3.5 transition-colors cursor-pointer flex items-center gap-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E05A2B]',
                          paperCardClass
                        )}
                      >
                        <div
                          className={cn(
                            'shrink-0 rounded-lg px-2.5 py-2 flex items-center justify-center gap-2',
                            isDark ? 'bg-[#14161B]' : 'bg-[#F4EEE1]'
                          )}
                        >
                          <ShakuhachiHoleDiagram holes={meta.holes} size="md" className={inkClass} />
                          <div className="flex flex-col items-center">
                            <span
                              style={{ fontFamily: SHAKUHACHI_SERIF_FONT }}
                              className={cn('text-2xl font-bold leading-none', inkClass)}
                            >
                              {school === 'tozan' ? meta.tozan : meta.kinko}
                            </span>
                            {differs && (
                              <span className={cn('text-[10px] mt-1 font-medium', subtleTextClass)}>
                                {school === 'tozan' ? `琴古 ${meta.kinko}` : `都山 ${meta.tozan}`}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-1.5">
                            <span className="text-sm font-bold">{meta.romaji}</span>
                            <span className={cn('text-[11px] font-mono', isInserted ? 'text-emerald-500 font-semibold' : 'text-[#E05A2B]')}>
                              {isInserted ? (
                                <span className="inline-flex items-center gap-0.5"><Check className="w-3 h-3" /> Added</span>
                              ) : (
                                `{${insertTok}}`
                              )}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-[#E05A2B] font-semibold mt-0.5">
                            1.8尺: {meta.pitch18}
                          </div>
                          <p className={cn('mt-1 text-[11.5px] leading-snug', subtleTextClass)}>
                            {meta.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tube Lengths Reference */}
              <div>
                <h3 className="text-sm font-bold mb-2.5">Shakuhachi Tube Lengths (管長 · @length)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {SHAKUHACHI_LENGTHS.map(len => (
                    <div
                      key={len.code}
                      className={cn(
                        'rounded-lg border px-2.5 py-2 text-xs',
                        len.code === '1.8'
                          ? (isDark ? 'bg-[#E05A2B]/15 border-[#E05A2B]/40' : 'bg-[#E05A2B]/[0.07] border-[#E05A2B]/35')
                          : (isDark ? 'bg-[#1B1E24] border-white/[0.06]' : 'bg-white border-[#8C6D46]/15')
                      )}
                    >
                      <div className="font-bold">{len.label}</div>
                      <div style={{ fontFamily: SHAKUHACHI_SERIF_FONT }} className={cn('text-[11px]', subtleTextClass)}>
                        {len.kanjiLabel} · Ro={len.keyNote}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : activeTab === 'bends' ? (
            <>
              {/* Meri & Kari */}
              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="text-sm font-bold">Meri &amp; Kari Pitch Shading (メリ・カリ)</h3>
                  <span className={cn('text-xs', subtleTextClass)}>Lower chin (メ) flattens pitch · Raise chin (カ) sharpens</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {MERIKARI_ORDER.map(mkId => {
                    const mk = SHAKUHACHI_MERIKARI_LABELS[mkId];
                    const tok = mk.tozan;
                    const isAdded = justInserted === tok;
                    return (
                      <button
                        key={mkId}
                        type="button"
                        onClick={() => handleInsert(tok, true)}
                        className={cn(
                          'text-left rounded-xl border p-3.5 transition-colors cursor-pointer flex items-center gap-3.5',
                          paperCardClass
                        )}
                      >
                        <div
                          className={cn(
                            'shrink-0 w-14 h-12 rounded-lg flex items-center justify-center font-bold text-lg',
                            isDark ? 'bg-[#14161B]' : 'bg-[#F4EEE1]'
                          )}
                          style={{ fontFamily: SHAKUHACHI_SERIF_FONT }}
                        >
                          {school === 'tozan' ? mk.tozan : mk.kinko}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-sm font-bold">{mk.en}</span>
                            <span className={cn('text-[11px] font-mono', isAdded ? 'text-emerald-500 font-semibold' : 'text-[#E05A2B]')}>
                              {isAdded ? 'Added' : `{${tok}}`}
                            </span>
                          </div>
                          <p className={cn('text-xs mt-0.5', subtleTextClass)}>
                            Kinko: {mk.kinko} · Tozan: {mk.tozan} · Combine directly with katakana like ツメ or ツ大メ.
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pitch Bends & Glides */}
              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="text-sm font-bold">Pitch Bends, Glides &amp; Honkyoku Curves (萎し・擦り・落とし)</h3>
                  <span className={cn('text-xs', subtleTextClass)}>Rendered as calligraphic vertical bend vectors</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {BEND_ORDER.map(bid => {
                    const b = SHAKUHACHI_BEND_LABELS[bid];
                    const isAdded = justInserted === b.jp;
                    return (
                      <button
                        key={bid}
                        type="button"
                        onClick={() => handleInsert(b.jp, true)}
                        className={cn(
                          'text-left rounded-xl border p-3.5 transition-colors cursor-pointer flex items-center gap-3.5',
                          paperCardClass
                        )}
                      >
                        <div
                          className={cn(
                            'shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-[#E05A2B]',
                            isDark ? 'bg-[#14161B]' : 'bg-[#F4EEE1]'
                          )}
                        >
                          <ShakuhachiBendIcon type={bid} className="w-6 h-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="flex items-baseline gap-2">
                              <span style={{ fontFamily: SHAKUHACHI_SERIF_FONT }} className="text-base font-bold">
                                {b.jp}
                              </span>
                              <span className={cn('text-xs', subtleTextClass)}>{b.romaji}</span>
                            </div>
                            <span className={cn('text-[11px] font-mono', isAdded ? 'text-emerald-500 font-semibold' : 'text-[#E05A2B]')}>
                              {isAdded ? 'Added' : `{${b.jp}}`}
                            </span>
                          </div>
                          <p className={cn('text-xs mt-1 leading-relaxed', subtleTextClass)}>{b.en}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : activeTab === 'honkyoku' ? (
            <>
              {/* Traditional Honkyoku Techniques */}
              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="text-sm font-bold">Honkyoku Articulations, Vibrato &amp; Breath Techniques (本曲奏法)</h3>
                  <span className={cn('text-xs', subtleTextClass)}>Click to attach to current note</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {TECHNIQUE_ORDER.map(tid => {
                    const t = SHAKUHACHI_TECHNIQUE_LABELS[tid];
                    const tok = tid === 'breath' ? '息' : tid === 'ma' ? '間' : t.jp;
                    const isAdded = justInserted === tok;
                    return (
                      <button
                        key={tid}
                        type="button"
                        onClick={() => handleInsert(tok, tid !== 'ma' && tid !== 'breath')}
                        className={cn(
                          'text-left rounded-xl border p-3 transition-colors cursor-pointer flex items-center gap-3',
                          paperCardClass
                        )}
                      >
                        <div
                          style={{ fontFamily: SHAKUHACHI_SERIF_FONT }}
                          className={cn(
                            'shrink-0 w-12 h-11 rounded-lg flex items-center justify-center text-sm font-bold text-[#E05A2B]',
                            isDark ? 'bg-[#14161B]' : 'bg-[#F4EEE1]'
                          )}
                        >
                          {t.shortJp}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="flex items-baseline gap-2">
                              <span style={{ fontFamily: SHAKUHACHI_SERIF_FONT }} className="text-sm font-bold">
                                {t.jp}
                              </span>
                              <span className={cn('text-xs', subtleTextClass)}>{t.romaji}</span>
                            </div>
                            <span className={cn('text-[11px] font-mono', isAdded ? 'text-emerald-500 font-semibold' : 'text-[#E05A2B]')}>
                              {isAdded ? 'Added' : `{${tok}}`}
                            </span>
                          </div>
                          <p className={cn('text-xs mt-0.5', subtleTextClass)}>{t.en}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Jin Nyodo Side Annotations */}
              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="text-sm font-bold">Jin Nyodo Style Verbal Annotations (神如道流・傍注)</h3>
                  <span className={cn('text-xs', subtleTextClass)}>Write any text in quotes &quot;...&quot; or jin:... inside {'{...}'}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {JIN_NYODO_PRESETS.map(p => {
                    const isAdded = justInserted === p.token;
                    return (
                      <button
                        key={p.jp}
                        type="button"
                        onClick={() => handleInsert(p.token, true)}
                        className={cn(
                          'text-left rounded-xl border px-3.5 py-2.5 transition-colors cursor-pointer flex items-center justify-between gap-3',
                          paperCardClass
                        )}
                      >
                        <div className="min-w-0">
                          <div style={{ fontFamily: SHAKUHACHI_SERIF_FONT }} className="text-sm font-bold text-[#E05A2B]">
                            「{p.jp}」
                          </div>
                          <div className={cn('text-xs mt-0.5', subtleTextClass)}>{p.en}</div>
                        </div>
                        <span className={cn('text-[11px] font-mono shrink-0', isAdded ? 'text-emerald-500 font-semibold' : subtleTextClass)}>
                          {isAdded ? 'Added' : '+ Insert'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4 text-xs leading-relaxed">
              <div
                className={cn(
                  'rounded-xl border p-4 space-y-2',
                  isDark ? 'bg-[#1B1E24] border-white/[0.08]' : 'bg-[#F5EFE2]/70 border-[#8C6D46]/20'
                )}
              >
                <h3 className="text-sm font-bold">Free Rhythm Honkyoku (散拍・本曲) vs Metrical Scores (拍子)</h3>
                <p className={subtleTextClass}>
                  Just like Guqin scores, Shakuhachi scores can be written either with exact metrical rhythm (for modern compositions and sankyoku) or in free breathing rhythm (for traditional Zen honkyoku).
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className={cn('rounded-lg border p-3', isDark ? 'bg-[#14161B] border-white/[0.06]' : 'bg-white border-[#8C6D46]/15')}>
                    <div className="font-bold text-[#E05A2B] mb-1">Free Rhythm Honkyoku (@time: free)</div>
                    <p className={subtleTextClass}>
                      Write pure Shakuhachi notes in braces with sustain tags (<code className="font-mono">短</code>, <code className="font-mono">長</code>, <code className="font-mono">長長</code>), bends, and quoted Jin Nyodo instructions:
                    </p>
                    <pre className={cn('mt-2 p-2 rounded-md font-mono text-[11px] overflow-x-auto', isDark ? 'bg-black/30 text-neutral-200' : 'bg-neutral-100 text-neutral-800')}>
{`@instrument: shakuhachi
@school: kinko
@length: 1.8尺 (D)
@time: free
| {ロ,萎し,長,"静かに息を澄ませて"} {ツメ,ユリ} {レ,メリ込み} {息} |`}
                    </pre>
                  </div>
                  <div className={cn('rounded-lg border p-3', isDark ? 'bg-[#14161B] border-white/[0.06]' : 'bg-white border-[#8C6D46]/15')}>
                    <div className="font-bold text-[#E05A2B] mb-1">Metrical Dual Score (@time: 4/4)</div>
                    <p className={subtleTextClass}>
                      Combine standard Jianpu digits &amp; beams with Shakuhachi fingerings (or let the engine auto-derive Kinko/Tozan katakana from your Jianpu pitches!):
                    </p>
                    <pre className={cn('mt-2 p-2 rounded-md font-mono text-[11px] overflow-x-auto', isDark ? 'bg-black/30 text-neutral-200' : 'bg-neutral-100 text-neutral-800')}>
{`@instrument: shakuhachi
@school: tozan
@key: D
@time: 4/4
| 1{ロ} 3b/{ツ} 4/{レ,当り} 5{チ,ユリ} - |`}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className={cn('rounded-xl border p-4', isDark ? 'bg-[#1B1E24] border-white/[0.08]' : 'bg-white border-[#8C6D46]/15')}>
                  <h4 className="font-bold text-sm mb-1.5" style={{ fontFamily: SHAKUHACHI_SERIF_FONT }}>
                    琴古流 Kinko-ryū Vertical Reading
                  </h4>
                  <ul className={cn('space-y-1 list-disc list-inside', subtleTextClass)}>
                    <li>Uses <strong>リ</strong> for C5/C6 and shaded fingerings <strong>ウ / イ / ル</strong>.</li>
                    <li>Draws a continuous vertical line running down the middle of the column with filled <strong>●</strong> (表拍 on-beat) and hollow <strong>○</strong> (裏拍 off-beat) beat dots along the right side.</li>
                    <li>Rests appear as hollow circles <strong>○</strong>; sustained multi-beat notes extend down the center line with right-side beat dots for each held beat.</li>
                  </ul>
                </div>
                <div className={cn('rounded-xl border p-4', isDark ? 'bg-[#1B1E24] border-white/[0.08]' : 'bg-white border-[#8C6D46]/15')}>
                  <h4 className="font-bold text-sm mb-1.5" style={{ fontFamily: SHAKUHACHI_SERIF_FONT }}>
                    都山流 Tozan-ryū Vertical Reading
                  </h4>
                  <ul className={cn('space-y-1 list-disc list-inside', subtleTextClass)}>
                    <li>Uses <strong>ハ</strong> for C5/C6 and <strong>ピ</strong> for Dai-kan D6.</li>
                    <li>Draws continuous vertical duration lines along the <strong>right side</strong> of notes (1 line = 8th, 2 parallel lines = 16th, 3 = 32nd) with right-side <strong>•</strong> augmentation dots and beat ticks.</li>
                    <li>Rests appear as explicit <strong>休</strong> kanji with crisp horizontal measure barlines.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
