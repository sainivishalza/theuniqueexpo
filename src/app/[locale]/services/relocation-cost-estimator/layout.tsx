import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Relocation Cost Estimator",
  description: "Free calculator for estimating office, residential, freight, or pet relocation costs to or within China -- then request an exact quote.",
};

export default function RelocationCostEstimatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
