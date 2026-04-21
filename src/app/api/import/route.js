import pool from '@/lib/db';
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
          await pool.query(
            `INSERT INTO frl (level, school_year, county_id, district_id, school_id, agency_name, pct_frl)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              row.level,
              row.school_year,
              Math.floor(parseFloat(row.county_id)) || 0, // Converts "0.0" to 0
              Math.floor(parseFloat(row.district_id)) || 0,
              Math.floor(parseFloat(row.school_id)) || 0,
              row.agency_name,
              parseFloat(row.pct_frl) || 0 // Converts "0.5043" to float
            ]
          );
        } catch (err) {
          console.error('Error inserting row:', err);
        }
      }
      console.log('Import finished!');
    });
    return NextResponse.json({ message: "Import started check console" });
}