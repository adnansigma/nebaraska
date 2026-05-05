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
                    <div className="flex flex-col gap-4 sm:gap-5 mb-5">

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