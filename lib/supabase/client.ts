import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Export a constant to check if we are using the placeholder
export const isPlaceholder = supabaseUrl.includes('placeholder')

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseKey)

