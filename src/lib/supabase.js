import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ksjzcpywoqumsbcfasrd.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzanpjcHl3b3F1bXNiY2Zhc3JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1OTk3NDIsImV4cCI6MjA5MDE3NTc0Mn0.zwtItkxr_vkjZue-VRJFvhNvOdMspCmiG214_fw6OJs';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn("Supabase environment variables are missing. Using default configuration.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
