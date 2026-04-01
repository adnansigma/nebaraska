// ── Chart Utilities ───────────────────────────────────────────────────────────

/**
 * Extracts the end year from a school year string.
 * e.g. "2017-18" → 2018, "2022-23" → 2023
 */
export function getYear(schoolYear: string): number {
    return parseInt(schoolYear.split('-')[1])
}

/**
 * Computes a count-weighted average of scores.
 * Returns 0 if total count is zero.
 */
export function weightedAvg(scores: number[], counts: number[]): number {
    const total = counts.reduce((a, b) => a + b, 0)
    if (total === 0) return 0
    return scores.reduce((a, s, i) => a + s * counts[i], 0) / total
}

/**
 * Builds a map of { year → { scores[], counts[] } } from an array of ScoreRows.
 * Used to aggregate multiple grade rows into a single weighted average per year.
 */
export function buildYearMap(
    rows: { school_year: string; avg_scale_score: string; count_tested: string }[]
): Record<number, { scores: number[]; counts: number[] }> {
    const m: Record<number, { scores: number[]; counts: number[] }> = {}
    rows.forEach(r => {
        const yr = getYear(r.school_year)
        if (!m[yr]) m[yr] = { scores: [], counts: [] }
        m[yr].scores.push(parseFloat(r.avg_scale_score))
        m[yr].counts.push(parseFloat(r.count_tested) || 1)
    })
    return m
}