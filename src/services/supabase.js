import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cwrvmuqspvlggevqqsak.supabase.co'

const supabaseKey = 'sb_publishable_gxaDbu2vfW008yXKez-2Fw_II7UEiXL'

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
)