import { AllData, FrlRow } from '@/types'
import { COLORS }          from '@/lib/constants'

export interface FiltersResponse {
    districts        : string[]
    schoolsByDistrict: Record<string, string[]>
}

export interface DashboardBootstrap {
    allData          : AllData
    districts        : string[]
    schoolsByDistrict: Record<string, string[]>
    colorMap         : Record<string, string>
    frlData          : FrlRow[]
}

export async function fetchDashboardData(): Promise<DashboardBootstrap> {
    const [scores, filters, frlResp]: [AllData, FiltersResponse, { frl: FrlRow[] }] =
        await Promise.all([
            fetch('/api/scores').then(r => {
                if (!r.ok) throw new Error(`Scores API error: ${r.status}`)
                return r.json()
            }),
            fetch('/api/filters').then(r => {
                if (!r.ok) throw new Error(`Filters API error: ${r.status}`)
                return r.json()
            }),
            fetch('/api/frl').then(r => {
                if (!r.ok) throw new Error(`FRL API error: ${r.status}`)
                return r.json()
            }),
        ])

    const colorMap: Record<string, string> = {}

    filters.districts.forEach((d, i) => {
        colorMap[d] = COLORS[i % COLORS.length]
    })

    const allSchools = Object.values(filters.schoolsByDistrict).flat()
    allSchools.forEach((s, i) => {
        colorMap[s] = COLORS[(filters.districts.length + i) % COLORS.length]
    })

    return {
        allData          : scores,
        districts        : filters.districts,
        schoolsByDistrict: filters.schoolsByDistrict,
        colorMap,
        frlData          : frlResp.frl,
    }
}