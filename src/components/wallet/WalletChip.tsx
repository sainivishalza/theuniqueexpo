import { Link } from "@/i18n/navigation";
import { formatNumber } from "@/lib/format";

// A small gold pill with the wallet balance that opens the wallet. Shown in the phone top bar and the
// site header so a buyer always sees their points. The caller supplies the spoken label.
export default function WalletChip({ balance, ariaLabel, href = "/dashboard/buyer/wallet", onClick, className = "inline-flex" }: { balance: number; ariaLabel: string; href?: string; onClick?: () => void; className?: string }) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      onClick={onClick}
      className={`${className} shrink-0 items-center gap-1.5 rounded-full bg-gold-400 px-3 py-1.5 text-sm font-extrabold tabular-nums text-emerald-950 shadow-sm hover:bg-gold-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400`}
    >
      <span aria-hidden="true">💰</span>
      <span aria-hidden="true">{formatNumber(balance)}</span>
    </Link>
  );
}
