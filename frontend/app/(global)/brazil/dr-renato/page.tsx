import { redirect } from "next/navigation";

/**
 * The share page briefly lived here, locale-less, and links to it are already
 * out in the wild. It now sits at `/brazil/<locale>/dr-renato` so the header
 * language switcher (which swaps the `[lang]` segment) works on it, so this
 * route just forwards to the Portuguese one — its audience, and what the old
 * URL served by default.
 */
export default function DrRenatoLegacyRedirect(): never {
  redirect("/brazil/pt/dr-renato");
}
