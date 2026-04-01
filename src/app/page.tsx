'use client'
import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'

// ── Types & Constants ─────────────────────────────────────────────────────────
import { AllData }                  from '@/types'
import { GRADES, TICK_VALS, TICK_TEXTS } from '@/lib/constants'

// ── Services & Logic ──────────────────────────────────────────────────────────
import { fetchDashboardData }       from '@/services/scoreService'
import { buildTraces }              from '@/lib/traceBuilder'

// ── UI Components ─────────────────────────────────────────────────────────────
import { MultiSelect }              from '@/components/MultiSelect'
import { LineStyleLegend }          from '@/components/LineStyleLegend'
import { ChartSkeleton }            from '@/components/ChartSkeleton'

const Plot = dynamic(
    () => import('react-plotly.js').then(mod => mod.default),
    { ssr: false, loading: () => <ChartSkeleton /> }
)

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
            (row.level === 'ST' ||
                selDistricts.includes(row.agency_name))
        )
    }, [allData, subject, selGrades, viewMode, selDistricts])

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
                <div className="mx-auto max-w-screen-2xl px-12 py-4
                                flex items-center gap-4">
                    <div className="w-24 h-24 rounded-full bg-white/15
                                    flex items-center justify-center
                                    border border-white/20 flex-shrink-0">
                        <img src="/nde-logo.webp" alt="NDE Logo"
                            className="w-22 h-22 object-contain" />
                    </div>
                    <div>
                        <h1 className="text-white font-bold text-3xl
                                    tracking-wide leading-none">
                            Nebraska Department of Education
                        </h1>
                        <p className="text-blue-200 text-sm mt-0.5
                                    font-medium tracking-widest uppercase">
                            Assessment Data Dashboard
                        </p>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-screen-2xl px-12 py-8">

                {/* ── Page Title ───────────────────────────────────────── */}
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-800">
                        District Performance Over Time
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Average scale score trends by district, grade,
                        and student group
                    </p>
                </div>

                {/* ── Filter Bar ───────────────────────────────────────── */}
                <div className="bg-white rounded-2xl shadow-sm
                                border border-gray-100 p-6 mb-5">
                    <div className="flex flex-wrap gap-5 items-end">

                        {/* Subject */}
                        <div className="min-w-[190px]">
                            <p className="text-[11px] font-semibold
                                          text-gray-400 uppercase
                                          tracking-widest mb-2">
                                Subject
                            </p>
                            <select
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                className="w-full h-11 px-4 bg-white
                                           border-2 border-green-400
                                           rounded-xl text-sm font-medium
                                           text-gray-700 hover:bg-gray-50
                                           focus:outline-none focus:ring-2
                                           focus:ring-green-300 transition
                                           shadow-sm cursor-pointer"
                            >
                                <option value="Mathematics">
                                    Mathematics
                                </option>
                                <option value="English Language Arts">
                                    English Language Arts
                                </option>
                            </select>
                        </div>

                        {/* Grade multi-select */}
                        <div className="min-w-[160px]">
                            <MultiSelect
                                label="Grade"
                                options={GRADES}
                                selected={selGrades}
                                onChange={setSelGrades}
                                placeholder="Select grades..."
                                accentColor="#3b82f6"
                            />
                        </div>

                        {/* View Mode toggle */}
                        <div className="min-w-[200px]">
                            <p className="text-[11px] font-semibold
                                          text-gray-400 uppercase
                                          tracking-widest mb-2">
                                Student Group
                            </p>
                            <div className="flex h-11 rounded-xl overflow-hidden
                                            border-2 border-orange-400 shadow-sm">
                                <button
                                    onClick={() => setViewMode('all')}
                                    className={`flex-1 text-sm font-semibold
                                               transition-all px-3 ${
                                        viewMode === 'all'
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-white text-gray-600 hover:bg-orange-50'
                                    }`}
                                >
                                    All Students
                                </button>
                                <div className="w-px bg-orange-300" />
                                <button
                                    onClick={() => setViewMode('gender')}
                                    className={`flex-1 text-sm font-semibold
                                               transition-all px-3 ${
                                        viewMode === 'gender'
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-white text-gray-600 hover:bg-orange-50'
                                    }`}
                                >
                                    By Gender
                                </button>
                            </div>
                        </div>

                        {/* District multi-select */}
                        <div className="flex-1 min-w-[200px] max-w-[320px]">
                            <MultiSelect
                                label="District"
                                options={districtOptions}
                                selected={selDistricts}
                                onChange={setSelDistricts}
                                placeholder="Select districts"
                                accentColor="#8b5cf6"
                            />
                        </div>

                        {/* Clear district button */}
                        {selDistricts.length > 0 && (
                            <button
                                onClick={() => setSelDistricts([])}
                                className="h-11 px-4 text-sm text-gray-500
                                           hover:text-red-500 border-2
                                           border-gray-200 hover:border-red-300
                                           rounded-xl transition-all font-medium
                                           self-end"
                            >
                                Clear Districts
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Chart + Legend ────────────────────────────────────── */}
                <div className="flex gap-5 items-start">

                    {/* Chart */}
                    <div className="flex-1 bg-white rounded-2xl shadow-sm
                                    border border-gray-100 p-6 min-w-0">
                        {/* Chart header */}
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-semibold
                                               text-gray-800">
                                    {subject} — {gradeLabel}
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {viewMode === 'all'
                                        ? 'All Students · Weighted average across selected grades'
                                        : 'By Gender · Solid = Male · Dotted = Female · Dash-dot = Combined'}
                                </p>
                            </div>
                            {!dataLoading && (
                                <span className="text-xs font-semibold
                                                 text-gray-400 bg-gray-100
                                                 px-3 py-1.5 rounded-lg">
                                    {traces.length} lines
                                </span>
                            )}
                        </div>

                        {dataLoading ? <ChartSkeleton /> :
                         error ? (
                            <div className="h-64 flex items-center
                                            justify-center text-red-500
                                            text-sm">
                                ⚠️ {error}
                            </div>
                         ) : traces.length === 0 ? (
                            <div className="h-64 flex items-center
                                            justify-center text-gray-400
                                            text-sm">
                                No data for current selection.
                                {selGrades.length === 0 &&
                                    ' Please select at least one grade.'}
                            </div>
                         ) : (
                            <Plot
                                data={traces as any}
                                layout={{
                                    xaxis: {
                                        title    : { text: 'School Year', font: { size: 12 } },
                                        tickmode : 'array',
                                        tickvals : TICK_VALS,
                                        ticktext : TICK_TEXTS,
                                        gridcolor: '#f3f4f6',
                                        linecolor: '#e5e7eb',
                                    },
                                    yaxis: {
                                        title    : { text: 'Average Scale Score', font: { size: 12 } },
                                        gridcolor: '#f3f4f6',
                                        linecolor: '#e5e7eb',
                                    },
                                    hovermode    : 'closest',
                                    showlegend   : false,
                                    plot_bgcolor : 'white',
                                    paper_bgcolor: 'white',
                                    height  : 520,
                                    margin  : { t: 10, r: 10, b: 60, l: 70 },
                                    autosize: true,
                                    font    : {
                                        family: 'Inter, sans-serif',
                                        size  : 11,
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
                    <div className="w-52 flex-shrink-0">
                        <LineStyleLegend viewMode={viewMode} />

                        {/* District colour legend */}
                        {selDistricts.length > 0 && (
                            <div className="bg-white rounded-2xl border
                                            border-gray-100 shadow-sm
                                            p-5 mt-4">
                                <p className="text-[11px] font-semibold
                                              text-gray-400 uppercase
                                              tracking-widest mb-3">
                                    Selected Districts
                                </p>
                                <div className="space-y-2 max-h-80
                                                overflow-y-auto">
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
