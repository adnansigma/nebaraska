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
function linearRegression(points: { x: number; y: number; weight?: number }[]) {
    const n      = points.length
    if (n < 2) return null

    const W   = points.reduce((a, p) => a + (p.weight ?? 1), 0)
    const sumX  = points.reduce((a, p) => a + (p.weight ?? 1) * p.x, 0)
    const sumY  = points.reduce((a, p) => a + (p.weight ?? 1) * p.y, 0)
    const sumXY = points.reduce((a, p) => a + (p.weight ?? 1) * p.x * p.y, 0)
    const sumX2 = points.reduce((a, p) => a + (p.weight ?? 1) * p.x * p.x, 0)

    const denom = W * sumX2 - sumX * sumX
    if (denom === 0) return null

    const slope     = (W * sumXY - sumX * sumY) / denom
    const intercept = (sumY - slope * sumX) / W
    return { slope, intercept }
}
const normalizeName = (name: string) =>
    name
        .replace(/\d+/g, '')
        .replace(/\b(PUBLIC SCHOOLS?|SCHOOLS?|SCHOOL|PUBLIC|SCH SYSTEM|SCHS|DIST|R|COMM|DISTRICT)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim()

// ── Equity Page ──────────────────────────────────────────────────────────────
export default function EquityPage() {
    const [allData,     setAllData]     = useState<AllData | null>(null)
    const [frlData,     setFrlData]     = useState<FrlRow[]>([])
    const [colorMap,    setColorMap]    = useState<Record<string, string>>({})
    const [dataLoading, setDataLoading] = useState(true)
    const [error,       setError]       = useState('')

    const [subject,      setSubject]      = useState('Mathematics')
    const [selGrades,    setSelGrades]    = useState<string[]>(['03'])
    const [selYears,     setSelYears]     = useState<string[]>(['2024'])
    const [subjectOpen,  setSubjectOpen]  = useState(false)
    const [selDistricts, setSelDistricts] = useState<string[]>([])

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

    const normalizeName = (name: string) => {
        return name
            // 1. Remove numbers/digits
            .replace(/\d+/g, '') 
            // 2. Remove specific keywords (cleaned up duplicates)
            .replace(/\b(PUBLIC SCHOOLS?|SCHOOLS?|SCHOOL|PUBLIC|SCH SYSTEM|SCHS|DIST|R|COMM|DISTRICT)\b/gi, '')
            // 3. Collapse extra spaces and trim
            .replace(/\s+/g, ' ')
            .trim();
    }

    const yearOptions = useMemo(() => {
        if (dataLoading || frlData.length === 0) {
            return [{ value: 'loading', label: 'Loading years...' }]
        }
        const years = [...new Set(
            frlData
                .filter(r => r.level === 'DI')
                .map(r => String(getYear(r.school_year)))
        )]
            .sort((a, b) => Number(b) - Number(a))
        return years.map(y => ({
            value: y,
            label: TICK_TEXTS[TICK_VALS.indexOf(Number(y))] ?? y,
        }))
    }, [frlData, dataLoading])

    // ── districtScores ────────────────────────────────────────────────────────
    const districtScores = useMemo(() => {
        if (!allData) return {} as Record<string, { score: number; gradesPresent: string; totalTested: number }>

        const source = subject === 'Mathematics' ? allData.math : allData.english
        const rows = source.filter(r =>
            r.level         === 'DI'  &&
            r.subgroup_type === 'ALL' &&
            selGrades.includes(r.grade) &&
            selYears.includes(String(getYear(r.school_year)))
        )

        const byDist: Record<string, {
            scores: number[]
            counts: number[]
            grades: Set<string>
            totalTested: number
        }> = {}

        rows.forEach(r => {
            const score = parseFloat(r.avg_scale_score)
            const count = parseFloat(r.count_tested)
            if (!isFinite(count) || count <= 0) return
            if (!isFinite(score) || score <= 0) return
            const normName = normalizeName(r.agency_name)
            if (!byDist[normName])
                byDist[normName] = { scores: [], counts: [], grades: new Set(), totalTested: 0 }
            byDist[normName].scores.push(score)
            byDist[normName].counts.push(count)
            byDist[normName].grades.add(r.grade)
            byDist[normName].totalTested += count
        })

        const result: Record<string, { score: number; gradesPresent: string; totalTested: number }> = {}
        Object.entries(byDist).forEach(([name, { scores, counts, grades, totalTested }]) => {
            const gradesPresent = [...grades]
                .sort()
                .map(g => parseInt(g).toString())
                .join(', ')
            result[name] = {
                score       : weightedAvg(scores, counts),
                gradesPresent,
                totalTested : Math.round(totalTested),
            }
        })
        return result
    }, [allData, subject, selGrades, selYears])

    // ── districtFrl ───────────────────────────────────────────────────────────
    const districtFrl = useMemo(() => {
        const accum: Record<string, {
            weighted: { countFrl: number; total: number; yearCount: number }
            pctOnly:  number[]
        }> = {}

        frlData
            .filter(r => r.level === 'DI' && selYears.includes(String(getYear(r.school_year))))
            .forEach(r => {
                const pct   = parseFloat(r.pct_frl)
                const count = parseFloat(r.count_frl ?? '')

                if (!isFinite(pct)) return

                const normName = normalizeName(r.agency_name)
                if (!accum[normName])
                    accum[normName] = { weighted: { countFrl: 0, total: 0, yearCount: 0 }, pctOnly: [] }

                if (isFinite(count) && count > 0 && isFinite(pct) && pct > 0) {
                    const totalEnroll = count / pct
                    accum[normName].weighted.countFrl  += count
                    accum[normName].weighted.total     += totalEnroll
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
                // ✅ All years have count_frl → pure weighted average
                result[name] = {
                    pct     : (weighted.countFrl / weighted.total) * 100,
                    countFrl: Math.round(weighted.countFrl),
                }
            } else if (hasWeighted && hasPctOnly) {
                // ⚠️ Mixed years → blend weighted by year count
                const weightedPct = (weighted.countFrl / weighted.total) * 100
                const simplePct   = pctOnly.reduce((a, b) => a + b, 0) / pctOnly.length
                const totalYears  = weighted.yearCount + pctOnly.length
                const blendedPct  = (weightedPct * weighted.yearCount + simplePct * pctOnly.length) / totalYears
                result[name] = {
                    pct     : blendedPct,
                    countFrl: Math.round(weighted.countFrl),
                }
            } else {
                // ❌ No count_frl at all → simple average of pct values
                result[name] = {
                    pct     : pctOnly.reduce((a, b) => a + b, 0) / pctOnly.length,
                    countFrl: null,
                }
            }
        })

        return result
    }, [frlData, selYears])

    const districtOptions = useMemo(() => {
        return Object.keys(districtScores)
            .sort()
            .map(name => ({ value: name, label: name }))
    }, [districtScores])

    // ── scatterPoints ─────────────────────────────────────────────────────────
    const scatterPoints = useMemo(() => {
        return Object.entries(districtScores)
            .filter(([name]) => districtFrl[name] != null && !isNaN(districtFrl[name].pct))
            .map(([name, { score, gradesPresent, totalTested }]) => {
                const { pct, countFrl } = districtFrl[name]
                const gradesUsed    = gradesPresent ? gradesPresent.split(', ').length : 0
                const totalSelected = selGrades.length
                return {
                    name,
                    x           : pct,
                    y           : score,
                    color: Object.entries(colorMap).find(([k]) => normalizeName(k) === name)?.[1] || '#94a3b8',
                    gradesPresent,
                    gradesUsed,
                    totalSelected,
                    isPartial   : gradesUsed < totalSelected,
                    countFrl,
                    totalTested,
                }
            })
            .filter(p => p.y > 0)
    }, [districtScores, districtFrl, colorMap, selGrades])

    const regression = useMemo(() => {
        if (scatterPoints.length < 3) return null
        return linearRegression(
            scatterPoints.map(p => ({ x: p.x, y: p.y, weight: p.totalTested }))
        )
    }, [scatterPoints])

    const withGap = useMemo(() => {
        if (!regression) return scatterPoints.map(p => ({ ...p, gap: 0, predicted: p.y }))
        return scatterPoints.map(p => {
            const predicted = regression.slope * p.x + regression.intercept
            return { ...p, predicted, gap: p.y - predicted }
        })
    }, [scatterPoints, regression])

    // ── traces ────────────────────────────────────────────────────────────────
    const traces = useMemo(() => {
        if (!withGap.length) return []

        const fullPoints    = withGap.filter(p => !p.isPartial)
        const partialPoints = withGap.filter(p => p.isPartial)
        const result: object[] = []

        const highlightColor = (points: typeof withGap) =>
            points.map(p =>
                selDistricts.length === 0 || selDistricts.includes(p.name)
                    ? p.color
                    : '#d1d5db'
            )

        const highlightOpacity = (p: typeof withGap[0]) =>
            selDistricts.length === 0 || selDistricts.includes(p.name) ? 0.85 : 0.25

        const fmtFrl = (p: typeof withGap[0]) =>
            p.countFrl != null ? p.countFrl.toLocaleString() : 'N/A'

        if (fullPoints.length > 0) {
            result.push({
                type      : 'scatter',
                mode      : 'markers',
                x         : fullPoints.map(p => p.x),
                y         : fullPoints.map(p => p.y),
                text      : fullPoints.map(p => p.name),
                customdata: fullPoints.map(p => [
                    p.gap.toFixed(1),
                    p.predicted.toFixed(1),
                    p.gradesPresent,
                    p.gradesUsed,
                    p.totalSelected,
                    fmtFrl(p),
                    p.totalTested.toLocaleString(),
                ]),
                marker: {
                    size   : fullPoints.map(p =>
                        selDistricts.length > 0 && selDistricts.includes(p.name) ? 14 : 10),
                    color  : highlightColor(fullPoints),
                    opacity: fullPoints.map(p => highlightOpacity(p)),
                    line   : {
                        width: fullPoints.map(p =>
                            selDistricts.length > 0 && selDistricts.includes(p.name) ? 2.5 : 1.5),
                        color: fullPoints.map(p =>
                            selDistricts.length > 0 && selDistricts.includes(p.name) ? '#1a3353' : '#fff'),
                    },
                },
                hovertemplate:
                    '<b>%{text}</b><br>' +
                    'FRL: %{x:.1f}%<br>' +
                    'Students on FRL: %{customdata[5]}<br>' +
                    'Students Tested: %{customdata[6]}<br>' +
                    'Score: %{y:.1f}<br>' +
                    'Predicted: %{customdata[1]}<br>' +
                    'vs. Expected: <b>%{customdata[0]}</b><br>' +
                    'Weighted avg of Grade(s): %{customdata[2]}' +
                    '<extra></extra>',
                showlegend: false,
            })
        }

        if (partialPoints.length > 0) {
            result.push({
                type      : 'scatter',
                mode      : 'markers',
                x         : partialPoints.map(p => p.x),
                y         : partialPoints.map(p => p.y),
                text      : partialPoints.map(p => p.name),
                customdata: partialPoints.map(p => [
                    p.gap.toFixed(1),
                    p.predicted.toFixed(1),
                    p.gradesPresent,
                    p.gradesUsed,
                    p.totalSelected,
                    fmtFrl(p),
                    p.totalTested.toLocaleString(),
                ]),
                marker: {
                    size   : partialPoints.map(p =>
                        selDistricts.length > 0 && selDistricts.includes(p.name) ? 14 : 10),
                    color  : highlightColor(partialPoints),
                    opacity: partialPoints.map(p => highlightOpacity(p)),
                    symbol : 'circle-open',
                    line   : {
                        width: partialPoints.map(p =>
                            selDistricts.length > 0 && selDistricts.includes(p.name) ? 3 : 2.5),
                        color: highlightColor(partialPoints),
                    },
                },
                hovertemplate:
                    '<b>%{text}</b><br>' +
                    'FRL: %{x:.1f}%<br>' +
                    'Students on FRL: %{customdata[5]}<br>' +
                    'Students Tested: %{customdata[6]}<br>' +
                    'Score: %{y:.1f}<br>' +
                    'Predicted: %{customdata[1]}<br>' +
                    'vs. Expected: <b>%{customdata[0]}</b><br>' +
                    'Weighted avg of Grade(s): %{customdata[2]}<br>' +
                    '<i>%{customdata[3]} of %{customdata[4]} selected grades available</i>' +
                    '<extra></extra>',
                showlegend: false,
            })
        }

        if (regression) {
            const xs    = withGap.map(p => p.x)
            const lineX = [Math.min(...xs) - 1, Math.max(...xs) + 1]
            result.push({
                type      : 'scatter',
                mode      : 'lines',
                x         : lineX,
                y         : lineX.map(x => regression.slope * x + regression.intercept),
                line      : { color: '#94a3b8', width: 1.5, dash: 'dash' },
                hoverinfo : 'skip',
                showlegend: false,
            })
        }

        return result
    }, [withGap, regression, selDistricts])

    const sorted          = useMemo(() => [...withGap].sort((a, b) => b.gap - a.gap), [withGap])
    const topDistricts    = sorted.slice(0, 5)
    const bottomDistricts = sorted.length >= 5 ? sorted.slice(-5).reverse() : []

    const gradeLabel = selGrades.length === GRADES.length
        ? 'All Grades'
        : selGrades.length === 1
            ? `Grade ${parseInt(selGrades[0])}`
            : `Grade ${selGrades.map(g => parseInt(g)).join(', ')}`

    const yearLabel = selYears.length === 0
        ? 'No year selected'
        : selYears.length === 1
            ? (yearOptions.find(y => y.value === selYears[0])?.label ?? selYears[0])
            : selYears
                .map(y => yearOptions.find(o => o.value === y)?.label ?? y)
                .join(', ')

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
                        <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                            Each point represents a district, showing its FRL% and average scale score.
                            The line shows an expected score for districts with similar levels of economic disadvantage.
                            Districts <span className="text-emerald-600 font-medium">above the line</span> are performing better than expected,
                            while those <span className="text-red-500 font-medium">below the line</span> are underperforming.
                        </p>
                        <p className="text-[11px] text-gray-400 mt-2">
                            FRL% = Percentage of students eligible for free or reduced lunch.
                        </p>
                        <p className="text-[11px] mt-2 leading-relaxed">
                            <span className="text-red-500 font-semibold">Note:</span>{' '}
                            <span className="text-gray-500">
                                "Above" or "below" the line compares districts with similar socioeconomic profiles (FRL%).
                                A district below the line is performing lower than expected relative to similar districts,
                                not necessarily performing poorly overall.
                            </span>
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

                        {/* District */}
                        <div className="min-w-[220px]">
                            <MultiSelect
                                label="District"
                                options={districtOptions}
                                selected={selDistricts}
                                onChange={setSelDistricts}
                                placeholder="Highlight Districts..."
                                accentColor="#0f2448"
                            />
                        </div>

                        {/* Year */}
                        <div className="min-w-[160px]">
                            {dataLoading ? (
                                <div className="animate-pulse">
                                    <div className="h-3 w-12 bg-gray-200 rounded mb-2" />
                                    <div className="h-11 w-full bg-gray-50 border-2 border-gray-100 rounded-xl" />
                                </div>
                            ) : (
                                <MultiSelect
                                    label="School Year"
                                    options={yearOptions}
                                    selected={selYears}
                                    onChange={setSelYears}
                                    placeholder="Select Year(s)"
                                    accentColor="#0f2448"
                                />
                            )}
                        </div>

                        {/* Clear button */}
                        {selDistricts.length > 0 && (
                            <div className="self-end">
                                <button
                                    onClick={() => setSelDistricts([])}
                                    className="h-11 px-5 text-sm rounded-xl font-medium transition-all
                                            bg-white text-gray-500 border border-gray-200
                                            hover:border-red-200 hover:bg-red-50 hover:text-red-600 shadow-sm"
                                >
                                    Clear
                                </button>
                            </div>
                        )}
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

                            {/* Chart header */}
                            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                                <div>
                                    <h3 className="text-sm sm:text-base font-semibold text-gray-800">
                                        {subject} — {gradeLabel} · {yearLabel}
                                    </h3>
                                    <p className="text-[11px] sm:text-xs text-gray-500 mt-1 leading-relaxed">
                                        Each dot represents a district.
                                        <span className="block sm:inline">
                                            &nbsp;·&nbsp;X-axis: Poverty level (FRL%)
                                        </span>
                                        <span className="block sm:inline">
                                            &nbsp;·&nbsp;Y-axis: Average test score
                                        </span>
                                    </p>
                                </div>

                                {/* Legend pills */}
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
                                    {selGrades.length > 1 && (
                                        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200
                                                        rounded-lg px-2.5 py-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <svg width="12" height="12" viewBox="0 0 12 12">
                                                    <circle cx="6" cy="6" r="5" fill="#6b7280" />
                                                </svg>
                                                <span className="text-[11px] font-semibold text-gray-500 whitespace-nowrap">
                                                    All grades present
                                                </span>
                                            </div>
                                            <div className="w-px h-3 bg-gray-300" />
                                            <div className="flex items-center gap-1.5">
                                                <svg width="12" height="12" viewBox="0 0 12 12">
                                                    <circle cx="6" cy="6" r="4.5" fill="none"
                                                            stroke="#6b7280" strokeWidth="2" />
                                                </svg>
                                                <span className="text-[11px] font-semibold text-gray-500 whitespace-nowrap">
                                                    Partial grade data
                                                </span>
                                            </div>
                                        </div>
                                    )}
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
                                            title     : { text: 'Free & Reduced Lunch (%)', font: { size: 11 } },
                                            gridcolor : '#f3f4f6',
                                            linecolor : '#e5e7eb',
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