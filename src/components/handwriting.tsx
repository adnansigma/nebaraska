import React, { useState } from 'react';
import {
    PenLine, BookOpen, Eye, Hand, Crosshair, Layers,
    ChevronLeft, ChevronRight, TrendingUp, Activity, Link2,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────
   Data notes — what's actually in Van der Weel & Van der Meer (2024):
   - 16 significant connections / 32 clusters for handwriting, 0 for typing
   - 36 students, 256-channel EEG, theta (3.5–7.5Hz) & alpha (8–12.5Hz)
   - Cluster differences were significant specifically in parietal left (PL),
     parietal midline (PM), and parietal right (PR)
   - The three largest single connections highlighted in Fig. 2 are
     CR–PM, CL–PM, and CM–CR
   - The paper does NOT report a per-region connectivity percentage —
     those are removed. Region "role" text below is general neuroscience
     background, not a study-reported figure.
   Palette matches the rest of the Research Charts page (navy #1a3353,
   blue ramp #2d5282/#4a6fa5/#8aafd4, gray-100 borders, blue-50 callouts).
   Fonts: Fraunces (display), Caveat (handwriting-only labels),
   Space Mono (typewriting-only labels).
   ──────────────────────────────────────────────────────────────────── */

const REGIONS = [
    {
        code: 'PL', region: 'Parietal Left', role: 'Language & Writing', icon: PenLine,
        detail: 'This region processes written language — connecting letters, words, and meaning. It is active during reading, spelling, and comprehension. Handwriting keeps it highly engaged because each letter must be carefully formed.',
    },
    {
        code: 'PM', region: 'Parietal Midline', role: 'Memory Formation', icon: BookOpen,
        detail: 'Often called the brain\u2019s "save button" — this region encodes new information into long-term memory. When it is active and connected to other regions, what you learn is more likely to stick.',
    },
    {
        code: 'PR', region: 'Parietal Right', role: 'Spatial Awareness', icon: Eye,
        detail: 'Handles the visual and spatial processing needed to recognise the shape, size, and orientation of letters. This is what allows a child to tell the difference between "b" and "d."',
    },
    {
        code: 'CL', region: 'Central Left', role: 'Fine Motor Control', icon: Hand,
        detail: 'Manages the precise, controlled movements of the hand and fingers during writing. Because every letter requires a unique movement pattern, this region stays continuously active during handwriting.',
    },
    {
        code: 'CM', region: 'Central Midline', role: 'Attention & Focus', icon: Crosshair,
        detail: 'Coordinates sustained attention — keeping the brain on task. Handwriting requires deliberate effort for each character, which maintains a higher level of focus compared to tapping a single key.',
    },
    {
        code: 'CR', region: 'Central Right', role: 'Sensorimotor Integration', icon: Layers,
        detail: 'Links visual input, motor commands, and physical feedback into one experience. When writing by hand, the eyes, hand, and brain form a continuous feedback loop that reinforces learning.',
    },
];

// The three specific connections singled out in the paper's Figure 2 as
// showing the largest significant difference between handwriting and typing.
// "Connection" = the two regions were firing in sync with each other far
// more during handwriting than during typing — i.e. working as a team.
const STRONG_CONNECTIONS = [
    { a: 'CR', b: 'PM' },
    { a: 'CL', b: 'PM' },
    { a: 'CM', b: 'CR' },
];

const PARIETAL_HIGHLIGHT = ['PL', 'PM', 'PR'];

const WAVES = [
    {
        Icon: Activity, freq: '3.5 – 7.5 Hz', role: 'Working Memory', wave: 'Theta',
        detail: 'These slow waves are the brain\u2019s way of holding new information in mind and processing it. When theta activity is high, the brain is actively absorbing and organising what it\u2019s encountering — which is exactly what good learning looks like.',
    },
    {
        Icon: TrendingUp, freq: '8 – 12.5 Hz', role: 'Long-Term Memory', wave: 'Alpha',
        detail: 'Alpha waves are linked to consolidating information into lasting memory. When these connections are strong, what a student learns in class is far more likely to be retained the next day, week, and month.',
    },
];

export default function HandwritingVsTypewriting() {
    const [idx, setIdx] = useState(0);
    const r = REGIONS[idx];
    const Icon = r.icon;
    const isParietalHighlight = PARIETAL_HIGHLIGHT.includes(r.code);
    const connections = STRONG_CONNECTIONS
        .filter(c => c.a === r.code || c.b === r.code)
        .map(c => REGIONS.find(reg => reg.code === (c.a === r.code ? c.b : c.a)))
        .filter((reg) => reg !== undefined);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-8 mb-5">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Caveat:wght@600;700&family=Space+Mono:wght@400;700&display=swap');
                .font-display { font-family: 'Fraunces', serif; font-optical-sizing: auto; }
                .font-hw { font-family: 'Caveat', cursive; }
                .font-tw { font-family: 'Space Mono', monospace; }
            `}</style>

            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 pb-6 border-b border-gray-100">
                <div>
                    <p className="font-tw text-[10px] text-[#4a6fa5] uppercase tracking-[0.2em] mb-2">
                        EEG Research &middot; NTNU 2024
                    </p>
                    <h3 className="font-display text-2xl sm:text-3xl font-semibold text-[#1a3353] leading-tight">
                        Handwriting <span className="text-gray-400 font-normal">vs.</span> Typewriting
                    </h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-sm">
                    A 256-sensor EEG study recorded brain activity in 36 university students as they
                    wrote or typed the same words. The difference in how the brain engaged was
                    immediate and significant.
                </p>
            </div>

            {/* ── Hero trace comparison ─────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {/* Handwriting trace */}
                <div className="relative overflow-hidden rounded-xl bg-[#1a3353] px-6 py-6">
                    <svg viewBox="0 0 300 60" className="absolute inset-x-0 bottom-0 w-full h-16 opacity-70">
                        <path d="M0,30 Q10,8 20,32 T40,28 Q50,4 60,34 T80,30 Q90,10 100,32 T120,26 Q130,6 140,34 T160,30 Q170,12 180,30 T200,28 Q210,6 220,34 T240,30 Q250,10 260,32 T280,28 Q290,14 300,30"
                            fill="none" stroke="#8aafd4" strokeWidth="2" />
                    </svg>
                    <p className="font-tw text-[10px] text-[#8aafd4] uppercase tracking-[0.2em] mb-3">During handwriting</p>
                    <p className="font-display text-5xl font-semibold text-white leading-none mb-2">16</p>
                    <p className="font-hw text-2xl text-blue-200 leading-none">significant brain connections</p>
                </div>

                {/* Typewriting trace */}
                <div className="relative overflow-hidden rounded-xl bg-white border border-gray-100 px-6 py-6">
                    <svg viewBox="0 0 300 60" className="absolute inset-x-0 bottom-0 w-full h-16 opacity-70">
                        <line x1="0" y1="30" x2="300" y2="30" stroke="#d1d5db" strokeWidth="2" strokeDasharray="1 6" strokeLinecap="round" />
                    </svg>
                    <p className="font-tw text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-3">During typewriting</p>
                    <p className="font-display text-5xl font-semibold text-[#1a3353] leading-none mb-2">0</p>
                    <p className="font-tw text-sm text-gray-400 leading-none tracking-wide">significant brain connections</p>
                </div>
            </div>

            {/* Supporting stats */}
            <div className="grid grid-cols-2 gap-3 mb-10">
                <div className="rounded-xl bg-blue-50 border border-blue-100 px-5 py-3 flex items-center justify-between">
                    <span className="text-xs text-gray-600">Significant clusters found across brain regions</span>
                    <span className="font-display text-xl font-semibold text-blue-900 ml-3 shrink-0">32</span>
                </div>
                <div className="rounded-xl bg-blue-50 border border-blue-100 px-5 py-3 flex items-center justify-between">
                    <span className="text-xs text-gray-600">University students studied with 256-sensor EEG</span>
                    <span className="font-display text-xl font-semibold text-blue-900 ml-3 shrink-0">36</span>
                </div>
            </div>

            {/* ── Section label ──────────────────────────────────────── */}
            <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-gray-100" />
                <p className="font-tw text-[10px] text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">
                    Six brain regions
                </p>
                <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* ── Region picker + detail panel ───────────────────────── */}
            <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden mb-8">
                <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr]">

                    {/* Region picker, arranged parietal (top) / central (bottom) as in the paper's own layout */}
                    <div className="bg-[#1a3353] p-6 flex flex-col items-center justify-center gap-3">
                        <p className="font-tw text-[9px] text-[#8aafd4] uppercase tracking-[0.2em] mb-1">Parietal</p>
                        <div className="flex gap-2">
                            {REGIONS.slice(0, 3).map((reg, i) => (
                                <button key={reg.code} onClick={() => setIdx(i)}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center font-tw text-[11px] font-bold transition-all cursor-pointer border
                                        ${idx === i
                                            ? 'bg-[#4a6fa5] border-[#4a6fa5] text-white scale-110'
                                            : 'bg-transparent border-white/25 text-[#8aafd4] hover:border-white/50'}`}>
                                    {reg.code}
                                </button>
                            ))}
                        </div>
                        <div className="w-px h-4 bg-white/15 my-1" />
                        <div className="flex gap-2">
                            {REGIONS.slice(3, 6).map((reg, i) => (
                                <button key={reg.code} onClick={() => setIdx(i + 3)}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center font-tw text-[11px] font-bold transition-all cursor-pointer border
                                        ${idx === i + 3
                                            ? 'bg-[#4a6fa5] border-[#4a6fa5] text-white scale-110'
                                            : 'bg-transparent border-white/25 text-[#8aafd4] hover:border-white/50'}`}>
                                    {reg.code}
                                </button>
                            ))}
                        </div>
                        <p className="font-tw text-[9px] text-[#8aafd4] uppercase tracking-[0.2em] mt-1">Central</p>

                        <div className="flex items-center gap-2 mt-4">
                            <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
                                className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/20 text-white hover:bg-white/10 disabled:opacity-30 transition-all cursor-pointer">
                                <ChevronLeft size={14} />
                            </button>
                            <button onClick={() => setIdx(i => Math.min(REGIONS.length - 1, i + 1))} disabled={idx === REGIONS.length - 1}
                                className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/20 text-white hover:bg-white/10 disabled:opacity-30 transition-all cursor-pointer">
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Detail panel */}
                    <div className="p-6 sm:p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-[#1a3353]/8 flex items-center justify-center shrink-0">
                                <Icon size={18} className="text-[#1a3353]" />
                            </div>
                            <div>
                                <p className="font-display text-lg font-semibold text-[#1a3353] leading-tight">{r.region}</p>
                                <p className="font-tw text-[10px] text-gray-400 uppercase tracking-wider">{r.code} &middot; {r.role}</p>
                            </div>
                        </div>

                        <p className="text-sm text-gray-600 leading-relaxed mb-5">{r.detail}</p>

                        {/* What the study found for this region — only paper-supported claims,
                            kept short and direct for easy scanning */}
                        <div className="border-t border-gray-100 pt-5">
                            <p className="font-tw text-[9px] text-gray-400 uppercase tracking-[0.2em] mb-3">
                                What the study found here
                            </p>

                            {isParietalHighlight && (
                                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-2.5 mb-3">
                                    <TrendingUp size={14} className="text-[#2d5282] shrink-0" />
                                    <p className="text-[12px] text-blue-900 font-medium leading-relaxed">
                                        Was significantly more engaged during handwriting than typewriting.
                                    </p>
                                </div>
                            )}

                            {connections.length > 0 && (
                                <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                                    <p className="text-[11px] text-gray-500 mb-2">
                                        Showed strong syncing with:
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        {connections.map(other => (
                                            <div key={other.code} className="flex items-center gap-2">
                                                <Link2 size={12} className="text-[#4a6fa5] shrink-0" />
                                                <span className="text-[12px] text-[#1a3353]">
                                                    <span className="font-semibold">{other.region}</span>
                                                    <span className="text-gray-400"> — {other.role}</span>
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── What the brain activity means ─────────────────────── */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-5">
                    <div className="flex-1 h-px bg-gray-100" />
                    <p className="font-tw text-[10px] text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">
                        What the brain activity means
                    </p>
                    <div className="flex-1 h-px bg-gray-100" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {WAVES.map(({ Icon: WaveIcon, freq, role, wave, detail }) => (
                        <div key={wave} className="bg-white border border-gray-100 rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 rounded-lg bg-[#1a3353]/8 flex items-center justify-center shrink-0">
                                    <WaveIcon size={16} className="text-[#1a3353]" />
                                </div>
                                <div>
                                    <p className="font-display text-sm font-semibold text-[#1a3353]">{wave} waves &middot; {role}</p>
                                    <p className="font-tw text-[10px] text-gray-400 mt-0.5">{freq}</p>
                                </div>
                            </div>
                            <p className="text-[12px] text-gray-600 leading-relaxed mb-3">{detail}</p>
                            <div className="text-[10px] font-semibold text-blue-900 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                                Activated only during handwriting — not typewriting.
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Key takeaway ───────────────────────────────────────── */}
            <div className="rounded-xl bg-[#1a3353] px-6 py-5 mb-5 border-l-4 border-[#4a6fa5]">
                <p className="font-display text-lg text-white leading-relaxed">
                    Handwriting activates far more of the brain than typing — specifically the regions
                    and wave patterns linked to memory, attention, and learning. The careful, deliberate
                    act of forming each letter by hand creates a rich network of brain connections that
                    a key press simply cannot replicate.
                </p>
            </div>

            {/* Citation */}
            <p className="font-tw text-[10px] text-gray-400 leading-relaxed border-t border-gray-100 pt-4">
                Source: Van der Weel F.R. and Van der Meer A.L.H. (2024). "Handwriting but not
                typewriting leads to widespread brain connectivity: a high-density EEG study with
                implications for the classroom." Frontiers in Psychology, 14:1219945.
                doi: 10.3389/fpsyg.2023.1219945.
            </p>
        </div>
    );
}