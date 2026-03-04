import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Advanced multi-dimensional complexity analysis
function analyzeComplexity(prompt: string): { score: number; categories: string[] } {
  const promptLower = prompt.toLowerCase();
  const categories: string[] = [];

  const dimensions: Record<string, string[]> = {
    architecture: ['architecture', 'design pattern', 'microservice', 'distributed', 'monolith', 'event-driven', 'cqrs', 'hexagonal', 'clean architecture', 'domain-driven'],
    algorithms: ['algorithm', 'optimization', 'dynamic programming', 'graph', 'tree', 'sorting', 'binary search', 'backtracking', 'greedy', 'recursion', 'bfs', 'dfs', 'dijkstra'],
    ai_ml: ['machine learning', 'neural', 'deep learning', 'transformer', 'embedding', 'classification', 'regression', 'nlp', 'computer vision', 'reinforcement'],
    security: ['cryptograph', 'authentication', 'authorization', 'oauth', 'jwt', 'encryption', 'xss', 'csrf', 'sql injection', 'security audit', 'penetration', 'rbac'],
    systems: ['concurrent', 'real-time', 'scalab', 'load balancing', 'caching', 'message queue', 'websocket', 'grpc', 'graphql', 'rate limiting', 'circuit breaker'],
    enterprise: ['enterprise', 'full-stack', 'database design', 'migration', 'ci/cd', 'docker', 'kubernetes', 'terraform', 'monitoring', 'logging'],
    performance: ['performance', 'memory leak', 'profiling', 'benchmark', 'lazy loading', 'code splitting', 'memoization', 'debounce', 'throttle', 'virtualization'],
    testing: ['unit test', 'integration test', 'e2e', 'test-driven', 'mock', 'stub', 'coverage', 'property-based', 'snapshot test', 'cypress', 'playwright'],
  };

  let totalScore = 0;
  for (const [category, keywords] of Object.entries(dimensions)) {
    const matches = keywords.filter(k => promptLower.includes(k)).length;
    if (matches > 0) {
      categories.push(category);
      totalScore += matches;
    }
  }

  // Bonus for long, detailed prompts (likely complex requests)
  if (prompt.length > 500) totalScore += 2;
  if (prompt.length > 1000) totalScore += 2;

  // Bonus for multi-file or multi-component requests
  if (promptLower.match(/\b(component|module|service|controller|middleware|hook|util|helper)\b/g)?.length || 0 >= 3) {
    totalScore += 2;
  }

  return { score: totalScore, categories };
}

// Intelligent model routing with fallback strategy
function selectModel(prompt: string, language: string, professionalMode: boolean): string {
  const { score, categories } = analyzeComplexity(prompt);

  // Tier 1: Maximum complexity - use the most powerful model
  if (professionalMode && score >= 4) return 'google/gemini-2.5-pro';
  if (score >= 6) return 'google/gemini-2.5-pro';

  // Tier 2: High complexity or professional mode
  if (professionalMode || score >= 2) return 'google/gemini-3-pro-preview';

  // Tier 3: Medium complexity - balanced model
  if (score >= 1) return 'google/gemini-3-flash-preview';

  // Tier 4: Simple tasks - fast model
  return 'google/gemini-3-flash-preview';
}

