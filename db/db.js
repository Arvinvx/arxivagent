import { createClient } from '@supabase/supabase-js'
import 'dotenv/config';


const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY


// Initialize the client once and reuse it globally
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)