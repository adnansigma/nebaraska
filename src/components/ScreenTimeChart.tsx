'use client'
import { useEffect, useRef, useState } from 'react'

type ScreenKey = 'total' | 'tv' | 'video'

interface RowData {
    label: string
    or: number
    pct: number       // (1 - OR) * 100, rounded — the plain-language drop %
    ci: string
    p: string
    sig: boolean
    grade: 3 | 6
}

interface ScreenData {
    rows: RowData[]
    unit: string
    note: string
}

// pct = percentage drop in chances = (1 - OR) * 100
const DATA: Record<ScreenKey, ScreenData> = {
    total: {
        unit: 'per extra hour/day',
        rows: [
            { label: 'Reading — Grade 3', or: 0.91, pct: 9,  ci: '0.86–0.96', p: '.001',  sig: true,  grade: 3 },
            { label: 'Writing — Grade 3', or: 0.94, pct: 6,  ci: '0.88–1.01', p: '.08',   sig: false, grade: 3 },
            { label: 'Math — Grade 3',    or: 0.91, pct: 9,  ci: '0.86–0.96', p: '<.001', sig: true,  grade: 3 },
            { label: 'Reading — Grade 6', or: 0.97, pct: 3,  ci: '0.90–1.05', p: '.45',   sig: false, grade: 6 },
            { label: 'Writing — Grade 6', or: 0.96, pct: 4,  ci: '0.89–1.03', p: '.21',   sig: false, grade: 6 },
            { label: 'Math — Grade 6',    or: 0.90, pct: 10, ci: '0.84–0.96', p: '.002',  sig: true,  grade: 6 },
        ],
        note: 'Each extra hour of daily screen time is linked to roughly a 9–10% drop in the chances of children meeting their grade level in Reading and Math (Grade 3) and Math (Grade 6). Writing showed no confirmed effect in either grade. These are confirmed findings — the study ruled out chance as the cause.',
    },
    tv: {
        unit: 'per extra hour/day',
        rows: [
            { label: 'Reading — Grade 3', or: 0.91, pct: 9,  ci: '0.85–0.97', p: '.004',  sig: true,  grade: 3 },
            { label: 'Writing — Grade 3', or: 0.93, pct: 7,  ci: '0.87–1.01', p: '.08',   sig: false, grade: 3 },
            { label: 'Math — Grade 3',    or: 0.90, pct: 10, ci: '0.85–0.96', p: '<.001', sig: true,  grade: 3 },
            { label: 'Reading — Grade 6', or: 0.93, pct: 7,  ci: '0.86–1.02', p: '.11',   sig: false, grade: 6 },
            { label: 'Writing — Grade 6', or: 0.94, pct: 6,  ci: '0.87–1.02', p: '.12',   sig: false, grade: 6 },
            { label: 'Math — Grade 6',    or: 0.89, pct: 11, ci: '0.82–0.96', p: '.002',  sig: true,  grade: 6 },
        ],
        note: 'TV and digital media time (TV, DVDs, computers, handheld devices — not including video games) shows a similar pattern. Each extra hour per day is linked to a ~9–11% drop in chances of meeting grade level for Grade 3 Reading & Math and Grade 6 Math. No confirmed effect on writing.',
    },
    video: {
        unit: 'any use vs. none',
        rows: [
            { label: 'Reading — Grade 3', or: 0.77, pct: 23, ci: '0.62–0.94', p: '.01',  sig: true,  grade: 3 },
            { label: 'Writing — Grade 3', or: 0.90, pct: 10, ci: '0.67–1.21', p: '.50',  sig: false, grade: 3 },
            { label: 'Math — Grade 3',    or: 0.85, pct: 15, ci: '0.71–1.01', p: '.07',  sig: false, grade: 3 },
            { label: 'Reading — Grade 6', or: 1.09, pct: -9, ci: '0.86–1.38', p: '.47',  sig: false, grade: 6 },
            { label: 'Writing — Grade 6', or: 0.95, pct: 5,  ci: '0.76–1.18', p: '.64',  sig: false, grade: 6 },
            { label: 'Math — Grade 6',    or: 0.99, pct: 1,  ci: '0.81–1.22', p: '.96',  sig: false, grade: 6 },
        ],
        note: 'Children who played any video games had a 23% lower chance of meeting the Grade 3 reading standard compared to non-users. This was the only confirmed finding for video games. No confirmed links were found for math or writing in Grade 3, or any subject in Grade 6.',
    },
}

