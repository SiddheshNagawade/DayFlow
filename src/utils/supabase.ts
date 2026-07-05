import { createClient } from "@supabase/supabase-js";
import { Database } from "../types/database";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. App will fall back to local storage (Guest Mode).");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
