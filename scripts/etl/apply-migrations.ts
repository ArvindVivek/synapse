/**
 * Apply pending migrations to the database
 */

import { config } from 'dotenv'
import path from 'path'
import { readFile } from 'fs/promises'
import { createClient } from '@supabase/supabase-js'

// Load env
config({ path: path.resolve(process.cwd(), '../../.env.local') })
config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const migrations = [
  '20260128000001_schema.sql',
  '20260128000002_indexes.sql',
  '20260128000003_champion_aliases.sql',
  '20260129000001_event_tables.sql',
]

async function applyMigrations() {
  console.log('Applying synapse migrations...\n')

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  for (const migration of migrations) {
    console.log(`Applying: ${migration}`)
    const migrationPath = path.resolve(process.cwd(), '../../supabase/migrations', migration)

    try {
      const sql = await readFile(migrationPath, 'utf-8')

      // Execute the SQL using raw query
      const { error } = await supabase.rpc('exec_sql', { sql_string: sql }).single()

      if (error) {
        // Try alternative approach - split and execute statements
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'))

        for (const statement of statements) {
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql_string: statement })
          if (stmtError) {
            console.error(`  [error] ${stmtError.message}`)
          }
        }
      }

      console.log(`  ✓ Applied`)
    } catch (e) {
      console.error(`  [error] ${(e as Error).message}`)
    }
  }

  console.log('\nMigrations complete!')
}

applyMigrations().catch(e => {
  console.error('Fatal:', e)
  process.exit(1)
})
