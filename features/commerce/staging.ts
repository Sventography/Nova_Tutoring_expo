import { SUPABASE_URL } from "../../app/lib/supabase";

export const STAGING_CHECKOUT_CLOSED =
  SUPABASE_URL.trim().replace(/\/+$/, "") === "https://gouhhltupxaycuysdtrw.supabase.co";
