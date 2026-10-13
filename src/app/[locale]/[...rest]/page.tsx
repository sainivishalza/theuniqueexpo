import { notFound } from "next/navigation";

// Any URL under a valid locale that no other route matches lands here and
// renders the localized 404 page (../not-found.tsx) inside the normal site
// layout, with a real 404 status. Without this, unmatched URLs fell through
// to Next's bare built-in "404: This page could not be found." screen.
export default function CatchAll() {
  notFound();
}
