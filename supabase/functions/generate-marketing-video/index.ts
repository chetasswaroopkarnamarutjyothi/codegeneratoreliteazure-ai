import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = mode === 'promo'
      ? `You are a world-class marketing video producer and creative director for CodeNova AI by StackMind Technologies. Generate comprehensive promotional video concepts.

For each video concept, provide:
1. **VIDEO TITLE** — A catchy, memorable title
2. **TARGET AUDIENCE** — Who this video is for
3. **DURATION** — Recommended video length
4. **TONE & STYLE** — Visual and narrative tone

5. **SCENE-BY-SCENE BREAKDOWN:**
   For each scene (aim for 5-8 scenes):
   - Scene number and duration
   - Visual description (camera angle, setting, motion graphics)
   - On-screen text / titles
   - Voiceover narration (word-for-word script)
   - Background music mood
   - Transition to next scene

6. **CALL TO ACTION** — End-screen CTA
7. **MUSIC RECOMMENDATIONS** — Genre, tempo, mood suggestions
8. **BRAND ELEMENTS** — Where to place logo, colors (teal #00C9A7, purple #8B5CF6), and branding

Make it cinematic, modern, and compelling. CodeNova AI is the most advanced code generation platform.`
      : `You are an expert screenwriter and storyboard artist for tech marketing videos. Generate detailed video scripts with storyboard descriptions for CodeNova AI by StackMind Technologies.

Provide:
1. **TITLE PAGE** — Video title, subtitle, duration, format
2. **CREATIVE BRIEF** — Objective, audience, key message, tone

3. **FULL SCRIPT WITH STORYBOARD:**
   For each shot:
   - SHOT # / DURATION
   - FRAME TYPE: (Wide/Medium/Close-up/Aerial/Screen capture)
   - VISUAL: Detailed description of what's on screen
   - ACTION: Character/element movements
   - DIALOGUE/VO: Exact words spoken
   - LOWER THIRDS / TEXT OVERLAYS
   - SFX: Sound effects
   - MUSIC: Music cues and transitions
   - NOTES: Production notes

4. **POST-PRODUCTION NOTES** — Color grading, effects, animation style
5. **DISTRIBUTION STRATEGY** — Platforms, formats, hashtags

Brand colors: Teal (#00C9A7), Purple (#8B5CF6). Modern, tech-forward aesthetic.`;

    console.log(`[Marketing Studio] Mode: ${mode} | Prompt: ${prompt.substring(0, 80)}...`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        stream: true,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Usage limit reached.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'Failed to generate content' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('generate-marketing-video error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
