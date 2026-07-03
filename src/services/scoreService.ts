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

// Module-level cache. Survives as long as the page isn't fully reloaded,
// which covers tab switches, component remounts, navigation, etc.
let cachedData: DashboardBootstrap | null = null
let inFlightRequest: Promise<DashboardBootstrap> | null = null

const CACHE_KEY = 'dashboard-bootstrap-v1'
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes, tweak as needed

function readSessionCache(): DashboardBootstrap | null {
    try {
        const raw = sessionStorage.getItem(CACHE_KEY)
        if (!raw) return null

        const { data, savedAt } = JSON.parse(raw)
        if (Date.now() - savedAt > CACHE_TTL_MS) {
            sessionStorage.removeItem(CACHE_KEY)
            return null
        }
        return data as DashboardBootstrap
    } catch {
        return null
    }
}

function writeSessionCache(data: DashboardBootstrap) {
    try {
        sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ data, savedAt: Date.now() })
        )
    } catch {
        // sessionStorage can fail (quota, private mode, etc) - just skip caching
    }
}

async function loadDashboardData(): Promise<DashboardBootstrap> {
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

export async function fetchDashboardData(opts?: { force?: boolean }): Promise<DashboardBootstrap> {
    const force = opts?.force ?? false

    if (!force) {
        // 1. In-memory cache (fastest, survives tab switches in the same session)
        if (cachedData) return cachedData

        // 2. An identical request already in flight - reuse it instead of firing another
        if (inFlightRequest) return inFlightRequest

        // 3. sessionStorage cache (survives full page reloads within the tab)
        const fromSession = readSessionCache()
        if (fromSession) {
            cachedData = fromSession
            return fromSession
        }
    }

    inFlightRequest = loadDashboardData()
        .then(data => {
            cachedData = data
            writeSessionCache(data)
            return data
        })
        .finally(() => {
            inFlightRequest = null
        })

    return inFlightRequest
}

// Call this if you add a "Refresh data" button, or after the CSV import job finishes
export function invalidateDashboardCache() {
    cachedData = null
    try {
        sessionStorage.removeItem(CACHE_KEY)
    } catch {
        // ignore
    }
}