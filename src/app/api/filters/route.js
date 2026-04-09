import pool from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const [districtsResult, schoolsResult] = await Promise.all([
            // Get all distinct district names
            pool.query(`
                SELECT DISTINCT agency_name
                FROM math_scores
                WHERE level = 'DI'
                ORDER BY agency_name
            `),
            // For each school (SC), find what district name (DI) shares
            // the same county_id AND district_id.
            // Use a subquery to get one district name per county+district combo.
            pool.query(`
                SELECT DISTINCT
                    sc.agency_name AS school_name,
                    di.agency_name AS district_name
                FROM math_scores sc
                JOIN (
                    SELECT DISTINCT county_id, district_id, agency_name
                    FROM math_scores
                    WHERE level = 'DI'
                ) di
                    ON sc.county_id = di.county_id
                    AND sc.district_id = di.district_id
                WHERE sc.level = 'SC'
                ORDER BY di.agency_name, sc.agency_name
            `)
        ])

        // Build { districtName: [schoolName, ...] }
        const schoolsByDistrict = {}

        // Initialize all districts with empty arrays
        for (const row of districtsResult.rows) {
            schoolsByDistrict[row.agency_name] = []
        }

        // Populate schools — already deduplicated by DISTINCT
        for (const row of schoolsResult.rows) {
            if (schoolsByDistrict[row.district_name] !== undefined) {
                schoolsByDistrict[row.district_name].push(row.school_name)
            }
        }

        return NextResponse.json({
            districts: districtsResult.rows.map(r => r.agency_name),
            schoolsByDistrict,
        })

    } catch (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}