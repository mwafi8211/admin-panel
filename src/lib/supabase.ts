import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zwvzzzqmnjqubaijylsf.supabase.co';
const supabaseKey = 'sb_publishable_cf_qdPXnbycfTubord-gmw_ljs7wbMy';

export const supabase = createClient(supabaseUrl, supabaseKey);