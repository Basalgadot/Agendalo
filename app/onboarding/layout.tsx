export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-secondary">
      <header className="bg-white border-b border-border px-6 py-4">
        <span className="text-lg font-bold text-primary">agéndalo</span>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-12">{children}</main>
    </div>
  );
}
