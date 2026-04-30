import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file (Vite only exposes variables prefixed with VITE_).",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);