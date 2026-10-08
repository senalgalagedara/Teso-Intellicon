import { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen relative">
      <Link
        href="/"
        className="absolute top-4 left-4 md:top-6 md:left-6 z-50 inline-flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 text-sm md:text-base border-2 border-blue-600 bg-white text-blue-600 rounded-lg md:rounded-xl shadow-sm hover:bg-blue-50 hover:scale-105 active:scale-95 transition-all font-semibold duration-200"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>
      {children}
    </div>
  );
}
