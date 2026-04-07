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
    const { url } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are CodeNova Website Verifier — an expert website auditor by StackMind Technologies. When given a URL, provide a comprehensive analysis and improvement suggestions.

Analyze the following aspects and provide actionable recommendations:

## 🎨 DESIGN & UX
- Visual hierarchy and layout quality
- Color scheme and contrast
- Typography and readability
- Mobile responsiveness
- User experience flow

## ⚡ PERFORMANCE
- Page load speed factors
- Image optimization opportunities
- Code optimization suggestions
- Caching strategies

## 🔍 SEO
- Meta tags and descriptions
- Heading structure (H1, H2, etc.)
- URL structure
- Content optimization
- Schema markup opportunities

## ♿ ACCESSIBILITY
- WCAG compliance issues
- ARIA labels and roles
- Keyboard navigation
- Screen reader compatibility
- Color contrast ratios

## 🔒 SECURITY
- HTTPS usage
- Content Security Policy
- Common vulnerability patterns
- Data protection practices

## 📊 OVERALL SCORE
Rate each category out of 10 and provide an overall score.

## 🚀 TOP 5 QUICK WINS
List the 5 most impactful improvements the user can make immediately.

Be specific, actionable, and constructive. Reference the URL in your analysis.`;

    console.log(`[Website Verifier] Analyzing: ${url}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Please analyze this website and provide improvement suggestions: ${url}` },
        ],
        stream: true,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Failed to analyze website" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("verify-website error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
