import { createClient } from "@supabase/supabase-js";
import { Database } from "../types/database";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://placeholder-project-id.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-anon-key";

if (supabaseUrl.includes("placeholder-project-id") || supabaseAnonKey === "placeholder-anon-key") {
  console.warn("Supabase credentials missing. App will fall back to local storage (Guest Mode).");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
