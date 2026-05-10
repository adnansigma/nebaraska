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
 * Returns NaN if total count is zero (lets callers detect "no data").
 */
export function weightedAvg(scores: number[], counts: number[]): number {
    const total = counts.reduce((a, b) => a + b, 0)
    if (total === 0) return NaN
    return scores.reduce((a, s, i) => a + s * counts[i], 0) / total
}

/**
 * Builds a map of { year → { scores[], counts[] } } from an array of ScoreRows.
 * Skips rows where score or count is missing/invalid.
 * Used to aggregate multiple grade rows into a single weighted average per year.
 */
export function buildYearMap(
    rows: { school_year: string; avg_scale_score: string; count_tested: string }[]
): Record<number, { scores: number[]; counts: number[] }> {
    const m: Record<number, { scores: number[]; counts: number[] }> = {}
    rows.forEach(r => {
        const score = parseFloat(r.avg_scale_score)
        const count = parseFloat(r.count_tested)

        // ✅ Skip rows where score or count is missing/invalid
        if (!isFinite(score) || score <= 0 || !isFinite(count) || count <= 0) return

        const yr = getYear(r.school_year)
        if (!m[yr]) m[yr] = { scores: [], counts: [] }
        m[yr].scores.push(score)
        m[yr].counts.push(count)
    })
    return m
}

/**
 * Same as buildYearMap but also tracks which grade labels contributed to each year.
 * Used to show "Grades available: 3, 5, 6" in the hover tooltip.
 */
export function buildYearMapWithGrades(
    rows: { school_year: string; avg_scale_score: string; count_tested: string; grade: string }[]
): Record<number, { scores: number[]; counts: number[]; grades: string[] }> {
    const m: Record<number, { scores: number[]; counts: number[]; grades: string[] }> = {}
    rows.forEach(r => {
        const score = parseFloat(r.avg_scale_score)
        const count = parseFloat(r.count_tested)

        // ✅ Skip rows where score or count is missing/invalid
        if (!isFinite(score) || score <= 0 || !isFinite(count) || count <= 0) return

        const yr = getYear(r.school_year)
        if (!m[yr]) m[yr] = { scores: [], counts: [], grades: [] }
        m[yr].scores.push(score)
        m[yr].counts.push(count)

        // Track grade label e.g. "03" → "3"
        const gradeLabel = `Grade ${parseInt(r.grade)}`
        if (!m[yr].grades.includes(gradeLabel)) {
            m[yr].grades.push(gradeLabel)
        }
    })
    return m
}