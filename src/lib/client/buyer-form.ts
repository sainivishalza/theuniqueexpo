"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { choiceLabel, defaultFormItems, itemLabel, type FormItem } from "@/lib/buyer-form";

interface BuyerForm {
  documents: FormItem[];
  fields: FormItem[];
}

// What buyers are asked for right now (Admin -> Buyer form settings): the documents and the extra
// information fields, in order. `ready` turns true once the list has arrived; until then (or if
// it cannot be loaded) the built-in documents are the fallback so a screen is never empty.
export function useBuyerForm(enabled = true) {
  const locale = useLocale();
  const [form, setForm] = useState<BuyerForm>({ documents: defaultFormItems(), fields: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    fetch("/api/buyer-form")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (live && data && Array.isArray(data.documents) && Array.isArray(data.fields)) setForm({ documents: data.documents, fields: data.fields });
      })
      .catch(() => {})
      .finally(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
    };
  }, [enabled]);

  return {
    documents: form.documents,
    fields: form.fields,
    ready,
    label: (item: Pick<FormItem, "labels">) => itemLabel(item, locale),
    choice: (item: Pick<FormItem, "options">, value: string) => choiceLabel(item, value, locale),
  };
}