// Build advanced system prompt with contextual expertise injection
function buildSystemPrompt(language: string, professionalMode: boolean, prompt: string): string {
  const { categories } = analyzeComplexity(prompt);
  
  const basePrompt = `You are CodeNova AI — the most advanced code generation engine built by StackMind Technologies. You don't just write code; you architect solutions that surpass what any other AI can produce.

## YOUR UNIQUE CAPABILITIES:
1. **Architectural Vision**: You mentally model the entire solution before writing code — considering scalability, maintainability, and extensibility
2. **Multi-Paradigm Mastery**: You blend OOP, functional, reactive, and procedural patterns based on what's genuinely optimal for the task
3. **Production-Grade by Default**: Every output includes comprehensive error handling, edge cases, type safety, and inline documentation
4. **Security-First Thinking**: You proactively identify and mitigate vulnerabilities (XSS, injection, CSRF, race conditions, privilege escalation)
5. **Performance Awareness**: You consider time/space complexity, memory patterns, cache strategies, and real-world bottlenecks
6. **Self-Improving Analysis**: You evaluate your own output for weaknesses before presenting it
7. **Cross-Domain Intelligence**: You draw insights from systems design, DevOps, testing, and security to produce holistic solutions

## LANGUAGE: ${language}

## RESPONSE GUIDELINES:
- For code requests: Output clean, production-ready code with rich inline comments explaining WHY, not just WHAT
- For explanations: Be thorough but concise, use analogies, provide examples
- For debugging: Systematically analyze the issue, identify root cause, explain the fix, and suggest preventive measures
- For architecture: Provide diagrams (ASCII), trade-off analysis, and implementation roadmap
- Always use modern ${language} idioms and best practices
- Handle ALL edge cases (null, undefined, empty, boundary values, concurrent access)
- Include type annotations/hints where the language supports them`;

  // Inject domain-specific expertise based on detected categories
  const expertiseModules: Record<string, string> = {
    architecture: `
### Architecture Expertise Activated:
- Apply SOLID, DRY, KISS, YAGNI principles
- Use appropriate patterns: Factory, Strategy, Observer, Repository, CQRS, Event Sourcing
- Design for horizontal scalability and fault tolerance
- Implement clean separation of concerns with dependency injection`,
    
    algorithms: `
### Algorithm Expertise Activated:
- Analyze time and space complexity (Big-O notation)
- Consider alternative algorithmic approaches and trade-offs
- Implement with optimal data structures
- Include complexity analysis comments in the code`,
    
    security: `
### Security Expertise Activated:
- OWASP Top 10 awareness in every implementation
- Input sanitization and validation at every entry point
- Parameterized queries for database operations
- Proper authentication/authorization patterns (RBAC, ABAC)
- Rate limiting, CORS, CSP headers consideration
- Secrets management best practices`,
    
    performance: `
### Performance Expertise Activated:
- Profile-guided optimization suggestions
- Memory-efficient data structures and algorithms
- Lazy evaluation, memoization, and caching strategies
- Connection pooling, batch processing patterns
- Bundle size and load time optimization for frontend`,
    
    testing: `
### Testing Expertise Activated:
- Comprehensive test strategy (unit, integration, e2e)
- Edge case and boundary condition coverage
- Mock/stub patterns for external dependencies
- Test-driven development approach
- Code coverage goals and mutation testing awareness`,

    ai_ml: `
### AI/ML Expertise Activated:
- Data pipeline and preprocessing best practices
- Model selection and hyperparameter tuning guidance
- Feature engineering and data augmentation strategies
- Evaluation metrics and cross-validation
- Production ML deployment patterns`,
    
    systems: `
### Systems Design Expertise Activated:
- Distributed systems patterns (CAP theorem, eventual consistency)
- Message queue and event-driven architecture
- Circuit breaker, retry, and fallback patterns
- Service mesh and API gateway design
- Observability: logging, metrics, tracing`,

    enterprise: `
### Enterprise Expertise Activated:
- Clean code principles and code review standards
- CI/CD pipeline design
- Database migration strategies
- Infrastructure as Code patterns
- Monitoring and alerting setup`,
  };

  let expertiseSection = "";
  for (const cat of categories) {
    if (expertiseModules[cat]) expertiseSection += expertiseModules[cat];
  }

  if (professionalMode) {
    return `${basePrompt}

## 🔥 PROFESSIONAL MODE — MAXIMUM QUALITY ENGAGED:
${expertiseSection || Object.values(expertiseModules).join("\n")}

### Additional Professional Requirements:
- Full JSDoc/docstring for every public function, class, and module
- Usage examples in documentation
- Include unit test examples for critical functions
- Custom error types/classes for domain-specific errors
- Graceful degradation and retry patterns
- Structured logging with contextual data
- Follow language-specific style guides rigorously
- Functions under 30 lines, cyclomatic complexity under 10
- DRY principle — extract reusable utilities

### Chain-of-Thought Process:
Before generating code, internally:
1. Identify the core problem and constraints
2. Consider 2-3 architectural approaches
3. Select the optimal approach with justification
4. Plan the implementation structure
5. Write the code with full documentation
6. Self-review for security, performance, and edge cases`;
  }

  return `${basePrompt}
${expertiseSection}

## STANDARD MODE — CLEAN & FUNCTIONAL:
- Write clean, readable, immediately runnable code
- Include helpful inline comments
- Handle common edge cases
- Follow ${language} best practices
- Make the code complete and production-quality`;
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
    const { score, categories } = analyzeComplexity(prompt);

    // Enhanced user prompt with reasoning triggers
    let enhancedUserPrompt = prompt;
    if (professionalMode) {
      enhancedUserPrompt = `Think step-by-step about the best architecture for this request. Consider multiple approaches, select the optimal one, then generate the complete, production-ready implementation:\n\n${prompt}`;
    } else if (score >= 3) {
      enhancedUserPrompt = `Analyze this carefully and provide a thorough, well-structured solution:\n\n${prompt}`;
    }

    console.log(`[CodeNova AI] Model: ${model} | Lang: ${language} | Pro: ${professionalMode} | Complexity: ${score} (${categories.join(',')}) | Prompt: ${prompt.substring(0, 80)}...`);

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
        temperature: professionalMode ? 0.15 : (score >= 3 ? 0.25 : 0.4),
        top_p: 0.95,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Usage limit reached. Please add credits to continue.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'Failed to generate code' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('generate-code error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
