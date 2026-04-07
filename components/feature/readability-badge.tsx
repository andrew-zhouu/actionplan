import type { ComplexityLevel } from "@/types/analysis";

const COMPLEXITY_STYLES: Record<ComplexityLevel, string> = {
  Low: "bg-green-100 text-green-800",
  Medium: "bg-yellow-100 text-yellow-800",
  High: "bg-red-100 text-red-800",
};

function getReadingLevelLabel(score: number): string {
  if (score < 8) return "Middle school or below";
  if (score <= 12) return "High school";
  return "College+";
}

type Props = {
  complexityLevel: ComplexityLevel;
  readabilityScore: number;
};

export function ReadabilityBadge({ complexityLevel, readabilityScore }: Props) {
  const readingLevelLabel = getReadingLevelLabel(readabilityScore);

  return (
    <div className="flex shrink-0 flex-col items-start gap-1.5 rounded-lg bg-zinc-50 px-3.5 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Complexity
      </p>
      <span
        className={`inline-flex items-center rounded-full px-3.5 py-1 text-sm font-semibold ${COMPLEXITY_STYLES[complexityLevel]}`}
      >
        {complexityLevel}
      </span>
      <div className="mt-0.5 space-y-0.5">
        <p className="text-xs font-medium text-zinc-600">
          {readingLevelLabel} reading level
        </p>
        <p className="text-xs text-zinc-400">
          Flesch-Kincaid grade {readabilityScore}
        </p>
      </div>
    </div>
  );
}
