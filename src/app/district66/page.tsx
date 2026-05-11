'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import dynamic                                   from 'next/dynamic'
import Link                                      from 'next/link'
import { ChevronDown, Check, ChevronLeft, School, TrendingUp, TrendingDown, Minus, BarChart2, ScatterChart, AlertCircle } from 'lucide-react'

import { AllData, FrlRow }               from '@/types'
import { GRADES, TICK_VALS, TICK_TEXTS } from '@/lib/constants'
import { fetchDashboardData }            from '@/services/scoreService'
import { buildTraces }                   from '@/lib/traceBuilder'
import { MultiSelect }                   from '@/components/MultiSelect'
import { LineStyleLegend }               from '@/components/LineStyleLegend'
import { ChartSkeleton }                 from '@/components/ChartSkeleton'
import { getYear, weightedAvg }          from '@/lib/chartUtils'
import { Navbar } from '@/components/Navbar'

const Plot = dynamic(
    () => import('react-plotly.js').then(mod => mod.default),
    { ssr: false, loading: () => <ChartSkeleton /> }
)

const DISTRICT_66_NAME = 'WESTSIDE COMMUNITY SCHOOLS'
const SUBJECTS         = ['Mathematics', 'English Language Arts']

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

// ── Show Lines Dropdown ───────────────────────────────────────────────────────
function ShowLinesDropdown({ showState, showDistrict, onToggleState, onToggleDistrict }: {
    showState: boolean; showDistrict: boolean
    onToggleState: () => void; onToggleDistrict: () => void
}) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const activeCount = (showState ? 1 : 0) + (showDistrict ? 1 : 0)
    const label = activeCount === 0 ? 'None'
        : activeCount === 2 ? 'State + District'
        : showState ? 'State Avg' : 'District Avg'

    return (
        <div className="relative" ref={ref}>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Show Lines
            </p>
            <button type="button" onClick={() => setOpen(o => !o)}
                className="w-full h-11 flex items-center justify-between px-4 bg-white
                           border-[3px] border-[#15315E] rounded-xl text-xs font-semibold
                           text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
                <span className="truncate text-left">{label}</span>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {activeCount > 0 && (
                        <span className="bg-[#0f2448] text-white text-[10px] font-bold
                                         w-5 h-5 rounded-full flex items-center justify-center">
                            {activeCount}
                        </span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-[#15315E] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                </div>
            </button>
            {open && (
                <div className="absolute z-50 mt-2 right-0 w-56 bg-white border border-gray-200
                                rounded-xl shadow-2xl overflow-hidden">
                    <div onClick={onToggleState}
                         className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50
                                    cursor-pointer transition-colors border-b border-gray-100">
                        <div style={{ borderColor: showState ? '#0f2448' : '#d1d5db', background: showState ? '#0f2448' : 'white' }}
                             className="w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all">
                            {showState && <Check className="w-3 h-3 text-white stroke-[4]" />}
                        </div>
                        <div className="flex items-center gap-2">
                            <svg width="26" height="10">
                                <line x1="0" y1="5" x2="26" y2="5" stroke="#ef4444" strokeWidth="2" strokeDasharray="5,3" />
                            </svg>
                            <span className={`text-sm select-none ${showState ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                                State Average
                            </span>
                        </div>
                    </div>
                    <div onClick={onToggleDistrict}
                         className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors">
                        <div style={{ borderColor: showDistrict ? '#0f2448' : '#d1d5db', background: showDistrict ? '#0f2448' : 'white' }}
                             className="w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all">
                            {showDistrict && <Check className="w-3 h-3 text-white stroke-[4]" />}
                        </div>
                        <div className="flex items-center gap-2">
                            <svg width="26" height="10">
                                <line x1="0" y1="5" x2="26" y2="5" stroke="#1e40af" strokeWidth="2.5" />
                                <circle cx="13" cy="5" r="2.5" fill="#1e40af" />
                            </svg>
                            <span className={`text-sm select-none ${showDistrict ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                                District 66 Avg
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Subject Dropdown ──────────────────────────────────────────────────────────
function SubjectDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [open, setOpen] = useState(false)
    return (
        <div className="relative min-w-[200px]">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Subject</p>
            <button type="button" onClick={() => setOpen(o => !o)}
                className="w-full h-11 flex items-center justify-between gap-3 px-4 bg-white
                           border-[3px] border-[#15315E] rounded-xl text-sm font-semibold
                           text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
                <span className="truncate text-left">{value}</span>
                <ChevronDown className={`w-4 h-4 text-[#15315E] flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
                        {SUBJECTS.map(opt => (
                            <button key={opt} onClick={() => { onChange(opt); setOpen(false) }}
                                className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                                    value === opt ? 'bg-blue-50 text-[#15315E] font-bold' : 'text-gray-600 hover:bg-gray-50'
                                }`}>
                                <div className="flex items-center justify-between">
                                    {opt}
                                    {value === opt && <div className="w-2 h-2 rounded-full bg-[#15315E]" />}
                                </div>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function District66Page() {
    const [allData,           setAllData]           = useState<AllData | null>(null)
    const [schoolsByDistrict, setSchoolsByDistrict] = useState<Record<string, string[]>>({})
    const [colorMap,          setColorMap]          = useState<Record<string, string>>({})
    const [frlData,           setFrlData]           = useState<FrlRow[]>([])
    const [dataLoading,       setDataLoading]       = useState(true)
    const [error,             setError]             = useState('')
    const [activeTab,         setActiveTab]         = useState<Tab>('performance')

    // ── Performance tab state ─────────────────────────────────────────────────
    const [pSubject,      setPSubject]      = useState('Mathematics')
    const [pGrades,       setPGrades]       = useState<string[]>(['03'])
    const [pViewMode,     setPViewMode]     = useState<'all' | 'gender'>('all')
    const [pSelSchools,   setPSelSchools]   = useState<string[]>([])
    const [pShowState,    setPShowState]    = useState(true)
    const [pShowDistrict, setPShowDistrict] = useState(true)

    // ── Equity tab state ──────────────────────────────────────────────────────
    const [eSubject, setESubject] = useState('Mathematics')
    const [eGrades,  setEGrades]  = useState<string[]>(['03'])
    const [eYears,   setEYears]   = useState<string[]>(['2024'])

    useEffect(() => {
        fetchDashboardData()
            .then(({ allData, schoolsByDistrict, colorMap, frlData }) => {
                setAllData(allData)
                setSchoolsByDistrict(schoolsByDistrict)
                setColorMap(colorMap)
                setFrlData(frlData)
                setDataLoading(false)
            })
            .catch(e => { setError(e.message); setDataLoading(false) })
    }, [])

    const normalizeSchoolName = (name: string) =>
        name
            .replace(/\b(ELEMENTARY SCHOOL|ELEMENTARY SCH|MIDDLE SCHOOL|CARL A|ROAD|HILLS)\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim()

    // ── Performance tab derived ───────────────────────────────────────────────
    const schoolOptions = useMemo(() => {
        const seen = new Map<string, string>()
        ;(schoolsByDistrict[DISTRICT_66_NAME] ?? []).forEach(s => {
            const n = normalizeSchoolName(s)
            if (!seen.has(n)) seen.set(n, s)
        })
        return Array.from(seen.keys()).map(n => ({ value: n, label: n }))
    }, [schoolsByDistrict])

    const filteredData = useMemo(() => {
        if (!allData) return []
        const source         = pSubject === 'Mathematics' ? allData.math : allData.english
        const subgroupFilter = pViewMode === 'all' ? 'ALL' : 'GENDER'
        return source.filter(row => {
            if (!pGrades.includes(row.grade))         return false
            if (row.subgroup_type !== subgroupFilter) return false
            if (row.level === 'ST') return pShowState
            if (row.level === 'DI') return pShowDistrict && row.agency_name === DISTRICT_66_NAME
            if (row.level === 'SC') {
                return row.district_name === DISTRICT_66_NAME
                    && pSelSchools.includes(normalizeSchoolName(row.agency_name))
            }
            return false
        })
    }, [allData, pSubject, pGrades, pViewMode, pSelSchools, pShowState, pShowDistrict])

    const normalizedFilteredData = useMemo(() =>
        filteredData.map(r => ({ ...r, agency_name: normalizeSchoolName(r.agency_name) })),
        [filteredData]
    )

    const normalizedColorMap = useMemo(() => {
        const map: Record<string, string> = {}
        Object.entries(colorMap).forEach(([k, v]) => { map[normalizeSchoolName(k)] = v })
        map[normalizeSchoolName(DISTRICT_66_NAME)] = '#1e40af'
        return map
    }, [colorMap])

    const traces = useMemo(() =>
        buildTraces({ filteredData: normalizedFilteredData, colorMap: normalizedColorMap, viewMode: pViewMode }),
        [normalizedFilteredData, normalizedColorMap, pViewMode]
    )

    const pGradeLabel = pGrades.length === GRADES.length
        ? 'All Grades' : pGrades.map(g => `Grade ${parseInt(g)}`).join(', ')

    // ── Equity tab derived ────────────────────────────────────────────────────
    const eYearOptions = useMemo(() => {
        const years = [...new Set(
            frlData.filter(r => r.level === 'SC').map(r => String(getYear(r.school_year)))
        )].sort((a, b) => Number(b) - Number(a))
        return years.map(y => ({
            value: y,
            label: TICK_TEXTS[TICK_VALS.indexOf(Number(y))] ?? y,
        }))
    }, [frlData])

    const schoolScores = useMemo(() => {
        if (!allData) return {}
        const source = eSubject === 'Mathematics' ? allData.math : allData.english
        const rows   = source.filter(r =>
            r.level         === 'SC'  &&
            r.subgroup_type === 'ALL' &&
            r.district_name === DISTRICT_66_NAME &&
            eGrades.includes(r.grade) &&
            eYears.includes(String(getYear(r.school_year)))
        )
        const bySchool: Record<string, { scores: number[]; counts: number[] }> = {}
        rows.forEach(r => {
            const score    = parseFloat(r.avg_scale_score)
            const rawCount = parseFloat(r.count_tested)
            if (!isFinite(score) || score <= 0) return
            const count = (isFinite(rawCount) && rawCount > 0) ? rawCount : 1
            const name = normalizeSchoolName(r.agency_name)
            if (!bySchool[name]) bySchool[name] = { scores: [], counts: [] }
            bySchool[name].scores.push(score)
            bySchool[name].counts.push(count)
        })
        const result: Record<string, number> = {}
        Object.entries(bySchool).forEach(([name, { scores, counts }]) => {
            if (scores.length > 0) result[name] = weightedAvg(scores, counts)
        })
        return result
    }, [allData, eSubject, eGrades, eYears])

    // ── schoolFrl: weighted avg when count available, simple avg otherwise ────
    const schoolFrl = useMemo(() => {
        const accum: Record<string, {
            weighted: { countFrl: number; total: number; yearCount: number }
            pctOnly:  number[]
        }> = {}

        // Deduplicate: one FRL row per school per year
        const seen = new Set<string>()

        frlData
            .filter(r => r.level === 'SC' && eYears.includes(String(getYear(r.school_year))))
            .forEach(r => {
                const normalized = normalizeSchoolName(r.agency_name)
                const pct        = parseFloat(r.pct_frl)
                const count      = parseFloat(r.count_frl ?? '')

                if (!isFinite(pct)) return

                // Skip duplicate school+year combos
                const key = `${normalized}__${r.school_year}`
                if (seen.has(key)) return
                seen.add(key)

                if (!accum[normalized])
                    accum[normalized] = { weighted: { countFrl: 0, total: 0, yearCount: 0 }, pctOnly: [] }

                if (isFinite(count) && count > 0) {
                    // Reverse-calculate total enrollment: count_frl / pct_frl
                    const totalEnroll = count / pct
                    accum[normalized].weighted.countFrl  += count
                    accum[normalized].weighted.total     += totalEnroll
                    accum[normalized].weighted.yearCount += 1
                } else {
                    // No count available — store raw pct at full precision
                    accum[normalized].pctOnly.push(pct * 100)
                }
            })

        // Build rawMap with correct blending logic
        const rawMap: Record<string, { pct: number; countFrl: number | null }> = {}

        Object.entries(accum).forEach(([name, { weighted, pctOnly }]) => {
            const hasWeighted = weighted.total > 0
            const hasPctOnly  = pctOnly.length > 0

            if (hasWeighted && !hasPctOnly) {
                // ✅ All years have count_frl → pure weighted average
                rawMap[name] = {
                    pct     : (weighted.countFrl / weighted.total) * 100,
                    countFrl: Math.round(weighted.countFrl),
                }
            } else if (hasWeighted && hasPctOnly) {
                // ⚠️ Mixed years → blend weighted pct + simple pct, weighted by year count
                const weightedPct = (weighted.countFrl / weighted.total) * 100
                const simplePct   = pctOnly.reduce((a, b) => a + b, 0) / pctOnly.length
                const totalYears  = weighted.yearCount + pctOnly.length
                const blendedPct  = (weightedPct * weighted.yearCount + simplePct * pctOnly.length) / totalYears
                rawMap[name] = {
                    pct     : blendedPct,
                    countFrl: Math.round(weighted.countFrl),
                }
            } else {
                // ❌ No count_frl at all → simple average of pct values
                rawMap[name] = {
                    pct     : pctOnly.reduce((a, b) => a + b, 0) / pctOnly.length,
                    countFrl: null,
                }
            }
        })

        // Fuzzy matching for schools whose names differ between score and FRL data
        const frlNames = Object.keys(rawMap)
        const result: Record<string, { pct: number; countFrl: number | null }> = { ...rawMap }

        if (allData) {
            const source = eSubject === 'Mathematics' ? allData.math : allData.english
            const scoreNames = [
                ...new Set(
                    source
                        .filter(r =>
                            r.level         === 'SC' &&
                            r.subgroup_type === 'ALL' &&
                            r.district_name === DISTRICT_66_NAME &&
                            eYears.includes(String(getYear(r.school_year)))
                        )
                        .map(r => normalizeSchoolName(r.agency_name))
                )
            ]

            scoreNames.forEach(scoreName => {
                if (result[scoreName] != null) return
                const scoreWords = scoreName.toLowerCase().split(' ').filter(Boolean)
                const fuzzyMatch = frlNames.find(frlName => {
                    const frlWords = frlName.toLowerCase().split(' ').filter(Boolean)
                    return (
                        (scoreWords[0] && frlWords[0] && scoreWords[0] === frlWords[0]) ||
                        frlName.toLowerCase().includes(scoreName.toLowerCase()) ||
                        scoreName.toLowerCase().includes(frlName.toLowerCase()) ||
                        scoreWords.some(sw => sw.length >= 3 && frlWords.some(fw => fw === sw))
                    )
                })
                if (fuzzyMatch != null) result[scoreName] = rawMap[fuzzyMatch]
            })
        }

        return result
    }, [frlData, eYears, allData, eSubject])

    // ── eScatterPoints: passes countFrl + totalTested ─────────────────────────
    const eScatterPoints = useMemo(() => {
        const gradesBySchool: Record<string, Set<string>> = {}
        const testedBySchool: Record<string, number>      = {}

        if (allData) {
            const source = eSubject === 'Mathematics' ? allData.math : allData.english
            source
                .filter(r => {
                    const score = parseFloat(r.avg_scale_score)
                    return (
                        r.level         === 'SC' &&
                        r.subgroup_type === 'ALL' &&
                        r.district_name === DISTRICT_66_NAME &&
                        eGrades.includes(r.grade) &&
                        eYears.includes(String(getYear(r.school_year))) &&
                        isFinite(score) && score > 0
                    )
                })
                .forEach(r => {
                    const name  = normalizeSchoolName(r.agency_name)
                    const count = parseFloat(r.count_tested) || 0
                    if (!gradesBySchool[name]) gradesBySchool[name] = new Set()
                    gradesBySchool[name].add(r.grade)
                    testedBySchool[name] = (testedBySchool[name] ?? 0) + count
                })
        }

        return Object.entries(schoolScores)
            .filter(([, score]) => isFinite(score) && score > 0)
            .map(([name, score]) => {
                const frlEntry      = schoolFrl[name]
                const hasFrl        = frlEntry != null && !isNaN(frlEntry.pct)
                const schoolGrades  = gradesBySchool[name] ?? new Set()
                const gradesPresent = [...schoolGrades]
                    .sort()
                    .map(g => parseInt(g).toString())
                    .join(', ')
                const gradesUsed    = schoolGrades.size
                const totalSelected = eGrades.length
                const isPartial     = gradesUsed < totalSelected

                return {
                    name,
                    x           : hasFrl ? frlEntry.pct : null,
                    y           : score,
                    hasFrl,
                    color       : normalizedColorMap[name] || '#94a3b8',
                    gradesPresent,
                    gradesUsed,
                    totalSelected,
                    isPartial,
                    countFrl    : hasFrl ? frlEntry.countFrl : null,
                    totalTested : testedBySchool[name] ?? 0,
                }
            })
    }, [schoolScores, schoolFrl, normalizedColorMap, allData, eSubject, eGrades, eYears])

    const eRegression = useMemo(() => {
        const plottable = eScatterPoints
            .filter((p): p is typeof p & { x: number } => p.hasFrl && p.x !== null)
        if (plottable.length < 3) return null
        return linearRegression(plottable)
    }, [eScatterPoints])

    const eWithGap = useMemo(() => {
        return eScatterPoints.map(p => {
            if (!p.hasFrl || !eRegression) {
                return { ...p, gap: 0, predicted: p.y }
            }
            const predicted = eRegression.slope * (p.x as number) + eRegression.intercept
            return { ...p, predicted, gap: p.y - predicted }
        })
    }, [eScatterPoints, eRegression])

    // ── eTraces ───────────────────────────────────────────────────────────────
    const eTraces = useMemo(() => {
        const plottable     = eWithGap.filter(p => p.hasFrl)
        const fullPoints    = plottable.filter(p => !p.isPartial)
        const partialPoints = plottable.filter(p => p.isPartial)

        if (!plottable.length) return []

        const result: object[] = []

        const fmtFrl = (p: typeof eWithGap[0]) =>
            p.countFrl != null ? p.countFrl.toLocaleString() : 'N/A'

        if (fullPoints.length > 0) {
            result.push({
                type        : 'scatter',
                mode        : 'markers+text',
                name        : 'All selected grades',
                x           : fullPoints.map(p => p.x),
                y           : fullPoints.map(p => p.y),
                text        : fullPoints.map(p => p.name),
                textposition: 'top center',
                textfont    : { size: 9, color: '#6b7280' },
                customdata  : fullPoints.map(p => [
                    p.gap.toFixed(1),
                    p.predicted.toFixed(1),
                    p.gradesPresent,
                    p.gradesUsed,
                    p.totalSelected,
                    fmtFrl(p),
                    p.totalTested.toLocaleString(),
                ]),
                marker: {
                    size   : 12,
                    color  : fullPoints.map(p => p.color),
                    opacity: 0.9,
                    line   : { width: 1.5, color: '#fff' },
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
                type        : 'scatter',
                mode        : 'markers+text',
                name        : 'Partial grade data',
                x           : partialPoints.map(p => p.x),
                y           : partialPoints.map(p => p.y),
                text        : partialPoints.map(p => p.name),
                textposition: 'top center',
                textfont    : { size: 9, color: '#9ca3af' },
                customdata  : partialPoints.map(p => [
                    p.gap.toFixed(1),
                    p.predicted.toFixed(1),
                    p.gradesPresent,
                    p.gradesUsed,
                    p.totalSelected,
                    fmtFrl(p),
                    p.totalTested.toLocaleString(),
                ]),
                marker: {
                    size   : 12,
                    color  : partialPoints.map(p => p.color),
                    opacity: 0.45,
                    symbol : 'circle-open',
                    line   : { width: 2.5, color: partialPoints.map(p => p.color) },
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

        if (eRegression) {
            const xs    = plottable.map(p => p.x as number)
            const lineX = [Math.min(...xs) - 2, Math.max(...xs) + 2]
            result.push({
                type      : 'scatter',
                mode      : 'lines',
                x         : lineX,
                y         : lineX.map(x => eRegression.slope * x + eRegression.intercept),
                line      : { color: '#94a3b8', width: 1.5, dash: 'dash' },
                hoverinfo : 'skip',
                showlegend: false,
            })
        }

        return result
    }, [eWithGap, eRegression])

    const eSorted = useMemo(() =>
        [...eWithGap].filter(p => p.hasFrl).sort((a, b) => b.gap - a.gap),
        [eWithGap]
    )
    const eTop    = eSorted.slice(0, 3)
    const eBottom = eSorted.length > 3 ? eSorted.slice(-3).reverse() : []

    const eNoFrl = useMemo(() =>
        eWithGap.filter(p => !p.hasFrl),
        [eWithGap]
    )

    const eGradeLabel = eGrades.length === GRADES.length
        ? 'All Grades'
        : eGrades.length === 1
            ? `Grade ${parseInt(eGrades[0])}`
            : `Grade ${eGrades.map(g => parseInt(g).toString()).join(', ')}`

    const eYearListLabel = eYears.length === 0
        ? 'No year selected'
        : eYears.length === 1
            ? (eYearOptions.find(y => y.value === eYears[0])?.label ?? eYears[0])
            : `${eYears.length} Years Avg`

    return (
        <div className="min-h-screen bg-[#f4f6f9]">

            {/* Header */}
            <header className="bg-[#1a3353] shadow-lg">
                <Navbar />
            </header>

            <main className="mx-auto max-w-screen-2xl px-4 sm:px-8 lg:px-12 py-5 sm:py-8">

                {/* Back + Title */}
                <div className="flex flex-col gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">District 66</h1>
                        <p className="text-sm text-slate-500 mt-0.5">WESTSIDE COMMUNITY SCHOOLS</p>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-1 bg-white border border-gray-200 rounded-2xl p-1.5
                                shadow-sm mb-6 w-fit">
                    <button
                        onClick={() => setActiveTab('performance')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
                                    transition-all duration-200 ${
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
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
                                    transition-all duration-200 ${
                            activeTab === 'equity'
                                ? 'bg-[#1a3353] text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        <ScatterChart className="w-4 h-4" />
                        Equity Analysis
                    </button>
                </div>

                {/* ══════════════════════════════════════════════════════════════════ */}
                {/* TAB: Performance Over Time                                        */}
                {/* ══════════════════════════════════════════════════════════════════ */}
                {activeTab === 'performance' && (
                    <div>
                        <p className="text-sm text-slate-500 mb-5">
                            Compare individual school trends against district and state averages over time.
                        </p>

                        {/* Filter bar */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-5">
                            <div className="flex flex-wrap gap-3 items-end">
                                <SubjectDropdown value={pSubject} onChange={setPSubject} />

                                <div className="w-[160px]">
                                    <MultiSelect label="Grade" options={GRADES} selected={pGrades}
                                        onChange={setPGrades} placeholder="Select grades" accentColor="#0f2448" />
                                </div>

                                <div className="w-[190px]">
                                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                                        Student Group
                                    </p>
                                    <div className="flex h-11 rounded-xl overflow-hidden border-[3px] border-[#15315E] shadow-sm">
                                        <button onClick={() => setPViewMode('all')}
                                            className={`flex-1 text-xs font-semibold transition-all px-3 ${
                                                pViewMode === 'all'
                                                    ? 'bg-gradient-to-b from-[#004080] to-[#003366] text-white'
                                                    : 'bg-white text-gray-600 hover:bg-slate-50'
                                            }`}>All Students</button>
                                        <div className="w-px bg-blue-300" />
                                        <button onClick={() => setPViewMode('gender')}
                                            className={`flex-1 text-xs font-semibold transition-all px-3 ${
                                                pViewMode === 'gender'
                                                    ? 'bg-gradient-to-b from-[#004080] to-[#003366] text-white'
                                                    : 'bg-white text-gray-600 hover:bg-slate-50'
                                            }`}>By Gender</button>
                                    </div>
                                </div>

                                <div className="w-[240px]">
                                    <MultiSelect label="School" options={schoolOptions} selected={pSelSchools}
                                        onChange={setPSelSchools}
                                        placeholder={schoolOptions.length === 0 ? 'Loading...' : 'Select Schools...'}
                                        accentColor="#0f2448" disabled={schoolOptions.length === 0} />
                                </div>

                                <div className="w-[180px]">
                                    <ShowLinesDropdown showState={pShowState} showDistrict={pShowDistrict}
                                        onToggleState={() => setPShowState(s => !s)}
                                        onToggleDistrict={() => setPShowDistrict(d => !d)} />
                                </div>

                                <button onClick={() => setPSelSchools([])} disabled={pSelSchools.length === 0}
                                    className={`h-11 px-6 text-sm rounded-xl font-medium transition-all self-end
                                        ${pSelSchools.length > 0
                                            ? 'bg-white text-gray-500 border border-gray-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 shadow-sm'
                                            : 'bg-transparent text-gray-300 border border-gray-100 cursor-not-allowed'
                                        }`}>
                                    Clear
                                </button>
                            </div>
                        </div>

                        {/* Chart + right panel */}
                        <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 items-stretch lg:h-[560px]">
                            <div className="w-full lg:flex-1 bg-white rounded-2xl shadow-sm
                                            border border-gray-100 p-4 sm:p-6 min-w-0 h-full">
                                <div className="mb-4">
                                    <h3 className="text-sm sm:text-base font-semibold text-gray-800">
                                        {pSubject} — {pGradeLabel}
                                    </h3>
                                    <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
                                        District 66 · {pViewMode === 'all'
                                            ? 'All Students'
                                            : 'By Gender · Solid = Male · Dotted = Female'}
                                    </p>
                                </div>
                                {dataLoading ? <ChartSkeleton /> :
                                 error ? (
                                    <div className="h-64 flex items-center justify-center text-red-500 text-sm">{error}</div>
                                 ) : traces.length === 0 ? (
                                    <div className="h-64 flex items-center justify-center text-gray-400 text-sm text-center px-4">
                                        {!pShowState && !pShowDistrict && pSelSchools.length === 0
                                            ? 'Enable State/District lines or select schools.'
                                            : 'No data for the current selection.'}
                                    </div>
                                 ) : (
                                    <Plot data={traces as any}
                                        layout={{
                                            xaxis: {
                                                title    : { text: 'School Year', font: { size: 11 } },
                                                tickmode : 'array',
                                                tickvals : TICK_VALS,
                                                ticktext : TICK_TEXTS,
                                                gridcolor: '#f3f4f6',
                                                linecolor: '#e5e7eb',
                                            },
                                            yaxis    : { title: { text: 'Average Scale Score', font: { size: 11 } }, gridcolor: '#f3f4f6', linecolor: '#e5e7eb' },
                                            hovermode: 'closest',
                                            showlegend   : false,
                                            plot_bgcolor : 'white',
                                            paper_bgcolor: 'white',
                                            height  : 420,
                                            margin  : { t: 10, r: 10, b: 55, l: 60 },
                                            autosize: true,
                                            font    : { family: 'Inter, sans-serif', size: 10, color: '#6b7280' },
                                        }}
                                        style={{ width: '100%' }}
                                        config={{
                                            responsive          : true,
                                            displayModeBar      : false,
                                            toImageButtonOptions: { format: 'png', filename: `NDE_D66_${pSubject}`, scale: 2 },
                                        }}
                                        useResizeHandler={true}
                                    />
                                )}
                            </div>

                            {/* Right panel */}
                            <div className="w-full lg:w-52 lg:flex-shrink-0 h-full flex flex-col gap-4 overflow-hidden">
                                <LineStyleLegend viewMode={pViewMode} showDistrict66={true} />
                                <div className="flex-1 bg-white rounded-2xl border border-gray-100
                                                shadow-sm p-4 sm:p-5 flex flex-col min-h-0 overflow-hidden">
                                    <p className="text-[11px] font-semibold text-gray-400
                                                  uppercase tracking-widest mb-3 flex-shrink-0">
                                        Selected Schools
                                        <span className="ml-1.5 text-[10px] bg-gray-100 text-gray-500
                                                         px-1.5 py-0.5 rounded-full normal-case font-bold tracking-normal">
                                            {pSelSchools.length}
                                        </span>
                                    </p>
                                    <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-2">
                                        {pSelSchools.length > 0 ? (
                                            pSelSchools.map(s => (
                                                <div key={s} className="flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                         style={{ background: normalizedColorMap[s] || '#aaa' }} />
                                                    <span className="text-xs text-gray-600 truncate">{s}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
                                                <School size={24} className="text-gray-300 mb-2" />
                                                <p className="text-[10px] text-gray-400 font-medium leading-tight">
                                                    No schools<br />selected
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════════ */}
                {/* TAB: Equity Analysis                                              */}
                {/* ══════════════════════════════════════════════════════════════════ */}
                {activeTab === 'equity' && (
                    <div>
                        <p className="text-sm text-slate-500 mb-5">
                            Each school is plotted by its poverty rate vs. average score.
                            Schools <span className="text-emerald-600 font-medium">above the trend line</span> are
                            outperforming expectations; those <span className="text-red-500 font-medium">below</span> warrant attention.
                        </p>

                        {/* Filter bar */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-5">
                            <div className="flex flex-wrap gap-4 items-end">
                                <SubjectDropdown value={eSubject} onChange={setESubject} />

                                <div className="min-w-[150px]">
                                    <MultiSelect label="Grade" options={GRADES} selected={eGrades}
                                        onChange={setEGrades} placeholder="Select Grades" accentColor="#0f2448" />
                                </div>

                                <div className="min-w-[160px]">
                                    <MultiSelect
                                        label="School Year"
                                        options={eYearOptions}
                                        selected={eYears}
                                        onChange={setEYears}
                                        placeholder="Select Year(s)"
                                        accentColor="#0f2448"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Scatter card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
                            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                                <div>
                                    <h3 className="text-sm sm:text-base font-semibold text-gray-800">
                                        {eSubject} — {eGradeLabel} · {eYearListLabel}
                                    </h3>
                                    <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
                                        Each point is one school &nbsp;·&nbsp;
                                        X = Free &amp; Reduced Lunch % &nbsp;·&nbsp; Y = Avg Scale Score
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                        <span className="text-[11px] font-semibold text-emerald-700 whitespace-nowrap">
                                            Above line — Outperforming
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
                                        <TrendingDown className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                                        <span className="text-[11px] font-semibold text-red-600 whitespace-nowrap">
                                            Below line — Underperforming
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                                        <Minus className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                        <span className="text-[11px] font-semibold text-gray-500 whitespace-nowrap">
                                            Expected trend
                                        </span>
                                    </div>
                                    {eGrades.length > 1 && (
                                        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
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

                            {dataLoading ? <ChartSkeleton /> :
                             eTraces.length === 0 ? (
                                <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                                    No FRL data available for the selected filters.
                                </div>
                             ) : (
                                <Plot data={eTraces as any}
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
                                        height  : 420,
                                        margin  : { t: 30, r: 20, b: 60, l: 70 },
                                        autosize: true,
                                        font    : { family: 'Inter, sans-serif', size: 10, color: '#6b7280' },
                                    }}
                                    style={{ width: '100%' }}
                                    config={{
                                        responsive          : true,
                                        displayModeBar      : false,
                                        toImageButtonOptions: { format: 'png', filename: `NDE_D66_Equity_${eSubject}`, scale: 2 },
                                    }}
                                    useResizeHandler={true}
                                />
                            )}
                        </div>

                        {/* Top / Bottom performers */}
                        {eSorted.length > 0 && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                                    <div className="flex items-center gap-2 mb-1">
                                        <TrendingUp className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                        <p className="text-sm font-semibold text-gray-800">Top Overperformers</p>
                                    </div>
                                    <p className="text-[11px] text-gray-400 mb-4">
                                        Schools scoring above expectations for their FRL rate
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        {eTop.map((d, i) => (
                                            <div key={d.name}
                                                 className="flex items-center justify-between
                                                            py-2.5 px-3 rounded-xl bg-emerald-50 border border-emerald-100">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className="text-xs font-bold text-emerald-700 w-5 flex-shrink-0">{i + 1}</span>
                                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                                                    <span className="text-xs text-gray-700 font-medium truncate">{d.name}</span>
                                                </div>
                                                <div className="text-right flex-shrink-0 ml-3">
                                                    <p className="text-xs font-bold text-emerald-700">+{d.gap.toFixed(1)} pts</p>
                                                    <p className="text-[10px] text-gray-400">{(d.x as number).toFixed(0)}% FRL</p>
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
                                    <p className="text-[11px] text-gray-400 mb-4">
                                        Schools scoring below expectations for their FRL rate
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        {eBottom.map((d, i) => (
                                            <div key={d.name}
                                                 className="flex items-center justify-between
                                                            py-2.5 px-3 rounded-xl bg-red-50 border border-red-100">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className="text-xs font-bold text-red-500 w-5 flex-shrink-0">{i + 1}</span>
                                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                                                    <span className="text-xs text-gray-700 font-medium truncate">{d.name}</span>
                                                </div>
                                                <div className="text-right flex-shrink-0 ml-3">
                                                    <p className="text-xs font-bold text-red-500">{d.gap.toFixed(1)} pts</p>
                                                    <p className="text-[10px] text-gray-400">{(d.x as number).toFixed(0)}% FRL</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* No-FRL callout */}
                        {eNoFrl.length > 0 && (
                            <div className="mt-5 bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-amber-800 mb-1">
                                            {eNoFrl.length === 1
                                                ? '1 school excluded from chart'
                                                : `${eNoFrl.length} schools excluded from chart`}
                                        </p>
                                        <p className="text-[11px] text-amber-700 mb-3">
                                            FRL poverty data is unavailable for the following{' '}
                                            {eNoFrl.length === 1 ? 'school' : 'schools'} in {eYearListLabel}.
                                            Score data is present — the school{eNoFrl.length > 1 ? 's' : ''} cannot
                                            be plotted without an x-axis value.
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {eNoFrl.map(d => (
                                                <div key={d.name}
                                                     className="flex items-center gap-2 bg-white border border-amber-200
                                                                rounded-lg px-3 py-1.5">
                                                    <div className="w-2 h-2 rounded-full flex-shrink-0"
                                                         style={{ background: d.color }} />
                                                    <span className="text-xs font-medium text-gray-700">{d.name}</span>
                                                    <span className="text-[10px] text-gray-400">
                                                        avg {d.y.toFixed(0)} · Grade{d.gradesPresent.includes(',') ? 's' : ''} {d.gradesPresent}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </main>
            {/* Footer */}
            <footer className="mt-12 pb-12 border-t border-gray-200 pt-8 px-4">
                <div className="max-w-screen-2xl mx-auto text-center">
                    <p className="text-xs text-gray-400">
                        &copy; {new Date().getFullYear()} Pencils Before Pixels 
                    </p>
                </div>
            </footer>
        </div>
    )
}