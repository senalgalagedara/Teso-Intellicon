"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Keyboard, ArrowRight, Sparkles, Loader2, Info } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function JoinFormContent() {
  const [examCode, setExamCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle pre-filling code from query parameters
  useEffect(() => {
    const codeParam = searchParams.get("code") || searchParams.get("examCode") || "";
    if (codeParam) {
      setExamCode(codeParam.toUpperCase().trim());
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = examCode.trim().toUpperCase();
    if (!cleanCode) {
      setError("Please enter an exam code");
      return;
    }
    if (cleanCode.length < 4) {
      setError("Exam code must be at least 4 characters");
      return;
    }
    if (!/^[A-Za-z0-9\-_]+$/.test(cleanCode)) {
      setError("Exam code can only contain letters, numbers, hyphens and underscores");
      return;
    }

    setLoading(true);
    setError("");

    // Redirect to candidate identity check-in page
    router.push(`/candidate/identity?examCode=${encodeURIComponent(cleanCode)}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between py-12 px-6 bg-[var(--background)] relative overflow-hidden">
      {/* ── Ambient background ── */}
      <div className="fixed inset-0 pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            rotate: [0, 45, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-1/4 left-1/4 w-[600px] h-[600px] bg-indigo-500/10 blur-[130px] rounded-full"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, -30, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-1/4 right-1/4 w-[500px] h-[500px] bg-violet-500/8 blur-[120px] rounded-full"
        />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* ── Header / Logo ── */}
      <header className="relative z-10 w-full max-w-md flex justify-center">
        <Link href="/" className="flex items-center gap-3 group" aria-label="Teso Exams Home">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
            <Image
              src="/teso-logo.png"
              alt="Teso"
              width={22}
              height={22}
              className="object-contain"
            />
          </div>
          <span className="text-[var(--foreground)] font-black text-xl tracking-tight">
            Teso <span className="gradient-text">Exams</span>
          </span>
        </Link>
      </header>

      {/* ── Main card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md my-auto"
      >
        {/* Header badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex justify-center mb-6"
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-xs font-bold uppercase tracking-widest shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            Candidate Entry
          </div>
        </motion.div>

        {/* Card Container */}
        <div className="bg-[var(--background-card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-2xl shadow-black/5">
          {/* Accent top gradient strip */}
          <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />

          <div className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight mb-2">
                Join an Exam Session
              </h1>
              <p className="text-sm text-[var(--foreground-muted)] max-w-[280px] mx-auto leading-relaxed">
                Enter the unique exam code provided by your host to start check-in.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="examCode"
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)]"
                >
                  <Keyboard className="w-3.5 h-3.5 text-indigo-500" />
                  Exam Code
                </Label>
                <div className="relative flex items-center">
                  <Input
                    id="examCode"
                    type="text"
                    value={examCode}
                    onChange={(e) => {
                      setExamCode(e.target.value.toUpperCase().replace(/\s/g, ""));
                      setError("");
                    }}
                    placeholder="e.g. ABCD"
                    required
                    autoFocus
                    autoComplete="off"
                    spellCheck="false"
                    className="bg-[var(--background)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:border-indigo-500/70 focus:ring-indigo-500/20 rounded-xl h-14 pl-4 pr-12 text-lg font-mono font-bold tracking-widest uppercase transition-all shadow-sm"
                  />
                  {examCode && (
                    <button
                      type="button"
                      onClick={() => setExamCode("")}
                      className="absolute right-4 text-xs font-bold text-[var(--foreground-subtle)] hover:text-[var(--foreground)] transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Error Alert */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium">
                      <Info className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Button */}
              <Button
                type="submit"
                disabled={loading || !examCode.trim()}
                className="w-full h-14 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold rounded-xl text-sm tracking-wide shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Continue to Check-in
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Info footer links */}
        <p className="text-center text-xs text-[var(--foreground-subtle)] mt-6">
          Are you a host?{" "}
          <Link href="/auth/sign-in" className="text-indigo-500 hover:text-indigo-600 font-bold transition-colors">
            Sign in here
          </Link>
        </p>
      </motion.div>

      {/* ── Footer ── */}
      <footer className="relative z-10 text-center text-[10px] text-[var(--foreground-subtle)] uppercase tracking-widest mt-auto">
        © {new Date().getFullYear()} Teso Exams • Secure Portal
      </footer>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      }
    >
      <JoinFormContent />
    </Suspense>
  );
}
