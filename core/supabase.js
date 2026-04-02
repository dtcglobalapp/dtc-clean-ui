// core/supabase.js

import { createClient } from "https://esm.sh/@supabase/supabase-js";

// 🔐 CONFIGURA ESTO CON TUS DATOS REALES
const SUPABASE_URL = "https://mugufzwvwteoopjdrheq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_npn2NhS9fEHAjWHGsbLTSQ_KudyqrFt";

// 🚀 CLIENTE GLOBAL
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);