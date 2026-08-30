/**
 * Shared facts for the Terms of Service and Privacy Policy.
 *
 * Confirmed details live in LEGAL_OPERATOR. Anything still outstanding lives in
 * LEGAL_PLACEHOLDERS and renders inside square brackets, so an unfinished
 * document is obvious on sight and grepping for "[" lists what is left.
 */

/** Date the legal documents were last reviewed. Update when the text changes. */
export const LEGAL_LAST_UPDATED = "30 August 2026";

/**
 * Who operates Argus.
 *
 * Two named individuals rather than a registered company, so the documents say
 * "operators" and treat them as natural persons. If the service is ever moved
 * into a company, this is the only place the name has to change.
 */
export const LEGAL_OPERATOR = {
  /** Used wherever the documents name who you are contracting with. */
  name: "Paarth Sharma and Ishaan Jangid",
  /** Grammatical helper so prose does not have to guess at singular or plural. */
  noun: "operators",
} as const;

/**
 * Details that do not exist anywhere in the codebase and cannot be inferred.
 * These render verbatim so the gaps are visible until an owner fills them in.
 */
export const LEGAL_PLACEHOLDERS = {
  contactEmail: "[CONTACT EMAIL]",
  privacyEmail: "[PRIVACY CONTACT EMAIL]",
  jurisdiction: "[JURISDICTION]",
  minimumAge: "[MINIMUM AGE]",
} as const;
