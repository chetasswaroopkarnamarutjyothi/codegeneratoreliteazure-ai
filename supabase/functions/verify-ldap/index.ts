import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { secretCode } = await req.json();
    const LDAP_SECRET = Deno.env.get("LDAP_SECRET_CODE");

    if (!LDAP_SECRET) {
      console.error("LDAP_SECRET_CODE not configured");
      return new Response(
        JSON.stringify({ valid: false, error: "LDAP not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isValid = secretCode === LDAP_SECRET;

    return new Response(
      JSON.stringify({ valid: isValid }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("LDAP verification error:", error);
    return new Response(
      JSON.stringify({ valid: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
