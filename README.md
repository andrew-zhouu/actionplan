# ActionPlan

Turn confusing school and administrative documents into clear next steps.

## Problem

Students and applicants regularly receive dense, jargon-heavy documents such as scholarship letters, housing leases, and financial aid notices with no easy way to figure out what they actually need to do, by when, and what the risks are. Missing something buried in fine print can have real consequences.

## What It Does

ActionPlan takes pasted document text and returns a structured breakdown:

- Plain-English summary
- Ordered action items
- Deadlines with descriptions
- Risks and fine print worth flagging
- Questions worth asking the issuing party
- Document type classification
- Readability score (Flesch-Kincaid grade level with a plain-English label)

This is a focused MVP. It handles one document at a time, from a text paste.

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| AI | Anthropic Claude (`claude-sonnet-4-6`) |
| Validation | Zod v4 |

## Local Setup

Clone the repo and install dependencies:

```bash
git clone https://github.com/andrew-zhouu/actionplan.git
cd actionplan
npm install
```

Create `.env.local` in the project root:

```bash
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6
```

Start the dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key. The server throws a clear error if this is missing. |
| `ANTHROPIC_MODEL` | No | Model to use. Defaults to `claude-sonnet-4-6`. |

## How It Works

Analysis runs in two stages before anything reaches the client.

### Stage 1 — Deterministic pre-processing

Runs locally with no network calls:

- **Readability** (`lib/analysis/readability.ts`) — computes a Flesch-Kincaid grade level and derives a complexity label
- **Classification** (`lib/analysis/classify-document.ts`) — uses keyword scoring to identify the document type
- **Date extraction** (`lib/analysis/extract-dates.ts`) — extracts date-like strings and passes them into the prompt as context

### Stage 2 — Model call and validation

- Pre-processed context is injected into the prompt before the model sees the document text
- All prompt strings live in `prompts/`
- `lib/ai/analyze-document.ts` is the only file that imports the Anthropic SDK
- Model output is parsed defensively, then validated against a Zod schema
- Validation failures surface as a typed `ModelOutputError` and return a `502`

### Request flow

```text
POST /api/analyze
  → validate request (Zod, min 50 chars)
  → readability + classifyDocument + extractDates
  → buildPrompt
  → callModel
  → parse + schema validation (Zod)
  → merge deterministic fields + AI output
  → return AnalysisResult
```

## Roadmap

- File upload support (PDF, DOCX)
- Streaming responses
- Saved analysis history
- User accounts and rate limiting

## Limitations

- **Text paste only.** No file upload. Users must paste plain text.
- **No streaming.** The full response is returned at once. Response time varies with document length and API latency.
- **Heuristic classifier.** The document type classifier uses keyword scoring and can misclassify documents that lack expected terminology or span multiple categories.
- **Flesch-Kincaid only.** This is designed for English prose and is less reliable on very short texts, heavily formatted content, or non-English documents.
- **No retry logic.** Transient model failures return an error immediately rather than retrying.
- **Single provider.** There is no fallback if the Anthropic API is unavailable.
- **No auth or rate limiting.** It is not suitable for public deployment without adding both.