const TABS: { key: ScreenKey; label: string }[] = [
    { key: 'total', label: 'Total screen time'  },
    { key: 'tv',    label: 'TV & digital media' },
    { key: 'video', label: 'Video games'         },
]

const barColor  = (r: RowData) => !r.sig ? '#c8ddf2' : r.grade === 3 ? '#1a3353' : '#4a6fa5'
const barBorder = (r: RowData) => !r.sig ? '#8aafd4' : r.grade === 3 ? '#1a3353' : '#4a6fa5'

export function ScreenTimeChart() {
    const [active, setActive] = useState<ScreenKey>('total')
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const chartRef  = useRef<any>(null)

    useEffect(() => {
        let cancelled = false
        async function build() {
            const { Chart, registerables } = await import('chart.js')
            if (cancelled) return
            Chart.register(...registerables)
            if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }

            const d = DATA[active]

            chartRef.current = new Chart(canvasRef.current!, {
                type: 'bar',
                data: {
                    labels: d.rows.map(r => r.label),
                    datasets: [{
                        label: 'Drop in chances of meeting grade level (%)',
                        // OR > 1 (pct < 0) = no drop — show a tiny stub so the row label stays visible
                        data: d.rows.map(r => r.pct < 0 ? 0.6 : r.pct),
                        backgroundColor: d.rows.map(r => r.pct < 0 ? '#e5e7eb' : barColor(r)),
                        borderColor:     d.rows.map(r => r.pct < 0 ? '#d1d5db' : barBorder(r)),
                        borderWidth:     d.rows.map(r => r.sig ? 0 : 1),
                        borderRadius:    5,
                    }],
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                title: (items: any[]) => items[0].label,
                                label: (item: any) => {
                                    const r = DATA[active].rows[item.dataIndex]
                                    const dropText = r.or > 1
                                        ? `  No drop — slightly higher odds (OR ${r.or.toFixed(2)}, not confirmed)`
                                        : `  ~${r.pct}% lower chance of meeting grade level`
                                    return [
                                        dropText,
                                        `  ${r.sig ? '✓ Confirmed finding' : '✗ Result may be due to chance'}`,
                                        `  ────────────────────────`,
                                        `  Research figure (OR): ${r.or.toFixed(2)}  (95% CI: ${r.ci})`,
                                        `  p value: ${r.p}`,
                                    ]
                                },
                            },
                            backgroundColor: '#1a3353',
                            titleColor: '#e6f1fb',
                            bodyColor: '#b5d4f4',
                            padding: 12,
                            cornerRadius: 8,
                        },
                    },
                    scales: {
                        x: {
                            min: 0,
                            max: 30,
                            title: {
                                display: true,
                                text: active === 'video'
                                    ? 'Drop in chances of meeting grade level (%) — any video game use vs. none'
                                    : 'Drop in chances of meeting grade level (%) per extra hour/day of screen time',
                                font: { size: 10 },
                                color: '#6b7280',
                            },
                            ticks: {
                                callback: (v: any) => `${v}%`,
                                color: '#6b7280',
                                font: { size: 10 },
                                stepSize: 5,
                            },
                            grid: { color: '#f3f4f6' },
                        },
                        y: {
                            ticks: { color: '#374151', font: { size: 11 } },
                            grid: { display: false },
                        },
                    },
                    animation: { duration: 300 },
                },
            })
        }
        build()
        return () => {
            cancelled = true
            if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
        }
    }, [active])

    return (
        <div>
            {/* Stat pills */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                {[
                    { num: '~9% lower',  sub: 'chance of meeting grade level per extra hour/day — Gr.3 Reading & Math' },
                    { num: '~10% lower', sub: 'chance of meeting grade level per extra hour/day — Gr.6 Math' },
                    { num: '~23% lower', sub: 'chance of meeting Gr.3 reading standard — children who play any video games vs. none' },
                    { num: '5,400+',     sub: 'children tracked from toddlerhood to elementary school, 2008–2023' },
                ].map(({ num, sub }) => (
                    <div key={num} className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-center">
                        <p className="text-base sm:text-lg font-bold text-blue-900">{num}</p>
                        <p className="text-[9px] sm:text-[10px] text-blue-700 mt-0.5 leading-tight">{sub}</p>
                    </div>
                ))}
            </div>

            {/* Plain-language how-to-read box */}
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 mb-4">
                <p className="text-[11px] sm:text-xs text-amber-900 leading-relaxed">
                    <span className="font-semibold">How to read this chart: </span>
                    Each bar shows how much a child's <strong>chance of meeting their grade-level standard drops</strong> for
                    each extra hour of that screen type per day. A longer bar = a bigger drop.{' '}
                    <span className="italic">Faded bars</span> mean the result could be due to chance (not a confirmed finding).
                    Hover any bar to see the exact research figures.
                </p>
            </div>

            {/* Screen type tabs */}
            <div className="flex gap-2 flex-wrap mb-4">
                {TABS.map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setActive(key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                            ${active === key
                                ? 'bg-[#1a3353] text-white border-[#1a3353]'
                                : 'bg-blue-50 text-blue-900 border-blue-100 hover:bg-blue-100'}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mb-3">
                {[
                    { swatch: 'bg-[#1a3353]',                          label: 'Grade 3 — confirmed finding' },
                    { swatch: 'bg-[#4a6fa5]',                          label: 'Grade 6 — confirmed finding' },
                    { swatch: 'bg-[#c8ddf2] border border-[#8aafd4]', label: 'Result may be due to chance' },
                    { swatch: 'bg-[#e5e7eb] border border-[#d1d5db]', label: 'No drop (OR ≥ 1.0)'          },
                ].map(({ swatch, label }) => (
                    <span key={label} className="flex items-center gap-1.5 text-[10px] sm:text-xs text-gray-500">
                        <span className={`w-3 h-3 rounded-sm inline-block ${swatch}`} />
                        {label}
                    </span>
                ))}
            </div>

            {/* Chart */}
            <div className="relative w-full" style={{ height: '340px' }}>
                <canvas
                    ref={canvasRef}
                    role="img"
                    aria-label={`Drop in chances of meeting grade level for ${active} screen time across reading, writing and math in grades 3 and 6`}
                />
            </div>

            {/* Plain-language finding summary */}
            <div className="mt-4 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
                <p className="text-[11px] sm:text-xs text-blue-900 leading-relaxed">
                    <span className="font-semibold">What this means: </span>
                    {DATA[active].note}
                </p>
            </div>

            {/* Footnote for the technically curious */}
            <div className="mt-3 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="text-[10px] sm:text-xs text-gray-500 leading-relaxed">
                    <span className="font-semibold text-gray-600">Statistical note: </span>
                    Percentage estimates are derived from proportional odds ratios reported in Table 3 of Li et al. (
                    <em>JAMA Network Open</em>, 2025). For interpretive clarity, each odds ratio has been converted to an
                    approximate percentage-point change in the likelihood of meeting grade-level standards
                    (e.g., OR = 0.91 ≈ 9% reduction). This conversion is an approximation; readers are encouraged
                    to consult the original odds ratios, 95% confidence intervals, and p values — available on hover —
                    for precise statistical inference.
                </p>
            </div>
        </div>
    )
}
