import type { ComplexityLevel } from "@/types/analysis";

const COMPLEXITY_STYLES: Record<ComplexityLevel, string> = {
  Low: "bg-green-100 text-green-800",
  Medium: "bg-yellow-100 text-yellow-800",
  High: "bg-red-100 text-red-800",
};

type Props = {
  complexityLevel: ComplexityLevel;
  readabilityScore: number;
};

export function ReadabilityBadge({ complexityLevel, readabilityScore }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${COMPLEXITY_STYLES[complexityLevel]}`}
    >
      Grade {readabilityScore} · {complexityLevel} complexity
    </span>
  );
}
