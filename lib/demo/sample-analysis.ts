import type { AnalysisResult } from "@/types/analysis";
import type { PlanStep } from "@/app/actions/task-plans";

/**
 * Fixed sample used by /demo. Hardcoded so the demo is shareable, stable,
 * and doesn't require any DB writes or model calls.
 *
 * Content is fictional — a hypothetical scholarship verification email from
 * a made-up program at a made-up school. No real names, no real institutions.
 *
 * The sample threads a single narrative across all surfaces:
 *   1. Top deadline (May 29) is surfaced as the Next step.
 *   2. The Action plan walks through 5 sub-steps for completing it.
 *   3. Step 3 (clarifying the 15% income-change threshold) needs a draft.
 *   4. The Draft is the clarification email step 3 calls for — approved.
 * That's the real ActionPlan loop: deadline → plan → blocked step → draft.
 */

export const SAMPLE_SOURCE_TEXT = `From: Office of Student Financial Services
Subject: Verification Required — Continued Aid Award (Action Needed)

Dear Recipient,

Your continued financial aid award for the upcoming academic term has been
provisionally calculated, but final disbursement is contingent on completing
verification by Friday, May 29, 2026. If we do not receive the items listed
below by that date, your provisional award will be withdrawn and the term's
charges will be due in full from your account on file.

REQUIRED ITEMS

1. Signed copy of your most recent federal tax return, including all
   schedules and W-2 forms. If your tax filing status has changed in the
   last 12 months, please also include the prior year's return for
   comparison.

2. Updated household-size attestation. The form is available in your student
   portal under "Financial Aid → Forms." It must be signed by both you and a
   parent or guardian if you are claimed as a dependent.

3. A written statement (no more than one page) describing any change in
   household income greater than 15% from the prior year. If no such change
   has occurred, a brief statement to that effect is sufficient.

PROCESSING TIMELINE

Documents received before Friday, May 29, 2026 will be processed within
10–14 business days. Documents received between May 30 and June 12 may
still be considered, but disbursement will be delayed and you will be
responsible for any late fees the bursar's office assesses in the interim.

Documents received after June 12, 2026 will not be considered for this
term's aid; you would need to reapply for the following term.

CONTACT

If you have questions about which documents apply to your situation, you
may schedule a 15-minute appointment with a financial aid counselor through
the portal. Walk-in advising is available Tuesdays and Thursdays from
1–4 PM at the Student Services building.

Please note: we cannot accept verification documents by email due to
confidentiality requirements. All submissions must go through the secure
upload portal or be hand-delivered to our office.

Office of Student Financial Services`;

export const SAMPLE_ANALYSIS: AnalysisResult = {
  documentType:     "Financial aid verification notice",
  complexityLevel:  "Medium",
  readabilityScore: 11,
  summary:
    "The school is asking the recipient to submit three verification items (tax return, " +
    "household attestation, and income-change statement) before May 29, 2026 to keep " +
    "their continued financial aid award. Late submissions face delays and possible " +
    "loss of the term's aid entirely after June 12.",
  deadlines: [
    {
      description: "Submit all required verification documents through the secure upload portal",
      date:        "May 29, 2026",
    },
    {
      description: "Final cutoff for late documents to be considered for this term's aid",
      date:        "June 12, 2026",
    },
  ],
  actionItems: [
    "Gather most recent federal tax return with all schedules and W-2 forms",
    "Complete the household-size attestation form from the student portal and have a parent or guardian co-sign if dependent",
    "Write a one-page statement about household income changes (or a brief statement confirming no change)",
    "Optionally book a 15-minute counselor appointment through the portal if any item is unclear",
  ],
  risks: [
    "Missing the May 29 deadline forfeits the provisional award and makes term charges due in full from the account on file.",
    "Documents submitted after June 12 will not be considered for this term's aid at all.",
    "Email submissions are not accepted — using email risks both delay and rejection.",
    "If filing status changed in the last 12 months, omitting the prior year's return will cause the verification to be considered incomplete.",
  ],
  questionsToAsk: [
    "Which household-income changes count toward the 15% threshold — gross income, after-tax income, or something else?",
    "If a parent or guardian is unreachable for co-signing the household attestation, what alternative documentation is accepted?",
    "If the secure upload portal goes down before May 29, what proof of attempted submission counts?",
  ],
};

