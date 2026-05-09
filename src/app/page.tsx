'use client'
import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { ChevronDown, Check } from 'lucide-react'
import { School, TrendingUp, TrendingDown, Minus, BarChart2, ScatterChart } from 'lucide-react'
import { FrlRow, AllData } from '@/types'
import { GRADES, TICK_VALS, TICK_TEXTS } from '@/lib/constants'
import { fetchDashboardData } from '@/services/scoreService'
import { buildTraces } from '@/lib/traceBuilder'
import { MultiSelect } from '@/components/MultiSelect'
import { LineStyleLegend } from '@/components/LineStyleLegend'
import { ChartSkeleton } from '@/components/ChartSkeleton'
import { getYear, weightedAvg } from '@/lib/chartUtils'
import { Navbar } from '@/components/Navbar'

const Plot = dynamic(
    () => import('react-plotly.js').then(mod => mod.default),
    { ssr: false, loading: () => <ChartSkeleton /> }
)

const SUBJECTS = ['Mathematics', 'English Language Arts']
type Tab = 'performance' | 'equity'

// ── Linear regression ─────────────────────────────────────────────────────────
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

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
    // ── Shared state ──────────────────────────────────────────────────────────
    const [allData,     setAllData]     = useState<AllData | null>(null)
    const [districts,   setDistricts]   = useState<string[]>([])
    const [colorMap,    setColorMap]    = useState<Record<string, string>>({})
    const [frlData,     setFrlData]     = useState<FrlRow[]>([])
    const [dataLoading, setDataLoading] = useState(true)
    const [error,       setError]       = useState('')
    const [activeTab,   setActiveTab]   = useState<Tab>('performance')

    // ── Performance tab state ─────────────────────────────────────────────────
    const [subject,      setSubject]      = useState('Mathematics')
    const [selGrades,    setSelGrades]    = useState<string[]>(['03'])
    const [viewMode,     setViewMode]     = useState<'all' | 'gender'>('all')
    const [selDistricts, setSelDistricts] = useState<string[]>([])
    const [showState,    setShowState]    = useState(true)
    const [subjectOpen,  setSubjectOpen]  = useState(false)

    // ── Equity tab state ──────────────────────────────────────────────────────
    const [eSubject,        setESubject]        = useState('Mathematics')
    const [eGrades,         setEGrades]         = useState<string[]>(['03'])
    const [eYears,          setEYears]          = useState<string[]>(['2024'])
    const [eSelDistricts,   setESelDistricts]   = useState<string[]>([])
    const [eSubjectOpen,    setESubjectOpen]    = useState(false)

    useEffect(() => {
        fetchDashboardData()
            .then(({ allData, districts, colorMap, frlData }) => {
                setAllData(allData)
                setDistricts(districts)
                setColorMap(colorMap)
                setFrlData(frlData)
                setDataLoading(false)
            })
            .catch(e => { setError(e.message); setDataLoading(false) })
    }, [])

    const normalizeName = (name: string) =>
        name
            .replace(/\d+/g, '')
            .replace(/\b(PUBLIC SCHOOLS?|SCHOOLS?|SCHOOL|PUBLIC|SCH SYSTEM|SCHS|DIST|R|COMM|DISTRICT)\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim()

    // ── Performance tab memos ─────────────────────────────────────────────────
    const filteredData = useMemo(() => {
        if (!allData) return []
        const source = subject === 'Mathematics' ? allData.math : allData.english
        const subgroupFilter = viewMode === 'all' ? 'ALL' : 'GENDER'
        return source.filter(row => {
            if (!selGrades.includes(row.grade)) return false
            if (row.subgroup_type !== subgroupFilter) return false
            if (row.level === 'ST') return showState
            if (row.level === 'DI') {
                const normalizedRowName = normalizeName(row.agency_name)
                return selDistricts.length > 0 && selDistricts.includes(normalizedRowName)
            }
            return false
        })
    }, [allData, subject, selGrades, viewMode, selDistricts, showState])

    const normalizedFilteredData = useMemo(() =>
        filteredData.map(row => ({ ...row, agency_name: normalizeName(row.agency_name) })),
        [filteredData]
    )

    const normalizedColorMap = useMemo(() => {
        const map: Record<string, string> = {}
        Object.entries(colorMap).forEach(([key, val]) => { map[normalizeName(key)] = val })
        return map
    }, [colorMap])

    const traces = useMemo(() =>
        buildTraces({ filteredData: normalizedFilteredData, colorMap: normalizedColorMap, viewMode }),
        [normalizedFilteredData, normalizedColorMap, viewMode]
    )

    const districtOptions = useMemo(() => {
        const seen = new Map<string, string>()
        districts.forEach(d => {
            const normalized = normalizeName(d)
            if (!seen.has(normalized)) seen.set(normalized, d)
        })
        return Array.from(seen.entries()).map(([normalized]) => ({ value: normalized, label: normalized }))
    }, [districts])

    const gradeLabel = selGrades.length === GRADES.length
        ? 'All Grades'
        : selGrades.map(g => `Grade ${parseInt(g)}`).join(', ')

    const emptyMessage = useMemo(() => {
        if (selGrades.length === 0)    return 'Please select at least one grade.'
        if (selDistricts.length === 0) return 'Select at least one district.'
        return 'No data for the current selection.'
    }, [selGrades, selDistricts])

    // ── Equity tab memos ──────────────────────────────────────────────────────
    const eYearOptions = useMemo(() => {
        if (dataLoading || frlData.length === 0)
            return [{ value: 'loading', label: 'Loading years...' }]
        const years = [...new Set(
            frlData.filter(r => r.level === 'DI').map(r => String(getYear(r.school_year)))
        )].sort((a, b) => Number(b) - Number(a))
        return years.map(y => ({
            value: y,
            label: TICK_TEXTS[TICK_VALS.indexOf(Number(y))] ?? y,
        }))
    }, [frlData, dataLoading])

    const districtScores = useMemo(() => {
        if (!allData) return {} as Record<string, { score: number; gradesPresent: string; totalTested: number }>
        const source = eSubject === 'Mathematics' ? allData.math : allData.english
        const rows = source.filter(r =>
            r.level === 'DI' && r.subgroup_type === 'ALL' &&
            eGrades.includes(r.grade) && eYears.includes(String(getYear(r.school_year)))
        )
        const byDist: Record<string, { scores: number[]; counts: number[]; grades: Set<string>; totalTested: number }> = {}
        rows.forEach(r => {
            const score = parseFloat(r.avg_scale_score)
            const count = parseFloat(r.count_tested)
            if (!isFinite(count) || count <= 0 || !isFinite(score) || score <= 0) return
            const normName = normalizeName(r.agency_name)
            if (!byDist[normName]) byDist[normName] = { scores: [], counts: [], grades: new Set(), totalTested: 0 }
            byDist[normName].scores.push(score)
            byDist[normName].counts.push(count)
            byDist[normName].grades.add(r.grade)
            byDist[normName].totalTested += count
        })
        const result: Record<string, { score: number; gradesPresent: string; totalTested: number }> = {}
        Object.entries(byDist).forEach(([name, { scores, counts, grades, totalTested }]) => {
            result[name] = {
                score: weightedAvg(scores, counts),
                gradesPresent: [...grades].sort().map(g => parseInt(g).toString()).join(', '),
                totalTested: Math.round(totalTested),
            }
        })
        return result
    }, [allData, eSubject, eGrades, eYears])

    const districtFrl = useMemo(() => {
        const accum: Record<string, {
            weighted: { countFrl: number; total: number; yearCount: number }
            pctOnly: number[]
        }> = {}
        frlData
            .filter(r => r.level === 'DI' && eYears.includes(String(getYear(r.school_year))))
            .forEach(r => {
                const pct   = parseFloat(r.pct_frl)
                const count = parseFloat(r.count_frl ?? '')
                if (!isFinite(pct)) return
                const normName = normalizeName(r.agency_name)
                if (!accum[normName]) accum[normName] = { weighted: { countFrl: 0, total: 0, yearCount: 0 }, pctOnly: [] }
                if (isFinite(count) && count > 0 && pct > 0) {
                    accum[normName].weighted.countFrl  += count
                    accum[normName].weighted.total     += count / pct
                    accum[normName].weighted.yearCount += 1
                } else {
                    accum[normName].pctOnly.push(pct * 100)
                }
            })
        const result: Record<string, { pct: number; countFrl: number | null }> = {}
        Object.entries(accum).forEach(([name, { weighted, pctOnly }]) => {
            const hasWeighted = weighted.total > 0
            const hasPctOnly  = pctOnly.length > 0
            if (hasWeighted && !hasPctOnly) {
                result[name] = { pct: (weighted.countFrl / weighted.total) * 100, countFrl: Math.round(weighted.countFrl) }
            } else if (hasWeighted && hasPctOnly) {
                const weightedPct = (weighted.countFrl / weighted.total) * 100
                const simplePct   = pctOnly.reduce((a, b) => a + b, 0) / pctOnly.length
                const totalYears  = weighted.yearCount + pctOnly.length
                result[name] = {
                    pct: (weightedPct * weighted.yearCount + simplePct * pctOnly.length) / totalYears,
                    countFrl: Math.round(weighted.countFrl),
                }
            } else {
                result[name] = { pct: pctOnly.reduce((a, b) => a + b, 0) / pctOnly.length, countFrl: null }
            }
        })
        return result
    }, [frlData, eYears])

    const eDistrictOptions = useMemo(() =>
        Object.keys(districtScores).sort().map(name => ({ value: name, label: name })),
        [districtScores]
    )

    const scatterPoints = useMemo(() =>
        Object.entries(districtScores)
            .filter(([name]) => districtFrl[name] != null && !isNaN(districtFrl[name].pct))
            .map(([name, { score, gradesPresent, totalTested }]) => {
                const { pct, countFrl } = districtFrl[name]
                const gradesUsed = gradesPresent ? gradesPresent.split(', ').length : 0
                return {
                    name, x: pct, y: score,
                    color: Object.entries(colorMap).find(([k]) => normalizeName(k) === name)?.[1] || '#94a3b8',
                    gradesPresent, gradesUsed, totalSelected: eGrades.length,
                    isPartial: gradesUsed < eGrades.length, countFrl, totalTested,
                }
            })
            .filter(p => p.y > 0),
        [districtScores, districtFrl, colorMap, eGrades]
    )

    const eRegression = useMemo(() => {
        if (scatterPoints.length < 3) return null
        return linearRegression(scatterPoints.map(p => ({ x: p.x, y: p.y })))
    }, [scatterPoints])

    const withGap = useMemo(() => {
        if (!eRegression) return scatterPoints.map(p => ({ ...p, gap: 0, predicted: p.y }))
        return scatterPoints.map(p => {
            const predicted = eRegression.slope * p.x + eRegression.intercept
            return { ...p, predicted, gap: p.y - predicted }
        })
    }, [scatterPoints, eRegression])

    const eTraces = useMemo(() => {
        if (!withGap.length) return []
        const fullPoints    = withGap.filter(p => !p.isPartial)
        const partialPoints = withGap.filter(p => p.isPartial)
        const result: object[] = []

        const highlightColor = (points: typeof withGap) =>
            points.map(p => eSelDistricts.length === 0 || eSelDistricts.includes(p.name) ? p.color : '#d1d5db')
        const highlightOpacity = (p: typeof withGap[0]) =>
            eSelDistricts.length === 0 || eSelDistricts.includes(p.name) ? 0.85 : 0.25
        const fmtFrl = (p: typeof withGap[0]) =>
            p.countFrl != null ? p.countFrl.toLocaleString() : 'N/A'

        if (fullPoints.length > 0) {
            result.push({
                type: 'scatter', mode: 'markers',
                x: fullPoints.map(p => p.x), y: fullPoints.map(p => p.y),
                text: fullPoints.map(p => p.name),
                customdata: fullPoints.map(p => [p.gap.toFixed(1), p.predicted.toFixed(1), p.gradesPresent, p.gradesUsed, p.totalSelected, fmtFrl(p), p.totalTested.toLocaleString()]),
                marker: {
                    size:    fullPoints.map(p => eSelDistricts.length > 0 && eSelDistricts.includes(p.name) ? 14 : 10),
                    color:   highlightColor(fullPoints),
                    opacity: fullPoints.map(p => highlightOpacity(p)),
                    line: {
                        width: fullPoints.map(p => eSelDistricts.length > 0 && eSelDistricts.includes(p.name) ? 2.5 : 1.5),
                        color: fullPoints.map(p => eSelDistricts.length > 0 && eSelDistricts.includes(p.name) ? '#1a3353' : '#fff'),
                    },
                },
                hovertemplate:
                    '<b>%{text}</b><br>FRL: %{x:.1f}%<br>Students on FRL: %{customdata[5]}<br>' +
                    'Students Tested: %{customdata[6]}<br>Score: %{y:.1f}<br>Predicted: %{customdata[1]}<br>' +
                    'vs. Expected: <b>%{customdata[0]}</b><br>Weighted avg of Grade(s): %{customdata[2]}<extra></extra>',
                showlegend: false,
            })
        }

        if (partialPoints.length > 0) {
            result.push({
                type: 'scatter', mode: 'markers',
                x: partialPoints.map(p => p.x), y: partialPoints.map(p => p.y),
                text: partialPoints.map(p => p.name),
                customdata: partialPoints.map(p => [p.gap.toFixed(1), p.predicted.toFixed(1), p.gradesPresent, p.gradesUsed, p.totalSelected, fmtFrl(p), p.totalTested.toLocaleString()]),
                marker: {
                    size:    partialPoints.map(p => eSelDistricts.length > 0 && eSelDistricts.includes(p.name) ? 14 : 10),
                    color:   highlightColor(partialPoints),
                    opacity: partialPoints.map(p => highlightOpacity(p)),
                    symbol: 'circle-open',
                    line: {
                        width: partialPoints.map(p => eSelDistricts.length > 0 && eSelDistricts.includes(p.name) ? 3 : 2.5),
                        color: highlightColor(partialPoints),
                    },
                },
                hovertemplate:
                    '<b>%{text}</b><br>FRL: %{x:.1f}%<br>Students on FRL: %{customdata[5]}<br>' +
                    'Students Tested: %{customdata[6]}<br>Score: %{y:.1f}<br>Predicted: %{customdata[1]}<br>' +
                    'vs. Expected: <b>%{customdata[0]}</b><br>Weighted avg of Grade(s): %{customdata[2]}<br>' +
                    '<i>%{customdata[3]} of %{customdata[4]} selected grades available</i><extra></extra>',
                showlegend: false,
            })
        }

        if (eRegression) {
            const xs = withGap.map(p => p.x)
            const lineX = [Math.min(...xs) - 1, Math.max(...xs) + 1]
            result.push({
                type: 'scatter', mode: 'lines',
                x: lineX, y: lineX.map(x => eRegression.slope * x + eRegression.intercept),
                line: { color: '#94a3b8', width: 1.5, dash: 'dash' },
                hoverinfo: 'skip', showlegend: false,
            })
        }

        return result
    }, [withGap, eRegression, eSelDistricts])

    const eSorted        = useMemo(() => [...withGap].sort((a, b) => b.gap - a.gap), [withGap])
    const eTopDistricts  = eSorted.slice(0, 5)
    const eBotDistricts  = eSorted.length >= 5 ? eSorted.slice(-5).reverse() : []

    const eGradeLabel = eGrades.length === GRADES.length
        ? 'All Grades'
        : eGrades.length === 1
            ? `Grade ${parseInt(eGrades[0])}`
            : `Grade ${eGrades.map(g => parseInt(g)).join(', ')}`

    const eYearLabel = eYears.length === 0
        ? 'No year selected'
        : eYears.length === 1
            ? (eYearOptions.find(y => y.value === eYears[0])?.label ?? eYears[0])
            : eYears.map(y => eYearOptions.find(o => o.value === y)?.label ?? y).join(', ')

    return (
        <div className="min-h-screen bg-[#f4f6f9]">
            <header className="bg-[#1a3353] shadow-lg">
                <Navbar />
            </header>

            <main className="mx-auto max-w-screen-2xl px-4 sm:px-8 lg:px-12 py-5 sm:py-8">

                {/* Page Title */}
                <div className="mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800">Nebraska</h2>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                        Average scale score trends by district, grade, and student group
                    </p>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-1 bg-white border border-gray-200 rounded-2xl p-1.5 shadow-sm mb-6 w-fit">
                    <button
                        onClick={() => setActiveTab('performance')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                            activeTab === 'performance'
                                ? 'bg-[#1a3353] text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        <BarChart2 className="w-4 h-4" />
                        Performance Over Time
                    </button>
                    <button
                        onClick={() => setActiveTab('equity')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                            activeTab === 'equity'
                                ? 'bg-[#1a3353] text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        <ScatterChart className="w-4 h-4" />
                        Equity Analysis
                    </button>
                </div>

                {/* ══════════════════════════════════════════════════════════ */}
                {/* TAB: Performance Over Time                                */}
                {/* ══════════════════════════════════════════════════════════ */}
                {activeTab === 'performance' && (
                    <div>
                        {/* Filter Bar */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-5">
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:flex lg:flex-wrap lg:gap-5 lg:items-end">

                                {/* Subject */}
                                <div className="relative col-span-2 sm:col-span-1 lg:min-w-[200px]">
                                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Subject</p>
                                    <button type="button" onClick={() => setSubjectOpen(o => !o)}
                                        className="w-full h-11 flex items-center justify-between gap-3 px-4 bg-white border-[3px] border-[#15315E] rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
                                        <span className="truncate text-left">{subject}</span>
                                        <ChevronDown className={`w-4 h-4 text-[#15315E] flex-shrink-0 transition-transform duration-200 ${subjectOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {subjectOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setSubjectOpen(false)} />
                                            <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
                                                {SUBJECTS.map(opt => (
                                                    <button key={opt} onClick={() => { setSubject(opt); setSubjectOpen(false) }}
                                                        className={`w-full px-4 py-3 text-left text-sm transition-colors ${subject === opt ? 'bg-blue-50 text-[#15315E] font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
                                                        <div className="flex items-center justify-between">
                                                            {opt}
                                                            {subject === opt && <div className="w-2 h-2 rounded-full bg-[#15315E]" />}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Grade */}
                                <div className="col-span-1 lg:min-w-[120px]">
                                    <MultiSelect label="Grade" options={GRADES} selected={selGrades}
                                        onChange={setSelGrades} placeholder="Select Grades" accentColor="#0f2448" />
                                </div>

                                {/* Student Group */}
                                <div className="col-span-1 lg:min-w-[190px]">
                                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Student Group</p>
                                    <div className="flex h-11 rounded-xl overflow-hidden border-[3px] border-[#15315E] shadow-sm">
                                        <button onClick={() => setViewMode('all')}
                                            className={`flex-1 text-xs font-semibold transition-all px-2 sm:px-3 ${viewMode === 'all' ? 'bg-gradient-to-b from-[#004080] to-[#003366] text-white' : 'bg-white text-gray-600 hover:bg-slate-50'}`}>
                                            All Students
                                        </button>
                                        <div className="w-px bg-blue-300" />
                                        <button onClick={() => setViewMode('gender')}
                                            className={`flex-1 text-xs font-semibold transition-all px-2 sm:px-3 ${viewMode === 'gender' ? 'bg-gradient-to-b from-[#004080] to-[#003366] text-white' : 'bg-white text-gray-600 hover:bg-slate-50'}`}>
                                            By Gender
                                        </button>
                                    </div>
                                </div>

                                {/* District */}
                                <div className="col-span-2 sm:col-span-1 lg:min-w-[220px]">
                                    <MultiSelect label="District" options={districtOptions} selected={selDistricts}
                                        onChange={setSelDistricts} placeholder="Select Districts..." accentColor="#0f2448" />
                                </div>

                                {/* State toggle */}
                                <div className="col-span-1 lg:self-end">
                                    <button onClick={() => setShowState(prev => !prev)}
                                        className={`w-full lg:w-auto h-11 px-6 text-sm rounded-xl font-semibold transition-all flex items-center justify-center gap-2 border-[3px] ${showState ? 'bg-gradient-to-b from-[#004080] to-[#003366] text-white border-[#15315E] shadow-sm' : 'bg-white text-gray-600 border-[#15315E] hover:bg-gray-50'}`}>
                                        State
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${showState ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                            {showState ? 'ON' : 'OFF'}
                                        </span>
                                    </button>
                                </div>

                                {/* Clear */}
                                <div className="col-span-1 lg:self-end">
                                    <button onClick={() => setSelDistricts([])} disabled={selDistricts.length === 0}
                                        className={`w-full lg:w-auto h-11 px-8 text-sm rounded-xl font-medium transition-all ${selDistricts.length > 0 ? 'bg-white text-gray-500 border border-gray-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 shadow-sm active:scale-95' : 'bg-transparent text-gray-300 border border-gray-100 cursor-not-allowed'}`}>
                                        Clear
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Chart + Right Panel */}
                        <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 items-stretch lg:h-[560px]">
                            <div className="w-full lg:flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 min-w-0 h-full">
                                <div className="mb-4">
                                    <h3 className="text-sm sm:text-base font-semibold text-gray-800">{subject} — {gradeLabel}</h3>
                                    <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
                                        {viewMode === 'all' ? 'All Students · Weighted average across selected grades' : 'By Gender · Solid = Male · Dotted = Female'}
                                    </p>
                                </div>
                                {dataLoading ? <ChartSkeleton /> : error ? (
                                    <div className="h-64 flex items-center justify-center text-red-500 text-sm">⚠️ {error}</div>
                                ) : traces.length === 0 ? (
                                    <div className="h-64 flex flex-col items-center justify-center text-gray-400 text-sm text-center px-4 gap-2">
                                        <span className="text-2xl">📊</span>
                                        <span>{emptyMessage}</span>
                                    </div>
                                ) : (
                                    <Plot data={traces as any}
                                        layout={{
                                            xaxis: { title: { text: 'School Year', font: { size: 11 } }, tickmode: 'array', tickvals: TICK_VALS, ticktext: TICK_TEXTS, gridcolor: '#f3f4f6', linecolor: '#e5e7eb' },
                                            yaxis: { title: { text: 'Average Scale Score', font: { size: 11 } }, gridcolor: '#f3f4f6', linecolor: '#e5e7eb' },
                                            hovermode: 'closest', showlegend: false,
                                            plot_bgcolor: 'white', paper_bgcolor: 'white',
                                            height: 420, margin: { t: 10, r: 10, b: 55, l: 60 }, autosize: true,
                                            font: { family: 'Inter, sans-serif', size: 10, color: '#6b7280' },
                                        }}
                                        style={{ width: '100%' }}
                                        config={{ responsive: true, displayModeBar: false, toImageButtonOptions: { format: 'png', filename: `NDE_${subject}`, scale: 2 } }}
                                        useResizeHandler={true}
                                    />
                                )}
                            </div>

                            {/* Right Panel */}
                            <div className="w-full lg:w-52 lg:flex-shrink-0 h-full flex flex-col gap-4 overflow-hidden">
                                <div className="flex-none"><LineStyleLegend viewMode={viewMode} /></div>
                                <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 flex flex-col min-h-0 overflow-hidden">
                                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3 flex-shrink-0">
                                        Selected Districts
                                        <span className="ml-1.5 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full normal-case font-bold tracking-normal">
                                            {selDistricts.length}
                                        </span>
                                    </p>
                                    <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
                                        {selDistricts.length > 0 ? (
                                            selDistricts.map(d => (
                                                <div key={d} className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: normalizedColorMap[d] || '#999' }} />
                                                    <span className="text-xs text-gray-600 truncate">{d}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-center opacity-40 grayscale">
                                                <School size={24} className="text-gray-300 mb-2" />
                                                <p className="text-[10px] text-gray-400 font-medium leading-tight">No districts<br />selected</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════ */}
                {/* TAB: Equity Analysis                                      */}
                {/* ══════════════════════════════════════════════════════════ */}
                {activeTab === 'equity' && (
                    <div>
                        <p className="text-sm text-slate-500 mb-1 leading-relaxed">
                            Each point represents a district, showing its FRL% and average scale score.
                            Districts <span className="text-emerald-600 font-medium">above the line</span> are performing better than expected,
                            while those <span className="text-red-500 font-medium">below the line</span> are underperforming.
                        </p>
                        <p className="text-[11px] text-gray-400 mb-5">
                            FRL% = Percentage of students eligible for free or reduced lunch.
                        </p>

                        {/* Equity Filter Bar */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-5">
                            <div className="flex flex-wrap gap-4 items-end">

                                {/* Subject */}
                                <div className="relative min-w-[200px]">
                                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Subject</p>
                                    <button type="button" onClick={() => setESubjectOpen(o => !o)}
                                        className="w-full h-11 flex items-center justify-between gap-3 px-4 bg-white border-[3px] border-[#15315E] rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
                                        <span className="truncate text-left">{eSubject}</span>
                                        <ChevronDown className={`w-4 h-4 text-[#15315E] flex-shrink-0 transition-transform duration-200 ${eSubjectOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {eSubjectOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setESubjectOpen(false)} />
                                            <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
                                                {SUBJECTS.map(opt => (
                                                    <button key={opt} onClick={() => { setESubject(opt); setESubjectOpen(false) }}
                                                        className={`w-full px-4 py-3 text-left text-sm transition-colors ${eSubject === opt ? 'bg-blue-50 text-[#15315E] font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
                                                        <div className="flex items-center justify-between">
                                                            {opt}
                                                            {eSubject === opt && <div className="w-2 h-2 rounded-full bg-[#15315E]" />}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Grade */}
                                <div className="min-w-[150px]">
                                    <MultiSelect label="Grade" options={GRADES} selected={eGrades}
                                        onChange={setEGrades} placeholder="Select Grades" accentColor="#0f2448" />
                                </div>

                                {/* District highlight */}
                                <div className="min-w-[220px]">
                                    <MultiSelect label="District" options={eDistrictOptions} selected={eSelDistricts}
                                        onChange={setESelDistricts} placeholder="Highlight Districts..." accentColor="#0f2448" />
                                </div>

                                {/* Year */}
                                <div className="min-w-[160px]">
                                    {dataLoading ? (
                                        <div className="animate-pulse">
                                            <div className="h-3 w-12 bg-gray-200 rounded mb-2" />
                                            <div className="h-11 w-full bg-gray-50 border-2 border-gray-100 rounded-xl" />
                                        </div>
                                    ) : (
                                        <MultiSelect label="School Year" options={eYearOptions} selected={eYears}
                                            onChange={setEYears} placeholder="Select Year(s)" accentColor="#0f2448" />
                                    )}
                                </div>

                                {/* Clear */}
                                {eSelDistricts.length > 0 && (
                                    <div className="self-end">
                                        <button onClick={() => setESelDistricts([])}
                                            className="h-11 px-5 text-sm rounded-xl font-medium transition-all bg-white text-gray-500 border border-gray-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 shadow-sm">
                                            Clear
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Scatter Card */}
                        {dataLoading ? <ChartSkeleton /> : error ? (
                            <div className="h-64 flex items-center justify-center text-red-500 text-sm">Error: {error}</div>
                        ) : (
                            <div className="flex flex-col gap-5">
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
                                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                                        <div>
                                            <h3 className="text-sm sm:text-base font-semibold text-gray-800">
                                                {eSubject} — {eGradeLabel} · {eYearLabel}
                                            </h3>
                                            <p className="text-[11px] sm:text-xs text-gray-500 mt-1">
                                                Each dot represents a district &nbsp;·&nbsp; X-axis: Poverty level (FRL%) &nbsp;·&nbsp; Y-axis: Average test score
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                                                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                                <span className="text-[11px] font-semibold text-emerald-700 whitespace-nowrap">Above line — Outperforming</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
                                                <TrendingDown className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                                                <span className="text-[11px] font-semibold text-red-600 whitespace-nowrap">Below line — Underperforming</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                                                <Minus className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                <span className="text-[11px] font-semibold text-gray-500 whitespace-nowrap">Expected trend</span>
                                            </div>
                                            {eGrades.length > 1 && (
                                                <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="#6b7280" /></svg>
                                                        <span className="text-[11px] font-semibold text-gray-500 whitespace-nowrap">All grades present</span>
                                                    </div>
                                                    <div className="w-px h-3 bg-gray-300" />
                                                    <div className="flex items-center gap-1.5">
                                                        <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4.5" fill="none" stroke="#6b7280" strokeWidth="2" /></svg>
                                                        <span className="text-[11px] font-semibold text-gray-500 whitespace-nowrap">Partial grade data</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {eTraces.length === 0 ? (
                                        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                                            No data available for the current selection.
                                        </div>
                                    ) : (
                                        <Plot data={eTraces as any}
                                            layout={{
                                                xaxis: { title: { text: 'Free & Reduced Lunch (%)', font: { size: 11 } }, gridcolor: '#f3f4f6', linecolor: '#e5e7eb', ticksuffix: '%' },
                                                yaxis: { title: { text: 'Average Scale Score', font: { size: 11 } }, gridcolor: '#f3f4f6', linecolor: '#e5e7eb' },
                                                hovermode: 'closest', showlegend: false,
                                                plot_bgcolor: 'white', paper_bgcolor: 'white',
                                                height: 460, margin: { t: 10, r: 20, b: 60, l: 70 }, autosize: true,
                                                font: { family: 'Inter, sans-serif', size: 10, color: '#6b7280' },
                                            }}
                                            style={{ width: '100%' }}
                                            config={{ responsive: true, displayModeBar: false, toImageButtonOptions: { format: 'png', filename: `NDE_Equity_${eSubject}`, scale: 2 } }}
                                            useResizeHandler={true}
                                        />
                                    )}
                                </div>

                                {/* Top / Bottom performers */}
                                {withGap.length > 0 && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                                            <div className="flex items-center gap-2 mb-1">
                                                <TrendingUp className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                                <p className="text-sm font-semibold text-gray-800">Top Overperformers</p>
                                            </div>
                                            <p className="text-[11px] text-gray-400 mb-4">Scoring above expectations relative to their FRL rate</p>
                                            <div className="flex flex-col gap-2">
                                                {eTopDistricts.map((d, i) => (
                                                    <div key={d.name} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-emerald-50 border border-emerald-100">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <span className="text-xs font-bold text-emerald-700 w-5 flex-shrink-0 text-right">{i + 1}</span>
                                                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                                                            <span className="text-xs text-gray-700 font-medium truncate">{d.name}</span>
                                                        </div>
                                                        <div className="text-right flex-shrink-0 ml-3">
                                                            <p className="text-xs font-bold text-emerald-700">+{d.gap.toFixed(1)} pts</p>
                                                            <p className="text-[10px] text-gray-400">{d.x.toFixed(1)}% FRL</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                                            <div className="flex items-center gap-2 mb-1">
                                                <TrendingDown className="w-4 h-4 text-red-500 flex-shrink-0" />
                                                <p className="text-sm font-semibold text-gray-800">Underperformers</p>
                                            </div>
                                            <p className="text-[11px] text-gray-400 mb-4">Scoring below expectations relative to their FRL rate</p>
                                            <div className="flex flex-col gap-2">
                                                {eBotDistricts.map((d, i) => (
                                                    <div key={d.name} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-red-50 border border-red-100">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <span className="text-xs font-bold text-red-500 w-5 flex-shrink-0 text-right">{i + 1}</span>
                                                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                                                            <span className="text-xs text-gray-700 font-medium truncate">{d.name}</span>
                                                        </div>
                                                        <div className="text-right flex-shrink-0 ml-3">
                                                            <p className="text-xs font-bold text-red-500">{d.gap.toFixed(1)} pts</p>
                                                            <p className="text-[10px] text-gray-400">{d.x.toFixed(1)}% FRL</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

            </main>

            <footer className="mt-12 pb-12 border-t border-gray-200 pt-8 px-4">
                <div className="max-w-screen-2xl mx-auto text-center">
                    <p className="text-xs text-gray-400">
                        &copy; {new Date().getFullYear()} Pencils before Pixels — Assessment Data Dashboard
                    </p>
                </div>
            </footer>
        </div>
    )
}