# ActionPlan Architecture

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Validation | zod |
| LLM Provider | Anthropic Claude (swappable via `lib/ai/`) |

## Folder Responsibilities

```
app/                               # Routes only — no business logic
  api/analyze/route.ts             # POST: orchestrates pipeline, returns AnalysisResult
  layout.tsx                       # App shell
  page.tsx                         # Thin: composes ActionPlanForm + AnalysisResults

components/
  feature/                         # Domain-specific UI components (stateful)
    action-plan-form.tsx           # Textarea + submit; calls /api/analyze
    analysis-results.tsx           # Renders all output sections
  ui/                              # Reusable primitives (shadcn/ui)

lib/
  ai/
    analyze-document.ts            # Calls model provider, parses and validates response
  analysis/
    readability.ts                 # Flesch-Kincaid score — pure, deterministic
    classify-document.ts           # Document type heuristics — pure, deterministic
    extract-dates.ts               # Date extraction helpers — pure, deterministic
  validations/
    analysis-schema.ts             # Zod schema for AnalysisResult
  utils/                           # Shared pure utilities (no AI, no UI coupling)

prompts/
  system.ts                        # System prompt — defines model role and output rules
  action-plan.ts                   # User prompt template — injects document + context

types/
  analysis.ts                      # Shared TypeScript types (inferred from zod schemas)
```

## End-to-End Data Flow

```
Browser
  └─ ActionPlanForm (client component)
       └─ POST /api/analyze  { text }
            │
            ├─ 1. readability(text)          → readabilityScore, complexityLevel
            ├─ 2. classifyDocument(text)     → documentType hint
            ├─ 3. extractDates(text)         → date strings for prompt context
            │
            ├─ 4. buildPrompt(context)       ← prompts/system.ts + prompts/action-plan.ts
            │
            └─ 5. analyzeDocument(prompt)    ← lib/ai/analyze-document.ts
                   └─ parseAndValidate()     ← lib/validations/analysis-schema.ts (zod)
                        └─ AnalysisResult JSON
  └─ AnalysisResults (client component)
       └─ renders summary, actionItems, deadlines, risks,
          questionsToAsk, documentType, readabilityScore, complexityLevel
```

## Analysis Pipeline (Step by Step)

1. **Readability** (`lib/analysis/readability.ts`) — runs first, no network cost.
   Computes Flesch-Kincaid grade level from syllable/word/sentence counts.
   Derives `complexityLevel` (Low / Medium / High) from the grade level.

2. **Classification** (`lib/analysis/classify-document.ts`) — keyword heuristics
   map the text to a document type label (e.g. "Scholarship Award Letter").
   Passed to the prompt as a hint so the model doesn't have to guess.

3. **Date extraction** (`lib/analysis/extract-dates.ts`) — regex-based extraction
   of date-like strings. Surfaced in the prompt context so the model can produce
   accurate deadline entries without hallucinating.

4. **Prompt construction** (`prompts/system.ts` + `prompts/action-plan.ts`) —
   `system.ts` defines the model's role and output format rules. `action-plan.ts`
   is the user-facing template that injects the document text and pre-processed
   context. All prompt strings live in `prompts/` — none exist elsewhere.

5. **Model call** (`lib/ai/analyze-document.ts`) — sends the assembled prompt to
   the configured provider. This is the only file that imports the AI SDK.
   Swapping providers means changing only this file.

6. **Validation** (`lib/validations/analysis-schema.ts`) — the raw model response
   is parsed as JSON and validated against the zod schema before any data reaches
   the route handler or the UI.

## Key Architecture Rules

- No prompt strings inside React components or API route handlers
- No model SDK imports outside `lib/ai/`
- AI output is always validated through zod before use
- Deterministic analysis runs before the model call (cheaper, faster, no latency)
- API route (`route.ts`) orchestrates but contains no logic — it delegates to `lib/`
- `page.tsx` contains no logic — layout and component composition only
