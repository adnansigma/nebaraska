import { Pool } from 'pg'

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING,
    ssl: { rejectUnauthorized: false }
})

export default pool