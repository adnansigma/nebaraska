import supabase from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const { data, error } = await supabase.rpc('api_get_filters')
        if (error) throw error

        const districts = data.districts ?? []
        const schoolsByDistrict = Object.fromEntries(
            districts.map(name => [name, []])
        )

        for (const row of data.school_pairs ?? []) {
            if (schoolsByDistrict[row.district_name] !== undefined) {
                schoolsByDistrict[row.district_name].push(row.school_name)
            }
        }

        return NextResponse.json({ districts, schoolsByDistrict })

    } catch (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}
