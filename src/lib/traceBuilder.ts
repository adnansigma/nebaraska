// ── Trace Builder ─────────────────────────────────────────────────────────────
// Converts filtered ScoreRow data into Plotly trace objects.

import { ScoreRow } from '@/types'
import { buildYearMap, weightedAvg } from './chartUtils'

interface BuildTracesParams {
    filteredData: ScoreRow[]
    colorMap    : Record<string, string>
    viewMode    : 'all' | 'gender'
}

export function buildTraces({
    filteredData,
    colorMap,
    viewMode,
}: BuildTracesParams): object[] {
    if (!filteredData.length) return []

    const result: object[] = []

    // ── All Students view: one weighted avg line per district ─────────────
    if (viewMode === 'all') {
        const byDist: Record<string, ScoreRow[]> = {}

        filteredData.forEach(r => {
            const k = `${r.agency_name}|||${r.level}`
            if (!byDist[k]) byDist[k] = []
            byDist[k].push(r)
        })

        Object.entries(byDist).forEach(([key, rows]) => {
            const [name, level] = key.split('|||')
            const isST  = level === 'ST'
            const m     = buildYearMap(rows)
            const years  = Object.keys(m).map(Number).sort()
            const scores = years.map(yr =>
                weightedAvg(m[yr].scores, m[yr].counts))

            result.push({
                x: years,
                y: scores,
                mode: 'lines+markers',
                name: isST ? 'State Average' : name,
                legendgroup: isST ? '__state__' : name,
                showlegend: true,
                line: {
                    color: isST ? '#dc2626' : colorMap[name] || '#999',
                    width: isST ? 3.5 : 1.5,
                    dash : isST ? 'dash' : 'solid',
                },
                marker: {
                    size  : isST ? 10 : 5,
                    color : isST ? '#dc2626' : colorMap[name] || '#999',
                    symbol: isST ? 'diamond' : 'circle',
                },
                opacity: isST ? 1 : 0.85,
                hovertemplate: isST
                    ? `<b>State Average</b><br>Year: %{x}<br>Score: %{y:.1f}<extra></extra>`
                    : `<b>${name}</b><br>Year: %{x}<br>Score: %{y:.1f}<extra></extra>`,
            })
        })

        return result
    }

    // ── By Gender view: Male + Female + Combined per district ─────────────
    const distKeys = [
        ...new Set(filteredData.map(r => `${r.agency_name}|||${r.level}`)),
    ]

    distKeys.forEach(key => {
        const [name, level] = key.split('|||')
        const isST  = level === 'ST'
        const color = isST ? '#dc2626' : colorMap[name] || '#999'

        const maleRows   = filteredData.filter(r =>
            r.agency_name === name && r.level === level &&
            r.subgroup_desc === 'Male')
        const femaleRows = filteredData.filter(r =>
            r.agency_name === name && r.level === level &&
            r.subgroup_desc === 'Female')

        const maleMap   = buildYearMap(maleRows)
        const femaleMap = buildYearMap(femaleRows)
        const allYears  = [
            ...new Set([
                ...Object.keys(maleMap).map(Number),
                ...Object.keys(femaleMap).map(Number),
            ]),
        ].sort()

        // Male
        if (maleRows.length) {
            const yrs = allYears.filter(yr => maleMap[yr])
            result.push({
                x: yrs,
                y: yrs.map(yr =>
                    weightedAvg(maleMap[yr].scores, maleMap[yr].counts)),
                mode: 'lines+markers',
                name: isST ? 'State — Male' : name,
                legendgroup: isST ? '__state_male__' : name,
                showlegend: true,
                line  : { color, width: isST ? 3 : 1.5, dash: 'solid' },
                marker: { size: isST ? 9 : 5, color, symbol: 'circle' },
                opacity: 0.9,
                hovertemplate: `<b>${name}</b><br>Gender: Male<br>Year: %{x}<br>Score: %{y:.1f}<extra></extra>`,
            })
        }

        // Female
        if (femaleRows.length) {
            const yrs = allYears.filter(yr => femaleMap[yr])
            result.push({
                x: yrs,
                y: yrs.map(yr =>
                    weightedAvg(femaleMap[yr].scores, femaleMap[yr].counts)),
                mode: 'lines+markers',
                name: isST ? 'State — Female' : name,
                legendgroup: isST ? '__state_female__' : name,
                showlegend: false,
                line  : { color, width: isST ? 3 : 1.5, dash: 'dot' },
                marker: { size: isST ? 9 : 5, color, symbol: 'diamond' },
                opacity: 0.9,
                hovertemplate: `<b>${name}</b><br>Gender: Female<br>Year: %{x}<br>Score: %{y:.1f}<extra></extra>`,
            })
        }

        // Combined weighted average
        if (maleRows.length && femaleRows.length) {
            const yrs = allYears.filter(yr => maleMap[yr] && femaleMap[yr])
            result.push({
                x: yrs,
                y: yrs.map(yr =>
                    weightedAvg(
                        [...maleMap[yr].scores, ...femaleMap[yr].scores],
                        [...maleMap[yr].counts, ...femaleMap[yr].counts],
                    )),
                mode: 'lines+markers',
                name: isST ? 'State — M+F Combined' : name,
                legendgroup: isST ? '__state_combined__' : name,
                showlegend: false,
                line  : { color, width: isST ? 3 : 2, dash: 'dashdot' },
                marker: { size: isST ? 9 : 5, color, symbol: 'square' },
                opacity: 0.6,
                hovertemplate: `<b>${name}</b><br>M+F Weighted Avg<br>Year: %{x}<br>Score: %{y:.1f}<extra></extra>`,
            })
        }
    })

    return result
}