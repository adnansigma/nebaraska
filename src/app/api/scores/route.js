import {
    applyScoreFilters,
    enrichScoreRows,
    fetchAllRows,
    fetchDistrictLookup,
    sortScoreRows,
} from '@/lib/db'
import { NextResponse } from 'next/server'

const SCORE_COLUMNS =
    'agency_name, school_year, avg_scale_score, count_tested, subgroup_type, subgroup_desc, grade, level, county_id, district_id'

export async function GET() {
    try {
        const [mathRows, engRows, mathDistricts, engDistricts] = await Promise.all([
            fetchAllRows('math_scores', SCORE_COLUMNS, applyScoreFilters),
            fetchAllRows('english_scores', SCORE_COLUMNS, applyScoreFilters),
            fetchDistrictLookup('math_scores'),
            fetchDistrictLookup('english_scores'),
        ])

        return NextResponse.json({
            math   : enrichScoreRows(sortScoreRows(mathRows), mathDistricts),
            english: enrichScoreRows(sortScoreRows(engRows), engDistricts),
        })

    } catch (error) {
        console.error('DB Error:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}
