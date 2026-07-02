import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
)

export default supabase

const PAGE_SIZE = 1000
const CONCURRENCY = 12

async function fetchPage(table, select, from, applyFilters) {
    let query = supabase
        .from(table)
        .select(select)
        .range(from, from + PAGE_SIZE - 1)

    if (applyFilters) {
        query = applyFilters(query)
    }

    const { data, error } = await query
    if (error) throw error
    return data ?? []
}

export async function fetchAllRows(table, select, applyFilters) {
    let countQuery = supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

    if (applyFilters) {
        countQuery = applyFilters(countQuery)
    }

    const { count, error: countError } = await countQuery
    if (countError) throw countError
    if (!count) return []

    const pages = Math.ceil(count / PAGE_SIZE)
    const rows = new Array(count)
    let writeIndex = 0

    for (let start = 0; start < pages; start += CONCURRENCY) {
        const batch = Array.from(
            { length: Math.min(CONCURRENCY, pages - start) },
            (_, i) => start + i
        )

        const results = await Promise.all(
            batch.map(page => fetchPage(table, select, page * PAGE_SIZE, applyFilters))
        )

        for (const pageRows of results) {
            for (const row of pageRows) {
                rows[writeIndex++] = row
            }
        }
    }

    return rows.slice(0, writeIndex)
}

export function districtKey(countyId, districtId) {
    return `${countyId}:${districtId}`
}

export async function fetchDistrictLookup(table) {
    const rows = await fetchAllRows(
        table,
        'county_id, district_id, agency_name',
        q => q.eq('level', 'DI')
    )

    const lookup = new Map()

    for (const row of rows) {
        lookup.set(districtKey(row.county_id, row.district_id), row.agency_name)
    }

    return lookup
}

export function applyScoreFilters(query) {
    return query
        .in('level', ['DI', 'ST', 'SC'])
        .neq('grade', 'ALL')
        .in('subgroup_type', ['ALL', 'GENDER'])
}

export function sortScoreRows(rows) {
    return rows.sort((a, b) => {
        const byName = (a.agency_name ?? '').localeCompare(b.agency_name ?? '')
        if (byName !== 0) return byName
        const byYear = (a.school_year ?? '').localeCompare(b.school_year ?? '')
        if (byYear !== 0) return byYear
        return (a.grade ?? '').localeCompare(b.grade ?? '')
    })
}

export function enrichScoreRows(rows, districtLookup) {
    return rows.map(row => ({
        agency_name    : row.agency_name,
        school_year    : row.school_year,
        avg_scale_score: row.avg_scale_score,
        count_tested   : row.count_tested,
        subgroup_type  : row.subgroup_type,
        subgroup_desc  : row.subgroup_desc,
        grade          : row.grade,
        level          : row.level,
        county_id      : row.county_id,
        district_id    : row.district_id,
        district_name  : row.level === 'SC'
            ? districtLookup.get(districtKey(row.county_id, row.district_id)) ?? null
            : null,
    }))
}
