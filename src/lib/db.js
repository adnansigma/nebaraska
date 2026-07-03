// import { Pool } from 'pg'

// const pool = new Pool({
//     connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING,
//     ssl: { rejectUnauthorized: false }
// })

// export default pool

import { Pool } from 'pg'

const pool = new Pool({
    host    : 'localhost',
    port    : 5432,
    database: 'nebaraska',       // your db name
    user    : 'postgres',           // your pgAdmin username
    password: 'alina_neb_098_123098', // your pgAdmin password
})

export default pool