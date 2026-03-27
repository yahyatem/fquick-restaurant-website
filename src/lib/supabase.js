import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Use real values if environment variables are missing or contain placeholders
const supabaseUrl = (!rawUrl || rawUrl.includes('placeholder')) 
  ? 'https://ksjzcpywoqumsbcfasrd.supabase.co' 
  : rawUrl;

const supabaseAnonKey = (!rawKey || rawKey.includes('placeholder')) 
  ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzanpjcHl3b3F1bXNiY2Zhc3JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1OTk3NDIsImV4cCI6MjA5MDE3NTc0Mn0.zwtItkxr_vkjZue-VRJFvhNvOdMspCmiG214_fw6OJs' 
  : rawKey;

console.log('Supabase URL initialized:', supabaseUrl);

if (!rawUrl || !rawKey || rawUrl.includes('placeholder') || rawKey.includes('placeholder')) {
  console.warn("Supabase environment variables are missing or contain placeholders. Using default real configuration.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
