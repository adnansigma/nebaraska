'use client'
import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { ChevronDown } from 'lucide-react'

// ── Types & Constants ─────────────────────────────────────────────────────────
import { AllData }                       from '@/types'
import { GRADES, TICK_VALS, TICK_TEXTS } from '@/lib/constants'

// ── Services & Logic ──────────────────────────────────────────────────────────
import { fetchDashboardData }            from '@/services/scoreService'
import { buildTraces }                   from '@/lib/traceBuilder'

// ── UI Components ─────────────────────────────────────────────────────────────
import { MultiSelect }                   from '@/components/MultiSelect'
import { LineStyleLegend }               from '@/components/LineStyleLegend'
import { ChartSkeleton }                 from '@/components/ChartSkeleton'

const Plot = dynamic(
    () => import('react-plotly.js').then(mod => mod.default),
    { ssr: false, loading: () => <ChartSkeleton /> }
)

const SUBJECTS = ['Mathematics', 'English Language Arts']

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {

    const [allData,      setAllData]      = useState<AllData | null>(null)
    const [districts,    setDistricts]    = useState<string[]>([])
    const [colorMap,     setColorMap]     = useState<Record<string, string>>({})
    const [dataLoading,  setDataLoading]  = useState(true)
    const [error,        setError]        = useState('')

    // Filters
    const [subject,      setSubject]      = useState('Mathematics')
    const [selGrades,    setSelGrades]    = useState<string[]>(['03'])
    const [viewMode,     setViewMode]     = useState<'all' | 'gender'>('all')
    const [selDistricts, setSelDistricts] = useState<string[]>([])
    const [showState,    setShowState]    = useState(true)
    const [subjectOpen,  setSubjectOpen]  = useState(false)

    // ── Load data once ─────────────────────────────────────────────────────
    useEffect(() => {
        fetchDashboardData()
            .then(({ allData, districts, colorMap }) => {
                setAllData(allData)
                setDistricts(districts)
                setColorMap(colorMap)
                setDataLoading(false)
            })
            .catch(e => {
                setError(e.message)
                setDataLoading(false)
            })
    }, [])

    // ── Filter data in memory ──────────────────────────────────────────────
    const filteredData = useMemo(() => {
        if (!allData) return []
        const source = subject === 'Mathematics'
            ? allData.math : allData.english

        return source.filter(row =>
            selGrades.includes(row.grade) &&
            (viewMode === 'all'
                ? row.subgroup_type === 'ALL'
                : row.subgroup_type === 'GENDER') &&
            (row.level === 'ST'
                ? showState
                : selDistricts.includes(row.agency_name))
        )
    }, [allData, subject, selGrades, viewMode, selDistricts, showState])

    // ── Build Plotly traces ────────────────────────────────────────────────
    const traces = useMemo(() =>
        buildTraces({ filteredData, colorMap, viewMode }),
        [filteredData, colorMap, viewMode]
    )

    const districtOptions = useMemo(() =>
        districts.map(d => ({ value: d, label: d })), [districts])

    const gradeLabel = selGrades.length === GRADES.length
        ? 'All Grades'
        : selGrades.map(g => `Grade ${parseInt(g)}`).join(', ')

    return (
        <div className="min-h-screen bg-[#f4f6f9]">

            {/* ── Header ───────────────────────────────────────────────── */}
            <header className="bg-[#1a3353] shadow-lg">
                <div className="mx-auto max-w-screen-2xl px-4 sm:px-8 lg:px-12 py-3 sm:py-4
                                flex items-center gap-3 sm:gap-4">
                    {/* Logo — smaller on mobile */}
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

            <main className="mx-auto max-w-screen-2xl px-4 sm:px-8 lg:px-12 py-5 sm:py-8">

                {/* ── Page Title ───────────────────────────────────────── */}
                <div className="mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                        District Performance Over Time
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                        Average scale score trends by district, grade,
                        and student group
                    </p>
                </div>

                {/* ── Filter Bar ───────────────────────────────────────── */}
                <div className="bg-white rounded-2xl shadow-sm
                                border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-5">
                    {/* On mobile: 2-column grid. On lg: flex row */}
                    <div className="grid grid-cols-2 gap-3
                                    sm:grid-cols-2 sm:gap-4
                                    lg:flex lg:flex-wrap lg:gap-5 lg:items-end">

                        {/* ── Subject ───────────────────────────────────── */}
                        <div className="relative col-span-2 sm:col-span-1 lg:min-w-[240px]">
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
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setSubjectOpen(false)}
                                    />
                                    <div className="absolute z-50 mt-2 w-full bg-white
                                                    border border-gray-200 rounded-xl
                                                    shadow-2xl overflow-hidden">
                                        <div className="max-h-60 overflow-y-auto py-1">
                                            {SUBJECTS.map(opt => (
                                                <button
                                                    key={opt}
                                                    onClick={() => {
                                                        setSubject(opt)
                                                        setSubjectOpen(false)
                                                    }}
                                                    className={`w-full px-4 py-3 text-left text-sm
                                                                transition-colors ${
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
                                    </div>
                                </>
                            )}
                        </div>

                        {/* ── Grade ─────────────────────────────────────── */}
                        <div className="col-span-1 lg:min-w-[160px]">
                            <MultiSelect
                                label="Grade"
                                options={GRADES}
                                selected={selGrades}
                                onChange={setSelGrades}
                                placeholder="Select grades..."
                                accentColor="#0f2448"
                            />
                        </div>

                        {/* ── Student Group ─────────────────────────────── */}
                        <div className="col-span-1 lg:min-w-[200px]">
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

                        {/* ── District ──────────────────────────────────── */}
                        <div className="col-span-2 sm:col-span-1 lg:flex-1 lg:min-w-[200px] lg:max-w-[320px]">
                            <MultiSelect
                                label="District"
                                options={districtOptions}
                                selected={selDistricts}
                                onChange={setSelDistricts}
                                placeholder="Select districts"
                                accentColor="#0f2448"
                            />
                        </div>

                        {/* ── State Line Toggle ─────────────────────────── */}
                        <div className="col-span-1 lg:self-end">
                            <p className="text-[11px] font-semibold text-gray-400
                                          uppercase tracking-widest mb-2">
                                State Average
                            </p>
                            <button
                                onClick={() => setShowState(s => !s)}
                                className={`w-full lg:w-auto h-11 px-4 sm:px-5 text-sm
                                            font-semibold rounded-xl border-[3px]
                                            transition-all shadow-sm flex items-center
                                            justify-center gap-2 ${
                                    showState
                                        ? 'bg-gradient-to-b from-[#004080] to-[#003366] text-white border-[#15315E]'
                                        : 'bg-white text-gray-600 border-[#15315E] hover:bg-gray-50'
                                }`}
                            >
                                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                    showState ? 'bg-red-400' : 'bg-gray-300'
                                }`} />
                                {showState ? 'State: On' : 'State: Off'}
                            </button>
                        </div>

                        {/* ── Clear Districts ───────────────────────────── */}
                        {selDistricts.length > 0 && (
                            <div className="col-span-1 lg:self-end">
                                <button
                                    onClick={() => setSelDistricts([])}
                                    className="w-full lg:w-auto h-11 px-4 text-sm
                                               text-gray-500 hover:text-red-500
                                               border-[3px] border-gray-200
                                               hover:border-red-300 rounded-xl
                                               transition-all font-medium"
                                >
                                    Clear Districts
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Chart + Legend ────────────────────────────────────── */}
                {/* Stack vertically on mobile, side by side on lg+ */}
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
                            <div className="h-48 sm:h-64 flex items-center
                                            justify-center text-gray-400 text-sm
                                            text-center px-4">
                                No data for current selection.
                                {selGrades.length === 0 && ' Please select at least one grade.'}
                                {!showState && selDistricts.length === 0 &&
                                    ' Turn on State line or select a district.'}
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

                    {/* Right Panel — full width on mobile, fixed width on lg */}
                    <div className="w-full lg:w-52 lg:flex-shrink-0
                                    flex flex-row lg:flex-col gap-4 lg:gap-0">
                        <div className="flex-1 lg:flex-none">
                            <LineStyleLegend viewMode={viewMode} />
                        </div>

                        {selDistricts.length > 0 && (
                            <div className="flex-1 lg:flex-none bg-white rounded-2xl
                                            border border-gray-100 shadow-sm
                                            p-4 sm:p-5 lg:mt-4">
                                <p className="text-[11px] font-semibold text-gray-400
                                              uppercase tracking-widest mb-3">
                                    Selected Districts
                                </p>
                                <div className="flex flex-wrap lg:flex-col gap-2
                                                max-h-40 lg:max-h-80 overflow-y-auto">
                                    {selDistricts.map(d => (
                                        <div key={d}
                                             className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full flex-shrink-0"
                                                style={{ background: colorMap[d] || '#999' }}
                                            />
                                            <span className="text-xs text-gray-600 truncate">
                                                {d}
                                            </span>
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
