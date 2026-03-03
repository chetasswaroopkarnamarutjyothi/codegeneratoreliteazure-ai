import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Advanced model routing based on task complexity
function selectModel(prompt: string, language: string, professionalMode: boolean): string {
  const complexityIndicators = [
    'architecture', 'design pattern', 'microservice', 'distributed', 'algorithm',
    'optimization', 'machine learning', 'neural', 'cryptograph', 'concurrent',
    'real-time', 'scalab', 'enterprise', 'full-stack', 'database design',
    'security audit', 'performance', 'system design', 'api gateway', 'oauth',
  ];
  
  const promptLower = prompt.toLowerCase();
  const complexityScore = complexityIndicators.filter(i => promptLower.includes(i)).length;
  
  // Use the most powerful model for complex professional tasks
  if (professionalMode && complexityScore >= 2) {
    return 'google/gemini-2.5-pro';
  }
  // Use strong model for professional mode or complex prompts
  if (professionalMode || complexityScore >= 1) {
    return 'google/gemini-3-pro-preview';
  }
  // Default: fast and capable
  return 'google/gemini-3-flash-preview';
}

// Advanced system prompt with chain-of-thought reasoning
function buildSystemPrompt(language: string, professionalMode: boolean, prompt: string): string {
  const basePrompt = `You are CodeNova AI — an elite-tier code generation engine that surpasses conventional AI assistants. You don't just write code; you architect solutions.

## YOUR CORE ADVANTAGES OVER OTHER AI TOOLS:
1. **Deep Contextual Analysis**: Before writing a single line, you mentally model the entire solution architecture
2. **Multi-Paradigm Mastery**: You seamlessly blend OOP, functional, reactive, and procedural patterns based on what's optimal
3. **Production-Grade by Default**: Every output includes error handling, edge cases, type safety, and documentation
4. **Security-First Thinking**: You proactively identify and mitigate vulnerabilities (XSS, injection, CSRF, race conditions)
5. **Performance Awareness**: You consider time/space complexity, memory allocation patterns, and scalability

## LANGUAGE: ${language}

## OUTPUT RULES:
- Output ONLY the code. No explanations before or after the code block
- Include rich inline comments explaining WHY, not just WHAT
- Use modern ${language} idioms and best practices
- Handle ALL edge cases (null, undefined, empty, boundary values, concurrent access)
- Include type annotations/hints where the language supports them`;

  if (professionalMode) {
    return `${basePrompt}

## 🔥 PROFESSIONAL MODE — MAXIMUM QUALITY ENGAGED:

### Architecture Requirements:
- Apply SOLID principles rigorously
- Use appropriate design patterns (Factory, Strategy, Observer, Repository, etc.)
- Implement clean separation of concerns
- Create extensible, maintainable code structures

### Documentation Requirements:
- Full JSDoc/docstring for every public function, class, and module
- Inline comments for complex logic blocks
- Usage examples in documentation
- Parameter validation descriptions
- Return type documentation with edge case notes

### Testing Requirements:
- Include comprehensive unit test examples
- Cover edge cases, error paths, and boundary conditions
- Add integration test suggestions as comments
- Include performance benchmark suggestions

### Security Requirements:
- Input sanitization and validation at every entry point
- Parameterized queries for any database operations
- Proper authentication/authorization patterns
- OWASP Top 10 awareness in implementation
- Rate limiting and abuse prevention patterns

### Performance Requirements:
- Optimize hot paths and critical sections
- Use appropriate data structures (HashMap vs Array, Set vs List, etc.)
- Implement lazy loading/evaluation where beneficial
- Consider memory footprint and garbage collection pressure
- Add caching strategies where appropriate

### Error Handling:
- Custom error types/classes for domain-specific errors
- Graceful degradation patterns
- Retry logic with exponential backoff for network operations
- Comprehensive logging with structured data
- User-friendly error messages separate from debug info

### Code Quality:
- Follow language-specific style guides (PEP 8, Google Style, etc.)
- Use meaningful variable and function names (no single letters except loop indices)
- Keep functions under 30 lines where possible
- Cyclomatic complexity under 10 per function
- DRY principle — extract reusable utilities`;
  }

  return `${basePrompt}

## STANDARD MODE — CLEAN & FUNCTIONAL:
- Write clean, readable code
- Include helpful comments
- Handle common edge cases
- Follow ${language} best practices
- Make the code complete and immediately runnable`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, language, professionalMode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const model = selectModel(prompt, language, professionalMode);
    const systemPrompt = buildSystemPrompt(language, professionalMode, prompt);

    // Enhanced user prompt with chain-of-thought trigger
    const enhancedUserPrompt = professionalMode
      ? `Think step-by-step about the best architecture for this request, then generate the complete implementation:\n\n${prompt}`
      : prompt;

    console.log(`[CodeNova AI] Model: ${model} | Lang: ${language} | Pro: ${professionalMode} | Prompt: ${prompt.substring(0, 80)}...`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: enhancedUserPrompt },
        ],
        stream: true,
        temperature: professionalMode ? 0.2 : 0.4, // Lower temperature = more precise
        top_p: 0.95,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Usage limit reached. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'Failed to generate code' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('generate-code error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
