import type { Metadata } from "next";

export const metadata: Metadata = {
  title:       "Terms of Use · ActionPlan",
  description: "The terms governing your use of ActionPlan.",
};

export default function TermsPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-24">
      <header className="mb-12">
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Terms
        </p>
        <h1 className="mt-4 text-balance font-display text-[34px] font-normal leading-tight tracking-[-0.01em] text-zinc-900 sm:text-[40px]">
          ActionPlan Terms of Use
        </h1>
        <p className="mt-4 text-[14px] text-zinc-500">
          Effective date: May 22, 2026
        </p>
      </header>

      <div className="space-y-12 text-[15px] leading-relaxed text-zinc-700 sm:text-[16px]">
        <section>
          <p>
            These Terms of Use (&ldquo;Terms&rdquo;) govern your use of
            ActionPlan (the &ldquo;Service&rdquo;). By accessing or using the
            Service you agree to these Terms. If you don&rsquo;t agree, don&rsquo;t
            use the Service.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] font-normal tracking-tight text-zinc-900 sm:text-[26px]">
            1. The Service
          </h2>
          <p className="mt-4">
            ActionPlan accepts a document you submit (by pasting text or
            uploading a PDF /{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[13px] text-zinc-800">.txt</code>{" "}
            file) and uses an AI model to produce an analysis: a summary, action
            items, deadlines, risks, and questions to ask. Inside the signed-in
            workspace you can also generate task plans and draft responses
            (emails, letters, or notes) for the items the analysis surfaces.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] font-normal tracking-tight text-zinc-900 sm:text-[26px]">
            2. Early access
          </h2>
          <p className="mt-4">
            The Service is in <strong className="font-semibold text-zinc-900">early access</strong>. That means:
          </p>
          <ul className="mt-3 ml-5 list-disc space-y-1.5 marker:text-zinc-400">
            <li>Features, limits, and availability may change without notice.</li>
            <li>Bugs and downtime are more likely than in a fully-released product.</li>
            <li>We may add, remove, or restrict capabilities at any time.</li>
            <li>We may end your access, or close early access entirely, at our discretion.</li>
          </ul>
          <p className="mt-4">
            Don&rsquo;t build anything mission-critical on top of the Service
            while it&rsquo;s in this phase.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] font-normal tracking-tight text-zinc-900 sm:text-[26px]">
            3. Getting access
          </h2>
          <p className="mt-4">
            You access the Service by submitting your email address, or an
            access code we or your organization gave to you, at{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[13.5px] text-zinc-800">/early-access</code>.
            Access codes are issued by us and may be revoked by us at any time.
            We may decline to grant access for any reason.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] font-normal tracking-tight text-zinc-900 sm:text-[26px]">
            4. Your account
          </h2>
          <p className="mt-4">
            Your account is identified by the cookie our server sets after you
            sign in. Keep your device secure: anyone with access to your
            browser session may be able to use your account. If you believe
            your account has been used without your permission, contact us.
          </p>
          <p className="mt-4">
            You may not (a) attempt to access another user&rsquo;s account,
            documents, analyses, drafts, or plans, (b) attempt to share,
            transfer, or sell your access, or (c) impersonate someone else when
            requesting access.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] font-normal tracking-tight text-zinc-900 sm:text-[26px]">
            5. Usage limits
          </h2>
          <p className="mt-4">The Service enforces the following limits:</p>
          <ul className="mt-3 ml-5 list-disc space-y-2 marker:text-zinc-400">
            <li>
              <strong className="font-semibold text-zinc-900">Trial quota.</strong>{" "}
              Each account is given a fixed number of document analyses
              (currently 3 by default; an access code may grant a higher tier).
              Quota usage carries across visits. Re-signing in with the
              same email does not reset it.
            </li>
            <li>
              <strong className="font-semibold text-zinc-900">One analysis in progress at a time</strong>{" "}
              per account. If you start a second analysis while another is still
              processing, the second request will be rejected until the first
              finishes.
            </li>
            <li>
              <strong className="font-semibold text-zinc-900">Upload file types:</strong>{" "}
              PDF and plain-text (<code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[13px] text-zinc-800">.txt</code>) only.
            </li>
            <li>
              <strong className="font-semibold text-zinc-900">Upload file size:</strong>{" "}
              maximum <strong className="font-semibold text-zinc-900">5 MB</strong>.
            </li>
            <li>
              <strong className="font-semibold text-zinc-900">Submitted text length.</strong>{" "}
              Text extracted from an uploaded file is capped at{" "}
              <strong className="font-semibold text-zinc-900">50,000 characters</strong>;
              longer extracted content is truncated before analysis. Text you
              paste directly is not currently capped by our application, but may
              be subject to limits at our AI service provider.
            </li>
          </ul>
          <p className="mt-4">
            You may not attempt to bypass these limits, including by
            creating multiple accounts to extend your quota.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] font-normal tracking-tight text-zinc-900 sm:text-[26px]">
            6. Content you submit
          </h2>
          <p className="mt-4">
            You keep ownership of the text and files you submit. You grant
            ActionPlan a non-exclusive, worldwide, royalty-free license to
            store, process, transmit, and analyze that content{" "}
            <strong className="font-semibold text-zinc-900">solely</strong> to
            provide the Service to you, including transmitting it to an
            AI service provider to produce the analysis you requested, and
            storing the result so you can return to it.
          </p>
          <p className="mt-4">You represent that:</p>
          <ul className="mt-3 ml-5 list-disc space-y-1.5 marker:text-zinc-400">
            <li>You have the right to submit the content you submit.</li>
            <li>
              The content does not violate any law or any third party&rsquo;s
              rights, including intellectual-property and privacy rights.
            </li>
            <li>
              You are not submitting content that you are legally required to
              keep confidential and not share with third-party processors.
            </li>
          </ul>
          <p className="mt-4">You are responsible for the content you submit.</p>
        </section>

        <section>
          <h2 className="font-display text-[22px] font-normal tracking-tight text-zinc-900 sm:text-[26px]">
            7. AI-generated output
          </h2>
          <p className="mt-4">
            The analysis, action items, deadlines, risks, questions, task
            plans, and draft responses the Service returns are generated by an
            AI model.{" "}
            <strong className="font-semibold text-zinc-900">
              AI output may be inaccurate, incomplete, misleading, or wrong.
            </strong>{" "}
            It can miss things in your document, invent things that aren&rsquo;t
            there, misread dates, mistake the document type, or produce drafts
            that don&rsquo;t reflect what you actually want to say.
          </p>
          <p className="mt-4">
            You are responsible for reviewing and verifying every output before
            relying on it or acting on it, including:
          </p>
          <ul className="mt-3 ml-5 list-disc space-y-1.5 marker:text-zinc-400">
            <li>Confirming any deadline against the original document.</li>
            <li>Checking that any action item is actually required.</li>
            <li>Reading any drafted email, letter, or note in full before sending it.</li>
          </ul>
          <p className="mt-4">
            The Service is a starting point. It is not the final word.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] font-normal tracking-tight text-zinc-900 sm:text-[26px]">
            8. Not professional advice
          </h2>
          <p className="mt-4">
            ActionPlan does <strong className="font-semibold text-zinc-900">not</strong>{" "}
            provide legal, medical, financial, tax, immigration, insurance, or
            any other form of professional advice. Outputs are informational only.
          </p>
          <p className="mt-4">
            If your decision has legal, medical, financial, immigration,
            insurance, or other professional consequences, consult a qualified
            professional. Do not rely on the Service alone to make those
            decisions.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] font-normal tracking-tight text-zinc-900 sm:text-[26px]">
            9. Acceptable use
          </h2>
          <p className="mt-4">You may not:</p>
          <ul className="mt-3 ml-5 list-disc space-y-1.5 marker:text-zinc-400">
            <li>Use the Service to violate any law or any third party&rsquo;s rights.</li>
            <li>Attempt to access another user&rsquo;s account, documents, or analyses.</li>
            <li>Attempt to bypass authentication, the trial-quota limit, or the in-flight-analysis limit.</li>
            <li>Attempt to disrupt, overload, or harm the Service or the systems that host it.</li>
            <li>Submit content that contains malware, exploit payloads, or content designed to cause our systems or our AI service provider to misbehave.</li>
            <li>Reverse-engineer, scrape, or systematically extract data from the Service beyond ordinary, intended use.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-[22px] font-normal tracking-tight text-zinc-900 sm:text-[26px]">
            10. Deletion
          </h2>
          <p className="mt-4">
            You may delete individual documents from inside the Service at any
            time. Deleting a document removes the document, your task-completion
            history for it, the task plans you created for any of its tasks,
            and any drafts (emails, letters, or notes) you generated from those
            tasks. The deletion runs as a single atomic operation.
          </p>
          <p className="mt-4">
            If you want us to delete the rest of your account data, email us.
            We will handle the request manually. Self-service account deletion
            is not currently offered.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] font-normal tracking-tight text-zinc-900 sm:text-[26px]">
            11. Suspension and termination
          </h2>
          <p className="mt-4">
            We may suspend or end your access to the Service at any time, with
            or without notice, if we believe you&rsquo;ve violated these Terms,
            if your access code is revoked, or for any operational reason while
            the Service is in early access. If we do, you may lose access to
            the documents and analyses tied to your account.
          </p>
          <p className="mt-4">You may stop using the Service at any time.</p>
        </section>

        <section>
          <h2 className="font-display text-[22px] font-normal tracking-tight text-zinc-900 sm:text-[26px]">
            12. Service &ldquo;as is&rdquo;
          </h2>
          <p className="mt-4">
            The Service is provided{" "}
            <strong className="font-semibold text-zinc-900">&ldquo;as is&rdquo; and &ldquo;as available.&rdquo;</strong>{" "}
            To the maximum extent permitted by law, we make no warranties,
            express or implied, including any warranty of merchantability,
            fitness for a particular purpose, accuracy, non-infringement, or
            uninterrupted operation. We don&rsquo;t warrant that the Service
            will be error-free, that AI outputs will be correct, or that the
            Service will be available at any specific time.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] font-normal tracking-tight text-zinc-900 sm:text-[26px]">
            13. Limitation of liability
          </h2>
          <p className="mt-4">
            To the maximum extent permitted by law, ActionPlan and its
            operators will not be liable for any indirect, incidental, special,
            consequential, or exemplary damages (including lost profits,
            lost data, lost opportunities, or damages arising from your
            reliance on any AI-generated output) arising out of or
            related to your use of the Service. Our total aggregate liability
            arising from or related to the Service will not exceed the amount
            you paid us in the twelve months before the claim (and during
            early access, where no fees are charged, that amount is zero).
          </p>
          <p className="mt-4">
            This limitation does not apply to liability that cannot be limited
            under applicable law.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] font-normal tracking-tight text-zinc-900 sm:text-[26px]">
            14. Changes to these Terms
          </h2>
          <p className="mt-4">
            We may update these Terms as the Service changes. When we do,
            we&rsquo;ll update the effective date at the top. If you continue
            using the Service after a change, you accept the updated Terms.
            For material changes, we&rsquo;ll do something more visible than
            just updating the date.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] font-normal tracking-tight text-zinc-900 sm:text-[26px]">
            15. Contact
          </h2>
          <p className="mt-4">
            Email us at{" "}
            <a
              href="mailto:actionplan.support@gmail.com"
              className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 transition-colors hover:decoration-zinc-700"
            >
              actionplan.support@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </article>
  );
}
