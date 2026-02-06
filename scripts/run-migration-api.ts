/**
 * Run migration via Supabase Management API
 */

import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrlEnv = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKeyEnv = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrlEnv || !supabaseServiceKeyEnv) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabaseUrl: string = supabaseUrlEnv
const supabaseServiceKey: string = supabaseServiceKeyEnv

// Extract project ref from URL (e.g., https://xxx.supabase.co -> xxx)
const projectRef = supabaseUrl.replace('https://', '').split('.')[0]

async function runMigration() {
  const migrationPath = path.join(__dirname, '../supabase/migrations/20260128_create_favorite_spots.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')

  console.log(`Project ref: ${projectRef}`)
  console.log('Running migration via REST API...')

  // Use the database REST endpoint with service role key
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({
      // This won't work - Supabase doesn't expose raw SQL via REST
    }),
  })

  // Alternative: Try using pg directly if we can construct connection string
  // Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

  console.log('\n⚠️  Direct SQL execution requires one of:')
  console.log('   1. Supabase Dashboard SQL Editor')
  console.log('   2. Database password for psql connection')
  console.log('   3. Supabase CLI linked to project (supabase link)')
  console.log('')
  console.log('📋 Migration SQL:')
  console.log('─'.repeat(60))
  console.log(sql)
  console.log('─'.repeat(60))
  console.log('')
  console.log('Copy the SQL above and run it in your Supabase Dashboard:')
  console.log(`${supabaseUrl.replace('.supabase.co', '.supabase.co')}/project/${projectRef}/sql/new`)
}

runMigration().catch(console.error)
