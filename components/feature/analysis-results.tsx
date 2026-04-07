import type { AnalysisResult } from "@/types/analysis";
import { ResultCard } from "./result-card";
import { ReadabilityBadge } from "./readability-badge";

type Props = {
  result: AnalysisResult;
};

export function AnalysisResults({ result }: Props) {
  const {
    documentType,
    summary,
    actionItems,
    deadlines,
    risks,
    questionsToAsk,
    readabilityScore,
    complexityLevel,
  } = result;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Document type
            </p>
            <p className="mt-1 text-xl font-semibold leading-snug text-zinc-900">
              {documentType}
            </p>
          </div>
          <ReadabilityBadge
            complexityLevel={complexityLevel}
            readabilityScore={readabilityScore}
          />
        </div>
      </div>

      <ResultCard title="Summary" icon="📋">
        <p className="text-sm leading-relaxed text-zinc-600">{summary}</p>
      </ResultCard>

      {actionItems.length > 0 && (
        <ResultCard title="Action Items" icon="✅">
          <ol className="space-y-3">
            {actionItems.map((item, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span className="leading-relaxed text-zinc-700">{item}</span>
              </li>
            ))}
          </ol>
        </ResultCard>
      )}

      {deadlines.length > 0 && (
        <ResultCard title="Deadlines" icon="📅">
          <ul className="space-y-3">
            {deadlines.map((deadline, i) => (
              <li key={i} className="border-l-2 border-zinc-200 pl-3 text-sm">
                {deadline.date && (
                  <span className="block font-semibold text-zinc-900">
                    {deadline.date}
                  </span>
                )}
                <span className="leading-relaxed text-zinc-600">
                  {deadline.description}
                </span>
              </li>
            ))}
          </ul>
        </ResultCard>
      )}

      {risks.length > 0 && (
        <ResultCard title="Risks & Gotchas" icon="⚠️">
          <ul className="space-y-3">
            {risks.map((risk, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber-400" />
                <span className="leading-relaxed text-zinc-700">{risk}</span>
              </li>
            ))}
          </ul>
        </ResultCard>
      )}

      {questionsToAsk.length > 0 && (
        <ResultCard title="Questions to Ask" icon="❓">
          <ul className="space-y-3">
            {questionsToAsk.map((question, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-blue-400" />
                <span className="leading-relaxed text-zinc-700">{question}</span>
              </li>
            ))}
          </ul>
        </ResultCard>
      )}
    </div>
  );
}
