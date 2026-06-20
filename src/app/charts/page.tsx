'use client'
import dynamic from 'next/dynamic'
import { Navbar } from '@/components/Navbar'
import { ChartSkeleton } from '@/components/ChartSkeleton'
import { ScreenTimeChart } from '@/components/ScreenTimeChart'
import Image from 'next/image'

const Plot = dynamic(
    () => import('react-plotly.js').then(mod => mod.default),
    { ssr: false, loading: () => <ChartSkeleton /> }
)

export default function ChartsPage() {
    return (
        <div className="min-h-screen bg-[#f4f6f9]">
            <header className="bg-[#1a3353] shadow-lg">
                <Navbar />
            </header>

            <main className="mx-auto max-w-screen-2xl px-4 sm:px-8 lg:px-12 py-6 sm:py-10">

                {/* Page Header */}
                <div className="mb-6 sm:mb-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                        Research Charts
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-3xl leading-relaxed">
                        Findings from NAEP, PISA, TIMSS, PIRLS and peer-reviewed research —
                        documenting the relationship between digital device use and academic
                        performance across the United States and internationally.
                    </p>
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
                                    className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-center">
                                    <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                        {label}
                                    </p>
                                    <p className="text-base sm:text-lg font-bold text-blue-900">
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
                                                ? 'bg-blue-50 border-blue-100'
                                                : 'bg-red-50 border-red-100'}`}>
                                        <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-1 leading-tight">
                                            {subject}
                                        </p>
                                        <p className={`text-sm font-bold
                                            ${color === 'emerald' ? 'text-blue-900' : 'text-red-900'}`}>
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
                                                ? 'bg-blue-50 border-blue-100'
                                                : 'bg-red-50 border-red-100'}`}>
                                        <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-1 leading-tight">
                                            {subject}
                                        </p>
                                        <p className={`text-sm font-bold
                                            ${color === 'emerald' ? 'text-blue-900' : 'text-red-900'}`}>
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
                                Beyond national trends, a robust body of international research 
                                has examined the relationship between digital device use and academic performance. Below are key charts summarizing findings from 
                                PISA and OECD data, revealing consistent patterns of negative associations between screen time and student achievement across multiple 
                                countries and subjects.
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                            </div>
                        </div>
                

                            {/* Callout stat */}
                            <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-center">
                                <p className="text-xs text-gray-600">
                                    Students using screens <span className="font-bold text-gray-800">&gt;6 hours/day</span> scored
                                    an average of <span className="font-bold text-blue-900">66 points lower</span> than
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
                                    line: { color: '#bbd1f1', width: 2 },  // change '#111827' to whatever color you want
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
                    {/* ── Charts 3 & 4: TIMSS + PIRLS side by side ─────────────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 sm:gap-5 mb-5">

                    {/* ── Chart 3: TIMSS ──────────────────────────────────────────────── */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
                        <div className="mb-3">
                            <h3 className="text-sm sm:text-base font-semibold text-gray-800">
                                TIMSS: All Countries — In-School Computer Use vs. Math Score
                            </h3>
                            <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
                                Students using computers in class scored ~41 points lower in math 
                                than those who rarely used them — a drop from the 50th to the 32nd percentile.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
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
                                    xaxis: { title: { text: 'In-School CPU Use', font: { size: 10 } }, gridcolor: '#f3f4f6'},
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

                    {/* ── Chart 4: PIRLS ──────────────────────────────────────────────── */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
                        <div className="mb-3">
                            <h3 className="text-sm sm:text-base font-semibold text-gray-800">
                                PIRLS: In-School Computer Use vs. Reading Score
                            </h3>
                            <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
                                PIRLS (Progress in International Reading Literacy Study) assesses 4th grade reading
                                across dozens of countries every 5 years. Pattern mirrors PISA and TIMSS findings.
                            </p>
                        </div>
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
                                    line: { color: '#000000', width: 2.5 },
                                    marker: { size: 7, symbol: 'diamond', color: '#000000' },
                                    hovertemplate: 'Learning<br>%{x}<br>Score: %{y}<extra></extra>',
                                },
                                {
                                    type: 'scatter', mode: 'lines+markers', name: 'Leisure',
                                    x: ['None', 'Up to 1 hr', '1–2 hrs', '2–3 hrs', '3–5 hrs', '5–7 hrs', '>7 hrs'],
                                    y: [471, 491, 483, 469, 450, 430, 435],
                                    line: { color: '#ff0404', width: 2.5 },
                                    marker: { size: 7, symbol: 'circle', color: '#ff0404' },
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
            {/* ── Chart 6: PARCC Paper vs Online Testing ───────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-5">
                <div className="mb-4">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-800">
                        PARCC Testing Mode Study — Paper vs. Online
                    </h3>
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-1 leading-relaxed">
                        A peer-reviewed study published in the Economics of Education Review analyzed nearly 1.2 million student test 
                        results across Massachusetts public schools in grades 3 through 8, administering the identical exam in both online 
                        and paper formats simultaneously to isolate the effect of the testing mode itself. Researchers found that students 
                        who took the test on a computer scored 0.10 standard deviations lower in math and 0.25 standard deviations lower in 
                        English Language Arts compared to students who took the identical test on paper, meaning a student who truly deserves 
                        a B is being measured as a C student simply because of the device in front of them. To put those numbers in everyday 
                        terms, the researchers calculated that the ELA penalty alone represents up to 11 months of lost measured learning in 
                        a 9-month school year! The science test, which remained on paper for all students, showed zero penalty, confirming 
                        that the format of the test, not the knowledge of the child, is causing the gap.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                    {/* Math */}
                    <Plot
                        data={[
                            {
                                type: 'scatter',
                                mode: 'lines+markers',
                                name: 'Paper, 2015 & 2016',
                                x: [2011, 2012, 2013, 2014, 2015, 2016],
                                y: [-0.05, -0.048, -0.038, -0.037, 0.025, -0.01],
                                line: { color: '#10b981', width: 2 },
                                marker: { size: 7, color: '#10b981' },
                            },
                            {
                                type: 'scatter',
                                mode: 'lines+markers',
                                name: 'Online 2015, Paper 2016',
                                x: [2011, 2012, 2013, 2014, 2015, 2016],
                                y: [0.018, 0.015, 0.022, -0.002, -0.07, 0.03],
                                line: { color: '#3b82f6', width: 2},
                                marker: { size: 6, color: '#3b82f6' },
                            },
                            {
                                type: 'scatter',
                                mode: 'lines+markers',
                                name: 'Online, 2015 & 2016',
                                x: [2011, 2012, 2013, 2014, 2015, 2016],
                                y: [0.07, 0.071, 0.055, 0.055, 0.003, 0.03],
                                line: { color: '#000000', width: 2 },
                                marker: { size: 7, color: '#000000' },
                            },
                            {
                                type: 'scatter',
                                mode: 'lines+markers',
                                name: 'Paper 2015, Online 2016',
                                x: [2011, 2012, 2013, 2014, 2015, 2016],
                                y: [-0.175, -0.19, -0.175, -0.12, -0.065, -0.22],
                                line: { color: '#ef4444', width: 2},
                                marker: { size: 7, color: '#ef4444' },
                            },
                        ] as any}
                        layout={{
                            title: { text: 'Math', font: { size: 16, color: '#374151' } },
                            xaxis: { title: { text: 'Year' }, tickvals: [2011, 2012, 2013, 2014, 2015, 2016], gridcolor: '#f3f4f6' },
                            yaxis: { title: { text: 'Std. Achievement' }, range: [-0.35, 0.12], gridcolor: '#f3f4f6' },
                            plot_bgcolor: 'white',
                            paper_bgcolor: 'white',
                            height: 420,
                            margin: { t: 50, r: 20, b: 100, l: 60 },
                            font: { family: 'Inter, sans-serif', size: 10, color: '#6b7280' },
                            legend: { orientation: 'h', y: -0.3, x: 0.5, xanchor: 'center', namelength: -1 },
                            hoverlabel: {namelength: -1, bgcolor: '#f9fafb', bordercolor: '#e5e7eb', font: { size: 10, color: '#111827' } },
                        } as any}
                        style={{ width: '100%' }}
                        config={{ responsive: true, displayModeBar: false }}
                        useResizeHandler={true}
                    />

                    {/* ELA */}
                    <Plot
                        data={[
                            {
                                type: 'scatter',
                                mode: 'lines+markers',
                                name: 'Paper, 2015 & 2016',
                                x: [2011, 2012, 2013, 2014, 2015, 2016],
                                y: [-0.065, -0.053, -0.054, -0.043, 0.10, 0.03],
                                line: { color: '#10b981', width: 2 },
                                marker: { size: 7, color: '#10b981' },
                            },
                            {
                                type: 'scatter',
                                mode: 'lines+markers',
                                name: 'Online 2015, Paper 2016',
                                x: [2011, 2012, 2013, 2014, 2015, 2016],
                                y: [0.0, -0.015, -0.002, -0.018, -0.195, 0.055],
                                line: { color: '#3b82f6', width: 2},
                                marker: { size: 6, color: '#3b82f6' },
                            },
                            {
                                type: 'scatter',
                                mode: 'lines+markers',
                                name: 'Online, 2015 & 2016',
                                x: [2011, 2012, 2013, 2014, 2015, 2016],
                                y: [0.085, 0.082, 0.079, 0.07, -0.02, 0.01],
                                line: { color: '#000000', width: 2 },
                                marker: { size: 7, color: '#000000' },
                            },
                            {
                                type: 'scatter',
                                mode: 'lines+markers',
                                name: 'Paper 2015, Online 2016',
                                x: [2011, 2012, 2013, 2014, 2015, 2016],
                                y: [-0.145, -0.18, -0.188, -0.16, -0.02, -0.335],
                                line: { color: '#ef4444', width: 2 },
                                marker: { size: 7, color: '#ef4444' },
                            },
                        ] as any}
                        layout={{
                            title: { text: 'English Language Arts', font: { size: 16, color: '#374151' } },
                            xaxis: { title: { text: 'Year' }, tickvals: [2011, 2012, 2013, 2014, 2015, 2016], gridcolor: '#f3f4f6' },
                            yaxis: { title: { text: 'Std. Achievement' }, range: [-0.35, 0.12], gridcolor: '#f3f4f6' },
                            plot_bgcolor: 'white',
                            paper_bgcolor: 'white',
                            height: 420,
                            margin: { t: 50, r: 20, b: 100, l: 60 },
                            font: { family: 'Inter, sans-serif', size: 10, color: '#6b7280' },
                            legend: { orientation: 'h', y: -0.3, x: 0.5, xanchor: 'center', namelength: -1 },
                            hoverlabel: {namelength: -1, bgcolor: '#f9fafb', bordercolor: '#e5e7eb', font: { size: 10, color: '#111827' } },
                        } as any}
                        style={{ width: '100%' }}
                        config={{ responsive: true, displayModeBar: false }}
                        useResizeHandler={true}
                    />
                </div>
            </div>
            {/*
                Chart 7: Early Screen Time & Academic Achievement
                ──────────────────────────────────────────────────
            */}

            {/* ── Chart 7: JAMA Screen Time & Academic Achievement ─────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-5">

                {/* Card header */}
                <div className="mb-4">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-800">
                        Early Screen Time &amp; Children's Academic Achievement
                    </h3>
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-1 leading-relaxed">
                        A 15-year prospective study of 5,400+ Canadian children linked daily screen habits in early childhood
                        to official reading, writing, and math test results in Grades 3 and 6.
                    </p>
                </div>

                {/* The interactive chart component */}
                <ScreenTimeChart />
            </div>
            {/* ── Chart 8: Adolescent Mental Health Trends ──────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-5">

                {/* Card header */}
                <div className="mb-4">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-800">
                        Adolescent Mental Health Indicators, 2001–2018
                    </h3>
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-1 leading-relaxed">
                        Standardized (Z-score) annual rates of four mental health indicators among
                        U.S. adolescents from 2001 to 2018: suicide, self-poisoning, major depressive
                        episode, and depressive symptoms.
                    </p>
                </div>

                <div className="relative">
                    <Plot
                        data={[
                            {
                                type: 'scatter', mode: 'lines+markers',
                                name: 'Suicide',
                                x: [2001,2002,2003,2004,2005,2006,2007,2008,2009,2010,2011,2012,2013,2014,2015,2016,2017],
                                y: [-0.72,-0.85,-1.00,-0.13,-0.75,-0.78,-1.15,-0.75,-0.20,-0.27,-0.22,-0.35,0.97,1.15,1.25,1.75,1.65],
                                line: { color: '#ef4444', width: 1.5 },
                                marker: { size: 4 },
                                hovertemplate: 'Suicide<br>%{x}: %{y:.2f}<extra></extra>',
                            },
                            {
                                type: 'scatter', mode: 'lines+markers',
                                name: 'Self-poisoning',
                                x: [2001,2002,2003,2004,2005,2006,2007,2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,2018],
                                y: [-0.53,-0.50,-0.47,-0.40,-0.55,-0.78,-0.85,-0.78,-0.80,-0.88,-0.72,-0.30,0.25,1.05,1.40,1.42,1.75,1.70],
                                line: { color: '#10b981', width: 1.5 },
                                marker: { size: 4 },
                                hovertemplate: 'Self-poisoning<br>%{x}: %{y:.2f}<extra></extra>',
                            },
                            {
                                type: 'scatter', mode: 'lines+markers',
                                name: 'Major Depressive Episode',
                                x: [2005,2006,2007,2008,2009,2010,2011,2012,2013,2014,2015,2016,2017],
                                y: [-0.50,-0.92,-0.85,-0.62,-1.02,-0.40,-1.07,-0.35,0.72,0.65,1.62,1.12,1.62],
                                line: { color: '#1a3353', width: 1.5 },
                                marker: { size: 4 },
                                hovertemplate: 'Major Depressive Episode<br>%{x}: %{y:.2f}<extra></extra>',
                            },
                            {
                                type: 'scatter', mode: 'lines+markers',
                                name: 'Depressive Symptoms',
                                x: [2001,2002,2003,2004,2005,2006,2007,2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,2018],
                                y: [-0.97,-0.82,-0.35,-0.25,-0.50,-0.65,-1.25,-0.75,-0.35,-0.53,-0.60,-0.45, 0.25,1.25,1.35,0.93,1.85,1.95],
                                line: { color: '#3b82f6', width: 1.5 },
                                marker: { size: 4, symbol: 'circle' },
                                hovertemplate: 'Depressive Symptoms<br>%{x}: %{y:.2f}<extra></extra>',
                            },
                        ] as any}
                        layout={{
                            xaxis: {
                                title: { text: 'Year', font: { size: 11 } },
                                tickvals: [2001,2002,2003,2004,2005,2006,2007,2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,2018],
                                tickangle: 90,
                                gridcolor: '#f3f4f6', linecolor: '#e5e7eb',
                            },
                            yaxis: {
                                title: { text: 'Z-score', font: { size: 11 } },
                                gridcolor: '#f3f4f6', linecolor: '#e5e7eb',
                                zeroline: true, zerolinecolor: '#9ca3af', zerolinewidth: 1.5,
                                range: [-2, 2.1],
                                dtick: 0.5,
                                tickformat: '.1f',
                            },
                            shapes: [{
                                type: 'rect',
                                x0: 2012, x1: 2018,
                                y0: -2, y1: 2.1,
                                fillcolor: '#eff6ff',
                                opacity: 0.5,
                                line: { width: 0 },
                                layer: 'below',
                            }],
                            annotations: [{
                                x: 2012, y: 2.0,
                                xref: 'x', yref: 'y',
                                text: 'Sustained rise begins →',
                                showarrow: false,
                                xanchor: 'left',
                                font: { size: 9, color: '#3b82f6' },
                            }],
                            hovermode: 'closest',
                            showlegend: true,
                            legend: { orientation: 'h', y: -0.25, x: 0.5, xanchor: 'center', font: { size: 10 } },
                            plot_bgcolor: 'white', paper_bgcolor: 'white',
                            height: 420,
                            margin: { t: 40, r: 20, b: 90, l: 60 },
                            font: { family: 'Inter, sans-serif', size: 10, color: '#6b7280' },
                        }}
                        style={{ width: '100%' }}
                        config={{ responsive: true, displayModeBar: false }}
                        useResizeHandler={true}
                    />
                </div>

                {/* Callout stat */}
                <div className="mt-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-center">
                    <p className="text-xs text-gray-600">
                        All four indicators move from <span className="font-bold text-gray-800">below the
                        historical average</span> pre-2012 to <span className="font-bold text-blue-900">well
                        above it</span> by 2017–2018 — a synchronized shift across independent data sources
                        rarely seen outside of major societal change.
                    </p>
                </div>
            </div>


            </main>
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