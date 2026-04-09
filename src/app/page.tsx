'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import { ChevronDown, Check } from 'lucide-react'

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

const SUBJECTS = ['Mathematics', 'English Language Arts']

// ── Show Lines Dropdown ───────────────────────────────────────────────────────
function ShowLinesDropdown({
    showState,
    showDistrict,
    onToggleState,
    onToggleDistrict,
}: {
    showState        : boolean
    showDistrict     : boolean
    onToggleState    : () => void
    onToggleDistrict : () => void
}) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node))
                setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const activeCount = (showState ? 1 : 0) + (showDistrict ? 1 : 0)

    const label =
        activeCount === 0 ? 'None'
        : activeCount === 2 ? 'State + District'
        : showState ? 'State Avg'
        : 'District Avg'

    return (
        <div className="relative" ref={ref}>
            <p className="text-[11px] font-semibold text-gray-400
                          uppercase tracking-widest mb-2">
                Show Lines
            </p>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full h-11 flex items-center justify-between
                           px-4 bg-white border-[3px] border-[#15315E]
                           rounded-xl text-sm font-semibold text-gray-700
                           hover:bg-gray-50 transition-all shadow-sm
                           min-w-[170px]"
            >
                <span className="truncate text-left text-xs">{label}</span>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {activeCount > 0 && (
                        <span className="bg-[#0f2448] text-white text-[10px] font-bold
                                         w-5 h-5 rounded-full flex items-center
                                         justify-center shadow-sm">
                            {activeCount}
                        </span>
                    )}
                    <ChevronDown
                        className={`w-4 h-4 text-[#15315E] transition-transform
                                    duration-200 ${open ? 'rotate-180' : ''}`}
                    />
                </div>
            </button>

            {open && (
                <div className="absolute z-50 mt-2 right-0 w-56 bg-white
                                border border-gray-200 rounded-xl shadow-2xl
                                overflow-hidden">
                    {/* State Average */}
                    <div
                        onClick={onToggleState}
                        className="flex items-center gap-3 px-4 py-3.5
                                   hover:bg-gray-50 cursor-pointer transition-colors
                                   border-b border-gray-100"
                    >
                        <div
                            style={{
                                borderColor: showState ? '#0f2448' : '#d1d5db',
                                background : showState ? '#0f2448' : 'white',
                            }}
                            className="w-4 h-4 rounded border-2 flex-shrink-0
                                       flex items-center justify-center transition-all"
                        >
                            {showState && <Check className="w-3 h-3 text-white stroke-[4]" />}
                        </div>
                        <div className="flex items-center gap-2">
                            <svg width="26" height="10" className="flex-shrink-0">
                                <line x1="0" y1="5" x2="26" y2="5"
                                      stroke="#ef4444" strokeWidth="2"
                                      strokeDasharray="5,3" />
                                <polygon points="6,2 9,5 6,8" fill="#ef4444" />
                            </svg>
                            <span className={`text-sm select-none ${
                                showState ? 'text-gray-900 font-semibold' : 'text-gray-500'
                            }`}>
                                State Average
                            </span>
                        </div>
                    </div>

                    {/* District Average */}
                    <div
                        onClick={onToggleDistrict}
                        className="flex items-center gap-3 px-4 py-3.5
                                   hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                        <div
                            style={{
                                borderColor: showDistrict ? '#0f2448' : '#d1d5db',
                                background : showDistrict ? '#0f2448' : 'white',
                            }}
                            className="w-4 h-4 rounded border-2 flex-shrink-0
                                       flex items-center justify-center transition-all"
                        >
                            {showDistrict && <Check className="w-3 h-3 text-white stroke-[4]" />}
                        </div>
                        <div className="flex items-center gap-2">
                            <svg width="26" height="10" className="flex-shrink-0">
                                <line x1="0" y1="5" x2="26" y2="5"
                                      stroke="#1e40af" strokeWidth="2.5" />
                                <circle cx="13" cy="5" r="2.5" fill="#1e40af" />
                            </svg>
                            <span className={`text-sm select-none ${
                                showDistrict ? 'text-gray-900 font-semibold' : 'text-gray-500'
                            }`}>
                                District Avg
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {

    const [allData,           setAllData]           = useState<AllData | null>(null)
    const [districts,         setDistricts]         = useState<string[]>([])
    const [schoolsByDistrict, setSchoolsByDistrict] = useState<Record<string, string[]>>({})
    const [colorMap,          setColorMap]          = useState<Record<string, string>>({})
    const [dataLoading,       setDataLoading]       = useState(true)
    const [error,             setError]             = useState('')

    // Filters
    const [subject,      setSubject]      = useState('Mathematics')
    const [selGrades,    setSelGrades]    = useState<string[]>(['03'])
    const [viewMode,     setViewMode]     = useState<'all' | 'gender'>('all')
    const [selDistrict,  setSelDistrict]  = useState<string[]>([])   // max 1 item
    const [selSchools,   setSelSchools]   = useState<string[]>([])
    const [showState,    setShowState]    = useState(true)
    const [showDistrict, setShowDistrict] = useState(true)
    const [subjectOpen,  setSubjectOpen]  = useState(false)

    // ── Load data once ─────────────────────────────────────────────────────
    useEffect(() => {
        fetchDashboardData()
            .then(({ allData, districts, schoolsByDistrict, colorMap }) => {
                setAllData(allData)
                setDistricts(districts)
                setSchoolsByDistrict(schoolsByDistrict)
                setColorMap(colorMap)
                setDataLoading(false)
            })
            .catch(e => {
                setError(e.message)
                setDataLoading(false)
            })
    }, [])

    // ── Reset schools when district changes ────────────────────────────────
    useEffect(() => {
        setSelSchools([])
    }, [selDistrict])

    // ── School options for the selected district ───────────────────────────
    const schoolOptions = useMemo(() => {
        if (selDistrict.length === 0) return []
        return (schoolsByDistrict[selDistrict[0]] ?? [])
            .map(s => ({ value: s, label: s }))
    }, [selDistrict, schoolsByDistrict])

    // ── Filter data ────────────────────────────────────────────────────────
    const filteredData = useMemo(() => {
        if (!allData) return []
        const source        = subject === 'Mathematics' ? allData.math : allData.english
        const subgroupFilter = viewMode === 'all' ? 'ALL' : 'GENDER'
        const districtName  = selDistrict[0] ?? null

        return source.filter(row => {
            if (!selGrades.includes(row.grade))        return false
            if (row.subgroup_type !== subgroupFilter)  return false

            if (row.level === 'ST')  return showState

            if (row.level === 'DI') {
                return showDistrict
                    && districtName !== null
                    && row.agency_name === districtName
            }

            if (row.level === 'SC') {
                // Must have a district selected, and this school must belong to it
                if (!districtName)                         return false
                if (row.district_name !== districtName)    return false
                // Only show schools the user has selected
                return selSchools.includes(row.agency_name)
            }

            return false
        })
    }, [allData, subject, selGrades, viewMode, selDistrict, selSchools, showState, showDistrict])

    // ── Build traces ───────────────────────────────────────────────────────
    const traces = useMemo(() =>
        buildTraces({ filteredData, colorMap, viewMode }),
        [filteredData, colorMap, viewMode]
    )

    const districtOptions = useMemo(() =>
        districts.map(d => ({ value: d, label: d })), [districts])

    const gradeLabel = selGrades.length === GRADES.length
        ? 'All Grades'
        : selGrades.map(g => `Grade ${parseInt(g)}`).join(', ')

    const selectedDistrictName = selDistrict[0] ?? null

    // ── Empty-state message ────────────────────────────────────────────────
    const emptyMessage = useMemo(() => {
        if (selGrades.length === 0)
            return 'Please select at least one grade.'
        if (!showState && selDistrict.length === 0)
            return 'Select a district or enable State Average.'
        if (selDistrict.length > 0 && selSchools.length === 0 && !showState && !showDistrict)
            return 'Enable State/District lines or select schools to display data.'
        return 'No data for the current selection.'
    }, [selGrades, showState, showDistrict, selDistrict, selSchools])

    return (
        <div className="min-h-screen bg-[#f4f6f9]">

            {/* ── Header ───────────────────────────────────────────────── */}
            <header className="bg-[#1a3353] shadow-lg">
                <div className="mx-auto max-w-screen-2xl px-4 sm:px-8 lg:px-12
                                py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-24 lg:h-24
                                    rounded-full bg-white/15 flex items-center
                                    justify-center border border-white/20 flex-shrink-0">
                        <img src="/nde-logo.webp" alt="NDE Logo"
                             className="w-10 h-10 sm:w-14 sm:h-14 lg:w-22 lg:h-22
                                        object-contain" />
                    </div>
                    <div>
                        <h1 className="text-white font-bold
                                       text-lg sm:text-xl lg:text-3xl
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

            <main className="mx-auto max-w-screen-2xl px-4 sm:px-8 lg:px-12
                             py-5 sm:py-8">

                {/* ── Page Title ───────────────────────────────────────── */}
                <div className="mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                        District & School Performance Over Time
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                        Average scale score trends by district, school,
                        grade, and student group
                    </p>
                </div>

                {/* ── Filter Bar ───────────────────────────────────────── */}
                <div className="bg-white rounded-2xl shadow-sm
                                border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-5">
                    <div className="grid grid-cols-2 gap-3
                                    sm:grid-cols-3 sm:gap-4
                                    lg:flex lg:flex-wrap lg:gap-5 lg:items-end">

                        {/* Subject */}
                        <div className="relative col-span-2 sm:col-span-1
                                        lg:min-w-[200px]">
                            <p className="text-[11px] font-semibold text-gray-400
                                          uppercase tracking-widest mb-2">
                                Subject
                            </p>
                            <button
                                type="button"
                                onClick={() => setSubjectOpen(o => !o)}
                                className="w-full h-11 flex items-center justify-between
                                           px-4 bg-white border-[3px] border-[#15315E]
                                           rounded-xl text-sm font-semibold text-gray-700
                                           hover:bg-gray-50 transition-all shadow-sm"
                            >
                                <span className="truncate text-left">{subject}</span>
                                <ChevronDown
                                    className={`w-4 h-4 text-[#15315E] flex-shrink-0
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
                                            <button
                                                key={opt}
                                                onClick={() => {
                                                    setSubject(opt)
                                                    setSubjectOpen(false)
                                                }}
                                                className={`w-full px-4 py-3 text-left
                                                            text-sm transition-colors ${
                                                    subject === opt
                                                        ? 'bg-blue-50 text-[#15315E] font-bold'
                                                        : 'text-gray-600 hover:bg-gray-50'
                                                }`}
                                            >
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
                        <div className="col-span-1 lg:min-w-[150px]">
                            <MultiSelect
                                label="Grade"
                                options={GRADES}
                                selected={selGrades}
                                onChange={setSelGrades}
                                placeholder="Select grades..."
                                accentColor="#0f2448"
                            />
                        </div>

                        {/* Student Group */}
                        <div className="col-span-1 lg:min-w-[190px]">
                            <p className="text-[11px] font-semibold text-gray-400
                                          uppercase tracking-widest mb-2">
                                Student Group
                            </p>
                            <div className="flex h-11 rounded-xl overflow-hidden
                                            border-[3px] border-[#15315E] shadow-sm">
                                <button
                                    onClick={() => setViewMode('all')}
                                    className={`flex-1 text-xs font-semibold
                                               transition-all px-2 sm:px-3 ${
                                        viewMode === 'all'
                                            ? 'bg-gradient-to-b from-[#004080] to-[#003366] text-white shadow-inner'
                                            : 'bg-white text-gray-600 hover:bg-slate-50'
                                    }`}
                                >
                                    All Students
                                </button>
                                <div className="w-px bg-blue-300" />
                                <button
                                    onClick={() => setViewMode('gender')}
                                    className={`flex-1 text-xs font-semibold
                                               transition-all px-2 sm:px-3 ${
                                        viewMode === 'gender'
                                            ? 'bg-gradient-to-b from-[#004080] to-[#003366] text-white shadow-inner'
                                            : 'bg-white text-gray-600 hover:bg-slate-50'
                                    }`}
                                >
                                    By Gender
                                </button>
                            </div>
                        </div>

                        {/* District — single select */}
                        <div className="col-span-2 sm:col-span-1
                                        lg:min-w-[200px] lg:max-w-[260px]">
                            <MultiSelect
                                label="District"
                                options={districtOptions}
                                selected={selDistrict}
                                onChange={v => setSelDistrict(v.length ? [v[v.length - 1]] : [])}
                                placeholder="Select a district"
                                accentColor="#0f2448"
                                singleSelect={true}
                            />
                        </div>

                        {/* School — multi select, disabled until district chosen */}
                        <div className="col-span-2 sm:col-span-1
                                        lg:min-w-[200px] lg:max-w-[280px]">
                            <MultiSelect
                                label="School"
                                options={schoolOptions}
                                selected={selSchools}
                                onChange={setSelSchools}
                                placeholder={
                                    selDistrict.length === 0
                                        ? 'Select a district first'
                                        : schoolOptions.length === 0
                                        ? 'No schools available'
                                        : 'Select schools...'
                                }
                                accentColor="#0f2448"
                                disabled={selDistrict.length === 0 || schoolOptions.length === 0}
                            />
                        </div>

                        {/* Show Lines dropdown */}
                        <div className="col-span-1 lg:self-end">
                            <ShowLinesDropdown
                                showState={showState}
                                showDistrict={showDistrict}
                                onToggleState={() => setShowState(s => !s)}
                                onToggleDistrict={() => setShowDistrict(d => !d)}
                            />
                        </div>

                        {/* Clear button */}
                        {selDistrict.length > 0 && (
                            <div className="col-span-1 lg:self-end">
                                <button
                                    onClick={() => {
                                        setSelDistrict([])
                                        setSelSchools([])
                                    }}
                                    className="w-full lg:w-auto h-11 px-4 text-sm
                                               text-gray-500 hover:text-red-500
                                               border-[3px] border-gray-200
                                               hover:border-red-300 rounded-xl
                                               transition-all font-medium"
                                >
                                    Clear
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Chart + Legend ────────────────────────────────────── */}
                <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 items-start">

                    {/* Chart */}
                    <div className="w-full lg:flex-1 bg-white rounded-2xl shadow-sm
                                    border border-gray-100 p-4 sm:p-6 min-w-0">
                        <div className="flex items-start sm:items-center
                                        justify-between mb-4 gap-2">
                            <div>
                                <h3 className="text-sm sm:text-base font-semibold
                                               text-gray-800">
                                    {subject} — {gradeLabel}
                                </h3>
                                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
                                    {viewMode === 'all'
                                        ? 'All Students · Weighted average across selected grades'
                                        : 'By Gender · Solid = Male · Dotted = Female · Dash-dot = Combined'}
                                </p>
                            </div>
                            {!dataLoading && (
                                <span className="text-xs font-semibold text-gray-400
                                                 bg-gray-100 px-3 py-1.5 rounded-lg
                                                 flex-shrink-0">
                                    {traces.length} lines
                                </span>
                            )}
                        </div>

                        {dataLoading ? <ChartSkeleton /> :
                         error ? (
                            <div className="h-48 sm:h-64 flex items-center
                                            justify-center text-red-500 text-sm">
                                ⚠️ {error}
                            </div>
                         ) : traces.length === 0 ? (
                            <div className="h-48 sm:h-64 flex flex-col items-center
                                            justify-center text-gray-400 text-sm
                                            text-center px-4 gap-2">
                                <span className="text-2xl">📊</span>
                                <span>{emptyMessage}</span>
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
                                    font    : {
                                        family: 'Inter, sans-serif',
                                        size  : 10,
                                        color : '#6b7280',
                                    },
                                }}
                                style={{ width: '100%' }}
                                config={{
                                    responsive: true,
                                    displayModeBar: true,
                                    modeBarButtonsToRemove: [
                                        'select2d', 'lasso2d', 'autoScale2d',
                                    ],
                                    toImageButtonOptions: {
                                        format  : 'png',
                                        filename: `NDE_${subject}`,
                                        scale   : 2,
                                    },
                                }}
                                useResizeHandler={true}
                            />
                        )}
                    </div>

                    {/* Right Panel */}
                    <div className="w-full lg:w-52 lg:flex-shrink-0
                                    flex flex-row lg:flex-col gap-4 lg:gap-0">
                        <div className="flex-1 lg:flex-none">
                            <LineStyleLegend viewMode={viewMode} />
                        </div>

                        {selectedDistrictName && (
                            <div className="flex-1 lg:flex-none bg-white rounded-2xl
                                            border border-gray-100 shadow-sm
                                            p-4 sm:p-5 lg:mt-4">
                                <p className="text-[11px] font-semibold text-gray-400
                                              uppercase tracking-widest mb-2">
                                    District
                                </p>
                                <div className="flex items-center gap-2 mb-4">
                                    <div
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ background: colorMap[selectedDistrictName] || '#999' }}
                                    />
                                    <span className="text-xs text-gray-700 font-medium
                                                     leading-tight">
                                        {selectedDistrictName}
                                    </span>
                                </div>

                                {selSchools.length > 0 && (
                                    <>
                                        <p className="text-[11px] font-semibold text-gray-400
                                                      uppercase tracking-widest mb-2">
                                            Schools
                                            <span className="ml-1.5 text-[10px] bg-gray-100
                                                             text-gray-500 px-1.5 py-0.5
                                                             rounded-full normal-case
                                                             font-bold tracking-normal">
                                                {selSchools.length}
                                            </span>
                                        </p>
                                        <div className="flex flex-col gap-2
                                                        max-h-52 overflow-y-auto">
                                            {selSchools.map(s => (
                                                <div key={s}
                                                     className="flex items-start gap-2">
                                                    <div
                                                        className="w-2.5 h-2.5 rounded-full
                                                                   flex-shrink-0 mt-0.5"
                                                        style={{ background: colorMap[s] || '#aaa' }}
                                                    />
                                                    <span className="text-xs text-gray-600
                                                                     leading-tight">
                                                        {s}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {selSchools.length === 0 && (
                                    <p className="text-xs text-gray-400 italic">
                                        No schools selected
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}