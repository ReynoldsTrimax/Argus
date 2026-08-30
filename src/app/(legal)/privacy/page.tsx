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
  title: "Privacy Policy",
  description:
    "What Argus stores about your account and library, how that information is used, and who else processes it.",
};

/**
 * Privacy Policy.
 *
 * Written against the current implementation. Anything not verifiable in the
 * repository is either omitted or marked with a bracketed placeholder, so the
 * document does not describe data practices Argus does not have.
 */
const SECTIONS: LegalSection[] = [
  {
    id: "scope",
    title: "What this policy covers",
    body: (
      <>
        <p>
          This policy explains what {APP_NAME} stores about you, why it stores it, and who
          else can see it. It applies to the {APP_NAME} website and web app, including the
          landing page, sign in and sign up, and everything behind your account.
        </p>
        <p>
          {APP_NAME} is a personal tracker for films and series. You add titles you are
          watching or have watched, and you can record ratings, reviews, notes, tags and
          collections against them. Almost everything in this policy is about that
          content, because that is the bulk of what the service holds.
        </p>
        <p>
          In this policy, <strong>we</strong> means {LEGAL_OPERATOR.name}, the{" "}
          {LEGAL_OPERATOR.noun} of {APP_NAME}.
        </p>
      </>
    ),
  },
  {
    id: "information-we-collect",
    title: "Information we collect",
    body: (
      <>
        <p>
          Everything below is information you enter or generate by using the app. There is
          no analytics service, no advertising identifier and no tracking pixel in{" "}
          {APP_NAME}, so there is no behavioural profile collected in the background.
        </p>

        <h3>Account information</h3>
        <p>
          Sign in works one of two ways: an email address with a password, or a Google
          account. Accounts are handled by Supabase Auth, which stores your email address
          and, for password accounts, a hashed password. We never receive your password in
          readable form. If you sign up with an email address, the display name you type is
          also stored on the account record.
        </p>
        <p>
          If you sign in with Google, Google tells {APP_NAME} the basic profile details
          attached to that Google account, which normally means your email address, your
          name and a link to your profile picture. {APP_NAME} does not receive your Google
          password and does not request access to any other Google data.
        </p>

        <h3>Profile information</h3>
        <p>
          Your profile can hold a username, a display name, a short bio, an avatar image
          URL and a website link. It also holds two visibility settings: whether your
          profile can be found by other signed in users, and who may read your library.
          All of these are optional except the username, which other people need in order
          to find you.
        </p>

        <h3>Library and activity</h3>
        <p>
          For each title you track, {APP_NAME} stores the title, whether it is a film or a
          series, its identifier and basic details from the catalogue, and your own record
          against it. That record can include:
        </p>
        <ul>
          <li>Watch status, such as watching, completed, paused, dropped or wishlist</li>
          <li>Progress, including minutes for films and episodes and seasons for series</li>
          <li>
            Flags you set yourself: favourite, pinned, archived and hidden, plus a rewatch
            count
          </li>
          <li>
            Watch sessions, with the date, duration, whether it was a rewatch, and any
            optional notes or session details you add
          </li>
          <li>
            Ratings, along with a history of previous ratings so an earlier score is not
            overwritten
          </li>
          <li>
            Reviews, including a spoiler flag and earlier versions of a review you have
            edited
          </li>
          <li>Private notes, tags and collections you create</li>
          <li>Status changes over time, and titles you recently viewed</li>
          <li>
            An activity log of actions in the app, such as adding a title, rating one or
            writing a review
          </li>
        </ul>

        <h3>Settings and preferences</h3>
        <p>
          Stored settings include theme, interface density, language, timezone, reduced
          motion, sidebar state, which page you land on, preferred content languages,
          spoiler protection, and two flags for whether you want account emails and
          marketing emails. {APP_NAME} does not currently send marketing email, so that
          flag records a preference for a feature that does not exist yet.
        </p>

        <h3>Search history</h3>
        <p>
          Searches you run in the app are stored against your account and shown back to
          you as recent searches. Queries shorter than two characters are not stored.
        </p>

        <h3>Friends</h3>
        <p>
          If you use the friends feature, {APP_NAME} stores who sent each request, who
          received it, and whether it is pending, accepted or declined.
        </p>

        <h3>Technical information</h3>
        <p>
          Signing in sets session cookies in your browser. Beyond that, {APP_NAME} does
          not run its own logging or telemetry. The services that host the app and the
          database necessarily process technical details in order to serve a request, such
          as your IP address, your browser user agent and the time of the request. That
          processing is theirs, under their own policies, and {APP_NAME} does not build any
          profile from it.
        </p>
        <p>
          There is no payment processing in {APP_NAME}, so no card or billing details are
          collected.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use-it",
    title: "How we use information",
    body: (
      <>
        <p>Information is used to run the service. In practice that means:</p>
        <ul>
          <li>Creating your account and keeping you signed in across visits</li>
          <li>
            Storing your library so it is the same on every device you sign in from
          </li>
          <li>Showing your progress, statistics, streaks and year in review</li>
          <li>Ranking recommendations, as described in the next section</li>
          <li>
            Showing your library to people you have chosen to share it with, and to nobody
            else
          </li>
          <li>Keeping the service working, including diagnosing failures</li>
          <li>
            Protecting accounts and the service against abuse, and enforcing our{" "}
            <LegalCrossLink href={ROUTES.terms} label="Terms of Service" />
          </li>
        </ul>
        <p>
          Your library is not used to advertise to you, and it is not sold or rented to
          anyone.
        </p>
      </>
    ),
  },
  {
    id: "recommendations",
    title: "How recommendations work",
    body: (
      <>
        <p>
          Recommendations are produced by a scoring function that runs on our server. It is
          deterministic, which means the same library and the same catalogue data always
          produce the same ranking. There is no machine learning model and no generative AI
          service involved, and your library is never sent to an AI provider.
        </p>
        <p>The ranking reads the following from your own account:</p>
        <ul>
          <li>Titles in your library and their status, including what you dropped</li>
          <li>Your ratings and how they compare to each other</li>
          <li>Genres, keywords and themes that recur in what you watch</li>
          <li>Directors, writers and cast who recur in what you watch</li>
          <li>Release decades you return to</li>
          <li>Typical runtime and how often you finish what you start</li>
          <li>Favourites, rewatches and film or series bias</li>
          <li>Original language of what you watch</li>
        </ul>
        <p>
          Titles already in your library are excluded from suggestions, and so are titles
          you have marked as hidden. Hidden titles are also left out of your statistics and
          insights. Every recommendation shown in the app carries the reason it was
          selected, drawn from the same factors that produced its score.
        </p>
        <p>
          To find candidate titles, our server asks the catalogue provider for things like
          titles in a genre, other work by a person, or entries in a film collection. Those
          requests are made by {APP_NAME} using our own API credentials. They contain the
          genre, person or title identifiers we are asking about, and they do not contain
          your account, your email address or your library.
        </p>
        <p>
          One account has one library and one set of recommendations. {APP_NAME} does not
          support multiple viewing profiles inside a single account, and recommendations are
          never computed across accounts, so another person&apos;s activity cannot change
          what you are shown.
        </p>
      </>
    ),
  },
  {
    id: "sharing-with-people",
    title: "Sharing with friends and profile visibility",
    body: (
      <>
        <p>
          {APP_NAME} has a friends feature, and your library visibility setting controls who
          can read your library. It has three values:
        </p>
        <ul>
          <li>
            <strong>Private</strong>, meaning nobody but you
          </li>
          <li>
            <strong>Friends</strong>, meaning people whose friend request you accepted, or
            whose request you sent and they accepted
          </li>
          <li>
            <strong>Public</strong>, meaning any signed in {APP_NAME} user who visits your
            profile
          </li>
        </ul>
        <p>
          <strong>
            The current default for a new account is friends, not private.
          </strong>{" "}
          You can change it in the app at any time. Nothing is readable by people who are
          not signed in: there is no signed out view of anyone&apos;s library.
        </p>
        <p>
          When your library is shared, the profile page shows your tracked titles with
          their status, progress and your rating. The database permits a viewer who is
          allowed to read your library to read a wider set of records than that page
          currently displays, including your watch sessions, rating history, status history,
          activity log, collections and reviews. Your private notes and your tags are not
          included. If you want none of this visible to anyone, set library visibility to
          private.
        </p>
        <p>
          Titles you have marked as hidden are excluded from recommendations and statistics,
          but they are not currently excluded from a shared library view. Treat hidden as an
          organising tool rather than a privacy control.
        </p>
      </>
    ),
  },
  {
    id: "sharing-with-others",
    title: "How information is shared with others",
    body: (
      <>
        <p>We do not sell your information and we do not share it for advertising.</p>
        <p>Information leaves {APP_NAME} in only these situations:</p>
        <ul>
          <li>
            <strong>Service providers.</strong> The companies that host the app, the
            database and authentication necessarily process your data so that {APP_NAME} can
            run. They are listed in the next section.
          </li>
          <li>
            <strong>People you share with.</strong> Friends, or any signed in user if you
            set your library to public, as described above.
          </li>
          <li>
            <strong>Legal and safety.</strong> If we are required by law to disclose
            information, or where disclosure is necessary to investigate abuse or protect
            the service and its users.
          </li>
          <li>
            <strong>A change of ownership.</strong> If the service is transferred to
            another operator, account data would move with it. We would publish notice
            before that happened.
          </li>
        </ul>
        <p>
          The catalogue and ratings providers do not receive your library, your account or
          your email address. They receive requests for public information about films and
          series, sent by our server.
        </p>
      </>
    ),
  },
  {
    id: "third-parties",
    title: "Third-party services we use",
    body: (
      <>
        <p>
          {APP_NAME} depends on the services below. Each has its own privacy policy, and we
          suggest reading the ones that matter to you.
        </p>
        <ul>
          <li>
            <strong>Supabase</strong> provides authentication and the PostgreSQL database.
            Your account, profile, library and every record described in this policy are
            stored there. Supabase also sends the confirmation email when you register with
            an email address.
          </li>
          <li>
            <strong>Google</strong> is an optional sign in method. If you use it, Google
            knows you signed in to {APP_NAME}. Profile pictures from Google accounts are
            loaded from Google&apos;s image servers by your browser.
          </li>
          <li>
            <strong>TMDB</strong> supplies film and series metadata and artwork. Artwork is
            loaded directly from TMDB&apos;s image servers by your browser, which means TMDB
            receives the request for those images.
          </li>
          <li>
            <strong>OMDb</strong> supplies IMDb, Rotten Tomatoes and Metacritic scores when
            the operator has configured a key for it. These requests are made by our
            server.
          </li>
          <li>
            <strong>YouTube</strong> hosts trailers. When a page with a trailer loads, your
            browser contacts YouTube to fetch its player, so YouTube and Google can receive
            your IP address and set their own cookies. This happens whether or not you press
            play.
          </li>
          <li>
            <strong>Our hosting provider</strong> serves the app and processes requests in
            order to do so. The project is set up to deploy to Vercel.
          </li>
        </ul>
        <p>
          Links out to IMDb and similar sites are ordinary links. Following one is a visit
          to that site, on their terms.
        </p>
        <p>
          There is no analytics provider, error monitoring service, session recorder,
          advertising network or A/B testing tool in {APP_NAME}.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and browser storage",
    body: (
      <>
        <p>
          {APP_NAME} does not use tracking or advertising cookies. What it does use:
        </p>
        <ul>
          <li>
            <strong>Session cookies</strong> set by Supabase Auth when you sign in. They
            keep you signed in and are refreshed as you browse. Clearing them signs you out.
          </li>
          <li>
            <strong>Local storage</strong> for small interface preferences kept only in your
            browser: whether the sidebar is collapsed, your animation and poster density
            choices, and your recent and pinned searches.
          </li>
          <li>
            <strong>A service worker cache</strong> so the app can show an offline page and
            load faster. It caches the offline page, the app manifest and versioned static
            assets. It is written not to intercept authentication routes, API routes or any
            request to another site.
          </li>
        </ul>
        <p>
          Third-party services can set their own cookies when your browser talks to them,
          most notably YouTube when a trailer is present on a page.
        </p>
        <p>
          {APP_NAME} does not use session storage or IndexedDB for your data.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "Data retention",
    body: (
      <>
        <p>
          Your account and library are kept for as long as your account exists. There is no
          automatic expiry, and no scheduled deletion job. We would rather say that plainly
          than publish a retention schedule the service does not implement.
        </p>
        <p>
          When you delete something in the app, such as a library entry, a note, a
          collection or a friendship, that record is deleted from the database. Deleting a
          library entry also removes the progress, sessions, rating history and review
          attached to it. Backups held by our database provider may retain deleted content
          for a period set by that provider.
        </p>
        <p>
          Some records are deliberately historical. Rating history keeps your earlier
          scores, review versions keep earlier drafts, and the activity log keeps a record
          of past actions. These exist so your own history is not silently rewritten, and
          they are removed when the entry or account they belong to is removed.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <>
        <p>
          We use reasonable technical measures designed to protect your information. No
          service can promise that it will never be breached, and we do not make that
          promise.
        </p>
        <p>Measures currently in place include:</p>
        <ul>
          <li>
            Row level security on every table in the database, so a signed in user can read
            and write their own rows, plus the specific read access described in the
            visibility section above. A viewer of a shared library can never write to it.
          </li>
          <li>
            Server side session checks on protected routes, which revalidate the session
            with the authentication service rather than trusting a cookie, and which fail
            closed by treating an unverifiable session as signed out
          </li>
          <li>Passwords handled and hashed by Supabase Auth, never stored by us in readable form</li>
          <li>Validation of submitted data on the server before it reaches the database</li>
          <li>
            Redirects after sign in restricted to paths inside {APP_NAME}, so a crafted link
            cannot bounce you to another site
          </li>
          <li>
            HTTP response headers including HSTS, a denial of framing, no MIME type
            sniffing, a restrictive referrer policy, and a permissions policy that blocks
            camera, microphone and location access
          </li>
          <li>Traffic to the app and to every third-party API listed above sent over HTTPS</li>
        </ul>
        <p>
          Keeping your own account secure matters too. Use a password you do not reuse
          elsewhere, and sign out on devices you share.
        </p>
      </>
    ),
  },
  {
    id: "your-choices",
    title: "Your choices",
    body: (
      <>
        <p>What you can do inside the app today:</p>
        <ul>
          <li>Edit your profile, including your username, display name, bio and avatar</li>
          <li>Change who can see your library, or set it to private</li>
          <li>
            Edit or delete your library entries, notes, tags, collections and friendships
          </li>
          <li>Change your interface, language and notification preferences</li>
          <li>Sign out from the account menu</li>
        </ul>
        <p>
          Some things are not yet self service. There is no button that deletes your whole
          account, no button that clears your stored search history, and no export of your
          data in the interface. For any of those, and for a copy or correction of what we
          hold about you, write to {P.privacyEmail} and we will handle it manually.
        </p>
        <p>
          Depending on where you live, you may have rights over your personal information,
          such as access, correction, deletion or a copy in portable form. We will respond
          to requests of that kind. We are not claiming certification under any particular
          privacy regime, and the legal basis and exact scope of those rights is a matter
          for {P.jurisdiction}.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <>
        <p>
          {APP_NAME} is intended for general audiences and is not directed at young
          children. The service does not currently ask for or verify your age at any point.
        </p>
        <p>
          A minimum age of {P.minimumAge} applies to accounts. If we learn that an account
          belongs to someone below that age, we will remove it. If you believe a child has
          created an account, contact us at {P.privacyEmail}.
        </p>
      </>
    ),
  },
  {
    id: "international",
    title: "Where your information is held",
    body: (
      <>
        <p>
          {APP_NAME} is reachable from anywhere with a browser. Our database, authentication
          and hosting providers operate infrastructure in a number of countries, and the
          region in use depends on how the operator has configured those services. If you
          use {APP_NAME} from outside that region, your information will be transferred to
          and processed in it.
        </p>
        <p>
          If you need to know the specific region your data is stored in, ask us at{" "}
          {P.privacyEmail}.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <>
        <p>
          We will update this policy when the service changes in a way that affects it. The
          date at the top of the page is the date of the current version.
        </p>
        <p>
          For a change that materially reduces your privacy, we will give notice in the app
          before it takes effect rather than quietly editing this page. Continuing to use{" "}
          {APP_NAME} after a change takes effect means the updated policy applies to you.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <>
        <p>
          Questions about this policy, or about the information {APP_NAME} holds about you,
          go to {P.privacyEmail}.
        </p>
        <p>
          {APP_NAME} is operated by {LEGAL_OPERATOR.name}. General enquiries can go to{" "}
          {P.contactEmail}.
        </p>
        <p>
          See also our <LegalCrossLink href={ROUTES.terms} label="Terms of Service" />.
        </p>
      </>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lede={`What ${APP_NAME} stores about you, why it stores it, and who else can see it. This describes the service as it works today rather than as it might work later.`}
      sections={SECTIONS}
      pendingReview
    />
  );
}
