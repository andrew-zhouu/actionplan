import type { Metadata } from "next";

export const metadata: Metadata = {
  title:       "Privacy Policy · ActionPlan",
  description: "How ActionPlan collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-24">
      <header className="mb-12">
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Privacy
        </p>
        <h1 className="mt-4 text-balance font-display text-[34px] font-normal leading-tight tracking-[-0.01em] text-zinc-900 sm:text-[40px]">
          ActionPlan Privacy Policy
        </h1>
        <p className="mt-4 text-[14px] text-zinc-500">
          Effective date: May 22, 2026
        </p>
      </header>

      <div className="space-y-12 text-[15px] leading-relaxed text-zinc-700 sm:text-[16px]">
        <section>
          <p>
            ActionPlan (&ldquo;we&rdquo;, &ldquo;us&rdquo;) makes a tool that turns
            dense documents (leases, scholarship letters, financial forms,
            healthcare and insurance notices, and similar) into a clearer
            summary, deadlines, and a draft response. This Privacy Policy explains
            what data we collect when you use the service at the URL where this
            policy is published (the &ldquo;Service&rdquo;), what we do with it,
            and what choices you have.
          </p>
          <p className="mt-4">
            The Service is in early access. Some features described in this
            policy may change as we add or remove functionality. If we make a
            material change, we&rsquo;ll update the effective date above.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] font-normal tracking-tight text-zinc-900 sm:text-[26px]">
            What we collect
          </h2>
          <p className="mt-4">
            When you create access at{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[13.5px] text-zinc-800">
              /early-access
            </code>
            , you&rsquo;ll submit either:
          </p>
          <ul className="mt-3 ml-5 list-disc space-y-1.5 marker:text-zinc-400">
            <li>
              <strong className="font-semibold text-zinc-900">Your email address</strong>, or
            </li>
            <li>
              <strong className="font-semibold text-zinc-900">An access code</strong> we gave to you or your organization.
            </li>
          </ul>
          <p className="mt-4">
            If you submit an email, we store it (lowercased) so we can recognize
            you on later visits and so the same account picks up where you left
            off. If you submit only an access code, we don&rsquo;t store an
            email. We identify your session entirely through a cookie.
          </p>
          <p className="mt-4">When you submit a document for analysis, we collect:</p>
          <ul className="mt-3 ml-5 list-disc space-y-2 marker:text-zinc-400">
            <li>
              <strong className="font-semibold text-zinc-900">The text of your document.</strong>{" "}
              If you paste text, we store what you pasted. If you upload a file
              (PDF or <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[13px] text-zinc-800">.txt</code> only),
              we extract the text from the file and store that. We do{" "}
              <strong className="font-semibold text-zinc-900">not</strong> keep a
              copy of the uploaded file itself, only the extracted text.
            </li>
            <li>
              <strong className="font-semibold text-zinc-900">The analysis result.</strong>{" "}
              The summary, action items, deadlines, risks, and questions our
              model produces from your document. These are stored alongside the
              source text so you can come back to them.
            </li>
            <li>
              <strong className="font-semibold text-zinc-900">Anything you add inside the workspace.</strong>{" "}
              This includes task plans you generate and email/letter/note drafts
              you create from a task. These are stored until you delete the
              document they&rsquo;re attached to, or until you replace or
              discard them individually inside the workspace.
            </li>
          </ul>
          <p className="mt-4">We also generate and store:</p>
          <ul className="mt-3 ml-5 list-disc space-y-2 marker:text-zinc-400">
            <li>
              <strong className="font-semibold text-zinc-900">An internal account ID</strong>{" "}
              (a random UUID) to identify your account on our servers.
            </li>
            <li>
              <strong className="font-semibold text-zinc-900">Usage counts</strong>{" "}
              for your account: how many documents you&rsquo;ve analyzed, your
              allowed document quota, the time your account was created, and the
              last time it was active.
            </li>
            <li>
              <strong className="font-semibold text-zinc-900">Which access code you used</strong>, if any.
            </li>
          </ul>
          <p className="mt-4">
            We do <strong className="font-semibold text-zinc-900">not</strong> read
            or store IP addresses, user-agent strings, device fingerprints, or
            geolocation at the application layer. Our hosting provider may retain
            its own infrastructure logs at the platform level; those are outside
            our application.
          </p>
          <p className="mt-4">
            We do <strong className="font-semibold text-zinc-900">not</strong> run
            any third-party analytics, behavior-tracking, advertising, or
            session-replay tools.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] font-normal tracking-tight text-zinc-900 sm:text-[26px]">
            How we use what we collect
          </h2>
          <p className="mt-4">We use the information you submit only to operate the Service:</p>
          <ul className="mt-3 ml-5 list-disc space-y-1.5 marker:text-zinc-400">
            <li>To run the analysis you asked for and return the result to you.</li>
            <li>To keep you signed in across visits.</li>
            <li>To enforce your trial quota.</li>
            <li>To recognize a returning email so you don&rsquo;t start from scratch.</li>
            <li>To diagnose problems in our system when something goes wrong (see <em>Server logs</em> below).</li>
            <li>To respond to you if you contact us.</li>
          </ul>
          <p className="mt-4">
            We do not use your submitted content for advertising. We do not sell it.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] font-normal tracking-tight text-zinc-900 sm:text-[26px]">
            Cookies and sessions
          </h2>
          <p className="mt-4">
            We use a first-party cookie to keep you signed in. The cookie is{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[13px] text-zinc-800">HttpOnly</code>,{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[13px] text-zinc-800">SameSite=Lax</code>, and{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[13px] text-zinc-800">Secure</code>{" "}
            in production. It contains your internal account ID and an issued-at
            timestamp, signed with a server secret. Lifetime: up to 30 days.
          </p>
          <p className="mt-4">
            We do not set any third-party cookies. We do not use cookies for
            advertising, cross-site tracking, or analytics.
          </p>
          <p className="mt-4">
            On one page in the signed-in app, we temporarily store your current
            analysis in your browser&rsquo;s{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[13px] text-zinc-800">sessionStorage</code>{" "}
            so the workspace can render after navigation. This data lives in
            your own browser, is cleared when you reset the workspace or leave
            the page, and is not transmitted anywhere beyond what&rsquo;s already
            in our database.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] font-normal tracking-tight text-zinc-900 sm:text-[26px]">
            Third parties we use
          </h2>
          <p className="mt-4">
            To provide the Service, your data passes through the following providers:
          </p>
          <ul className="mt-3 ml-5 list-disc space-y-2 marker:text-zinc-400">
            <li>
              <strong className="font-semibold text-zinc-900">An AI service provider.</strong>{" "}
              We use a third-party AI service to process prompts, uploaded or
              pasted document text, and related content in order to generate the
              analyses, task plans, and drafts the Service produces. The
              provider&rsquo;s handling of submitted content is governed by their
              own terms. We do not control the provider&rsquo;s data handling
              beyond what they publish.
            </li>
            <li>
              <strong className="font-semibold text-zinc-900">A hosting and database provider.</strong>{" "}
              Your account information, document text, analysis results, task
              plans, and drafts are stored in a third-party-hosted database we
              use. Our application is run on a third-party hosting provider.
              Both are accessed over authenticated connections.
            </li>
          </ul>
          <p className="mt-4">
            Those are the third-party services that touch your account data
            through the application. We don&rsquo;t share your data with anyone else.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] font-normal tracking-tight text-zinc-900 sm:text-[26px]">
            Storage, retention, and deletion
          </h2>
          <p className="mt-4">
            We currently retain the data you submit for as long as your account
            exists. We do <strong className="font-semibold text-zinc-900">not</strong>{" "}
            automatically expire or delete documents, analyses, or accounts on a
            schedule.
          </p>
          <p className="mt-4">
            You can delete an individual document at any time from inside the
            Service. When you do, we delete the document, your task-completion
            history for it, the task plans you created for any of its tasks,
            and any drafts (emails, letters, or notes) you generated from any of
            its tasks. This runs as a single atomic operation: either all
            of it is removed, or none of it is.
          </p>
          <p className="mt-4">
            We do <strong className="font-semibold text-zinc-900">not</strong>{" "}
            currently provide a self-service way to delete your account, your
            email, or your entire history in one action. If you&rsquo;d like us
            to delete your account and the data tied to it, email us at the
            address below and we will handle the request manually.
          </p>
          <p className="mt-4">
            We do not apply application-layer encryption to stored documents or
            analyses; protection at rest depends on the hosting and database
            providers. Connections between your browser, our servers, and our
            third-party processors are over HTTPS.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] font-normal tracking-tight text-zinc-900 sm:text-[26px]">
            Server logs
          </h2>
          <p className="mt-4">
            When something fails on our side, we write log entries to our
            server&rsquo;s standard error. Logs may include internal identifiers,
            error messages, and short excerpts of system or model output in rare
            error paths. Logs do not normally contain your full source text,
            your email, or your session token. Our hosting platform may retain
            logs we emit; those logs follow the platform&rsquo;s own retention.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] font-normal tracking-tight text-zinc-900 sm:text-[26px]">
            Your choices
          </h2>
          <p className="mt-4">You can:</p>
          <ul className="mt-3 ml-5 list-disc space-y-1.5 marker:text-zinc-400">
            <li>Stop using the Service at any time.</li>
            <li>Delete individual documents from inside the product (cascade described above).</li>
            <li>Email us to request that we delete the rest of your data.</li>
            <li>Clear our cookies in your browser; doing so will sign you out.</li>
          </ul>
          <p className="mt-4">
            We will respond to requests in a reasonable time. We may need to
            confirm the request comes from you before acting on it.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] font-normal tracking-tight text-zinc-900 sm:text-[26px]">
            Children
          </h2>
          <p className="mt-4">
            The Service is not intended for children under 13, and we
            don&rsquo;t knowingly collect information from anyone under 13. If
            you believe a child has submitted information through the Service,
            contact us and we will delete it.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] font-normal tracking-tight text-zinc-900 sm:text-[26px]">
            Changes to this policy
          </h2>
          <p className="mt-4">
            We may update this Privacy Policy as the Service changes. When we
            do, we&rsquo;ll update the effective date at the top. For material
            changes, we&rsquo;ll do something more visible than just updating
            the date.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] font-normal tracking-tight text-zinc-900 sm:text-[26px]">
            Contact
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