/**
 * Index of the deadline surfaced as the "Next step" on the demo. Points at
 * deadlines[0] — the primary May 29 submission deadline.
 */
export const SAMPLE_TOP_TASK_INDEX = 0;

/**
 * 5-step action plan for completing the surfaced deadline. Mirrors the shape
 * the real generateTaskPlan action returns. Step 3 has needsDraft: true and is
 * the step the demo pre-expands — it's blocked by an unclear policy detail,
 * which is what the sample draft below resolves.
 */
export const SAMPLE_PLAN_STEPS: PlanStep[] = [
  {
    title:      "Locate your most recent federal tax return with all schedules",
    detail:     "You'll need the full return plus every W-2 form. If you used a service like TurboTax or FreeTaxUSA, log in and download the complete PDF; otherwise search your inbox for confirmation emails with the return attached.",
    needsDraft: false,
  },
  {
    title:      "Download the household-size attestation from the student portal",
    detail:     "Log in to the portal and find it under Financial Aid → Forms. Print two copies — keep one as a backup in case revisions come up after a parent or guardian reviews it.",
    needsDraft: false,
  },
  {
    title:      "Email financial services to clarify the 15% income-change threshold",
    detail:     "The notice mentions a 15% threshold but doesn't specify gross vs. after-tax income. Get this clarified before drafting your statement, so the figure you cite matches what the office is actually measuring.",
    needsDraft: true,
  },
  {
    title:      "Prepare the one-page income-change statement using the clarified figure",
    detail:     "If the change exceeds the threshold, write a one-page statement explaining what changed and why. If it doesn't, a short no-change attestation is enough — keep it factual and dated.",
    needsDraft: false,
  },
  {
    title:      "Upload the complete package through the secure portal before May 29",
    detail:     "Email submissions are explicitly not accepted. If the portal is unavailable as the deadline approaches, save a timestamped screenshot of the error as proof of attempted submission, then hand-deliver or schedule a counselor visit.",
    needsDraft: false,
  },
];

/** Index of the plan step pre-expanded in the demo. */
export const SAMPLE_EXPANDED_STEP_INDEX = 2;

/**
 * Plain shape for the demo draft. Matches the visible fields of the live
 * TaskDraft type but is locally typed so the demo doesn't depend on the
 * server-action module's full type surface.
 *
 * approvedAt is intentionally omitted — the demo footer uses a state
 * descriptor ("Approved — ready to use.") instead of a hardcoded date,
 * since a sample has no real approval timeline and an absolute date would
 * become stale.
 */
export type SampleDraft = {
  draftType: "email" | "letter" | "note";
  subject:   string | null;
  body:      string;
  approved:  boolean;
};

export const SAMPLE_DRAFT: SampleDraft = {
  draftType: "email",
  subject:   "Quick clarification on the 15% household-income threshold",
  body:      `Dear Office of Student Financial Services,

I received the verification request for my continued financial aid award and am preparing the required materials before the May 29 deadline.

Before I write the income-change statement, I want to confirm one detail: when the notice references a 15% threshold for household-income change, does that refer to gross household income, after-tax income, or another figure? I'd like my statement to use the figure the office is actually measuring so it aligns with how the rest of my file will be reviewed.

I have the prior-year and current-year W-2 totals on hand and can move quickly once this is clarified. If a brief written response is sufficient, that works well; otherwise I'd be happy to book a 15-minute appointment through the portal.

Thank you for your help.

Sincerely,
[Your name]`,
  approved:  true,
};
