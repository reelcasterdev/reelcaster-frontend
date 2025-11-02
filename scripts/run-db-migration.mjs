#!/usr/bin/env node
/**
 * Direct SQL execution via Supabase REST API
 * Runs the migration to drop approval tables
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in .env.local')
  process.exit(1)
}

// Read migration file
const migrationPath = join(__dirname, '../supabase/migrations/20251102_drop_approval_tables.sql')
const sql = readFileSync(migrationPath, 'utf8')

console.log('🎣 Running Migration: Drop Approval Tables')
console.log('==========================================\n')

// Extract project ref from URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]

if (!projectRef) {
  console.error('❌ Could not extract project ref from SUPABASE_URL')
  process.exit(1)
}

// Use Supabase Management API to run SQL
const managementApiUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`

console.log('Executing SQL statements...\n')

try {
  const response = await fetch(managementApiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API request failed: ${response.status} - ${error}`)
  }

  const result = await response.json()

  console.log('✅ Migration executed successfully!')
  console.log('\nResult:', result)
  console.log('\n==========================================')
  console.log('✅ Approval tables have been dropped!')
  console.log('\nVerify in Supabase Dashboard:')
  console.log(`https://app.supabase.com/project/${projectRef}/editor`)

} catch (error) {
  console.error('❌ Error executing migration:', error.message)
  console.log('\n📝 Fallback: Run this SQL manually in Supabase Dashboard:')
  console.log(`https://app.supabase.com/project/${projectRef}/sql/new\n`)
  console.log(sql)
  process.exit(1)
}
