// Turns arbitrary text (titles with emoji, punctuation, "&", extra spaces,
// etc.) into a URL-safe slug: lowercase letters/numbers separated by single
// hyphens, no leading/trailing hyphen. Used both client-side (to suggest a
// slug from the exhibition title) and server-side (to guarantee whatever
// ends up in the database is always URL-safe, regardless of what the client
// sent).
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-") // any run of non letters/numbers (emoji, &, spaces, punctuation) -> one hyphen
    .replace(/^-+|-+$/g, ""); // no leading/trailing hyphen
}
