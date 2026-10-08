"use client";

import React, { useState } from "react";
import { createHostPaper } from "@/app/actions/papers";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Loader2, PlusCircle, ChevronLeft, Sparkles,
  FileText, Calendar, Clock, Users, Hash, Sliders,
  CheckCircle2, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AddPaperClient({ hostId }: { hostId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [paperTitle, setPaperTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [examTime, setExamTime] = useState("");
  const [numberOfStudents, setNumberOfStudents] = useState<number | "">("");
  const [questionCount, setQuestionCount] = useState<number | "">("");
  const [answersPerQuestion, setAnswersPerQuestion] = useState<number | "">(5);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const newErrors: { [key: string]: string } = {};
      if (!paperTitle) newErrors.paperTitle = "Title is required";
      if (!examDate) newErrors.examDate = "Date is required";
      if (!examTime) newErrors.examTime = "Time is required";
      if (numberOfStudents === "") {
        newErrors.numberOfStudents = "Capacity is required";
      } else if (Number(numberOfStudents) > 100) {
        newErrors.numberOfStudents = "Max 100 students";
      } else if (Number(numberOfStudents) < 1) {
        newErrors.numberOfStudents = "Min 1 student";
      }
      if (questionCount === "") {
        newErrors.questionCount = "Question count is required";
      } else if (Number(questionCount) > 50) {
        newErrors.questionCount = "Max 50 questions";
      } else if (Number(questionCount) < 1) {
        newErrors.questionCount = "Min 1 question";
      }
      if (answersPerQuestion === "") {
        newErrors.answersPerQuestion = "Options count is required";
      } else if (Number(answersPerQuestion) < 1 || Number(answersPerQuestion) > 5) {
        newErrors.answersPerQuestion = "Must be between 1 and 5";
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        toast.error("Please fix the errors before submitting.");
        setLoading(false);
        return;
      }

      const combinedDateTime = `${examDate}T${examTime}`;
      const res = await createHostPaper({
        hostId,
        paperTitle,
        numberOfStudents: Number(numberOfStudents),
        questionCount: Number(questionCount),
        answersPerQuestion: Number(answersPerQuestion),
        examDate: combinedDateTime,
      });

      if (res.success && res.data) {
        toast.success("Exam paper created!");
        router.push("/host/create");
      } else {
        toast.error(`Error: ${res.error || "Failed to create paper"}`);
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  const fieldCls = (key: string) =>
    `h-11 rounded-xl border ${errors[key]
      ? "border-red-400 bg-red-50/60 focus:border-red-400 focus:ring-red-400/20"
      : "border-[var(--border)] bg-white focus:border-indigo-400 focus:ring-indigo-400/20"
    } text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] text-sm font-medium transition-all focus:ring-2 focus:outline-none px-3`;

  return (
    <div className="w-full min-h-[calc(100vh-48px)] flex items-start justify-center px-4 py-10">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-500/5 blur-[130px] rounded-full" />
        <div className="absolute bottom-1/4 left-1/3 w-[500px] h-[400px] bg-violet-500/4 blur-[110px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-2xl"
      >
        {/* Back link */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => router.push("/host")}
          className="group flex items-center gap-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors mb-7"
          id="back-to-dashboard-btn"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest">Back to Dashboard</span>
        </motion.button>

        {/* Card */}
        <div className="bg-white border border-[var(--border)] rounded-3xl shadow-xl shadow-black/5 overflow-hidden">

          {/* Gradient top strip */}
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-400" />

          {/* Card header */}
          <div className="px-8 pt-8 pb-6 border-b border-[var(--border)]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Create Exam Paper</h1>
                <p className="text-sm text-[var(--foreground-muted)] mt-0.5">Set up a new template, then add questions.</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="px-8 py-7 space-y-7">

            {/* Exam Title */}
            <div className="space-y-2">
              <Label htmlFor="paperTitle" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--foreground-muted)]">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                Exam Title
              </Label>
              <input
                id="paperTitle"
                type="text"
                required
                value={paperTitle}
                onChange={(e) => { setPaperTitle(e.target.value); setErrors(prev => ({ ...prev, paperTitle: "" })); }}
                placeholder="e.g. 2026 A/L Physics Paper I"
                className={fieldCls("paperTitle")}
                style={{ width: "100%" }}
              />
              {errors.paperTitle && <p className="text-[11px] font-semibold text-red-500">{errors.paperTitle}</p>}
            </div>

            {/* Date + Time row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="examDate" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--foreground-muted)]">
                  <Calendar className="w-3.5 h-3.5 text-violet-400" />
                  Date
                </Label>
                <input
                  id="examDate"
                  type="date"
                  required
                  value={examDate}
                  onChange={(e) => { setExamDate(e.target.value); setErrors(prev => ({ ...prev, examDate: "" })); }}
                  className={fieldCls("examDate")}
                  style={{ width: "100%" }}
                />
                {errors.examDate && <p className="text-[11px] font-semibold text-red-500">{errors.examDate}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="examTime" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--foreground-muted)]">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  Start Time
                </Label>
                <input
                  id="examTime"
                  type="time"
                  required
                  value={examTime}
                  onChange={(e) => { setExamTime(e.target.value); setErrors(prev => ({ ...prev, examTime: "" })); }}
                  className={fieldCls("examTime")}
                  style={{ width: "100%" }}
                />
                {errors.examTime && <p className="text-[11px] font-semibold text-red-500">{errors.examTime}</p>}
              </div>
            </div>

            {/* Divider with section label */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[var(--border)]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground-subtle)]">Capacity &amp; Questions</span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>

            {/* Seats + Questions + Options row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numberOfStudents" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--foreground-muted)]">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  Seats
                </Label>
                <input
                  id="numberOfStudents"
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={numberOfStudents}
                  onChange={(e) => { setNumberOfStudents(e.target.value !== "" ? parseInt(e.target.value) : ""); setErrors(prev => ({ ...prev, numberOfStudents: "" })); }}
                  placeholder="e.g. 30"
                  className={fieldCls("numberOfStudents")}
                  style={{ width: "100%" }}
                />
                {errors.numberOfStudents && <p className="text-[11px] font-semibold text-red-500">{errors.numberOfStudents}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="questionCount" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--foreground-muted)]">
                  <Hash className="w-3.5 h-3.5 text-indigo-400" />
                  Questions
                </Label>
                <input
                  id="questionCount"
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={questionCount}
                  onChange={(e) => { setQuestionCount(e.target.value !== "" ? parseInt(e.target.value) : ""); setErrors(prev => ({ ...prev, questionCount: "" })); }}
                  placeholder="e.g. 40"
                  className={fieldCls("questionCount")}
                  style={{ width: "100%" }}
                />
                {errors.questionCount && <p className="text-[11px] font-semibold text-red-500">{errors.questionCount}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="answersPerQuestion" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--foreground-muted)]">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  Options
                </Label>
                <input
                  id="answersPerQuestion"
                  type="number"
                  min="1"
                  max="5"
                  required
                  value={answersPerQuestion}
                  onChange={(e) => { setAnswersPerQuestion(e.target.value !== "" ? parseInt(e.target.value) : ""); setErrors(prev => ({ ...prev, answersPerQuestion: "" })); }}
                  placeholder="1-5"
                  className={fieldCls("answersPerQuestion")}
                  style={{ width: "100%" }}
                />
                {errors.answersPerQuestion && <p className="text-[11px] font-semibold text-red-500">{errors.answersPerQuestion}</p>}
              </div>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl px-4 py-3.5">
              <CheckCircle2 className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-indigo-700 font-medium leading-relaxed">
                After creating this paper, you'll be taken to the <strong>question editor</strong> where you can add and configure each question.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => router.back()}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl border border-[var(--border)] text-sm font-bold text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--foreground-muted)] transition-all active:scale-95"
              >
                Cancel
              </button>

              <Button
                type="submit"
                id="create-exam-submit-btn"
                disabled={loading}
                className="h-11 px-8 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-500/25 gap-2 transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    Create Paper
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
