import type { Metadata } from "next";

import { APP_NAME } from "@/constants/app";
import { ROUTES } from "@/constants/routes";
import {
  LegalCrossLink,
  LegalPage,
  type LegalSection,
} from "@/features/legal/components/legal-page";
import { LEGAL_OPERATOR, LEGAL_PLACEHOLDERS as P } from "@/features/legal/constants";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The rules for using Argus: your account, your content, what the service does and does not promise, and how disputes are handled.",
};

/**
 * Terms of Service.
 *
 * Describes only functionality that exists in the current codebase. The TMDB
 * notice in the third-party section is the wording TMDB requires of API
 * consumers, not language written for this document.
 */
const SECTIONS: LegalSection[] = [
  {
    id: "acceptance",
    title: "Accepting these terms",
    body: (
      <>
        <p>
          These terms are an agreement between you and {LEGAL_OPERATOR.name}, the{" "}
          {LEGAL_OPERATOR.noun} of {APP_NAME}. By creating an account or using {APP_NAME},
          you accept them. If you do not accept them, do not use the service.
        </p>
        <p>
          Our <LegalCrossLink href={ROUTES.privacy} label="Privacy Policy" /> explains what
          we store and who can see it. It forms part of this agreement.
        </p>
      </>
    ),
  },
  {
    id: "the-service",
    title: "What Argus is",
    body: (
      <>
        <p>
          {APP_NAME} is a web app for keeping track of films and series you watch. With an
          account you can:
        </p>
        <ul>
          <li>Browse and search a catalogue of films, series and the people who make them</li>
          <li>
            Track titles with a watch status, and record progress in minutes or by episode
          </li>
          <li>Rate titles, write reviews, keep private notes, and organise with tags and collections</li>
          <li>See statistics, insights, a calendar, a timeline and a year in review built from your own history</li>
          <li>Get ranked recommendations based on your library</li>
          <li>Add friends and choose whether they can see your library</li>
        </ul>
        <p>
          {APP_NAME} does not stream anything and does not sell or provide access to films or
          series. It records what you watched elsewhere. Where the app shows which services
          carry a title, that is information from a third party and may be wrong or out of
          date.
        </p>
        <p>
          The service is provided free of charge. There is no payment, subscription or
          billing in {APP_NAME} today.
        </p>
      </>
    ),
  },
  {
    id: "your-account",
    title: "Your account",
    body: (
      <>
        <p>
          You need an account for everything except the landing page and these legal pages.
          You can register with an email address and password, or sign in with Google.
        </p>
        <p>When you have an account:</p>
        <ul>
          <li>Give accurate information, and keep your email address current so you can recover access</li>
          <li>Keep your password and your Google account secure, and do not share your credentials</li>
          <li>
            You are responsible for what happens under your account, including anything
            done by someone you gave access to
          </li>
          <li>Tell us at {P.contactEmail} if you think someone else is using your account</li>
        </ul>
        <p>
          One person gets one account, and one account holds one library. Do not create an
          account for someone else without their permission, and do not use another
          person&apos;s account.
        </p>
        <p>
          Account deletion is not yet available as a button in the app. Ask us at{" "}
          {P.contactEmail} and we will delete the account and its contents.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: (
      <>
        <p>Do not do any of the following:</p>
        <ul>
          <li>
            Try to reach data that is not yours, including another user&apos;s library,
            profile or account
          </li>
          <li>
            Probe, scan or test the security of the service, or work around authentication,
            access controls or rate limits
          </li>
          <li>
            Interfere with the service or the infrastructure it runs on, including
            deliberately overloading it
          </li>
          <li>
            Scrape or bulk collect content from {APP_NAME} with automated tools, or run
            automated traffic against it at a volume a person could not produce
          </li>
          <li>
            Use the catalogue data reached through {APP_NAME} to build a competing dataset,
            or in any way the underlying providers prohibit
          </li>
          <li>
            Upload or write content that is illegal, that harasses or threatens someone,
            that infringes another person&apos;s rights, or that contains malware
          </li>
          <li>Impersonate anyone, or claim a username in order to mislead</li>
          <li>Use {APP_NAME} for anything illegal where you are</li>
        </ul>
        <p>
          Reverse engineering, decompiling or copying the software behind {APP_NAME} is not
          permitted, except where the law gives you that right regardless of this agreement.
        </p>
      </>
    ),
  },
  {
    id: "your-content",
    title: "Your content",
    body: (
      <>
        <p>
          Your ratings, reviews, notes, tags, collections, profile text and every other
          entry you make are <strong>yours</strong>. Creating an account does not transfer
          ownership of any of it to us, and we do not claim a right to publish, sell or
          reuse your content for our own purposes.
        </p>
        <p>
          We need permission to operate the service, and no more than that. You grant us a
          limited licence to store, copy, process and display your content for the purpose
          of running {APP_NAME} for you: showing it back to you, computing your statistics
          and recommendations, backing it up, and showing it to the people you have chosen to
          share your library with. That licence ends when you delete the content or your
          account, subject to backups held for a short period.
        </p>
        <p>
          You are responsible for what you write. Do not post content you have no right to
          post. If you share your library, remember that reviews and history become readable
          by the people you shared with, as set out in the{" "}
          <LegalCrossLink href={ROUTES.privacy} label="Privacy Policy" />.
        </p>
        <p>
          We may remove content that breaks these terms or the law. We do not otherwise
          moderate, screen or edit what you write.
        </p>
      </>
    ),
  },
  {
    id: "recommendations",
    title: "Recommendations and information in the app",
    body: (
      <>
        <p>
          Recommendations are suggestions. They are produced by a deterministic scoring
          function that reads your library, your ratings and your viewing patterns, and they
          are ranked by that score alone. They are not a promise that you will enjoy
          anything, not professional advice, and not curated by a person.
        </p>
        <p>
          The reason shown under a recommendation describes the factors that moved its
          score. It is an explanation of a calculation, not a claim about the title itself.
        </p>
        <p>
          Details about films and series, including artwork, cast, release dates, runtimes,
          audience scores and streaming availability, come from third-party providers.{" "}
          {APP_NAME} does not verify that information. It can be incomplete, out of date or
          wrong, and it can change or disappear when a provider changes it. Statistics,
          insights and your year in review are calculated from what you recorded, so they
          are only as accurate as your own entries.
        </p>
      </>
    ),
  },
  {
    id: "third-party",
    title: "Third-party content and services",
    body: (
      <>
        <p>
          {APP_NAME} is built on services run by other companies, and their terms apply to
          your use of what they provide.
        </p>
        <p>
          <strong>
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </strong>
        </p>
        <p>
          Film and series metadata and artwork come from TMDB. Audience scores attributed to
          IMDb, Rotten Tomatoes and Metacritic are retrieved through OMDb. Trailers are
          played through YouTube&apos;s embedded player, so YouTube&apos;s terms and
          Google&apos;s policies apply when you watch one. Authentication and data storage
          run on Supabase. Google is an optional sign in provider.
        </p>
        <p>
          Links to other sites, including IMDb and streaming services, are provided for
          convenience. We do not control those sites and are not responsible for their
          content or their practices.
        </p>
        <p>
          Titles, artwork, logos, trademarks and other material relating to films and series
          belong to their respective owners. Nothing in {APP_NAME} grants you any right to
          that material beyond viewing it in the app.
        </p>
      </>
    ),
  },
  {
    id: "intellectual-property",
    title: "Our intellectual property",
    body: (
      <>
        <p>
          The {APP_NAME} software, its source code, its interface design, its name and its
          wordmark belong to us or our licensors. These terms do not give you a licence to
          copy, redistribute or create a derivative of them.
        </p>
        <p>
          You get a personal, revocable, non-transferable permission to use {APP_NAME} as it
          is offered, for your own use, in line with these terms.
        </p>
        <p>
          We claim nothing over third-party film and series material shown in the app, and
          nothing over your content.
        </p>
      </>
    ),
  },
  {
    id: "availability",
    title: "Availability and changes",
    body: (
      <>
        <p>
          We do not promise that {APP_NAME} will be available without interruption. It
          depends on third-party services, and it can go down when they do. We may take it
          offline for maintenance, and we may change, add or remove features.
        </p>
        <p>
          A feature you rely on today may work differently or disappear later. If we retire
          something that holds your data, we will give notice where we reasonably can.
        </p>
        <p>
          We may also stop offering {APP_NAME} entirely. If that happens, we will give
          reasonable notice so you can retrieve your data.
        </p>
      </>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    body: (
      <>
        <p>
          {APP_NAME} is provided as it is and as it is available. To the extent the law
          allows, we make no warranties of any kind about it, whether express or implied,
          including implied warranties of merchantability, fitness for a particular purpose
          and non-infringement.
        </p>
        <p>We specifically do not warrant that:</p>
        <ul>
          <li>The service will be uninterrupted, timely or free of errors</li>
          <li>Catalogue information, scores or streaming availability are accurate or current</li>
          <li>Recommendations will suit your taste</li>
          <li>Any defect will be corrected</li>
          <li>Your data can never be lost, though we take care to avoid it</li>
        </ul>
        <p>
          Keep your own copy of anything you cannot afford to lose. Some jurisdictions do
          not allow certain warranties to be excluded, so parts of this section may not
          apply to you.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    body: (
      <>
        <p>
          To the extent the law allows, we are not liable for indirect, incidental, special,
          consequential or punitive damages, or for lost profits, lost data, or loss of
          goodwill, arising from your use of {APP_NAME}.
        </p>
        <p>
          Because {APP_NAME} is provided free of charge, our total liability to you for all
          claims relating to the service is limited to the greater of the amount you paid us
          in the twelve months before the claim, which is currently nothing, or the minimum
          amount the law requires.
        </p>
        <p>
          Nothing here limits liability that cannot be limited by law, such as liability for
          death or personal injury caused by negligence, or for fraud. The enforceability of
          limitations like these varies by country, so their effect on you depends on the law
          of {P.jurisdiction} and on your own local law.
        </p>
      </>
    ),
  },
  {
    id: "indemnity",
    title: "Indemnification",
    body: (
      <p>
        You agree to indemnify us against claims, damages and reasonable costs, including
        legal fees, arising from your use of {APP_NAME} in breach of these terms, from
        content you posted, or from your infringement of someone else&apos;s rights. We will
        tell you about any such claim and let you take part in defending it.
      </p>
    ),
  },
  {
    id: "termination",
    title: "Suspension and termination",
    body: (
      <>
        <p>
          You can stop using {APP_NAME} whenever you want. To have your account and its
          contents deleted, write to {P.contactEmail}.
        </p>
        <p>
          We may suspend or terminate an account that breaks these terms, that is used to
          attack the service or another user, or where we are required to by law. Serious
          cases can be immediate. Otherwise we will normally contact you first and give you a
          chance to put it right.
        </p>
        <p>
          Enforcement is currently a manual decision by a person. There is no automated
          system in {APP_NAME} that suspends accounts.
        </p>
        <p>
          If your account is terminated, your right to use the service ends and your content
          may be deleted. The sections on your content, intellectual property, disclaimers,
          liability and indemnification survive termination.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    body: (
      <p>
        We may update these terms. The date at the top of the page shows the current
        version, and for a significant change we will give notice in the app before it takes
        effect. Continuing to use {APP_NAME} after that means you accept the updated terms.
        If you do not accept them, stop using the service and ask us to delete your account.
      </p>
    ),
  },
  {
    id: "governing-law",
    title: "Governing law and disputes",
    body: (
      <>
        <p>
          These terms are governed by the laws of {P.jurisdiction}, and the courts of{" "}
          {P.jurisdiction} have exclusive jurisdiction over any dispute, except where the law
          where you live gives you the right to bring a claim locally.
        </p>
        <p>
          Before starting a formal dispute, contact us at {P.contactEmail}. Most problems can
          be sorted out that way.
        </p>
      </>
    ),
  },
  {
    id: "general",
    title: "General",
    body: (
      <>
        <p>
          If any part of these terms is unenforceable, the rest still applies. Not enforcing
          a term straight away does not waive it. You may not transfer your rights under
          these terms to someone else; we may transfer ours if the service changes hands.
        </p>
        <p>
          These terms and the{" "}
          <LegalCrossLink href={ROUTES.privacy} label="Privacy Policy" /> are the whole
          agreement between you and us about {APP_NAME}.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        {APP_NAME} is operated by {LEGAL_OPERATOR.name}. Questions about these terms go to{" "}
        {P.contactEmail}. For questions about your data, see our{" "}
        <LegalCrossLink href={ROUTES.privacy} label="Privacy Policy" />.
      </p>
    ),
  },
];

export default function TermsOfServicePage() {
  return (
    <LegalPage
      title="Terms of Service"
      lede={`The rules for using ${APP_NAME}: your account, your content, and what the service does and does not promise. Written to describe the service as it works today.`}
      sections={SECTIONS}
      pendingReview
    />
  );
}
