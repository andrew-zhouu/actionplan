# ActionPlan MVP

## Purpose

ActionPlan turns confusing school, admissions, scholarship, housing, and administrative documents into clear, structured next steps. Users paste raw text; the app returns an analysis they can act on immediately.

## Target Users

Students and applicants dealing with admissions letters, scholarship offers, housing agreements, and school or administrative documents — people who need to understand what they must do, by when, and what could go wrong.

## Core Workflow

1. User pastes document text into the input area
2. User clicks "Analyze"
3. App calls `/api/analyze` with the text
4. API runs deterministic pre-processing (readability score, document classification, date extraction)
5. API calls the LLM layer with a structured prompt + pre-processed context
6. The model returns JSON matching the `AnalysisResult` schema
7. App validates the output with zod and renders the result

## Output Fields

| Field | Description |
|---|---|
| `summary` | Plain-English explanation of what this document is about |
| `actionItems` | Ordered list of things the user must do |
| `deadlines` | Important dates and what they trigger |
| `risks` | Gotchas, fine print, and things that could go wrong |
| `questionsToAsk` | Questions the user should ask the issuing party |
| `documentType` | Classified type (e.g. "Financial Aid Award Letter") |
| `readabilityScore` | Flesch-Kincaid grade level (deterministic) |
| `complexityLevel` | Derived label: Low / Medium / High |

## MVP Scope

**Must-have:**
- Single-page paste-and-analyze flow
- All 7 output fields rendered clearly
- Supports common admissions, scholarship, housing, and school/admin documents
- Error state if the model fails or text is too short

**Nice-to-have:**
- Copy-to-clipboard for individual sections
- Character/word count feedback on input
- Visual complexity indicator (color-coded badge)

**Later:**
- User accounts / auth
- Saving / history
- File upload (PDF, DOCX)
- Streaming responses
- Multi-document comparison
