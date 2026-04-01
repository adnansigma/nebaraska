// ── Types ─────────────────────────────────────────────────────────────────────
 
export interface ScoreRow {
    agency_name    : string
    school_year    : string
    avg_scale_score: string
    count_tested   : string
    subgroup_type  : string
    subgroup_desc  : string
    grade          : string
    level          : string
}
 
export interface AllData {
    math   : ScoreRow[]
    english: ScoreRow[]
}