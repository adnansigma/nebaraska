// ── Score Service ─────────────────────────────────────────────────────────────
// All API calls are centralised here. If endpoints or base URLs change,
// this is the only file that needs updating.

import { AllData } from '@/types'
import { COLORS } from '@/lib/constants'

export interface FiltersResponse {
    districts: string[]
}

export interface DashboardBootstrap {
    allData  : AllData
    districts: string[]
    colorMap : Record<string, string>
}

/**
 * Fetches scores and filters in parallel, then builds the color map.
 * Throws on any network or JSON error so the caller can surface it.
 */
export async function fetchDashboardData(): Promise<DashboardBootstrap> {
    const [scores, filters]: [AllData, FiltersResponse] = await Promise.all([
        fetch('/api/scores').then(r => {
            if (!r.ok) throw new Error(`Scores API error: ${r.status}`)
            return r.json()
        }),
        fetch('/api/filters').then(r => {
            if (!r.ok) throw new Error(`Filters API error: ${r.status}`)
            return r.json()
        }),
    ])

    const colorMap: Record<string, string> = {}
    filters.districts.forEach((d, i) => {
        colorMap[d] = COLORS[i % COLORS.length]
    })

    return {
        allData  : scores,
        districts: filters.districts,
        colorMap,
    }
}