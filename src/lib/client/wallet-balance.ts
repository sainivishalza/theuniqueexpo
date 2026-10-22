"use client";

import { useEffect, useState } from "react";
import { usePathname } from "@/i18n/navigation";

export interface WalletBalance {
  balance: number;
  frozen: boolean;
  pendingWithdrawal: number;
}

// The signed-in buyer's wallet balance, for the little wallet pill and the wallet card. It is read
// again whenever the page changes, so points that arrive (or are spent) show up soon after.
// Returns null until it is known, and stays null for anyone without a wallet or if it cannot be read.
export function useWalletBalance(enabled: boolean): WalletBalance | null {
  const pathname = usePathname();
  const [wallet, setWallet] = useState<WalletBalance | null>(null);

  useEffect(() => {
    if (!enabled) {
      setWallet(null);
      return;
    }
    let live = true;
    fetch("/api/wallet")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (live && data && typeof data.balance === "number") {
          setWallet({ balance: data.balance, frozen: !!data.frozen, pendingWithdrawal: Number(data.pendingWithdrawal) || 0 });
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [enabled, pathname]);

  return wallet;
}
