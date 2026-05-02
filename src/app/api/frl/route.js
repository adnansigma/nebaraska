import pool from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const result = await pool.query(`
            SELECT
                agency_name,
                school_year,
                pct_frl,
                count_frl,
                level,
                district_id,
                county_id
            FROM frl_scores
            WHERE level IN ('DI', 'SC')
            ORDER BY level, agency_name, school_year
        `)

        return NextResponse.json({ frl: result.rows })

    } catch (error) {
        console.error('FRL DB Error:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}