// ── Trace Builder ─────────────────────────────────────────────────────────────
// Converts filtered ScoreRow data into Plotly trace objects.

import { ScoreRow } from '@/types'
import { buildYearMap, buildYearMapWithGrades, weightedAvg } from './chartUtils'

interface BuildTracesParams {
    filteredData: ScoreRow[]
    colorMap    : Record<string, string>
    viewMode    : 'all' | 'gender'
}

const DISTRICT_66_NAME = 'WESTSIDE COMMUNITY SCHOOLS'

export function buildTraces({
    filteredData,
    colorMap,
    viewMode,
}: BuildTracesParams): object[] {
    if (!filteredData.length) return []

    const result: object[] = []

    // ── All Students view ─────────────────────────────────────────────
    if (viewMode === 'all') {
        const byDist: Record<string, ScoreRow[]> = {}

        filteredData.forEach(r => {
            const k = `${r.agency_name}|||${r.level}`
            if (!byDist[k]) byDist[k] = []
            byDist[k].push(r)
        })

        Object.entries(byDist).forEach(([key, rows]) => {
            const [name, level] = key.split('|||')
            const isST         = level === 'ST'
            const isDistrict66 = name === DISTRICT_66_NAME

            // ✅ Use grade-aware year map
            const m        = buildYearMapWithGrades(rows)
            const allYears = Object.keys(m).map(Number).sort()

            // ✅ Only keep years where weighted average is a valid number
            const validPairs = allYears
                .map(yr => ({
                    yr,
                    avg:    weightedAvg(m[yr].scores, m[yr].counts),
                    grades: [...m[yr].grades].sort(),
                }))
                .filter(({ avg }) => isFinite(avg))

            result.push({
                x: validPairs.map(p => p.yr),
                y: validPairs.map(p => p.avg),
                // ✅ customdata[0] = comma-separated grade list for tooltip
                customdata: validPairs.map(p => [p.grades.join(', ')]),
                mode: 'lines+markers',
                name: isST ? 'State Average' : name,
                legendgroup: isST ? '__state__' : name,
                showlegend: true,
                line: {
                    color: isST ? '#dc2626' : colorMap[name] || '#999',
                    width: isST ? 3.5 : isDistrict66 ? 3 : 1.5,
                    dash : isST ? 'dash' : 'solid',
                },
                marker: {
                    size  : isST ? 10 : 5,
                    color : isST ? '#dc2626' : colorMap[name] || '#999',
                    symbol: isST ? 'diamond' : 'circle',
                },
                opacity: isST ? 1 : 0.85,
                // ✅ Show grades in tooltip; state has no grade breakdown
                hovertemplate: isST
                    ? `<b>State Average</b><br>Year: %{x}<br>Score: %{y:.1f}<extra></extra>`
                    : `<b>${name}</b><br>Year: %{x}<br>Score: %{y:.1f}<br>Grades: %{customdata[0]}<extra></extra>`,
            })
        })

        return result
    }

    // ── By Gender view ─────────────────────────────────────────────
    const distKeys = [
        ...new Set(filteredData.map(r => `${r.agency_name}|||${r.level}`)),
    ]

    distKeys.forEach(key => {
        const [name, level] = key.split('|||')
        const isST         = level === 'ST'
        const isDistrict66 = name === DISTRICT_66_NAME
        const color        = isST ? '#dc2626' : colorMap[name] || '#999'

        const maleRows = filteredData.filter(r =>
            r.agency_name === name && r.level === level && r.subgroup_desc === 'Male')

        const femaleRows = filteredData.filter(r =>
            r.agency_name === name && r.level === level && r.subgroup_desc === 'Female')

        // ✅ Use grade-aware maps for gender view too
        const maleMap   = buildYearMapWithGrades(maleRows)
        const femaleMap = buildYearMapWithGrades(femaleRows)

        const allYears = [
            ...new Set([
                ...Object.keys(maleMap).map(Number),
                ...Object.keys(femaleMap).map(Number),
            ]),
        ].sort()

        // Male
        if (maleRows.length) {
            const malePairs = allYears
                .filter(yr => maleMap[yr])
                .map(yr => ({
                    yr,
                    avg:    weightedAvg(maleMap[yr].scores, maleMap[yr].counts),
                    grades: [...maleMap[yr].grades].sort(),
                }))
                .filter(({ avg }) => isFinite(avg))  // ✅ drop NaN years

            result.push({
                x: malePairs.map(p => p.yr),
                y: malePairs.map(p => p.avg),
                customdata: malePairs.map(p => [p.grades.join(', ')]),
                mode: 'lines+markers',
                name: isST ? 'State — Male' : name,
                legendgroup: isST ? '__state_male__' : name,
                showlegend: true,
                line: { color, width: isST ? 3 : isDistrict66 ? 3 : 1.5, dash: 'solid' },
                marker: { size: isST ? 9 : 5, color, symbol: 'circle' },
                opacity: 0.9,
                hovertemplate: isST
                    ? `<b>State — Male</b><br>Year: %{x}<br>Score: %{y:.1f}<extra></extra>`
                    : `<b>${name}</b><br>Gender: Male<br>Year: %{x}<br>Score: %{y:.1f}<br>Grades: %{customdata[0]}<extra></extra>`,
            })
        }

        // Female
        if (femaleRows.length) {
            const femalePairs = allYears
                .filter(yr => femaleMap[yr])
                .map(yr => ({
                    yr,
                    avg:    weightedAvg(femaleMap[yr].scores, femaleMap[yr].counts),
                    grades: [...femaleMap[yr].grades].sort(),
                }))
                .filter(({ avg }) => isFinite(avg))  // ✅ drop NaN years

            result.push({
                x: femalePairs.map(p => p.yr),
                y: femalePairs.map(p => p.avg),
                customdata: femalePairs.map(p => [p.grades.join(', ')]),
                mode: 'lines+markers',
                name: isST ? 'State — Female' : name,
                legendgroup: isST ? '__state_female__' : name,
                showlegend: false,
                line: { color, width: isST ? 3 : isDistrict66 ? 3 : 1.5, dash: 'dot' },
                marker: { size: isST ? 9 : 5, color, symbol: 'diamond' },
                opacity: 0.9,
                hovertemplate: isST
                    ? `<b>State — Female</b><br>Year: %{x}<br>Score: %{y:.1f}<extra></extra>`
                    : `<b>${name}</b><br>Gender: Female<br>Year: %{x}<br>Score: %{y:.1f}<br>Grades: %{customdata[0]}<extra></extra>`,
            })
        }

        // Combined
        if (maleRows.length && femaleRows.length) {
            const combinedPairs = allYears
                .filter(yr => maleMap[yr] && femaleMap[yr])
                .map(yr => {
                    // Merge grade lists from both male and female maps for this year
                    const mergedGrades = [
                        ...new Set([...maleMap[yr].grades, ...femaleMap[yr].grades])
                    ].sort()
                    return {
                        yr,
                        avg: weightedAvg(
                            [...maleMap[yr].scores, ...femaleMap[yr].scores],
                            [...maleMap[yr].counts, ...femaleMap[yr].counts],
                        ),
                        grades: mergedGrades,
                    }
                })
                .filter(({ avg }) => isFinite(avg))  // ✅ drop NaN years

            result.push({
                x: combinedPairs.map(p => p.yr),
                y: combinedPairs.map(p => p.avg),
                customdata: combinedPairs.map(p => [p.grades.join(', ')]),
                mode: 'lines+markers',
                name: isST ? 'State — M+F Combined' : name,
                legendgroup: isST ? '__state_combined__' : name,
                showlegend: false,
                line: { color, width: isST ? 3 : isDistrict66 ? 3 : 2, dash: 'dashdot' },
                marker: { size: isST ? 9 : 5, color, symbol: 'square' },
                opacity: 0.6,
                hovertemplate: isST
                    ? `<b>State — M+F</b><br>Year: %{x}<br>Score: %{y:.1f}<extra></extra>`
                    : `<b>${name}</b><br>M+F Weighted Avg<br>Year: %{x}<br>Score: %{y:.1f}<br>Grades: %{customdata[0]}<extra></extra>`,
            })
        }
    })

    return result
}