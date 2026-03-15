import Link from "next/link";
import { Logo } from "@/components/logo";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-[#2D2D2D] border-b border-[#444444] px-6 py-4">
        <Link href="/">
          <Logo />
        </Link>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-12">{children}</main>
    </div>
  );
}
