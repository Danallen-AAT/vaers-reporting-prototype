// ---------------------------------------------------------------------------
// How this works: the reviewer-facing explanation of the build.
//
// Tab 2-2 of the quotation is submitted "via an accessible link", so anything
// reachable from that link is part of the prototype rather than part of the
// 15 page technical volume. This route exists so an evaluator scoring
// soundness and feasibility, technical risk, and extensibility has something
// to read instead of inferring the reasoning from clicking around.
//
// Written for a reader who is technical but has not seen the code. Plain
// prose, no jargon that is not defined, and the known limits stated rather
// than omitted.
// ---------------------------------------------------------------------------
import { useConfig } from '../state/ConfigStore';

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section className="about-section" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>{title}</h2>
      {children}
    </section>
  );
}

export function AboutView() {
  const { config } = useConfig();
  const sectionCount = config.sections.length;
  const fieldCount = config.sections.reduce((n, s) => n + s.fields.length, 0);

  return (
    <main id="main" className="wrap about">
      <h1>How this prototype works</h1>
      <p className="about-lede">
        A working demonstration of the modernized VAERS reporting form, built by Allen App Tools
        for CDC RFQ 75D301-26-Q-00146. This page explains the design decisions behind it, what has
        been verified, and what has deliberately not been built.
      </p>

      <Section id="idea" title="The one idea">
        <p>
          <strong>The form is data, not code.</strong> Every section, question, field type,
          validation rule, branching condition, help text and plain-language variant lives in a
          structured schema. A single rendering component builds the entire interface from that
          schema. Nothing about any individual question is written into the interface code.
        </p>
        <p>
          This prototype currently holds <strong>{sectionCount} sections</strong> and{' '}
          <strong>{fieldCount} fields</strong> in that schema, and the numbers on this page are read
          from it at render time rather than typed in, which is itself a small demonstration of the
          point.
        </p>
        <p>One decision answers three separate requirements in the solicitation:</p>
        <table className="about-table">
          <thead>
            <tr><th scope="col">Requirement</th><th scope="col">Why the architecture satisfies it</th></tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">PWS 1.8, program staff edit without a developer</th>
              <td>The configuration <em>is</em> the form. There is no second, hidden version that
                only a developer can reach, so an edit cannot fall out of sync with what reporters see.</td>
            </tr>
            <tr>
              <th scope="row">PRS#1, 100 percent branching correctness</th>
              <td>Branching rules are data evaluated by pure functions, so every combination of
                reporter type and answer is machine-verified on every change. Correctness is proven
                rather than asserted.</td>
            </tr>
            <tr>
              <th scope="row">Section 508 Chapter 504, authoring tool conformance</th>
              <td>Every label, association and semantic structure is produced by the renderer. A
                person editing content never touches markup, so authored content cannot introduce
                an accessibility defect.</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section id="branching" title="How branching works">
        <p>
          A field carries a list of conditions describing when it appears. The conditions are
          plain data. A pregnancy follow-up question, for example, is expressed as:
        </p>
        <pre className="about-code" aria-label="Example branching rule">
{`visibleWhen: [{ field: 'patientPregnant', equals: 'yes' }]`}
        </pre>
        <p>The rules in force today:</p>
        <ul>
          <li><strong>Public reporter.</strong> Plain-language wording throughout, clinical-only
            fields hidden.</li>
          <li><strong>Healthcare provider.</strong> The full clinical set, plus the vaccine
            administration error branch.</li>
          <li><strong>Administration error with no adverse event.</strong> The entire adverse event
            section is suppressed. This is PWS 1.6.2, and it is the case that makes the current
            form frustrating for providers.</li>
          <li><strong>Pregnancy.</strong> Due date and complications appear only when relevant.</li>
        </ul>
        <p>
          <strong>Validation follows visibility.</strong> Only fields currently presented are
          validated, derived from the same rules that decide what to show. A suppressed required
          field can never block a submission, which is the most common defect in conditional forms.
        </p>
      </Section>

      <Section id="audiences" title="Two audiences, one field">
        <p>
          Plain-language substitution is not a second form. It is a second <em>label</em> on the
          same field:
        </p>
        <pre className="about-code" aria-label="Example of two labels on one field">
{`id:          'vaccineLotNumber'
label:       'Lot number'                        // provider
publicLabel: 'Lot number on the vaccine record'  // public`}
        </pre>
        <p>
          Both reporters answer the same underlying question, so both answers land in the same
          place in the VAERS record. The two paths cannot drift apart as content changes, because
          there is only one field to change.
        </p>
        <p>
          This does create one thing an analyst must know about, and it is documented in the Data
          Management Plan: the two paths ask a semantically similar question in different words,
          and question wording affects answers.
        </p>
      </Section>

      <Section id="mapping" title="The mapping boundary, and what it maps today">
        <p>
          Every field can carry the VAERS data element it maps to. On submission, one isolated
          layer assembles the structured output, keying each answer on that element.
        </p>
        <p>
          <strong>Every field with a counterpart on the published VAERS 2.0 form carries a
          representative element today</strong>, keyed to that form's own item numbers (item 8
          pregnancy status, item 17 vaccine table, item 18 event description, and so on), because
          PWS 1.6 makes the current form the authoritative element list. Fields born of the
          modernized workflow, the administration error branch and the upload, deliberately carry
          none: PWS Section 9 states that CDC furnishes the authoritative data element definitions,
          business rules and integration requirements at kickoff, and inventing those would be
          guessing.
        </p>
        <p>
          So the output reports its own mapping state rather than hiding it. Submit the form and
          the JSON includes a block like:
        </p>
        <pre className="about-code" aria-label="Example mapping status in the output">
{`"mapping": { "answered": 14, "mapped": 12, "unmapped": [ "isAdminError", ... ] }`}
        </pre>
        <p>
          The moment the kickoff specification arrives, completing or correcting those names is an
          edit in one file, and mapping completeness is already a number on every submission,
          trackable to 100 percent. That is what PRS#6 is graded on.
        </p>
      </Section>

      <Section id="verified" title="What has been verified">
        <ul>
          <li><strong>106 automated tests across 14 files</strong>, run on every change. They cover
            the branching matrix for both paths, the suppression rule, repeatable vaccine groups,
            validation, configuration overrides, completion progress, the mapping boundary, and
            accessibility.</li>
          <li><strong>Behavioural verification driving a real browser.</strong> 21 of 21 checks
            passed, exercising actual key events rather than inspecting markup.</li>
          <li><strong>Performance, measured on the deployed build with a cold cache.</strong> 0.42
            seconds on broadband and 0.84 seconds on Fast 3G with a 4x CPU slowdown, across 4
            requests and 86 kilobytes. The requirement is 3 seconds. The measurement script is in
            the repository at <code>verification/perf.mjs</code>, so the figure can be re-run
            rather than taken on trust.</li>
          <li><strong>Accessibility.</strong> Zero automated violations across twelve interface
            states. An Accessibility Conformance Report accompanies the quotation.</li>
          <li><strong>Configuration cannot inject markup.</strong> A payload combining an element
            and an inline event handler was entered through the admin surface. It rendered as
            literal text, created no element, and executed nothing.</li>
        </ul>
        <p>
          <strong>One finding worth stating.</strong> Behavioural testing identified a defect that
          automated rule checking and the unit suite had both passed: a skip link was correctly
          formed and its target existed, but activating it did not reach that target, because the
          routing layer consumed the destination. It was fixed, two related defects were found the
          same way, and a regression guard now activates every in-page link and asserts navigation
          is unaffected. Automated tooling validates structure. Only exercising a product validates
          behaviour.
        </p>
      </Section>

      <Section id="limits" title="What is deliberately not built">
        <p>
          This is a prototype, not a partial production system. The following are absent by
          decision, not by oversight.
        </p>
        <ul>
          <li><strong>No back end and no database.</strong> Nothing is stored or transmitted. The
            structured output is generated and shown, never sent.</li>
          <li><strong>A representative subset of VAERS data elements</strong>, sufficient to
            demonstrate the branching architecture and both reporter paths. Under PWS 1.6 the
            authoritative list is that of the current VAERS form, established against a
            Government-approved specification at kickoff. Adding an element is a schema edit.</li>
          <li><strong>Upload is a client-side stub.</strong> Real file handling requires the
            security controls of the production environment.</li>
          <li><strong>The admin sign-in is a mock.</strong> It accepts anything. Real authentication
            belongs to CDC's environment, not to a demonstration.</li>
          <li><strong>Physical handset verification and assistive technology testing have not been
            performed.</strong> Both are planned against the Government-defined device matrix after
            award, and both are recorded as limitations in the conformance report.</li>
          <li><strong>Synthetic data only.</strong> No real personal or health information has ever
            been entered, and the interface says so on every page.</li>
        </ul>
      </Section>

      <Section id="try" title="The fastest way to see the idea">
        <ol>
          <li>Open <a href="#/admin">the admin surface</a> and sign in. It accepts anything.</li>
          <li>Change a question label and watch the preview update as you type.</li>
          <li>Open <a href="#/report">the reporting form</a> and see the same change on the live
            form. No rebuild, no redeployment, no developer.</li>
          <li>Choose the provider path, then answer that the report is a vaccine administration
            error with no adverse event, and watch the entire adverse event section disappear.</li>
        </ol>
      </Section>

      <p className="about-foot">
        Allen App Tools LLC &middot; Spokane, Washington &middot; UEI C557WB54VRN9 &middot; CAGE 238J8
      </p>
    </main>
  );
}
