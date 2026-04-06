import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ueodvjtmobvqzrqtmxcv.supabase.co';
const supabaseAnonKey = 'sb_publishable_i4UO_ewVpWljhVi4nSvFAQ_rTl5s_JC';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
