import pool from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const [mathResult, engResult] = await Promise.all([
            pool.query(`
                SELECT
                    s.agency_name,
                    s.school_year,
                    s.avg_scale_score,
                    s.count_tested,
                    s.subgroup_type,
                    s.subgroup_desc,
                    s.grade,
                    s.level,
                    s.county_id,
                    s.district_id,
                    d.agency_name AS district_name
                FROM math_scores s
                LEFT JOIN (
                    SELECT DISTINCT county_id, district_id, agency_name
                    FROM math_scores
                    WHERE level = 'DI'
                ) d ON s.county_id = d.county_id
                    AND s.district_id = d.district_id
                    AND s.level = 'SC'
                WHERE
                    s.level IN ('DI', 'ST', 'SC') AND
                    s.grade != 'ALL' AND
                    s.subgroup_type IN ('ALL', 'GENDER')
                ORDER BY s.agency_name, s.school_year, s.grade
            `),
            pool.query(`
                SELECT
                    s.agency_name,
                    s.school_year,
                    s.avg_scale_score,
                    s.count_tested,
                    s.subgroup_type,
                    s.subgroup_desc,
                    s.grade,
                    s.level,
                    s.county_id,
                    s.district_id,
                    d.agency_name AS district_name
                FROM english_scores s
                LEFT JOIN (
                    SELECT DISTINCT county_id, district_id, agency_name
                    FROM english_scores
                    WHERE level = 'DI'
                ) d ON s.county_id = d.county_id
                    AND s.district_id = d.district_id
                    AND s.level = 'SC'
                WHERE
                    s.level IN ('DI', 'ST', 'SC') AND
                    s.grade != 'ALL' AND
                    s.subgroup_type IN ('ALL', 'GENDER')
                ORDER BY s.agency_name, s.school_year, s.grade
            `)
        ])

        return NextResponse.json({
            math   : mathResult.rows,
            english: engResult.rows,
        })

    } catch (error) {
        console.error('DB Error:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}