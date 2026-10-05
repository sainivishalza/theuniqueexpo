import { useCallback, useEffect, useRef, useState } from "react";

// Admin CRUD pages render their edit/new form above a long list. On a phone,
// clicking Edit on a card further down changed state but left the form
// off-screen, so the click looked dead. Attach `formRef` to the form's
// <section> and call `scrollToForm()` from openEdit/openNew.
export function useFormScroll() {
  const formRef = useRef<HTMLElement>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (tick > 0) formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [tick]);

  const scrollToForm = useCallback(() => setTick((n) => n + 1), []);
  return { formRef, scrollToForm };
}
