import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log In",
  description: "Log in to The Unique Expo to manage your registrations, buy requests, and quotes.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
