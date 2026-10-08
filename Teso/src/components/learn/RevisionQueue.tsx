"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Award,
  Loader2,
  Calendar,
  Clock,
  RotateCw,
  ThumbsUp,
  ThumbsDown,
  TrendingDown,
} from "lucide-react";
import { getRevisionQueue, markRevisionDone } from "@/app/actions/adaptive-actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RevisionItem {
  skill_id: string;
  skill_name: string;
  forgetting_risk: number;
  memory_strength: number;
  mastery_probability: number;
  days_overdue: number;
  last_revised_at: string | null;
  is_overdue: boolean;
  suggested_duration_minutes: number;
  priority: number;
}

export function RevisionQueue() {
  const [queue, setQueue] = useState<RevisionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeItemIndex, setActiveItemIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [duration, setDuration] = useState<number>(10);
  const [rating, setRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const loadQueue = async () => {
    setLoading(true);
    try {
      const response = await getRevisionQueue(10);
      setQueue(response.revision_queue || []);
      setActiveItemIndex(0);
      setIsFlipped(false);
      setRating(null);
      startTimeRef.current = Date.now();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? "Failed to load revision queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const activeItem = queue[activeItemIndex];

  useEffect(() => {
    if (activeItem) {
      setDuration(1);
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const elapsedMinutes = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 60000));
        setDuration(elapsedMinutes);
      }, 10000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeItemIndex, activeItem]);

  const handleSubmitRevision = async (performanceScore: number, confidenceRating: number) => {
    if (submitting || !activeItem) return;
    setSubmitting(true);

    try {
      const elapsedMinutes = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 60000));

      const res = await markRevisionDone(
        activeItem.skill_id,
        performanceScore,
        elapsedMinutes,
        confidenceRating,
        `Self-assessment revision. Performance: ${(performanceScore * 100).toFixed(0)}%.`
      );

      toast.success(res.message ?? "Revision logged successfully!");

      const updatedQueue = [...queue];
      updatedQueue.splice(activeItemIndex, 1);
      setQueue(updatedQueue);

      setIsFlipped(false);
      setRating(null);

      if (activeItemIndex >= updatedQueue.length && updatedQueue.length > 0) {
        setActiveItemIndex(updatedQueue.length - 1);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? "Failed to save revision");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground text-sm" style={{ fontFamily: "'Google Sans Text', sans-serif" }}>
          Loading your personalized revision queue…
        </p>
      </div>
    );
  }

  // ── Empty / All caught up ─────────────────────────────────────────────────
  if (queue.length === 0) {
    return (
      <div className="flex-1 p-4 lg:p-8 overflow-auto bg-background flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-6 bg-card border border-border rounded-3xl p-8 shadow-sm">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9 text-green-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Google Sans', sans-serif" }}>
              All Caught Up!
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed" style={{ fontFamily: "'Google Sans Text', sans-serif" }}>
              No skills are due for revision today. Your memory retention is solid! Keep practicing quizzes or exploring new concepts.
            </p>
          </div>
          <button
            onClick={loadQueue}
            className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2"
          >
            <RotateCw size={15} />
            <span style={{ fontFamily: "'Google Sans Text', sans-serif" }}>Refresh Queue</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Risk color helpers ─────────────────────────────────────────────────────
  const getRiskColor = (risk: number) => {
    if (risk >= 0.7) return "text-red-500 border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-500/10 dark:text-red-400";
    if (risk >= 0.5) return "text-amber-600 border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-500/10 dark:text-amber-400";
    return "text-green-600 border-green-200 bg-green-50 dark:border-green-800/50 dark:bg-green-500/10 dark:text-green-400";
  };

  // ── Main ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 p-4 lg:p-8 overflow-auto bg-background text-foreground flex flex-col md:flex-row gap-8 max-w-7xl mx-auto w-full h-full">
      {/* Left: Active Flashcard */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-2xl lg:text-3xl font-bold flex items-center gap-2 text-foreground"
              style={{ fontFamily: "'Google Sans', sans-serif" }}
            >
              <Calendar className="text-primary" size={26} />
              Spaced Repetition
            </h1>
            <p className="text-muted-foreground text-sm mt-1" style={{ fontFamily: "'Google Sans Text', sans-serif" }}>
              Revise at the optimal time to maximize long-term memory.
            </p>
          </div>
          <div className="text-xs font-semibold px-3 py-1.5 bg-muted border border-border rounded-full text-muted-foreground select-none">
            {activeItemIndex + 1} / {queue.length} Due
          </div>
        </div>

        {/* Card Flip Container */}
        <div className="relative h-[380px] md:h-[420px] w-full" style={{ perspective: "1000px" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeItem.skill_id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full h-full"
            >
              <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.55, type: "spring", stiffness: 90 }}
                className="w-full h-full relative cursor-pointer"
                style={{ transformStyle: "preserve-3d" }}
                onClick={() => setIsFlipped(!isFlipped)}
              >
                {/* Front Side */}
                <div
                  className="absolute inset-0 bg-card border-2 border-primary/20 rounded-3xl p-8 flex flex-col justify-between shadow-sm"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border", getRiskColor(activeItem.forgetting_risk))}>
                      {activeItem.is_overdue
                        ? `Overdue by ${activeItem.days_overdue} day${activeItem.days_overdue !== 1 ? 's' : ''}`
                        : `High forgetting risk`}
                    </span>
                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-mono">
                      <Clock size={13} />
                      <span>~{activeItem.suggested_duration_minutes} min</span>
                    </div>
                  </div>

                  <div className="text-center space-y-4">
                    <span className="text-xs uppercase tracking-widest text-primary font-bold">
                      Chemistry Skill
                    </span>
                    <h2
                      className="text-2xl md:text-3xl font-extrabold text-foreground leading-snug"
                      style={{ fontFamily: "'Google Sans', sans-serif" }}
                    >
                      {activeItem.skill_name}
                    </h2>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <RotateCw size={13} className="animate-pulse" />
                      <span style={{ fontFamily: "'Google Sans Text', sans-serif" }}>Tap card to study details</span>
                    </div>
                    <div className="w-full max-w-[200px] bg-muted h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all"
                        style={{ width: `${activeItem.memory_strength * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Back Side */}
                <div
                  className="absolute inset-0 bg-card border-2 border-blue-300/40 dark:border-blue-500/30 rounded-3xl p-8 flex flex-col justify-between shadow-sm"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                      Study Mode
                    </span>
                    <div className="text-xs text-muted-foreground font-medium">
                      Recall & self-evaluate
                    </div>
                  </div>

                  <div className="overflow-y-auto space-y-4 my-auto max-h-[220px]">
                    <h3
                      className="text-xl font-bold text-foreground"
                      style={{ fontFamily: "'Google Sans', sans-serif" }}
                    >
                      {activeItem.skill_name}
                    </h3>
                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed" style={{ fontFamily: "'Google Sans Text', sans-serif" }}>
                      Review the core formulas, reaction mechanisms, and properties for{" "}
                      <strong className="text-primary">{activeItem.skill_name}</strong>. Refer to your study plan to reinforce structural memory.
                    </p>
                  </div>

                  <div className="flex justify-center items-center gap-2 text-xs text-muted-foreground">
                    <RotateCw size={13} />
                    <span>Tap to flip back</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Self-Assessment Controls */}
        <div className="bg-card border border-border rounded-3xl p-6 space-y-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-foreground text-sm" style={{ fontFamily: "'Google Sans', sans-serif" }}>
                Self-Assessment
              </h4>
              <p className="text-muted-foreground text-xs mt-0.5" style={{ fontFamily: "'Google Sans Text', sans-serif" }}>
                How well did you recall this concept?
              </p>
            </div>
            {duration > 0 && (
              <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 font-medium">
                <Clock size={12} /> {duration} min
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { score: 0.2, rating: 2, label: "Forgot",  className: "hover:bg-red-50 dark:hover:bg-red-500/10 border-border hover:border-red-200 dark:hover:border-red-500/30 text-muted-foreground hover:text-red-600 dark:hover:text-red-400",   icon: <ThumbsDown size={17} /> },
              { score: 0.5, rating: 3, label: "Vague",   className: "hover:bg-amber-50 dark:hover:bg-amber-500/10 border-border hover:border-amber-200 dark:hover:border-amber-500/30 text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400", icon: <RotateCw size={17} /> },
              { score: 0.8, rating: 4, label: "Good",    className: "hover:bg-blue-50 dark:hover:bg-blue-500/10 border-border hover:border-blue-200 dark:hover:border-blue-500/30 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400",   icon: <ThumbsUp size={17} /> },
              { score: 1.0, rating: 5, label: "Perfect", className: "hover:bg-green-50 dark:hover:bg-green-500/10 border-border hover:border-green-200 dark:hover:border-green-500/30 text-muted-foreground hover:text-green-600 dark:hover:text-green-400", icon: <Sparkles size={17} /> },
            ].map((btn) => (
              <button
                key={btn.label}
                disabled={submitting}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSubmitRevision(btn.score, btn.rating);
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border bg-background transition-all font-semibold hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                  btn.className
                )}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : btn.icon}
                <span className="text-xs" style={{ fontFamily: "'Google Sans Text', sans-serif" }}>
                  {btn.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Queue List */}
      <div className="w-full md:w-72 flex flex-col gap-4">
        <h3
          className="font-bold text-xs uppercase tracking-wider text-muted-foreground"
          style={{ fontFamily: "'Google Sans Text', sans-serif" }}
        >
          Revision Queue ({queue.length})
        </h3>
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[600px] md:max-h-none custom-scrollbar">
          {queue.map((item, idx) => {
            const isActive = idx === activeItemIndex;
            return (
              <div
                key={item.skill_id}
                onClick={() => {
                  setActiveItemIndex(idx);
                  setIsFlipped(false);
                }}
                className={cn(
                  "group p-4 rounded-2xl border-2 transition-all cursor-pointer select-none flex flex-col gap-2",
                  isActive
                    ? "bg-primary/10 border-primary shadow-sm"
                    : "bg-card border-border hover:border-primary/30 hover:bg-accent"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4
                    className={cn(
                      "text-sm font-semibold line-clamp-2 leading-snug",
                      isActive ? "text-primary" : "text-foreground group-hover:text-primary"
                    )}
                    style={{ fontFamily: "'Google Sans', sans-serif" }}
                  >
                    {item.skill_name}
                  </h4>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 border", getRiskColor(item.forgetting_risk))}>
                    {Math.round(item.forgetting_risk * 100)}%
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {item.suggested_duration_minutes}m review
                  </span>
                  {item.is_overdue && (
                    <span className="flex items-center gap-0.5 text-red-500 dark:text-red-400 font-medium">
                      <AlertTriangle size={10} />
                      Overdue
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
