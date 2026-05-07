'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image';
import { ChevronDown, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { School, Scale } from 'lucide-react';

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

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
    const router = useRouter()

    const [allData,      setAllData]      = useState<AllData | null>(null)
    const [districts,    setDistricts]    = useState<string[]>([])
    const [colorMap,     setColorMap]     = useState<Record<string, string>>({})
    const [dataLoading,  setDataLoading]  = useState(true)
    const [error,        setError]        = useState('')

    const [subject,      setSubject]      = useState('Mathematics')
    const [selGrades,    setSelGrades]    = useState<string[]>(['03'])
    const [viewMode,     setViewMode]     = useState<'all' | 'gender'>('all')
    const [selDistricts, setSelDistricts] = useState<string[]>([])
    const [showState,    setShowState]    = useState(true)
    const [showDistrict, setShowDistrict] = useState(true)
    const [subjectOpen,  setSubjectOpen]  = useState(false)

    useEffect(() => {
        fetchDashboardData()
            .then(({ allData, districts, colorMap }) => {
                setAllData(allData)
                setDistricts(districts)
                setColorMap(colorMap)
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

    const filteredData = useMemo(() => {
        if (!allData) return []
        const source = subject === 'Mathematics' ? allData.math : allData.english
        const subgroupFilter = viewMode === 'all' ? 'ALL' : 'GENDER'

        return source.filter(row => {
            if (!selGrades.includes(row.grade)) return false
            if (row.subgroup_type !== subgroupFilter) return false
            
            if (row.level === 'ST') return showState
            
            if (row.level === 'DI') {
                // Normalize the row name before checking if it's in our selection
                const normalizedRowName = normalizeName(row.agency_name);
                return showDistrict 
                    && selDistricts.length > 0 
                    && selDistricts.includes(normalizedRowName)
            }
            return false
        })
    }, [allData, subject, selGrades, viewMode, selDistricts, showState, showDistrict])

    // Add this intermediate memo to pass clean names to the chart builder
    const normalizedFilteredData = useMemo(() => {
        return filteredData.map(row => ({
            ...row,
            agency_name: normalizeName(row.agency_name)
        }))
    }, [filteredData])

    const normalizedColorMap = useMemo(() => {
        const map: Record<string, string> = {}
        Object.entries(colorMap).forEach(([key, val]) => {
            map[normalizeName(key)] = val
        })
        return map
    }, [colorMap])

    const traces = useMemo(() =>
        // Pass the normalized versions here!
        buildTraces({ filteredData: normalizedFilteredData, colorMap: normalizedColorMap, viewMode }),
        [normalizedFilteredData, normalizedColorMap, viewMode]
    )

    const districtOptions = useMemo(() => {
        const seen = new Map<string, string>();
        
        districts.forEach(d => {
            const normalized = normalizeName(d);
            if (!seen.has(normalized)) {
                seen.set(normalized, d);
            }
        });

        return Array.from(seen.entries()).map(([normalized]) => ({
            value: normalized, 
            label: normalized
        }));
    }, [districts]);

    const gradeLabel = selGrades.length === GRADES.length
        ? 'All Grades'
        : selGrades.map(g => `Grade ${parseInt(g)}`).join(', ')

    const emptyMessage = useMemo(() => {
        if (selGrades.length === 0)      return 'Please select at least one grade.'
        if (selDistricts.length === 0)   return 'Select at least one district.'
        return 'No data for the current selection.'
    }, [selGrades, selDistricts])

    return (
        <div className="min-h-screen bg-[#f4f6f9]">

            {/* Header */}
            <header className="bg-[#1a3353] shadow-lg">
                <div className="mx-auto max-w-screen-2xl px-4 sm:px-8 lg:px-12
                                py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
                    <div>
                        <h1 className="text-white font-bold text-lg sm:text-xl lg:text-3xl
                                       tracking-wide leading-tight">
                            Pencils before Pixels
                        </h1>
                        <p className="text-blue-200 text-[10px] sm:text-xs mt-0.5
                                      font-medium tracking-widest uppercase">
                            Assessment Data Dashboard
                        </p>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-screen-2xl px-4 sm:px-8 lg:px-12 py-5 sm:py-8">

                {/* ── Page Title + District 66 Button ──────────────────── */}
                <div className="mb-4 sm:mb-6 flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                            District Performance Over Time
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            Average scale score trends by district, grade, and student group
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                    <button
                        onClick={() => router.push('/district66')}
                        className="flex-shrink-0 flex items-center gap-2 bg-[#1a3353] hover:bg-[#15315E]/90 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md transition-all border-2 cursor-pointer border-white/20"
                    >
                        <School size={18} className="text-blue-200" /> 
                        District 66
                    </button>

                    {/* Equity Analysis Button */}
                    <button
                        onClick={() => router.push('/equity')}
                        className="flex-shrink-0 flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md transition-all border-2 cursor-pointer border-white/20"
                    >
                        <Scale size={18} className="text-emerald-200" />
                        Equity Analysis
                    </button>
                    </div>

                    
                </div>

                {/* Filter Bar */}
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
                                className="w-full h-11 flex items-center justify-between gap-3
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
                        <div className="col-span-1 lg:min-w-[120px]">
                            <MultiSelect
                                label="Grade"
                                options={GRADES}
                                selected={selGrades}
                                onChange={setSelGrades}
                                placeholder="Select Grades"
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
                                            ? 'bg-gradient-to-b from-[#004080] to-[#003366] text-white'
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
                                            ? 'bg-gradient-to-b from-[#004080] to-[#003366] text-white'
                                            : 'bg-white text-gray-600 hover:bg-slate-50'
                                    }`}
                                >
                                    By Gender
                                </button>
                            </div>
                        </div>

                        {/* District */}
                        <div className="col-span-2 sm:col-span-1
                                        lg:min-w-[220px]">
                            <MultiSelect
                                label="District"
                                options={districtOptions}
                                selected={selDistricts}
                                onChange={setSelDistricts}
                                placeholder="Select Districts..."
                                accentColor="#0f2448"
                            />
                        </div>

                        {/* Show Lines */}
                        <div className="col-span-1 lg:self-end">
                            <button
                                onClick={() => setShowState(prev => !prev)}
                                className={`w-full lg:w-auto h-11 px-6 text-sm rounded-xl font-semibold transition-all
                                    flex items-center justify-center gap-2 border-[3px]
                                    ${showState
                                        ? 'bg-gradient-to-b from-[#004080] to-[#003366] text-white border-[#15315E] shadow-sm'
                                        : 'bg-white text-gray-600 border-[#15315E] hover:bg-gray-50'
                                    }`}
                            >
                                State
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-md
                                    ${showState ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'}
                                `}>
                                    {showState ? 'ON' : 'OFF'}
                                </span>
                            </button>
                        </div>

                        {/* Clear Districts */}
                        <div className="col-span-1 lg:self-end">
                            <button
                                onClick={() => setSelDistricts([])}
                                disabled={selDistricts.length === 0}
                                className={`w-full lg:w-auto h-11 px-8 text-sm rounded-xl font-medium transition-all
                                    ${selDistricts.length > 0
                                        ? 'bg-white text-gray-500 border border-gray-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 shadow-sm active:scale-95'
                                        : 'bg-transparent text-gray-300 border border-gray-100 cursor-not-allowed'
                                    }`}
                            >
                                Clear
                            </button>
                        </div>
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
                                    {viewMode === 'all'
                                        ? 'All Students · Weighted average across selected grades'
                                        : 'By Gender · Solid = Male · Dotted = Female'}
                                </p>
                            </div>
                        </div>

                        {dataLoading ? <ChartSkeleton /> :
                         error ? (
                            <div className="h-64 flex items-center justify-center text-red-500 text-sm">
                                ⚠️ {error}
                            </div>
                         ) : traces.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center
                                            text-gray-400 text-sm text-center px-4 gap-2">
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
                                    font    : { family: 'Inter, sans-serif', size: 10, color: '#6b7280' },
                                }}
                                style={{ width: '100%' }}
                                config={{
                                    responsive: true,
                                    displayModeBar: false,
                                    modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d'],
                                    toImageButtonOptions: {
                                        format: 'png', filename: `NDE_${subject}`, scale: 2,
                                    },
                                }}
                                useResizeHandler={true}
                            />
                        )}
                    </div>

                    {/* Right Panel */}
                    <div className="w-full lg:w-52 lg:flex-shrink-0 h-full flex flex-col gap-4 overflow-hidden">
                        <div className="flex-none">
                            <LineStyleLegend viewMode={viewMode} />
                        </div>

                        {/* Removed the conditional check so this container is always visible */}
                        <div className="flex-1 bg-white rounded-2xl border border-gray-100
                                        shadow-sm p-4 sm:p-5 flex flex-col min-h-0 overflow-hidden">
                            <p className="text-[11px] font-semibold text-gray-400
                                            uppercase tracking-widest mb-3 flex-shrink-0">
                                Selected Districts
                                <span className="ml-1.5 text-[10px] bg-gray-100 text-gray-500
                                                px-1.5 py-0.5 rounded-full normal-case
                                                font-bold tracking-normal">
                                    {selDistricts.length}
                                </span>
                            </p>

                            <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
                                {selDistricts.length > 0 ? (
                                    selDistricts.map(d => (
                                        <div key={d} className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full flex-shrink-0"
                                                style={{ background: normalizedColorMap[d] || '#999' }} 
                                            />
                                            <span className="text-xs text-gray-600 truncate">{d}</span>
                                        </div>
                                    ))
                                ) : (
                                    /* Placeholder when nothing is selected */
                                    <div className="flex flex-col items-center justify-center h-full text-center opacity-40 grayscale">
                                        <School size={24} className="text-gray-300 mb-2" />
                                        <p className="text-[10px] text-gray-400 font-medium leading-tight">
                                            No districts<br/>selected
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                {/* ── National Context Section ─────────────────────────────────────── */}
                <div className="mt-6 sm:mt-8">

                    {/* Section Header */}
                    <div className="mb-4 sm:mb-5">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                            Nebraska in a National Context
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            How does Nebraska's trend compare to the broader national pattern?
                        </p>
                    </div>

                    {/* Intro Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-7 mb-5">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="flex-shrink-0 w-1 self-stretch rounded-full bg-[#1a3353]" />
                            <div>
                                <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-2">
                                    The NAEP Evidence: When Digital Adoption Aligns with Score Decline
                                </h3>
                                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                                    Nebraska's assessment trends don't exist in isolation. Nationally, researchers
                                    have documented a striking pattern: across all 50 states, NAEP scores in Math
                                    and Reading rose steadily for years — then plateaued and declined in alignment
                                    with each state's large-scale digital adoption, not with a single calendar year.
                                    This <span className="font-semibold text-gray-800">staggered policy adoption</span> design
                                    provides strong evidence that the timing of digital lock-in, not external factors,
                                    drives the shift.
                                </p>
                                <p className="text-xs sm:text-sm text-gray-500 mt-3 leading-relaxed">
                                    The charts below show national NAEP averages aligned to each state's digital
                                    inflection point (Year 0). These results cannot be attributed to COVID because Year 0 for every state occurred before the pandemic and 2022 data was excluded entirely. Unlike most “standardized” educational assessments that periodically reset their scoring scales, NAEP has remained anchored to its original 1992 scale, meaning these declines reflect genuine losses in student learning, not adjustments to the test.
                                </p>
                            </div>
                        </div>

                        {/* Stat Pills */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
                            {[
                                { label: 'Grade 4 Math',    slope: '−1.45 pts/yr' },
                                { label: 'Grade 4 Reading', slope: '−1.07 pts/yr' },
                                { label: 'Grade 8 Math',    slope: '−1.81 pts/yr' },
                                { label: 'Grade 8 Reading', slope: '−1.16 pts/yr' },
                            ].map(({ label, slope }) => (
                                <div key={label}
                                    className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-center">
                                    <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                        {label}
                                    </p>
                                    <p className="text-base sm:text-lg font-bold text-red-600">
                                        {slope}
                                    </p>
                                    <p className="text-[9px] sm:text-[10px] text-gray-400 mt-0.5">
                                        post-adoption avg. decline
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Charts Grid */}
                    <div className="flex flex-row gap-4 sm:gap-5 mb-5">

                        {/* Image 1: Grade 4 Math + Grade 4 Reading */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
                            <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3">
                                Grade 4 — Math &amp; Reading (2022 excluded)
                            </h4>
                            <div className="rounded-xl overflow-hidden border border-gray-100 mb-4">
                                <Image
                                src="/gradeFour.jpg"
                                alt="Grade 4 Math and Reading NAEP trends relative to digital adoption"
                                width={800}
                                height={500}
                                className="w-full object-contain"
                                />
                            </div>
                            {/* Pre/Post slopes for Grade 4 */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { subject: 'Math — Pre-adoption',    value: '+1.07 pts/yr', color: 'emerald' },
                                    { subject: 'Math — Post-adoption',   value: '−0.38 pts/yr', color: 'red'     },
                                    { subject: 'Reading — Pre-adoption',  value: '+0.27 pts/yr', color: 'emerald' },
                                    { subject: 'Reading — Post-adoption', value: '−0.80 pts/yr', color: 'red'     },
                                ].map(({ subject, value, color }) => (
                                    <div key={subject}
                                        className={`rounded-xl px-3 py-2.5 text-center border
                                            ${color === 'emerald'
                                                ? 'bg-emerald-50 border-emerald-100'
                                                : 'bg-red-50 border-red-100'}`}>
                                        <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-1 leading-tight">
                                            {subject}
                                        </p>
                                        <p className={`text-sm font-bold
                                            ${color === 'emerald' ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Image 2: Grade 8 Math + Grade 8 Reading */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
                            <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3">
                                Grade 8 — Math &amp; Reading (2022 excluded)
                            </h4>
                            <div className="rounded-xl overflow-hidden border border-gray-100 mb-4">
                                <Image
                                src="/gradeEight.jpg"
                                alt="Grade 8 Math and Reading NAEP trends relative to digital adoption"
                                width={800}
                                height={500}
                                className="w-full object-contain"
                                />
                            </div>
                            {/* Pre/Post slopes for Grade 8 */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { subject: 'Math — Pre-adoption',    value: '+0.67 pts/yr', color: 'emerald' },
                                    { subject: 'Math — Post-adoption',   value: '−1.14 pts/yr', color: 'red'     },
                                    { subject: 'Reading — Pre-adoption',  value: '+0.17 pts/yr', color: 'emerald' },
                                    { subject: 'Reading — Post-adoption', value: '−0.99 pts/yr', color: 'red'     },
                                ].map(({ subject, value, color }) => (
                                    <div key={subject}
                                        className={`rounded-xl px-3 py-2.5 text-center border
                                            ${color === 'emerald'
                                                ? 'bg-emerald-50 border-emerald-100'
                                                : 'bg-red-50 border-red-100'}`}>
                                        <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-1 leading-tight">
                                            {subject}
                                        </p>
                                        <p className={`text-sm font-bold
                                            ${color === 'emerald' ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Source Attribution */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <p className="text-[10px] sm:text-xs text-gray-500 italic leading-relaxed">
                            Note: The national charts utilize a "Year 0" alignment strategy where Year 0 
                            represents the specific year each state reached a threshold of digital device 
                            saturation in classrooms. Data via NAEP (National Assessment of Educational Progress).
                        </p>
                    </div>

                    {/* ── International Research Section ──────────────────────────────────── */}
                    <div className="mt-8 sm:mt-10">

                        {/* Section Header */}
                        <div className="mb-4 sm:mb-5">
                            <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                                International Research: Screen Time &amp; Academic Performance
                            </h2>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                Findings from PISA, TIMSS, PIRLS and OECD across dozens of countries.
                            </p>
                        </div>

                        {/* ── Chart 1: PISA All Countries ───────────────────────────────────── */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-5">
                            <div className="mb-3">
                                <h3 className="text-sm sm:text-base font-semibold text-gray-800">
                                    PISA: All Countries — In-School Computer Use vs. Score
                                </h3>
                                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
                                    PISA longitudinal data (2012–2018) reveals that students exceeding six 
                                    hours of daily in-school computer use score an average of 66 points lower than non-users, a 
                                    decline equivalent to two full letter grades.
                                </p>
                            </div>
                            <div className="relative">
                            {/* Legend — top right of the card */}
                            <div className="absolute -top-11 right-0 flex flex-col gap-1 z-10">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-6 border-t-2 border-[#1a3353]"></div>
                                    <span className="text-[10px] text-gray-600">2012</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-6 border-t-2 border-dashed border-[#4a6fa5]"></div>
                                    <span className="text-[10px] text-gray-600">2015</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-6 border-t-2 border-dashed border-[#8aafd4]"></div>
                                    <span className="text-[10px] text-gray-600">2018</span>
                                </div>
                            </div>

                            {/* The 3 charts */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Plot
                                data={[
                                    // Math 2012
                                    {
                                        type: 'scatter', mode: 'lines+markers', name: '2012',
                                        x: [0, 30, 90, 180, 300, 390],
                                        y: [508, 495, 465, 462, 450, 430],
                                        line: { color: '#1a3353', width: 2 },
                                        marker: { size: 6, color: '#1a3353' },
                                        legendgroup: 'math2012',
                                        hovertemplate: 'Math 2012<br>CPU: %{x} min/day<br>Score: %{y}<extra></extra>',
                                    },
                                    // Math 2015
                                    {
                                        type: 'scatter', mode: 'lines+markers', name: '2015',
                                        x: [0, 30, 90, 180, 300, 390],
                                        y: [483, 492, 461, 458, 450, 425],
                                        line: { color: '#4a6fa5', width: 2, dash: 'dot' },
                                        marker: { size: 6, color: '#4a6fa5' },
                                        hovertemplate: 'Math 2015<br>CPU: %{x} min/day<br>Score: %{y}<extra></extra>',
                                    },
                                    // Math 2018
                                    {
                                        type: 'scatter', mode: 'lines+markers', name: '2018',
                                        x: [0, 30, 90, 180, 300, 390],
                                        y: [470, 492, 456, 454, 450, 420],
                                        line: { color: '#8aafd4', width: 2, dash: 'dash' },
                                        marker: { size: 6, color: '#8aafd4' },
                                        hovertemplate: 'Math 2018<br>CPU: %{x} min/day<br>Score: %{y}<extra></extra>',
                                    },
                                ] as any}
                                layout={{
                                    title: { text: 'MATH', font: { size: 12, color: '#374151' } },
                                    xaxis: {
                                        title: { text: 'In-School CPU Use (min/day)', font: { size: 10 } },
                                        tickvals: [0, 30, 90, 180, 300, 390],
                                        ticktext: ['0', '1–60', '61–120', '121–240', '241–360', '>360'],
                                        gridcolor: '#f3f4f6',
                                    },
                                    yaxis: { title: { text: 'Total Score', font: { size: 10 } }, range: [400, 520], gridcolor: '#f3f4f6' },
                                    plot_bgcolor: 'white', paper_bgcolor: 'white',
                                    height: 280, margin: { t: 40, r: 20, b: 60, l: 55 },
                                    font: { family: 'Inter, sans-serif', size: 9, color: '#6b7280' },
                                    showlegend: false,
                                }}
                                style={{ width: '100%' }}
                                config={{ responsive: true, displayModeBar: false }}
                                useResizeHandler={true}
                            />
                                
                                <Plot
                                    data={[
                                        {
                                            type: 'scatter', mode: 'lines+markers', name: '2012',
                                            x: [0, 30, 90, 180, 300, 390],
                                            y: [508, 495, 465, 462, 450, 430],
                                            line: { color: '#1a3353', width: 2 },
                                            marker: { size: 6 },
                                            hovertemplate: 'Reading 2012<br>Score: %{y}<extra></extra>',
                                        },
                                        {
                                            type: 'scatter', mode: 'lines+markers', name: '2015',
                                            x: [0, 30, 90, 180, 300, 390],
                                            y: [483, 492, 461, 458, 448, 420],
                                            line: { color: '#4a6fa5', width: 2, dash: 'dot' },
                                            marker: { size: 6 },
                                            hovertemplate: 'Reading 2015<br>Score: %{y}<extra></extra>',
                                        },
                                        {
                                            type: 'scatter', mode: 'lines+markers', name: '2018',
                                            x: [0, 30, 90, 180, 300, 390],
                                            y: [470, 480, 456, 454, 445, 417],
                                            line: { color: '#8aafd4', width: 2, dash: 'dash' },
                                            marker: { size: 6 },
                                            hovertemplate: 'Reading 2018<br>Score: %{y}<extra></extra>',
                                        },
                                    ] as any}
                                    layout={{
                                        title: { text: 'READING', font: { size: 12, color: '#374151' } },
                                        xaxis: {
                                            title: { text: 'In-School CPU Use (min/day)', font: { size: 10 } },
                                            tickvals: [0, 30, 90, 180, 300, 390],
                                            ticktext: ['0', '1–60', '61–120', '121–240', '241–360', '>360'],
                                            gridcolor: '#f3f4f6',
                                        },
                                        yaxis: { title: { text: 'Total Score', font: { size: 10 } }, range: [400, 530], gridcolor: '#f3f4f6' },
                                        plot_bgcolor: 'white', paper_bgcolor: 'white',
                                        height: 260, margin: { t: 40, r: 10, b: 60, l: 55 },
                                        font: { family: 'Inter, sans-serif', size: 9, color: '#6b7280' },
                                        showlegend: false,
                                    }}
                                    style={{ width: '100%' }}
                                    config={{ responsive: true, displayModeBar: false }}
                                    useResizeHandler={true}
                                />
                                
                                {/* Science */}
                                <Plot
                                    data={[
                                        {
                                            type: 'scatter', mode: 'lines+markers', name: '2012',
                                            x: [0, 30, 90, 180, 300, 390],
                                            y: [508, 495, 465, 462, 450, 430],
                                            line: { color: '#1a3353', width: 2 },
                                            marker: { size: 6 },
                                            hovertemplate: 'Science 2012<br>Score: %{y}<extra></extra>',
                                        },
                                        {
                                            type: 'scatter', mode: 'lines+markers', name: '2015',
                                            x: [0, 30, 90, 180, 300, 390],
                                            y: [483, 492, 463, 458, 447, 425],
                                            line: { color: '#4a6fa5', width: 2, dash: 'dot' },
                                            marker: { size: 6 },
                                            hovertemplate: 'Science 2015<br>Score: %{y}<extra></extra>',
                                        },
                                        {
                                            type: 'scatter', mode: 'lines+markers', name: '2018',
                                            x: [0, 30, 90, 180, 300, 390],
                                            y: [470, 482, 461, 454, 445, 420],
                                            line: { color: '#8aafd4', width: 2, dash: 'dash' },
                                            marker: { size: 6 },
                                            hovertemplate: 'Science 2018<br>Score: %{y}<extra></extra>',
                                        },
                                    ] as any}
                                    layout={{
                                        title: { text: 'SCIENCE', font: { size: 12, color: '#374151' } },
                                        xaxis: {
                                            title: { text: 'In-School CPU Use (min/day)', font: { size: 10 } },
                                            tickvals: [0, 30, 90, 180, 300, 390],
                                            ticktext: ['0', '1–60', '61–120', '121–240', '241–360', '>360'],
                                            gridcolor: '#f3f4f6',
                                        },
                                        yaxis: { title: { text: 'Total Score', font: { size: 10 } }, range: [400, 530], gridcolor: '#f3f4f6' },
                                        plot_bgcolor: 'white', paper_bgcolor: 'white',
                                        height: 260, margin: { t: 40, r: 60, b: 60, l: 55 },
                                        showlegend: false,
                                        font: { family: 'Inter, sans-serif', size: 9, color: '#6b7280' },
                                    }}
                                    style={{ width: '100%' }}
                                    config={{ responsive: true, displayModeBar: false }}
                                    useResizeHandler={true}
                                />
                            </div>
                        </div>
                

                            {/* Callout stat */}
                            <div className="mt-4 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-center">
                                <p className="text-xs text-gray-600">
                                    Students using screens <span className="font-bold text-gray-800">&gt;6 hours/day</span> scored
                                    an average of <span className="font-bold text-red-600">66 points lower</span> than
                                    non-users — equivalent to a <span className="font-semibold text-gray-800">two letter-grade drop</span> (50th → 24th percentile).
                                </p>
                            </div>
                        </div>

                        {/* ── Chart 2: OECD Scatter ─────────────────────────────────────────── */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-5">
                        <div className="mb-3">
                            <h3 className="text-sm sm:text-base font-semibold text-gray-800">
                                OECD Countries — EdTech Access vs. Math Performance Change
                            </h3>
                            <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
                                Countries that invested more in classroom computers showed greater declines in PISA Math scores (2003 vs. 2012).
                                Adjusted association: <span className="font-semibold text-gray-600">−0.57</span>.
                            </p>
                        </div>
                        <Plot
                            data={[
                                {
                                    type: 'scatter', mode: 'markers+text',
                                    x : [
                                        1.3, // Turkey
                                        4.8, // Mexico
                                        5.3, // Greece
                                        6.8, // Italy
                                        6.0, // Korea
                                        6.3, // Luxembourg
                                        6.2, // Germany
                                        6.5, // Japan
                                        6.4, // Switzerland
                                        7.3, // Austria
                                        6.8, // Netherlands
                                        7.1, // Canada
                                        6.9, // Belgium
                                        7.7, // Ireland
                                        8.3, // Spain
                                        8.5, // Norway
                                        7.8, // United States
                                        7.5, // Denmark
                                        7.2, // France
                                        6.3, // Iceland
                                        9.0, // Hungary
                                        7.3, // Portugal
                                        7.5, // Poland
                                        6.9, // Finland
                                        6.5, // Sweden
                                        8.8, // Slovak Republic
                                        8.8, // Czech Republic
                                        9.7, // Australia
                                        9.8  // New Zealand
                                        ],

                                        y : [
                                        24,  // Turkey
                                        28,  // Mexico
                                        8,   // Greece
                                        19,  // Italy
                                        11,  // Korea
                                        -8,  // Luxembourg
                                        10,  // Germany
                                        2,   // Japan
                                        4,   // Switzerland
                                        0,   // Austria
                                        -15, // Netherlands
                                        -16, // Canada
                                        -15, // Belgium
                                        -2,  // Ireland
                                        -1,  // Spain
                                        -6,  // Norway
                                        -2,  // United States
                                        -15, // Denmark
                                        -16, // France
                                        -22, // Iceland
                                        -12, // Hungary
                                        21,  // Portugal
                                        28,  // Poland
                                        -26, // Finland
                                        -31, // Sweden
                                        -18, // Slovak Republic
                                        -19, // Czech Republic
                                        -20, // Australia
                                        -24  // New Zealand
                                        ],

                                        text: [
                                        'Turkey', 'Mexico', 'Greece', 'Italy', 'Korea', 'Luxembourg',
                                        'Germany', 'Japan', 'Switzerland', 'Austria', 'Netherlands',
                                        'Canada', 'Belgium', 'Ireland', 'Spain', 'Norway',
                                        'United States', 'Denmark', 'France', 'Iceland', 'Hungary',
                                        'Portugal', 'Poland', 'Finland', 'Sweden', 'Slovak Republic',
                                        'Czech Republic', 'Australia', 'New Zealand'
                                        ],
                                    textposition: [
                                        'top right', 'top center', 'bottom center', 'top center', 'top left',
                                        'bottom left', 'top center', 'bottom center', 'top right', 'top right',
                                        'bottom center', 'bottom left', 'top left', 'bottom right', 'top right',
                                        'bottom right', 'top right', 'bottom center', 'bottom left', 'bottom left',
                                        'top right', 'top right', 'top center', 'bottom center', 'bottom center',
                                        'bottom left', 'bottom right', 'bottom right', 'bottom right',
                                    ],
                                    textfont: { size: 8, color: '#6b7280' },
                                    marker: { size: 8, color: '#1a3353', opacity: 0.8 },
                                    hovertemplate: '<b>%{text}</b><br>Score change: %{y}<extra></extra>',
                                    showlegend: false,
                                },
                                // Trend line
                                {
                                    type: 'scatter', mode: 'lines',
                                    x: [0, 11.5],
                                    y: [36, -30],  // adjusted to better fit the data
                                    line: { color: '#ff9901', width: 2 },  // change '#111827' to whatever color you want
                                    hoverinfo: 'skip',
                                    showlegend: false,
                                },
                            ] as any}
                            layout={{
                                xaxis: {
                                    title: { text: '← Fewer Computers                More Computers →', font: { size: 10 } },
                                    showticklabels: false,
                                    gridcolor: '#f3f4f6',
                                    zeroline: false, zerolinecolor: '#e5e7eb',
                                    range: [0, 10.5],
                                },
                                yaxis: {
                                    title: { text: 'Difference in Math Performance (PISA 2012 vs 2003)', font: { size: 10 } },
                                    gridcolor: '#f3f4f6',
                                    zeroline: false, zerolinecolor: '#9ca3af', zerolinewidth: 1.5,
                                    range: [-42, 35],
                                },
                                plot_bgcolor: 'white', paper_bgcolor: 'white',
                                height: 480,
                                margin: { t: 20, r: 20, b: 60, l: 70 },
                                font: { family: 'Inter, sans-serif', size: 9, color: '#6b7280' },
                                showlegend: false,
                                annotations: [{
                                    text: 'OECD COUNTRIES',
                                    xref: 'paper', yref: 'paper',
                                    x: 0.5, y: 1.04, xanchor: 'center',
                                    showarrow: false,
                                    font: { size: 12, color: '#374151', family: 'Inter, sans-serif' },
                                }],
                            }}
                            style={{ width: '100%' }}
                            config={{ responsive: true, displayModeBar: false }}
                            useResizeHandler={true}
                        />
                    </div>

                        {/* ── Chart 3: TIMSS ────────────────────────────────────────────────── */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-5">
                            <div className="mb-3">
                                <h3 className="text-sm sm:text-base font-semibold text-gray-800">
                                    TIMSS: All Countries — In-School Computer Use vs. Math Score
                                </h3>
                                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
                                    Students using computers in class scored ~41 points lower in math 
                                    than those who rarely used them — a drop from the 50th to the 32nd percentile.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Plot
                                    data={[{
                                        type: 'bar',
                                        x: ['Almost Never', '1–2x per Month', '1–2x per Week', 'Almost Daily'],
                                        y: [550, 535, 508, 499],
                                        marker: {
                                            color: ['#1a3353', '#2d5282', '#4a6fa5', '#7fa3cc'],
                                        },
                                        hovertemplate: '%{x}<br>Score: %{y}<extra></extra>',
                                        showlegend: false,
                                    }] as any}
                                    layout={{
                                        title: { text: '4th Grade Math', font: { size: 12, color: '#374151' } },
                                        xaxis: { title: { text: 'In-School CPU Use', font: { size: 10 } }, gridcolor: '#f3f4f6' },
                                        yaxis: { title: { text: 'Total Score', font: { size: 10 } }, range: [480, 560], gridcolor: '#f3f4f6' },
                                        plot_bgcolor: 'white', paper_bgcolor: 'white',
                                        height: 280, margin: { t: 40, r: 10, b: 80, l: 60 },
                                        font: { family: 'Inter, sans-serif', size: 9, color: '#6b7280' },
                                    }}
                                    style={{ width: '100%' }}
                                    config={{ responsive: true, displayModeBar: false }}
                                    useResizeHandler={true}
                                />
                                <Plot
                                    data={[{
                                        type: 'bar',
                                        x: ['Almost Never', '1–2x per Month', '1–2x per Week', 'Almost Daily'],
                                        y: [528, 518, 497, 484],
                                        marker: {
                                            color: ['#1a3353', '#2d5282', '#4a6fa5', '#7fa3cc'],
                                        },
                                        hovertemplate: '%{x}<br>Score: %{y}<extra></extra>',
                                        showlegend: false,
                                    }] as any}
                                    layout={{
                                        title: { text: '8th Grade Math', font: { size: 12, color: '#374151' } },
                                        xaxis: { title: { text: 'In-School CPU Use', font: { size: 10 } }, gridcolor: '#f3f4f6' },
                                        yaxis: { title: { text: 'Total Score', font: { size: 10 } }, range: [460, 545], gridcolor: '#f3f4f6' },
                                        plot_bgcolor: 'white', paper_bgcolor: 'white',
                                        height: 280, margin: { t: 40, r: 10, b: 80, l: 60 },
                                        font: { family: 'Inter, sans-serif', size: 9, color: '#6b7280' },
                                    }}
                                    style={{ width: '100%' }}
                                    config={{ responsive: true, displayModeBar: false }}
                                    useResizeHandler={true}
                                />
                            </div>
                        </div>

                        {/* ── Chart 4: PIRLS ────────────────────────────────────────────────── */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-5">
                            <div className="mb-3">
                                <h3 className="text-sm sm:text-base font-semibold text-gray-800">
                                    PIRLS: In-School Computer Use vs. Reading Score
                                </h3>
                                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
                                    PIRLS (Progress in International Reading Literacy Study) assesses 4th grade reading
                                    across dozens of countries every 5 years. Pattern mirrors PISA and TIMSS findings.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Plot
                                    data={[{
                                        type: 'bar', orientation: 'h',
                                        y: ['Almost Never', '1–2x per Month', '1–2x per Week', 'Almost Daily'],
                                        x: [508, 508, 508, 455],
                                        marker: { color: ['#1a3353', '#2d5282', '#4a6fa5', '#7fa3cc'] },
                                        hovertemplate: '%{y}<br>Score: %{x}<extra></extra>',
                                        showlegend: false,
                                    }] as any}
                                    layout={{
                                        title: { text: 'All Countries', font: { size: 12, color: '#374151' } },
                                        xaxis: { title: { text: 'Total Score', font: { size: 10 } }, range: [450, 550], gridcolor: '#f3f4f6' },
                                        yaxis: { title: { text: 'In-School CPU Use', font: { size: 10 } }, gridcolor: '#f3f4f6' },
                                        plot_bgcolor: 'white', paper_bgcolor: 'white',
                                        height: 240, margin: { t: 40, r: 20, b: 50, l: 120 },
                                        font: { family: 'Inter, sans-serif', size: 9, color: '#6b7280' },
                                    }}
                                    style={{ width: '100%' }}
                                    config={{ responsive: true, displayModeBar: false }}
                                    useResizeHandler={true}
                                />
                                <Plot
                                    data={[{
                                        type: 'bar', orientation: 'h',
                                        y: ['Almost Never', '1–2x per Month', '1–2x per Week', 'Almost Daily'],
                                        x: [532, 537, 520, 484],
                                        marker: { color: ['#1a3353', '#2d5282', '#4a6fa5', '#7fa3cc'] },
                                        hovertemplate: '%{y}<br>Score: %{x}<extra></extra>',
                                        showlegend: false,
                                    }] as any}
                                    layout={{
                                        title: { text: 'OECD Countries Only', font: { size: 12, color: '#374151' } },
                                        xaxis: { title: { text: 'Total Score', font: { size: 10 } }, range: [480, 560], gridcolor: '#f3f4f6' },
                                        yaxis: { title: { text: 'In-School CPU Use', font: { size: 10 } }, gridcolor: '#f3f4f6' },
                                        plot_bgcolor: 'white', paper_bgcolor: 'white',
                                        height: 240, margin: { t: 40, r: 20, b: 50, l: 120 },
                                        font: { family: 'Inter, sans-serif', size: 9, color: '#6b7280' },
                                    }}
                                    style={{ width: '100%' }}
                                    config={{ responsive: true, displayModeBar: false }}
                                    useResizeHandler={true}
                                />
                            </div>
                        </div>

                        {/* ── Chart 5: Time on Devices vs Math (OECD) ───────────────────────── */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-5">
                            <div className="mb-3">
                                <h3 className="text-sm sm:text-base font-semibold text-gray-800">
                                    Time on Digital Devices at School &amp; Mathematics Performance
                                </h3>
                                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
                                    Based on students' self-reports · OECD average.
                                    Learning use declines steadily; leisure use drops sharply after 3 hours.
                                </p>
                            </div>
                            <Plot
                                data={[
                                    {
                                        type: 'scatter', mode: 'lines+markers', name: 'Learning',
                                        x: ['None', 'Up to 1 hr', '1–2 hrs', '2–3 hrs', '3–5 hrs', '5–7 hrs', '>7 hrs'],
                                        y: [455, 481, 478, 479, 477, 465, 459],
                                        line: { color: '#1a3353', width: 2.5 },
                                        marker: { size: 7, symbol: 'diamond', color: '#1a3353' },
                                        hovertemplate: 'Learning<br>%{x}<br>Score: %{y}<extra></extra>',
                                    },
                                    {
                                        type: 'scatter', mode: 'lines+markers', name: 'Leisure',
                                        x: ['None', 'Up to 1 hr', '1–2 hrs', '2–3 hrs', '3–5 hrs', '5–7 hrs', '>7 hrs'],
                                        y: [471, 491, 483, 469, 450, 430, 435],
                                        line: { color: '#ef4444', width: 2.5 },
                                        marker: { size: 7, symbol: 'circle', color: '#ef4444' },
                                        hovertemplate: 'Leisure<br>%{x}<br>Score: %{y}<extra></extra>',
                                    },
                                ] as any}
                                layout={{
                                    xaxis: {
                                        title: { text: 'Time Spent on Digital Devices at School', font: { size: 11 } },
                                        gridcolor: '#f3f4f6', linecolor: '#e5e7eb',
                                    },
                                    yaxis: {
                                        title: { text: 'Mean Score in Mathematics', font: { size: 11 } },
                                        gridcolor: '#f3f4f6', linecolor: '#e5e7eb',
                                        range: [360, 510],
                                    },
                                    hovermode: 'closest',
                                    showlegend: true,
                                    legend: { orientation: 'h', y: -0.22, x: 0.5, xanchor: 'center', font: { size: 10 } },
                                    plot_bgcolor: 'white', paper_bgcolor: 'white',
                                    height: 340,
                                    margin: { t: 10, r: 20, b: 80, l: 65 },
                                    font: { family: 'Inter, sans-serif', size: 10, color: '#6b7280' },
                                }}
                                style={{ width: '100%' }}
                                config={{ responsive: true, displayModeBar: false }}
                                useResizeHandler={true}
                            />
                        </div>

                    </div>
                </div>

            </main>

            {/* Footer */}
            <footer className="mt-12 pb-12 border-t border-gray-200 pt-8 px-4">
                <div className="max-w-screen-2xl mx-auto text-center">
                    <p className="text-xs text-gray-400">
                        &copy; {new Date().getFullYear()} Nebraska Assessment Dashboard
                    </p>
                </div>
            </footer>
        </div>
    )
}