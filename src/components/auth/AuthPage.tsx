import Logo from "@/components/Logo";

// The plain page frame for the sign-in help screens (forgot / reset password).
export default function AuthPage({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-cream-50 px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8"><Logo /></div>
        <h1 className="mb-2 text-3xl font-extrabold text-heading">{title}</h1>
        {intro && <p className="mb-6 text-gray-600">{intro}</p>}
        {children}
      </div>
    </main>
  );
}
