'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ChevronDown, Check, ArrowLeft, Link as LinkIcon, ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { AllData }                       from '@/types'
import { GRADES, TICK_VALS, TICK_TEXTS } from '@/lib/constants'
import { fetchDashboardData }            from '@/services/scoreService'
import { buildTraces }                   from '@/lib/traceBuilder'
import { MultiSelect }                   from '@/components/MultiSelect'
import { LineStyleLegend }               from '@/components/LineStyleLegend'
import { ChartSkeleton }                 from '@/components/ChartSkeleton'

const Plot = dynamic(
    () => import('react-plotly.js').then(mod => mod.default),
    { ssr: false, loading: () => <ChartSkeleton /> }
)

// ⚠️ Replace with exact agency_name from your DB
const DISTRICT_66_NAME = 'WESTSIDE COMMUNITY SCHOOLS'
const SUBJECTS = ['Mathematics', 'English Language Arts']

// ── Show Lines Dropdown (State + District only) ───────────────────────────────
function ShowLinesDropdown({
    showState, showDistrict, onToggleState, onToggleDistrict,
}: {
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
                    <ChevronDown className={`w-4 h-4 text-[#15315E] transition-transform
                                            duration-200 ${open ? 'rotate-180' : ''}`} />
                </div>
            </button>
            {open && (
                <div className="absolute z-50 mt-2 right-0 w-56 bg-white border border-gray-200
                                rounded-xl shadow-2xl overflow-hidden">
                    <div onClick={onToggleState}
                         className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50
                                    cursor-pointer transition-colors border-b border-gray-100">
                        <div style={{
                                borderColor: showState ? '#0f2448' : '#d1d5db',
                                background : showState ? '#0f2448' : 'white',
                             }}
                             className="w-4 h-4 rounded border-2 flex-shrink-0
                                        flex items-center justify-center transition-all">
                            {showState && <Check className="w-3 h-3 text-white stroke-[4]" />}
                        </div>
                        <div className="flex items-center gap-2">
                            <svg width="26" height="10">
                                <line x1="0" y1="5" x2="26" y2="5"
                                      stroke="#ef4444" strokeWidth="2" strokeDasharray="5,3" />
                            </svg>
                            <span className={`text-sm select-none ${showState ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                                State Average
                            </span>
                        </div>
                    </div>
                    <div onClick={onToggleDistrict}
                         className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50
                                    cursor-pointer transition-colors">
                        <div style={{
                                borderColor: showDistrict ? '#0f2448' : '#d1d5db',
                                background : showDistrict ? '#0f2448' : 'white',
                             }}
                             className="w-4 h-4 rounded border-2 flex-shrink-0
                                        flex items-center justify-center transition-all">
                            {showDistrict && <Check className="w-3 h-3 text-white stroke-[4]" />}
                        </div>
                        <div className="flex items-center gap-2">
                            <svg width="26" height="10">
                                <line x1="0" y1="5" x2="26" y2="5"
                                      stroke="#1e40af" strokeWidth="2.5" />
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

// ── District 66 Page ──────────────────────────────────────────────────────────
export default function District66Page() {
    const router = useRouter()

    const [allData,           setAllData]           = useState<AllData | null>(null)
    const [schoolsByDistrict, setSchoolsByDistrict] = useState<Record<string, string[]>>({})
    const [colorMap,          setColorMap]          = useState<Record<string, string>>({})
    const [dataLoading,       setDataLoading]       = useState(true)
    const [error,             setError]             = useState('')

    const [subject,      setSubject]      = useState('Mathematics')
    const [selGrades,    setSelGrades]    = useState<string[]>(['03'])
    const [viewMode,     setViewMode]     = useState<'all' | 'gender'>('all')
    const [selSchools,   setSelSchools]   = useState<string[]>([])
    const [showState,    setShowState]    = useState(true)
    const [showDistrict, setShowDistrict] = useState(true)
    const [subjectOpen,  setSubjectOpen]  = useState(false)

    useEffect(() => {
        fetchDashboardData()
            .then(({ allData, schoolsByDistrict, colorMap }) => {
                setAllData(allData)
                setSchoolsByDistrict(schoolsByDistrict)
                setColorMap(colorMap)
                setDataLoading(false)
            })
            .catch(e => { setError(e.message); setDataLoading(false) })
    }, [])

    const normalizeSchoolName = (name: string) => {
        return name
            .replace(/\b(ELEMENTARY SCHOOL|ELEMENTARY SCH|MIDDLE SCHOOL|CARL A|ROAD|LANE|HILLS)\b/gi, '')
            .replace(/\s+/g, ' ') // Collapse extra spaces left behind
            .trim()
    }

    const schoolOptions = useMemo(() => {
        const seen = new Map<string, string>() // normalized → original

        ;(schoolsByDistrict[DISTRICT_66_NAME] ?? []).forEach(s => {
            const normalized = normalizeSchoolName(s)
            if (!seen.has(normalized)) {
                seen.set(normalized, s)
            }
        })

        return Array.from(seen.entries()).map(([normalized]) => ({
            value: normalized,   // ✅ NOW normalized
            label: normalized
        }))
    }, [schoolsByDistrict])

    const filteredData = useMemo(() => {
        if (!allData) return []
        const source         = subject === 'Mathematics' ? allData.math : allData.english
        const subgroupFilter = viewMode === 'all' ? 'ALL' : 'GENDER'

        return source.filter(row => {
            if (!selGrades.includes(row.grade))       return false
            if (row.subgroup_type !== subgroupFilter) return false

            if (row.level === 'ST') return showState

            if (row.level === 'DI') {
                return showDistrict && row.agency_name === DISTRICT_66_NAME
            }

            if (row.level === 'SC') {
                return row.district_name === DISTRICT_66_NAME
                    && selSchools.includes(normalizeSchoolName(row.agency_name))
            }

            return false
        })
    }, [allData, subject, selGrades, viewMode, selSchools, showState, showDistrict])

    const normalizedFilteredData = useMemo(() => {
        return filteredData.map(row => ({
            ...row,
            agency_name: normalizeSchoolName(row.agency_name)
        }))
    }, [filteredData])

    const normalizedColorMap = useMemo(() => {
        const map: Record<string, string> = {}

        Object.entries(colorMap).forEach(([key, val]) => {
            const normalized = normalizeSchoolName(key)
            map[normalized] = val
        })

        // ✅ FORCE District 66 color to match legend
        map[normalizeSchoolName(DISTRICT_66_NAME)] = '#1e40af'

        return map
    }, [colorMap])

    const traces = useMemo(() =>
        buildTraces({ filteredData: normalizedFilteredData, colorMap: normalizedColorMap, viewMode }),
        [filteredData, colorMap, viewMode]
    )

    const gradeLabel = selGrades.length === GRADES.length
        ? 'All Grades'
        : selGrades.map(g => `Grade ${parseInt(g)}`).join(', ')

    return (
        <div className="min-h-screen bg-[#f4f6f9]">

            {/* Header */}
            <header className="bg-[#1a3353] shadow-lg">
                <div className="mx-auto max-w-screen-2xl px-4 sm:px-8 lg:px-12
                                py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-24 lg:h-24
                                    rounded-full bg-white/15 flex items-center
                                    justify-center border border-white/20 flex-shrink-0">
                        <img src="/nde-logo.webp" alt="NDE Logo"
                             className="w-10 h-10 sm:w-14 sm:h-14 lg:w-22 lg:h-22 object-contain" />
                    </div>
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
                <div className="flex flex-col gap-4 mb-6"> 
                {/* Back Icon Row */}
                <div>
                    <Link 
                    href="/" 
                    className="inline-flex p-2 rounded-full bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors group"
                    >
                        <ChevronLeft className="w-4 h-4 text-gray-600 group-hover:text-gray-900" />
                    </Link>
                </div>

                {/* Title & Description Row */}
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold text-slate-900">
                    District 66 — School Performance Over Time
                    </h1>
                    <p className="text-sm text-slate-500">
                    WESTSIDE COMMUNITY SCHOOLS · Compare schools against district and state averages
                    </p>
                </div>
                </div>

                {/* Filter Bar */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-5">
                    <div
                        className="grid grid-cols-2 gap-3
                                sm:grid-cols-3 sm:gap-4
                                lg:flex lg:flex-wrap lg:gap-3 lg:items-end"
                    >

                        {/* Subject */}
                        <div className="relative col-span-2 sm:col-span-1 lg:min-w-[200px]"> {/* Added lg:min-w here */}
                            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                                Subject
                            </p>
                            <button 
                                type="button" 
                                onClick={() => setSubjectOpen(o => !o)}
                                className="w-full h-11 flex items-center justify-between gap-3 px-4 bg-white
                                        border-[3px] border-[#15315E] rounded-xl text-sm font-semibold 
                                        text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                            > {/* Changed text-xs to text-sm above */}
                                <span className="truncate text-left">{subject}</span>
                                <ChevronDown className={`w-4 h-4 text-[#15315E] flex-shrink-0
                                                        transition-transform duration-200
                                                        ${subjectOpen ? 'rotate-180' : ''}`}
                                />
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
                        <div className="flex-shrink-0 w-[160px]">
                            <MultiSelect
                                label="Grade"
                                options={GRADES}
                                selected={selGrades}
                                onChange={setSelGrades}
                                placeholder="Select grades"
                                accentColor="#0f2448"
                            />
                        </div>

                        {/* Student Group */}
                        <div className="flex-shrink-0 w-[190px]">
                            <p className="text-[11px] font-semibold text-gray-400
                                          uppercase tracking-widest mb-2">Student Group</p>
                            <div className="flex h-11 rounded-xl overflow-hidden
                                            border-[3px] border-[#15315E] shadow-sm">
                                <button onClick={() => setViewMode('all')}
                                    className={`flex-1 text-xs font-semibold transition-all px-3 ${
                                        viewMode === 'all'
                                            ? 'bg-gradient-to-b from-[#004080] to-[#003366] text-white'
                                            : 'bg-white text-gray-600 hover:bg-slate-50'
                                    }`}>All Students</button>
                                <div className="w-px bg-blue-300" />
                                <button onClick={() => setViewMode('gender')}
                                    className={`flex-1 text-xs font-semibold transition-all px-3 ${
                                        viewMode === 'gender'
                                            ? 'bg-gradient-to-b from-[#004080] to-[#003366] text-white'
                                            : 'bg-white text-gray-600 hover:bg-slate-50'
                                    }`}>By Gender</button>
                            </div>
                        </div>

                        {/* Schools of District 66 */}
                        <div className="flex-shrink-0 w-[240px]">
                            <MultiSelect
                                label="School"
                                options={schoolOptions}
                                selected={selSchools}
                                onChange={setSelSchools}
                                placeholder={
                                    schoolOptions.length === 0
                                        ? 'Loading schools...'
                                        : 'Select schools...'
                                }
                                accentColor="#0f2448"
                                disabled={schoolOptions.length === 0}
                            />
                        </div>

                        {/* Show Lines */}
                        <div className="flex-shrink-0 w-[180px]">
                            <ShowLinesDropdown
                                showState={showState}
                                showDistrict={showDistrict}
                                onToggleState={() => setShowState(s => !s)}
                                onToggleDistrict={() => setShowDistrict(d => !d)}
                            />
                        </div>

                        <button
                        onClick={() => setSelSchools([])}
                        disabled={selSchools.length === 0}
                        className={`w-full lg:w-auto h-11 px-8 text-sm rounded-xl font-medium transition-all
                            ${selSchools.length > 0
                            ? 'bg-white text-gray-500 border border-gray-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 shadow-sm active:scale-95'
                            : 'bg-transparent text-gray-300 border border-gray-100 cursor-not-allowed'
                            }`}
                        >
                        Clear All
                        </button>
                    </div>
                </div>

                {/* Chart + Legend */}
                <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 items-stretch lg:h-[560px]">

                    <div className="w-full lg:flex-1 bg-white rounded-2xl shadow-sm
                                    border border-gray-100 p-4 sm:p-6 min-w-0 h-full">
                        <div className="flex items-center justify-between mb-4 gap-2">
                            <div>
                                <h3 className="text-sm sm:text-base font-semibold text-gray-800">
                                    {subject} — {gradeLabel}
                                </h3>
                                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
                                    District 66 · {viewMode === 'all'
                                        ? 'All Students'
                                        : 'By Gender · Solid = Male · Dotted = Female'}
                                </p>
                            </div>
                        </div>

                        {dataLoading ? <ChartSkeleton /> :
                         error ? (
                            <div className="h-64 flex items-center justify-center
                                            text-red-500 text-sm">⚠️ {error}</div>
                         ) : traces.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center
                                            text-gray-400 text-sm text-center px-4 gap-2">
                                <span className="text-2xl">📊</span>
                                <span>
                                    {!showState && !showDistrict && selSchools.length === 0
                                        ? 'Enable State/District lines or select schools.'
                                        : 'No data for the current selection.'}
                                </span>
                            </div>
                         ) : (
                            <Plot
                                data={traces as any}
                                layout={{
                                    xaxis: {
                                        title    : { text: 'School Year', font: { size: 11 } },
                                        tickmode : 'array',
                                        tickvals : TICK_VALS,
                                        ticktext : TICK_TEXTS,
                                        gridcolor: '#f3f4f6',
                                        linecolor: '#e5e7eb',
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
                                    margin  : { t: 10, r: 10, b: 55, l: 60 },
                                    autosize: true,
                                    font    : { family: 'Inter, sans-serif', size: 10, color: '#6b7280' },
                                }}
                                style={{ width: '100%' }}
                                config={{
                                    responsive: true,
                                    displayModeBar: true,
                                    modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d'],
                                    toImageButtonOptions: {
                                        format: 'png', filename: `NDE_District66_${subject}`, scale: 2,
                                    },
                                }}
                                useResizeHandler={true}
                            />
                        )}
                    </div>

                    {/* Right Panel */}
                    <div className="w-full lg:w-52 lg:flex-shrink-0 h-full flex flex-col gap-4 overflow-hidden">
                        <LineStyleLegend viewMode={viewMode} showDistrict66={true} />

                        {selSchools.length > 0 && (
                            <div className="flex-1 bg-white rounded-2xl border border-gray-100
                                        shadow-sm p-4 sm:p-5 flex flex-col min-h-0 overflow-hidden">
                                <p className="text-[11px] font-semibold text-gray-400
                                              uppercase tracking-widest mb-3 flex-shrink-0">
                                    Selected Schools
                                    <span className="ml-1.5 text-[10px] bg-gray-100 text-gray-500
                                                     px-1.5 py-0.5 rounded-full normal-case
                                                     font-bold tracking-normal">
                                        {selSchools.length}
                                    </span>
                                </p>
                                <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-2">
                                    {selSchools.map(s => (
                                        <div key={s} className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                 style={{ background: normalizedColorMap[s] || '#aaa' }} />
                                            <span className="text-xs text-gray-600 truncate">{s}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}