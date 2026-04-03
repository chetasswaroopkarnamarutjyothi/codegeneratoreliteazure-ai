import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call the reset function
    const { error } = await supabase.rpc("reset_daily_credits_with_penalties");
    if (error) {
      console.error("Reset error:", error);
      throw error;
    }

    // Grant birthday credits
    const { error: birthdayError } = await supabase.rpc("grant_birthday_credits");
    if (birthdayError) console.error("Birthday credits error:", birthdayError);

    // Expire old birthday credits
    const { error: expireError } = await supabase.rpc("expire_birthday_credits");
    if (expireError) console.error("Expire birthday credits error:", expireError);

    // Check 6-month usage penalty
    const { error: penaltyError } = await supabase.rpc("check_half_year_usage_penalty");
    if (penaltyError) console.error("Half-year penalty error:", penaltyError);

    console.log("Daily credits reset + birthday + penalty check completed at:", new Date().toISOString());

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Daily credits reset completed",
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Reset daily credits error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
