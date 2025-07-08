import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://tmmzsynqzqktzdpszdfb.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variable
if (!supabaseKey) {
  throw new Error(
    "Supabase key is missing. Please check your .env file and ensure VITE_SUPABASE_ANON_KEY is set."
  );
}

// Create Supabase client with optimized auth settings
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true, // Keep local cached sessions
    autoRefreshToken: true, // Refresh tokens automatically
    detectSessionInUrl: false, // Avoid resetting states from URL
  },
  realtime: {
    heartbeatIntervalMs: 30000, // Moderate interval for stability
  },
});

// Add debug listeners
supabase
  .channel("auth-debug")
  .on("postgres_changes", { event: "*" }, (payload) => {
    console.debug("[Supabase Realtime Event]", payload);
  })
  .subscribe();

// Session state change listener
supabase.auth.onAuthStateChange((event, session) => {
  console.log(`[Auth State Change] ${event}`, {
    user: session?.user?.id || "none",
    expiresAt: session?.expires_at
      ? new Date(session.expires_at * 1000).toISOString()
      : "null",
  });
});

// Custom method to handle token refresh
supabase.refreshSession = async () => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Session refresh failed:", error);
    await supabase.auth.signOut();
    return null;
  }
};

// Error handling wrapper
supabase.safeQuery = async (query) => {
  try {
    const { data, error } = await query;
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Database error:", error);
    return { data: null, error };
  }
};

export default supabase;
