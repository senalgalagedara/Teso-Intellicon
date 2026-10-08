"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Clock, Loader2, CheckCircle2, XCircle, Sparkles, User, Hash,
  FileText, Wifi,
} from "lucide-react";
import { getParticipantStatus } from "@/app/actions/candidate";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { io } from "socket.io-client";

function StatusIcon({ status }: { status: string }) {
  return (
    <AnimatePresence mode="wait">
      {status === "WAITING" && (
        <motion.div
          key="waiting"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.4 }}
          className="relative w-28 h-28"
        >
          {/* Pulsing rings */}
          <motion.div
            animate={{ scale: [1, 1.35, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 rounded-full bg-indigo-500/20"
          />
          <motion.div
            animate={{ scale: [1, 1.6, 1], opacity: [0.15, 0, 0.15] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
            className="absolute inset-0 rounded-full bg-indigo-500/10"
          />
          <div className="absolute inset-0 rounded-full bg-[var(--background-card)] border-2 border-indigo-500/30 flex items-center justify-center shadow-xl">
            <Clock className="w-10 h-10 text-indigo-400" />
          </div>
        </motion.div>
      )}

      {status === "ADMITTED" && (
        <motion.div
          key="admitted"
          initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
          className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-xl shadow-emerald-500/30 flex items-center justify-center"
        >
          <CheckCircle2 className="w-14 h-14 text-white" />
        </motion.div>
      )}

      {status === "DECLINED" && (
        <motion.div
          key="declined"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
          className="w-28 h-28 rounded-full bg-gradient-to-br from-red-500 to-red-600 shadow-xl shadow-red-500/30 flex items-center justify-center"
        >
          <XCircle className="w-14 h-14 text-white" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function WaitingLobbyContent() {
  const searchParams = useSearchParams();
  const fullName = searchParams.get("fullName") || "";
  const classCode = searchParams.get("classCode") || "";
  const examCode = searchParams.get("examCode") || "";
  const participantId = searchParams.get("participantId") || "";

  const router = useRouter();
  const [status, setStatus] = useState<string>("WAITING");
  const [loading, setLoading] = useState(true);
  const [isExamActive, setIsExamActive] = useState<boolean>(false);

  const checkStatus = useCallback(async () => {
    if (!participantId) return;
    try {
      const res = await getParticipantStatus(participantId);
      if (res.success && res.data) {
        const data = res.data;
        setStatus(data.status);
        if (data.session?.status === "ACTIVE") {
          setIsExamActive(true);
        }

        if (data.status === "DECLINED") {
          toast.error("Your request to join was declined.");
        }
      }
    } catch {
      console.error("Status check failed");
    } finally {
      setLoading(false);
    }
  }, [participantId]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Handle redirection when admitted and exam starts
  useEffect(() => {
    if (status === "ADMITTED" && isExamActive) {
      toast.success("Exam has started! Redirecting...");
      router.push(`/candidate/exam/${examCode}?participantId=${participantId}`);
    }
  }, [status, isExamActive, examCode, participantId, router]);

  // Connect to Socket.IO waiting lobby events
  useEffect(() => {
    if (!examCode || !participantId) return;

    const socket = io();
    socket.emit('join-lobby', { examCode, participantId });

    socket.on('status-update', (data: any) => {
      if (data.participantId === participantId) {
        setStatus(data.status);
        if (data.sessionStatus === "ACTIVE") {
          setIsExamActive(true);
        }
        if (data.status === "DECLINED") {
          toast.error("Your request to join was declined.");
        }
      }
    });

    socket.on('exam-started', () => {
      setIsExamActive(true);
    });

    socket.on('participant-status-changed', (data: any) => {
      if (data.participantId === participantId) {
        setStatus(data.status);
        if (data.status === "DECLINED") {
          toast.error("Your request to join was declined.");
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [examCode, participantId]);

  const statusConfig = {
    WAITING: {
      title: "Hang tight,",
      subtitle: fullName ? fullName + "!" : "",
      body: "The host is reviewing your request. Please don't refresh this page.",
      titleColor: "text-[var(--foreground)]",
    },
    ADMITTED: {
      title: "You're In!",
      subtitle: "",
      body: "You've been admitted. Waiting for the host to start the exam...",
      titleColor: "text-emerald-400",
    },
    DECLINED: {
      title: "Access Denied",
      subtitle: "",
      body: "Unfortunately, your request to join this session was declined.",
      titleColor: "text-red-400",
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] ?? statusConfig.WAITING;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[var(--background)] relative overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/4 -left-1/4 w-[70%] h-[70%] bg-indigo-500/4 rounded-full blur-[160px]"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/4 -right-1/4 w-[60%] h-[60%] bg-violet-500/4 rounded-full blur-[140px]"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Header badge */}
        <div className="flex justify-center mb-8">
        </div>

        {/* Main card */}
        <div className="bg-[var(--background-card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />

          <div className="p-8 text-center">
            {/* Status icon */}
            <div className="flex items-center justify-center mb-8">
              <StatusIcon status={status} />
            </div>

            {/* Status text */}
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <h1 className={`text-3xl font-black mb-1 ${config.titleColor}`}>
                {config.title}
              </h1>
              {config.subtitle && (
                <p className="text-lg font-bold text-[var(--foreground)] mb-2">
                  {config.subtitle}
                </p>
              )}
              <p className="text-sm text-[var(--foreground-muted)] max-w-xs mx-auto leading-relaxed">
                {config.body}
              </p>
            </motion.div>

            {/* Candidate info card */}
            <div className="bg-[var(--background)] border border-[var(--border)] rounded-xl p-5 text-left space-y-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground-subtle)]">
                  Candidate Profile
                </span>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full text-[10px] font-bold">
                  <Wifi className="w-2.5 h-2.5" />
                  Live
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-[10px] text-[var(--foreground-subtle)] font-bold uppercase">
                    <User className="w-2.5 h-2.5" />
                    Name
                  </div>
                  <p className="text-sm font-bold text-[var(--foreground)] truncate">{fullName}</p>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-[10px] text-[var(--foreground-subtle)] font-bold uppercase">
                    <Hash className="w-2.5 h-2.5" />
                    Class
                  </div>
                  <p className="text-sm font-bold text-[var(--foreground)] font-mono">{classCode}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-[10px] text-[var(--foreground-subtle)] font-bold uppercase">
                    <FileText className="w-2.5 h-2.5" />
                    Exam Code
                  </div>
                  <p className="text-sm font-black text-indigo-400 font-mono tracking-wider">
                    {examCode}
                  </p>
                </div>
                {status === "WAITING" && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--foreground-subtle)]">
                    <div className="flex gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dot-pulse-1" />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dot-pulse-2" />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dot-pulse-3" />
                    </div>
                    Connecting
                  </div>
                )}
              </div>
            </div>

            {/* Actions for declined */}
            {status === "DECLINED" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5"
              >
                <Button
                  id="back-to-join-btn"
                  onClick={() => router.push("/")}
                  className="w-full bg-[var(--background)] hover:bg-[var(--border)] text-[var(--foreground)] border border-[var(--border)] rounded-xl font-bold transition-all"
                >
                  Back to Join
                </Button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center text-[10px] text-[var(--foreground-subtle)] mt-6 uppercase tracking-widest flex items-center justify-center gap-2"
        >
          <Clock className="w-3 h-3" />
          Session managed by Teso Platform
        </motion.p>
      </motion.div>
    </div>
  );
}

export default function WaitingLobbyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      }
    >
      <WaitingLobbyContent />
    </Suspense>
  );
}
