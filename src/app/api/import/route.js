import supabase from '@/lib/db';
import fs from 'fs';
import csv from 'csv-parser';
import { NextResponse } from 'next/server';

export async function GET() {
    const results = [];

  fs.createReadStream('D:/clean/frl.csv')
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      console.log('CSV file successfully processed. Starting database upload...');

      for (const row of results) {
        try {
          await supabase.from('frl_scores').insert({
            level: row.level,
            school_year: row.school_year,
            county_id: Math.floor(parseFloat(row.county_id)) || 0,
            district_id: Math.floor(parseFloat(row.district_id)) || 0,
            school_id: Math.floor(parseFloat(row.school_id)) || 0,
            agency_name: row.agency_name,
            pct_frl: parseFloat(row.pct_frl) || 0,
          });
        } catch (err) {
          console.error('Error inserting row:', err);
        }
      }
      console.log('Import finished!');
    });
    return NextResponse.json({ message: "Import started check console" });
}
