/**
 * Run the favorite_spots migration
 * Usage: npx tsx scripts/run-favorite-spots-migration.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function runMigration() {
  const migrationPath = path.join(__dirname, '../supabase/migrations/20260128_create_favorite_spots.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')

  // Split SQL into individual statements (split on semicolons not inside quotes)
  const statements = sql
    .split(/;(?=(?:[^']*'[^']*')*[^']*$)/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`Running ${statements.length} SQL statements...`)

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    if (!stmt) continue

    // Use raw SQL execution via the REST API
    const { error } = await supabase.rpc('execute_sql', { query: stmt })

    if (error) {
      // If RPC doesn't exist, we need to use a different approach
      console.log(`Statement ${i + 1}: ${error.message}`)
      console.log('Note: Direct SQL execution requires the database execute_sql function or Supabase Dashboard')
    } else {
      console.log(`Statement ${i + 1}: OK`)
    }
  }

  // Alternative: Check if table exists after attempting migration
  const { data, error: checkError } = await supabase
    .from('favorite_spots')
    .select('id')
    .limit(1)

  if (checkError && checkError.code === '42P01') {
    console.log('\n❌ Table does not exist. Please run the migration manually:')
    console.log('   1. Go to Supabase Dashboard > SQL Editor')
    console.log('   2. Paste the contents of supabase/migrations/20260128_create_favorite_spots.sql')
    console.log('   3. Click "Run"')
  } else if (checkError) {
    console.log('\n⚠️  Error checking table:', checkError.message)
  } else {
    console.log('\n✅ Table favorite_spots exists and is accessible!')
  }
}

runMigration().catch(console.error)
