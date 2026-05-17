import type { Metadata } from "next";
import { DemoWorkspace } from "@/components/demo/demo-workspace";
import {
  SAMPLE_ANALYSIS,
  SAMPLE_SOURCE_TEXT,
  SAMPLE_TOP_TASK_INDEX,
  SAMPLE_PLAN_STEPS,
  SAMPLE_EXPANDED_STEP_INDEX,
  SAMPLE_DRAFT,
} from "@/lib/demo/sample-analysis";

export const metadata: Metadata = {
  title:       "ActionPlan demo",
  description: "See how ActionPlan turns a real-world document into a prioritized next step, a plan, and a drafted response.",
};

export default function DemoPage() {
  return (
    <DemoWorkspace
      text={SAMPLE_SOURCE_TEXT}
      result={SAMPLE_ANALYSIS}
      topDeadlineIndex={SAMPLE_TOP_TASK_INDEX}
      planSteps={SAMPLE_PLAN_STEPS}
      expandedStepIndex={SAMPLE_EXPANDED_STEP_INDEX}
      draft={SAMPLE_DRAFT}
    />
  );
}
