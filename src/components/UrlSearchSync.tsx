"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function Inner({ onChange }: { onChange: (q: string) => void }) {
  const q = useSearchParams().get("q") || "";
  useEffect(() => {
    if (q) onChange(q);
    // onChange is a state setter in every caller; only a new "?q=" matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  return null;
}

// Fills a list's search box from "?q=..." in the address -- also when the admin menu's
// search sends you to the page you are already on with a different query.
export default function UrlSearchSync({ onChange }: { onChange: (q: string) => void }) {
  return (
    <Suspense fallback={null}>
      <Inner onChange={onChange} />
    </Suspense>
  );
}
