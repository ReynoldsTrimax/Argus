import localFont from "next/font/local";

/**
 * Bostone — used exclusively for the Argus wordmark.
 *
 * Personal-use license only (see `src/assets/fonts/README-LICENSE.txt`):
 * this file must not be referenced by anything other than the `Logo`
 * component, and this project must remain non-commercial for as long as it
 * is used.
 */
export const bostone = localFont({
  src: "../../assets/fonts/Bostone.ttf",
  variable: "--font-bostone",
  display: "swap",
});
