"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { formatNumber } from "@/lib/format";
import { errorKey, walletApi } from "@/lib/client/wallet-client";
import type { ReferralSettings, ReferralStatus } from "@/lib/referral";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import WalletLayout from "../_components/WalletLayout";

interface Summary {
  code: string;
  settings: ReferralSettings;
  invited: number;
  rewarded: number;
  earned: number;
  limitReached: boolean;
  items: { id: number; name: string; status: ReferralStatus; points: number; createdAt: string }[];
}

const TONE: Record<ReferralStatus, BadgeTone> = { pending: "warning", rewarded: "success", rejected: "gray" };

// "Invite a friend": the buyer's personal link, what the programme pays right now (the admin edits it), and the people
// they invited with where each one stands.
export default function WalletInvitePage() {
  const t = useTranslations("buyerWallet");
  const ti = useTranslations("buyerWallet.invite");
  const locale = useLocale();
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  const isBuyer = user?.role === "buyer";
  useEffect(() => {
    setOrigin(window.location.origin);
    if (!isBuyer) return;
    let stale = false;
    walletApi<Summary>("/api/referrals/me").then((res) => {
      if (stale) return;
      if (!res.ok) setError(t(`errors.${errorKey(res.data.code)}`));
      else setSummary(res.data);
    });
    return () => {
      stale = true;
    };
  }, [isBuyer, t]);

  const link = summary && origin ? `${origin}/${locale}/register?invite=${summary.code}` : "";
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // the link is also shown in the box, so it can be copied by hand
    }
  }

  async function shareLink() {
    try {
      await navigator.share({ title: ti("title"), text: ti("shareText"), url: link });
    } catch {
      // closed without sharing
    }
  }

  const s = summary?.settings;
  const rule = !s
    ? ""
    : s.referrerPoints > 0 && s.referredPoints > 0
      ? ti("ruleBoth", { trigger: s.trigger, mine: formatNumber(s.referrerPoints), theirs: formatNumber(s.referredPoints) })
      : s.referrerPoints > 0
        ? ti("ruleMine", { trigger: s.trigger, mine: formatNumber(s.referrerPoints) })
        : ti("ruleTheirs", { trigger: s.trigger, theirs: formatNumber(s.referredPoints) });

  return (
    <WalletLayout title={ti("title")} subtitle={ti("subtitle")} signInNext="/dashboard/buyer/wallet/invite">
      {error && <p role="alert" className="mb-4 text-red-700">{error}</p>}
      {!summary && !error && <p className="text-center text-gray-700">{t("loading")}</p>}
      {summary && s && (
        <div className="space-y-6">
          {!s.enabled ? (
            <Card shadow="sm" bordered={false} className="p-5" data-testid="invite-off">
              <p className="text-gray-800">{ti("off")}</p>
            </Card>
          ) : (
            <>
              <Card shadow="sm" bordered={false} className="p-5 space-y-3" data-testid="invite-rule">
                <p className="font-semibold text-heading">{rule}</p>
                {s.maxPerReferrer > 0 && <p className="text-sm text-gray-700">{ti("cap", { max: formatNumber(s.maxPerReferrer) })}</p>}
                {summary.limitReached && <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" data-testid="invite-limit">{ti("limitReached", { max: formatNumber(s.maxPerReferrer) })}</p>}
              </Card>

              <Card shadow="sm" bordered={false} className="p-5 space-y-3">
                <label htmlFor="invite-link" className="block text-sm font-semibold text-gray-800">{ti("linkLabel")}</label>
                <input
                  id="invite-link"
                  readOnly
                  value={link}
                  onFocus={(e) => e.currentTarget.select()}
                  data-testid="invite-link"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                />
                <p className="text-sm text-gray-700" data-testid="invite-code">{ti("codeLabel", { code: summary.code })}</p>
                <div className="flex flex-wrap gap-3">
                  <Button type="button" variant="gradientCta" onClick={copyLink} data-testid="invite-copy">{ti("copy")}</Button>
                  {canShare && <Button type="button" variant="secondaryOutline" onClick={shareLink}>{ti("share")}</Button>}
                </div>
                {copied && <p role="status" className="text-sm text-green-800">{ti("copied")}</p>}
              </Card>
            </>
          )}

          <div className="grid grid-cols-3 gap-3" data-testid="invite-stats">
            {([["invited", summary.invited], ["rewarded", summary.rewarded], ["earned", summary.earned]] as const).map(([key, value]) => (
              <Card key={key} shadow="sm" bordered={false} className="p-4 text-center">
                <p className="text-2xl font-extrabold text-heading" data-testid={`invite-${key}`}>{formatNumber(value)}</p>
                <p className="text-xs font-semibold text-gray-700">{ti(key)}</p>
              </Card>
            ))}
          </div>

          <div>
            <h2 className="text-xl font-bold text-heading">{ti("listTitle")}</h2>
            {summary.items.length === 0 ? (
              <p className="mt-3 text-gray-700" data-testid="invite-empty">{ti("empty")}</p>
            ) : (
              <ul className="mt-3 space-y-2" data-testid="invite-list">
                {summary.items.map((item) => (
                  <li key={item.id}>
                    <Card shadow="sm" bordered={false} className="flex items-center justify-between gap-3 p-4">
                      <span className="font-semibold text-heading [overflow-wrap:anywhere]">{item.name}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        {item.points > 0 && <span className="text-sm font-bold text-green-800">{ti("pointsEarned", { points: formatNumber(item.points) })}</span>}
                        <Badge tone={TONE[item.status]}>{ti(item.status === "pending" ? "statusPending" : item.status === "rewarded" ? "statusRewarded" : "statusRejected")}</Badge>
                      </span>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </WalletLayout>
  );
}
