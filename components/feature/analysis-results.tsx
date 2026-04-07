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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Document type
          </p>
          <p className="text-lg font-semibold text-zinc-900">{documentType}</p>
        </div>
        <ReadabilityBadge
          complexityLevel={complexityLevel}
          readabilityScore={readabilityScore}
        />
      </div>

      <ResultCard title="Summary" icon="📋">
        <p className="text-sm leading-relaxed text-zinc-700">{summary}</p>
      </ResultCard>

      {actionItems.length > 0 && (
        <ResultCard title="Action Items" icon="✅">
          <ol className="space-y-2">
            {actionItems.map((item, i) => (
              <li key={i} className="flex gap-3 text-sm text-zinc-700">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
        </ResultCard>
      )}

      {deadlines.length > 0 && (
        <ResultCard title="Deadlines" icon="📅">
          <ul className="space-y-2">
            {deadlines.map((deadline, i) => (
              <li key={i} className="text-sm text-zinc-700">
                {deadline.date && (
                  <span className="font-medium text-zinc-900">
                    {deadline.date} —{" "}
                  </span>
                )}
                {deadline.description}
              </li>
            ))}
          </ul>
        </ResultCard>
      )}

      {risks.length > 0 && (
        <ResultCard title="Risks & Gotchas" icon="⚠️">
          <ul className="space-y-2">
            {risks.map((risk, i) => (
              <li key={i} className="flex gap-2 text-sm text-zinc-700">
                <span className="mt-0.5 shrink-0 text-amber-500">•</span>
                {risk}
              </li>
            ))}
          </ul>
        </ResultCard>
      )}

      {questionsToAsk.length > 0 && (
        <ResultCard title="Questions to Ask" icon="❓">
          <ul className="space-y-2">
            {questionsToAsk.map((question, i) => (
              <li key={i} className="flex gap-2 text-sm text-zinc-700">
                <span className="mt-0.5 shrink-0 text-blue-500">•</span>
                {question}
              </li>
            ))}
          </ul>
        </ResultCard>
      )}
    </div>
  );
}
