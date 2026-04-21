'use client'
import { useState, useEffect, useMemo }  from 'react'
import dynamic                           from 'next/dynamic'
import Link                              from 'next/link'
import { ChevronLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react'

import { AllData, FrlRow }               from '@/types'
import { GRADES, TICK_VALS, TICK_TEXTS } from '@/lib/constants'
import { fetchDashboardData }            from '@/services/scoreService'
import { MultiSelect }                   from '@/components/MultiSelect'
import { ChartSkeleton }                 from '@/components/ChartSkeleton'
import { getYear, weightedAvg }          from '@/lib/chartUtils'

const Plot = dynamic(
    () => import('react-plotly.js').then(mod => mod.default),
    { ssr: false, loading: () => <ChartSkeleton /> }
)

const SUBJECTS = ['Mathematics', 'English Language Arts']

// ── Linear regression ────────────────────────────────────────────────────────
function linearRegression(points: { x: number; y: number }[]) {
    const n = points.length
    if (n < 2) return null
    const sumX  = points.reduce((a, p) => a + p.x, 0)
    const sumY  = points.reduce((a, p) => a + p.y, 0)
    const sumXY = points.reduce((a, p) => a + p.x * p.y, 0)
    const sumX2 = points.reduce((a, p) => a + p.x * p.x, 0)
    const denom = n * sumX2 - sumX * sumX
    if (denom === 0) return null
    const slope     = (n * sumXY - sumX * sumY) / denom
    const intercept = (sumY - slope * sumX) / n
    return { slope, intercept }
}

// ── Equity Page ──────────────────────────────────────────────────────────────
export default function EquityPage() {
    const [allData,     setAllData]     = useState<AllData | null>(null)
    const [frlData,     setFrlData]     = useState<FrlRow[]>([])
    const [colorMap,    setColorMap]    = useState<Record<string, string>>({})
    const [dataLoading, setDataLoading] = useState(true)
    const [error,       setError]       = useState('')

    const [subject,     setSubject]     = useState('Mathematics')
    const [selGrades,   setSelGrades]   = useState<string[]>(['03'])
    const [selYear,     setSelYear]     = useState<string>('2024')
    const [subjectOpen, setSubjectOpen] = useState(false)

    useEffect(() => {
        fetchDashboardData()
            .then(({ allData, colorMap, frlData }) => {
                setAllData(allData)
                setColorMap(colorMap)
                setFrlData(frlData)
                setDataLoading(false)
            })
            .catch(e => { setError(e.message); setDataLoading(false) })
    }, [])

    const yearOptions = useMemo(() => {
        const years = [...new Set(frlData.map(r => String(getYear(r.school_year))))]
            .sort((a, b) => Number(b) - Number(a))
        return years.map(y => ({
            value: y,
            label: TICK_TEXTS[TICK_VALS.indexOf(Number(y))] ?? y,
        }))
    }, [frlData])

    const districtScores = useMemo(() => {
        if (!allData) return {}
        const source = subject === 'Mathematics' ? allData.math : allData.english
        const rows = source.filter(r =>
            r.level         === 'DI'  &&
            r.subgroup_type === 'ALL' &&
            selGrades.includes(r.grade) &&
            String(getYear(r.school_year)) === selYear
        )
        const byDist: Record<string, { scores: number[]; counts: number[] }> = {}
        rows.forEach(r => {
            if (!byDist[r.agency_name]) byDist[r.agency_name] = { scores: [], counts: [] }
            byDist[r.agency_name].scores.push(parseFloat(r.avg_scale_score))
            byDist[r.agency_name].counts.push(parseFloat(r.count_tested) || 1)
        })
        const result: Record<string, number> = {}
        Object.entries(byDist).forEach(([name, { scores, counts }]) => {
            result[name] = weightedAvg(scores, counts)
        })
        return result
    }, [allData, subject, selGrades, selYear])

    const districtFrl = useMemo(() => {
        const result: Record<string, number> = {}
        frlData
            .filter(r => String(getYear(r.school_year)) === selYear)
            .forEach(r => { 
                // Multiply by 100 and round to get a clean whole number (1-100)
                const rawValue = parseFloat(r.pct_frl);
                result[r.agency_name] = Math.round(rawValue * 100); 
            })
        return result
    }, [frlData, selYear])

    const scatterPoints = useMemo(() => {
        return Object.entries(districtScores)
            .filter(([name]) => districtFrl[name] != null && !isNaN(districtFrl[name]))
            .map(([name, score]) => ({
                name,
                x    : districtFrl[name],
                y    : score,
                color: colorMap[name] || '#94a3b8',
            }))
            .filter(p => p.y > 0)
    }, [districtScores, districtFrl, colorMap])

    const regression = useMemo(() => {
        if (scatterPoints.length < 3) return null
        return linearRegression(scatterPoints)
    }, [scatterPoints])

    const withGap = useMemo(() => {
        if (!regression) return scatterPoints.map(p => ({ ...p, gap: 0, predicted: p.y }))
        return scatterPoints.map(p => {
            const predicted = regression.slope * p.x + regression.intercept
            return { ...p, predicted, gap: p.y - predicted }
        })
    }, [scatterPoints, regression])

    const traces = useMemo(() => {
        if (!withGap.length) return []

        const scatter = {
            type      : 'scatter',
            mode      : 'markers',
            x         : withGap.map(p => p.x),
            y         : withGap.map(p => p.y),
            text      : withGap.map(p => p.name),
            customdata: withGap.map(p => [p.gap.toFixed(1), p.predicted.toFixed(1)]),
            marker    : {
                size   : 10,
                color  : withGap.map(p => p.color),
                opacity: 0.85,
                line   : { width: 1.5, color: '#fff' },
            },
            hovertemplate:
                '<b>%{text}</b><br>' +
                'FRL: %{x:.1f}%<br>' +
                'Score: %{y:.1f}<br>' +
                'vs. Expected: <b>%{customdata[0]}</b><extra></extra>',
            showlegend: false,
        }

        const result: object[] = [scatter]

        if (regression) {
            const xs    = withGap.map(p => p.x)
            const minX  = Math.min(...xs)
            const maxX  = Math.max(...xs)
            const lineX = [minX, maxX]
            const lineY = lineX.map(x => regression.slope * x + regression.intercept)
            result.push({
                type      : 'scatter',
                mode      : 'lines',
                x         : lineX,
                y         : lineY,
                line      : { color: '#94a3b8', width: 1.5, dash: 'dash' },
                hoverinfo : 'skip',
                showlegend: false,
            })
        }

        return result
    }, [withGap, regression])

    const sorted          = useMemo(() => [...withGap].sort((a, b) => b.gap - a.gap), [withGap])
    const topDistricts    = sorted.slice(0, 5)
    const bottomDistricts = sorted.slice(-5).reverse()

    const gradeLabel = selGrades.length === GRADES.length
        ? 'All Grades'
        : selGrades.map(g => `Grade ${parseInt(g)}`).join(', ')

    const yearLabel = yearOptions.find(y => y.value === selYear)?.label ?? selYear

    return (
        <div className="min-h-screen bg-[#f4f6f9]">

            {/* Header */}
            <header className="bg-[#1a3353] shadow-lg">
                <div className="mx-auto max-w-screen-2xl px-4 sm:px-8 lg:px-12
                                py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
                    <div>
                        <h1 className="text-white font-bold text-lg sm:text-xl lg:text-3xl
                                       tracking-wide leading-tight">
                            Nebraska Department of Education
                        </h1>
                        <p className="text-blue-200 text-[10px] sm:text-xs mt-0.5
                                      font-medium tracking-widest uppercase">
                            Assessment Data Dashboard
                        </p>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-screen-2xl px-4 sm:px-8 lg:px-12 py-5 sm:py-8">

                {/* Back + Title */}
                <div className="flex flex-col gap-4 mb-6">
                    <Link
                        href="/"
                        className="inline-flex p-2 rounded-full bg-white shadow-sm
                                   border border-gray-200 hover:bg-gray-50
                                   transition-colors group w-fit"
                    >
                        <ChevronLeft className="w-4 h-4 text-gray-600 group-hover:text-gray-900" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            Equity Analysis
                        </h1>
                        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                            Compares each district's average score against what would be expected
                            given its Free &amp; Reduced Lunch rate — a proxy for student income level.
                            Districts above the trend line are performing better than expected;
                            those below warrant closer attention.
                        </p>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100
                                p-4 sm:p-6 mb-5">
                    <div className="flex flex-wrap gap-4 items-end">

                        {/* Subject */}
                        <div className="relative min-w-[200px]">
                            <p className="text-[11px] font-semibold text-gray-400
                                          uppercase tracking-widest mb-2">Subject</p>
                            <button
                                type="button"
                                onClick={() => setSubjectOpen(o => !o)}
                                className="w-full h-11 flex items-center justify-between gap-3
                                           px-4 bg-white border-[3px] border-[#15315E]
                                           rounded-xl text-sm font-semibold text-gray-700
                                           hover:bg-gray-50 transition-all shadow-sm"
                            >
                                <span className="truncate text-left">{subject}</span>
                                <ChevronLeft className={`w-4 h-4 text-[#15315E] flex-shrink-0
                                                         transition-transform duration-200
                                                         ${subjectOpen ? '-rotate-90' : 'rotate-180'}`} />
                            </button>
                            {subjectOpen && (
                                <>
                                    <div className="fixed inset-0 z-40"
                                         onClick={() => setSubjectOpen(false)} />
                                    <div className="absolute z-50 mt-2 w-full bg-white
                                                    border border-gray-200 rounded-xl
                                                    shadow-2xl overflow-hidden">
                                        {SUBJECTS.map(opt => (
                                            <button key={opt}
                                                onClick={() => { setSubject(opt); setSubjectOpen(false) }}
                                                className={`w-full px-4 py-3 text-left text-sm
                                                            transition-colors ${
                                                    subject === opt
                                                        ? 'bg-blue-50 text-[#15315E] font-bold'
                                                        : 'text-gray-600 hover:bg-gray-50'
                                                }`}>
                                                <div className="flex items-center justify-between">
                                                    {opt}
                                                    {subject === opt && (
                                                        <div className="w-2 h-2 rounded-full bg-[#15315E]" />
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Grade */}
                        <div className="min-w-[150px]">
                            <MultiSelect
                                label="Grade"
                                options={GRADES}
                                selected={selGrades}
                                onChange={setSelGrades}
                                placeholder="Select Grades"
                                accentColor="#0f2448"
                            />
                        </div>

                        {/* Year */}
                        <div className="min-w-[160px]">
                            <MultiSelect
                                label="School Year"
                                options={yearOptions}
                                selected={selYear ? [selYear] : []}
                                onChange={vals => setSelYear(vals[0] ?? selYear)}
                                placeholder="Select Year"
                                accentColor="#0f2448"
                                singleSelect={true}
                            />
                        </div>
                    </div>
                </div>

                {/* Main content */}
                {dataLoading ? (
                    <ChartSkeleton />
                ) : error ? (
                    <div className="h-64 flex items-center justify-center text-red-500 text-sm">
                        Error loading data: {error}
                    </div>
                ) : (
                    <div className="flex flex-col gap-5">

                        {/* Scatter plot card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">

                            {/* Chart header: title left, legend pills right */}
                            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                                <div>
                                    <h3 className="text-sm sm:text-base font-semibold text-gray-800">
                                        {subject} — {gradeLabel} · {yearLabel}
                                    </h3>
                                    <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
                                        Each point represents one district &nbsp;·&nbsp;
                                        X = Free &amp; Reduced Lunch % &nbsp;·&nbsp; Y = Avg Scale Score
                                    </p>
                                </div>

                                {/* Legend pills — inline, top-right */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex items-center gap-1.5 bg-emerald-50
                                                    border border-emerald-200 rounded-lg px-2.5 py-1.5">
                                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                        <span className="text-[11px] font-semibold text-emerald-700 whitespace-nowrap">
                                            Above line — Outperforming
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-red-50
                                                    border border-red-200 rounded-lg px-2.5 py-1.5">
                                        <TrendingDown className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                                        <span className="text-[11px] font-semibold text-red-600 whitespace-nowrap">
                                            Below line — Underperforming
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-gray-50
                                                    border border-gray-200 rounded-lg px-2.5 py-1.5">
                                        <Minus className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                        <span className="text-[11px] font-semibold text-gray-500 whitespace-nowrap">
                                            Expected trend
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {traces.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center
                                                text-gray-400 text-sm text-center px-4 gap-2">
                                    <span>No data available for the current selection.</span>
                                </div>
                            ) : (
                                <Plot
                                    data={traces as any}
                                    layout={{
                                        xaxis: {
                                            title    : { text: 'Free & Reduced Lunch (%)', font: { size: 11 } },
                                            gridcolor: '#f3f4f6',
                                            linecolor: '#e5e7eb',
                                            ticksuffix: '%',
                                        },
                                        yaxis: {
                                            title    : { text: 'Average Scale Score', font: { size: 11 } },
                                            gridcolor: '#f3f4f6',
                                            linecolor: '#e5e7eb',
                                        },
                                        hovermode    : 'closest',
                                        showlegend   : false,
                                        plot_bgcolor : 'white',
                                        paper_bgcolor: 'white',
                                        height  : 460,
                                        margin  : { t: 10, r: 20, b: 60, l: 70 },
                                        autosize: true,
                                        font    : { family: 'Inter, sans-serif', size: 10, color: '#6b7280' },
                                    }}
                                    style={{ width: '100%' }}
                                    config={{
                                        responsive          : true,
                                        displayModeBar      : false,
                                        toImageButtonOptions: {
                                            format  : 'png',
                                            filename: `NDE_Equity_${subject}`,
                                            scale   : 2,
                                        },
                                    }}
                                    useResizeHandler={true}
                                />
                            )}
                        </div>

                        {/* Top / Bottom performers */}
                        {withGap.length > 0 && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                                {/* Overperformers */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                                    <div className="flex items-center gap-2 mb-1">
                                        <TrendingUp className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                        <p className="text-sm font-semibold text-gray-800">
                                            Top Overperformers
                                        </p>
                                    </div>
                                    <p className="text-[11px] text-gray-400 mb-4">
                                        Scoring above expectations relative to their FRL rate
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        {topDistricts.map((d, i) => (
                                            <div key={d.name}
                                                 className="flex items-center justify-between
                                                            py-2.5 px-3 rounded-xl
                                                            bg-emerald-50 border border-emerald-100">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className="text-xs font-bold text-emerald-700
                                                                     w-5 flex-shrink-0 text-right">
                                                        {i + 1}
                                                    </span>
                                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                         style={{ background: d.color }} />
                                                    <span className="text-xs text-gray-700 font-medium truncate">
                                                        {d.name}
                                                    </span>
                                                </div>
                                                <div className="text-right flex-shrink-0 ml-3">
                                                    <p className="text-xs font-bold text-emerald-700">
                                                        +{d.gap.toFixed(1)} pts
                                                    </p>
                                                    <p className="text-[10px] text-gray-400">
                                                        {d.x.toFixed(1)}% FRL
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Underperformers */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                                    <div className="flex items-center gap-2 mb-1">
                                        <TrendingDown className="w-4 h-4 text-red-500 flex-shrink-0" />
                                        <p className="text-sm font-semibold text-gray-800">
                                            Underperformers
                                        </p>
                                    </div>
                                    <p className="text-[11px] text-gray-400 mb-4">
                                        Scoring below expectations relative to their FRL rate
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        {bottomDistricts.map((d, i) => (
                                            <div key={d.name}
                                                 className="flex items-center justify-between
                                                            py-2.5 px-3 rounded-xl
                                                            bg-red-50 border border-red-100">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className="text-xs font-bold text-red-500
                                                                     w-5 flex-shrink-0 text-right">
                                                        {i + 1}
                                                    </span>
                                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                         style={{ background: d.color }} />
                                                    <span className="text-xs text-gray-700 font-medium truncate">
                                                        {d.name}
                                                    </span>
                                                </div>
                                                <div className="text-right flex-shrink-0 ml-3">
                                                    <p className="text-xs font-bold text-red-500">
                                                        {d.gap.toFixed(1)} pts
                                                    </p>
                                                    <p className="text-[10px] text-gray-400">
                                                        {d.x.toFixed(1)}% FRL
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}
