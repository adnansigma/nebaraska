import supabase from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const { data, error } = await supabase.rpc('api_get_frl')
        if (error) throw error

        return NextResponse.json(data)

    } catch (error) {
        console.error('FRL DB Error:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}
