"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, User, Hash, Loader2, Sparkles } from "lucide-react";
import { joinExam } from "@/app/actions/candidate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/providers/AuthProvider";

function IdentityFormContent() {
  const [fullName, setFullName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ fullName?: string; classCode?: string }>({});
  const [touched, setTouched] = useState<{ fullName?: boolean; classCode?: boolean }>({});
  const router = useRouter();
  const searchParams = useSearchParams();
  const examCode = searchParams.get("examCode") || "";
  const { user } = useAuth();

  const validate = () => {
    const errs: { fullName?: string; classCode?: string } = {};
    const cleanName = fullName.trim();
    const cleanClass = classCode.trim();

    if (!cleanName) {
      errs.fullName = "Full name is required";
    } else if (cleanName.length < 2) {
      errs.fullName = "Full name must be at least 2 characters";
    } else if (cleanName.length > 100) {
      errs.fullName = "Full name cannot exceed 100 characters";
    }

    if (!cleanClass) {
      errs.classCode = "Class code is required";
    } else if (cleanClass.length < 2) {
      errs.classCode = "Class code must be at least 2 characters";
    } else if (cleanClass.length > 50) {
      errs.classCode = "Class code cannot exceed 50 characters";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ fullName: true, classCode: true });
    
    if (!validate()) {
      return;
    }

    setLoading(true);
    setError("");
    const res = await joinExam(fullName.trim(), classCode.trim(), examCode, user?.id);
    setLoading(false);

    if (res.success) {
      const params = new URLSearchParams({
        fullName: fullName.trim(),
        classCode: classCode.trim(),
        examCode,
        userId: res.data?.userId || "",
        participantId: res.data?.participantId || "",
      });
      router.push(`/candidate/waiting?${params.toString()}`);
    } else {
      setError(res.error || "Failed to join exam. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[var(--background)] relative overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-indigo-600/8 blur-[150px] rounded-full" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[300px] bg-violet-600/6 blur-[120px] rounded-full" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Header badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center mb-8"
        >
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-[var(--background-card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-2xl shadow-black/50"
        >
          {/* Gradient top strip */}
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />

          <div className="p-8">
            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-black text-[var(--foreground)] mb-1.5">
                Tell us who you are
              </h1>
              <p className="text-sm text-[var(--foreground-muted)]">
                Just a few details to get started
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name */}
              <div className="space-y-2">
                <Label
                  htmlFor="fullName"
                  className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground-muted)]"
                >
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (fieldErrors.fullName) setFieldErrors(prev => ({ ...prev, fullName: undefined }));
                  }}
                  onBlur={() => {
                    setTouched(prev => ({ ...prev, fullName: true }));
                    if (!fullName.trim() || fullName.trim().length < 2) {
                      setFieldErrors(prev => ({ ...prev, fullName: "Full name must be at least 2 characters" }));
                    }
                  }}
                  placeholder="Enter your full name"
                  autoFocus
                  className={`bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] rounded-xl h-11 transition-all ${
                    touched.fullName && fieldErrors.fullName
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      : "border-[var(--border)] focus:border-indigo-500/70 focus:ring-indigo-500/20"
                  }`}
                />
                {touched.fullName && fieldErrors.fullName && (
                  <p className="text-xs text-red-400 font-medium">{fieldErrors.fullName}</p>
                )}
              </div>

              {/* Class Code */}
              <div className="space-y-2">
                <Label
                  htmlFor="classCode"
                  className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground-muted)]"
                >
                  <Hash className="w-3.5 h-3.5 text-violet-400" />
                  Class Code
                </Label>
                <Input
                  id="classCode"
                  type="text"
                  value={classCode}
                  onChange={(e) => {
                    setClassCode(e.target.value.toUpperCase());
                    if (fieldErrors.classCode) setFieldErrors(prev => ({ ...prev, classCode: undefined }));
                  }}
                  onBlur={() => {
                    setTouched(prev => ({ ...prev, classCode: true }));
                    if (!classCode.trim() || classCode.trim().length < 2) {
                      setFieldErrors(prev => ({ ...prev, classCode: "Class code must be at least 2 characters" }));
                    }
                  }}
                  placeholder="e.g. CS101-A"
                  className={`bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] rounded-xl h-11 font-mono transition-all ${
                    touched.classCode && fieldErrors.classCode
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      : "border-[var(--border)] focus:border-indigo-500/70 focus:ring-indigo-500/20"
                  }`}
                />
                {touched.classCode && fieldErrors.classCode && (
                  <p className="text-xs text-red-400 font-medium">{fieldErrors.classCode}</p>
                )}
              </div>

              {/* Error */}
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-400 font-medium"
                >
                  {error}
                </motion.p>
              )}

              {/* Submit */}
              <div className="pt-1">
                <Button
                  type="submit"
                  id="join-waiting-room-btn"
                  disabled={loading || !fullName.trim() || !classCode.trim()}
                  className="w-full h-12 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] disabled:opacity-40"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Join Waiting Room
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Exam code display */}
            {examCode && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-6 pt-5 border-t border-[var(--border)] text-center"
              >
                <p className="text-xs text-[var(--foreground-subtle)]">
                  Joining exam:{" "}
                  <span className="font-bold text-indigo-400 font-mono tracking-widest">
                    {examCode}
                  </span>
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function IdentityPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      }
    >
      <IdentityFormContent />
    </Suspense>
  );
}
