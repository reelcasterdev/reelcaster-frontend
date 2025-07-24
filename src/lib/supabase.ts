import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pehcvwiwtubzfgahuzuz.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlaGN2d2l3dHViemZnYWh1enV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyOTEzMjksImV4cCI6MjA2ODg2NzMyOX0.1BXQS068Ruo9F7CBz7Hb3_eXKx4hAOozLsFh6S9BJyU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)