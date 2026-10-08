"use client";

import React, { useState, useEffect } from "react";
import { createHostPaper, updateHostPaper } from "@/app/actions/papers";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Loader2, PlusCircle, X, Sparkles,
  BookOpen, Calendar, Clock, Users, HelpCircle, CheckSquare,
  CheckCircle2, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type PaperForEdit = {
  id: string;
  code: string;
  title: string;
  status: string;
  questionCount: number | null;
  numberOfStudents: number | null;
  examDate: string | null;
  createdAt: string;
  answersPerQuestion?: number | null;
  examDurationMins?: number | null;
};

interface CreateExamModalProps {
  hostId: string;
  isOpen: boolean;
  onClose: () => void;
  editingPaper?: PaperForEdit | null;
}

function formatTicketDate(dateStr: string) {
  if (!dateStr) return "Not scheduled";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return dateStr;
  }
}

export default function CreateExamModal({ hostId, isOpen, onClose, editingPaper }: CreateExamModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [paperTitle, setPaperTitle] = useState("");
  const [examDate, setExamDate] = useState("");

  // Custom interactive time picker states
  const [examHour, setExamHour] = useState("09");
  const [examMinute, setExamMinute] = useState("00");
  const [examPeriod, setExamPeriod] = useState("AM");

  const [numberOfStudents, setNumberOfStudents] = useState<number | "">("");
  const [questionCount, setQuestionCount] = useState<number | "">("");
  const [answersPerQuestion, setAnswersPerQuestion] = useState<number | "">(5);
  const [examDurationMins, setExamDurationMins] = useState<number | "">(60);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editingPaper) {
        setPaperTitle(editingPaper.title || "");
        if (editingPaper.examDate) {
          const d = new Date(editingPaper.examDate);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const date = String(d.getDate()).padStart(2, '0');
          setExamDate(`${year}-${month}-${date}`);
          
          let hours = d.getHours();
          const minutes = String(d.getMinutes()).padStart(2, '0');
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12;
          hours = hours ? hours : 12; // the hour '0' should be '12'
          const hoursStr = String(hours).padStart(2, '0');
          
          setExamHour(hoursStr);
          setExamMinute(minutes);
          setExamPeriod(ampm);
        } else {
          setExamDate("");
          setExamHour("09");
          setExamMinute("00");
          setExamPeriod("AM");
        }
        setNumberOfStudents(editingPaper.numberOfStudents ?? "");
        setQuestionCount(editingPaper.questionCount ?? "");
        setAnswersPerQuestion(editingPaper.answersPerQuestion ?? 5);
        setExamDurationMins(editingPaper.examDurationMins ?? 60);
      } else {
        setPaperTitle("");
        setExamDate("");
        setExamHour("09");
        setExamMinute("00");
        setExamPeriod("AM");
        setNumberOfStudents("");
        setQuestionCount("");
        setAnswersPerQuestion(5);
        setExamDurationMins(60);
      }
      setErrors({});
      setLoading(false);
    }
  }, [isOpen, editingPaper]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, loading, onClose]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const newErrors: { [key: string]: string } = {};
      const cleanTitle = paperTitle.trim();
      if (!cleanTitle) {
        newErrors.paperTitle = "Title is required";
      } else if (cleanTitle.length < 3) {
        newErrors.paperTitle = "Title must be at least 3 characters";
      } else if (cleanTitle.length > 150) {
        newErrors.paperTitle = "Title cannot exceed 150 characters";
      }

      if (!examDate) {
        newErrors.examDate = "Date is required";
      }

      if (numberOfStudents === "") {
        newErrors.numberOfStudents = "Capacity is required";
      } else if (Number(numberOfStudents) > 500) {
        newErrors.numberOfStudents = "Max 500 students";
      } else if (Number(numberOfStudents) < 1) {
        newErrors.numberOfStudents = "Min 1 student";
      }
      if (questionCount === "") {
        newErrors.questionCount = "Question count is required";
      } else if (Number(questionCount) > 100) {
        newErrors.questionCount = "Max 100 questions";
      } else if (Number(questionCount) < 1) {
        newErrors.questionCount = "Min 1 question";
      }
      if (answersPerQuestion === "") {
        newErrors.answersPerQuestion = "Options count is required";
      } else if (Number(answersPerQuestion) < 2 || Number(answersPerQuestion) > 5) {
        newErrors.answersPerQuestion = "Must be between 2 and 5";
      }
      if (examDurationMins === "") {
        newErrors.examDurationMins = "Duration is required";
      } else if (Number(examDurationMins) < 1) {
        newErrors.examDurationMins = "Min 1 minute";
      } else if (Number(examDurationMins) > 360) {
        newErrors.examDurationMins = "Max 360 minutes (6 hours)";
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        toast.error("Please fix the errors before submitting.");
        setLoading(false);
        return;
      }

      // Convert custom 12-hour period selection to 24-hour time string
      let hours24 = parseInt(examHour);
      if (examPeriod === "PM" && hours24 < 12) hours24 += 12;
      if (examPeriod === "AM" && hours24 === 12) hours24 = 0;
      const formattedHour = String(hours24).padStart(2, '0');
      const formattedMinute = examMinute.padStart(2, '0');
      const combinedDateTime = `${examDate}T${formattedHour}:${formattedMinute}`;

      let res;
      if (editingPaper) {
        res = await updateHostPaper({
          paperId: editingPaper.id,
          paperTitle,
          numberOfStudents: Number(numberOfStudents),
          questionCount: Number(questionCount),
          answersPerQuestion: Number(answersPerQuestion),
          examDate: combinedDateTime,
          examDurationMins: Number(examDurationMins),
        });
      } else {
        res = await createHostPaper({
          hostId,
          paperTitle,
          numberOfStudents: Number(numberOfStudents),
          questionCount: Number(questionCount),
          answersPerQuestion: Number(answersPerQuestion),
          examDate: combinedDateTime,
          examDurationMins: Number(examDurationMins),
        });
      }

      if (res.success && res.data) {
        if (editingPaper) {
          toast.success("Exam paper updated!");
          onClose();
          router.refresh();
        } else {
          toast.success("Exam paper created!");
          onClose();
          router.refresh();
        }
      } else {
        toast.error(`Error: ${res.error || `Failed to ${editingPaper ? "update" : "create"} paper`}`);
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  const fieldCls = (key: string) =>
    `h-10 rounded-xl border ${errors[key]
      ? "border-red-400 bg-red-50/40 focus:border-red-400 focus:ring-red-400/20"
      : "border-[var(--border)] bg-white focus:border-indigo-500 focus:ring-indigo-500/20"
    } text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] text-sm font-medium transition-all focus:ring-2 focus:outline-none px-3 w-full`;

  const displayTime = `${examHour}:${examMinute} ${examPeriod}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md"
            onClick={() => { if (!loading) onClose(); }}
          />

          {/* Modal panel */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative w-full max-w-4xl bg-white border border-[var(--border)] rounded-3xl shadow-2xl shadow-black/20 overflow-hidden pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                type="button"
                id="create-exam-modal-close-btn"
                onClick={onClose}
                disabled={loading}
                className="absolute top-4 right-4 w-9 h-9 rounded-xl flex items-center justify-center text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-slate-100 transition-all disabled:opacity-40 z-30"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Redesigned grid container */}
              <div className="grid grid-cols-1 md:grid-cols-12 min-h-[500px]">
                {/* Left Column: Live Ticket / Permit Preview */}
                <div className="md:col-span-5 bg-slate-50 p-6 flex flex-col justify-center border-b md:border-b-0 md:border-r border-[var(--border)] relative overflow-hidden">
                  {/* Decorative ambient auras */}
                  <div className="absolute top-0 right-0 -mr-12 -mt-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

                  {/* Physical Ticket Pass */}
                  <div className="relative h-full flex flex-col justify-between bg-white border border-indigo-100/80 rounded-2xl p-5 shadow-lg shadow-indigo-100/40 overflow-hidden min-h-[380px]">
                    {/* Ticket punches */}
                    <div className="absolute -left-3 top-[52%] -translate-y-1/2 w-6 h-6 bg-slate-50 border-r border-indigo-100 rounded-full z-20" />
                    <div className="absolute -right-3 top-[52%] -translate-y-1/2 w-6 h-6 bg-slate-50 border-l border-indigo-100 rounded-full z-20" />
                    {/* Dashed divider */}
                    <div className="absolute left-3 right-3 top-[52%] -translate-y-1/2 border-t border-dashed border-indigo-100 z-10" />

                    {/* Top half: Header & Exam Name */}
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3.5">
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100/50">
                          Exam Permit
                        </span>
                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                          Preview
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          <BookOpen className="w-2.5 h-2.5 text-indigo-400" />
                          Exam Title
                        </p>
                        <h3 className="text-sm font-black text-slate-800 line-clamp-3 leading-snug tracking-tight">
                          {paperTitle || "Untitled Exam Paper"}
                        </h3>
                      </div>

                      <div className="mt-3.5 flex items-center gap-2">
                        <span className="text-[9px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                          TEMP-GEN-01
                        </span>
                      </div>
                    </div>

                    {/* Bottom half: Meta Details, Options & Barcode */}
                    <div className="relative z-10 pt-3">
                      <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                        <div className="space-y-0.5">
                          <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            <Calendar className="w-2.5 h-2.5 text-violet-400" />
                            Exam Date
                          </p>
                          <p className="text-xs font-black text-slate-700 truncate">
                            {formatTicketDate(examDate)}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            <Clock className="w-2.5 h-2.5 text-cyan-400" />
                            Start Time
                          </p>
                          <p className="text-xs font-black text-slate-700 truncate">
                            {displayTime}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            <Clock className="w-2.5 h-2.5 text-amber-500" />
                            Duration
                          </p>
                          <p className="text-xs font-black text-slate-700 truncate">
                            {examDurationMins ? `${examDurationMins} Mins` : "—"}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            <Users className="w-2.5 h-2.5 text-emerald-400" />
                            Seats (Cap)
                          </p>
                          <p className="text-xs font-black text-slate-700">
                            {numberOfStudents ? `${numberOfStudents} Seats` : "—"}
                          </p>
                        </div>
                        <div className="space-y-0.5 col-span-2">
                          <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            <HelpCircle className="w-2.5 h-2.5 text-indigo-400" />
                            Total Items
                          </p>
                          <p className="text-xs font-black text-slate-700">
                            {questionCount ? `${questionCount} Qs` : "—"}
                          </p>
                        </div>
                      </div>

                      {/* Options per Question ticket pill */}
                      <div className="mt-3 bg-slate-50 border border-slate-100 rounded-lg p-2 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          <CheckSquare className="w-2.5 h-2.5 text-amber-400" />
                          Options
                        </span>
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded-md">
                          {answersPerQuestion ? `${answersPerQuestion} Choices` : "—"}
                        </span>
                      </div>

                      {/* Barcode representation */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col items-center">
                        <div className="flex gap-[2px] h-7 w-full justify-center items-end opacity-40">
                          {[2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 4].map((w, idx) => (
                            <div
                              key={idx}
                              className="bg-slate-900 rounded-sm"
                              style={{
                                width: `${w}px`,
                                height: idx % 3 === 0 ? "100%" : idx % 2 === 0 ? "85%" : "70%"
                              }}
                            />
                          ))}
                        </div>
                        <p className="text-[8px] font-mono text-slate-400 mt-1 uppercase tracking-widest font-semibold">
                          * {paperTitle ? paperTitle.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12).toUpperCase() : "EXAMPAPER"} *
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Form Inputs */}
                <div className="md:col-span-7 p-6 md:p-8 flex flex-col justify-between bg-white max-h-[85vh] md:max-h-[600px] overflow-y-auto">
                  <form onSubmit={onSubmit} className="space-y-4.5">
                    {/* Header title inside form */}
                    <div className="pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">

                        <h2 className="text-lg font-black text-slate-800 tracking-tight">
                          {editingPaper ? "Edit Exam Paper" : "Configure Exam Paper"}
                        </h2>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {editingPaper ? "Update exam credentials. Press Save to apply changes." : "Fill in template credentials. Press Create to build questions."}
                      </p>
                    </div>

                    {/* Exam Title */}
                    <div className="space-y-1.5">
                      <Label htmlFor="modal-paperTitle" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--foreground-muted)]">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                        Exam Title
                      </Label>
                      <input
                        id="modal-paperTitle"
                        type="text"
                        required
                        value={paperTitle}
                        onChange={(e) => { setPaperTitle(e.target.value); setErrors(prev => ({ ...prev, paperTitle: "" })); }}
                        placeholder="e.g. 2026 A/L Physics Paper I"
                        className={fieldCls("paperTitle")}
                      />
                      {errors.paperTitle && <p className="text-[11px] font-semibold text-red-500">{errors.paperTitle}</p>}
                    </div>

                    {/* Date + Time Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Date Picker */}
                      <div className="space-y-1.5">
                        <Label htmlFor="modal-examDate" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--foreground-muted)]">
                          <Calendar className="w-3.5 h-3.5 text-violet-400" />
                          Exam Date
                        </Label>
                        <input
                          id="modal-examDate"
                          type="date"
                          required
                          value={examDate}
                          onChange={(e) => { setExamDate(e.target.value); setErrors(prev => ({ ...prev, examDate: "" })); }}
                          className={fieldCls("examDate")}
                        />
                        {errors.examDate && <p className="text-[11px] font-semibold text-red-500">{errors.examDate}</p>}
                      </div>

                      {/* Start Time Picker (Easy custom fields) */}
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--foreground-muted)]">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" />
                          Start Time
                        </Label>
                        <div className="flex items-center gap-1.5 h-10">
                          {/* Hour Selection */}
                          <select
                            value={examHour}
                            onChange={(e) => { setExamHour(e.target.value); setErrors(prev => ({ ...prev, examTime: "" })); }}
                            className="flex-1 border border-[var(--border)] bg-white rounded-xl h-full px-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          >
                            {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].map((h) => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                          <span className="text-slate-400 font-black">:</span>
                          {/* Minute Selection */}
                          <select
                            value={examMinute}
                            onChange={(e) => { setExamMinute(e.target.value); setErrors(prev => ({ ...prev, examTime: "" })); }}
                            className="flex-1 border border-[var(--border)] bg-white rounded-xl h-full px-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          >
                            {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                          {/* AM/PM toggle */}
                          <div className="flex bg-slate-50 border border-slate-200 p-0.5 rounded-xl h-full w-20 flex-shrink-0">
                            {["AM", "PM"].map((period) => (
                              <button
                                key={period}
                                type="button"
                                onClick={() => setExamPeriod(period)}
                                className={`flex-1 flex items-center justify-center text-[10px] font-black rounded-lg transition-all ${examPeriod === period
                                    ? "bg-white shadow-sm text-indigo-600 border border-slate-200/50"
                                    : "text-slate-500 hover:text-slate-700"
                                  }`}
                              >
                                {period}
                              </button>
                            ))}
                          </div>
                        </div>
                        {errors.examTime && <p className="text-[11px] font-semibold text-red-500">{errors.examTime}</p>}
                      </div>
                    </div>

                    {/* Capacity, Questions, & Duration */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="modal-numberOfStudents" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--foreground-muted)]">
                          <Users className="w-3.5 h-3.5 text-emerald-400" />
                          Seats (Capacity)
                        </Label>
                        <input
                          id="modal-numberOfStudents"
                          type="number"
                          min="1"
                          max="100"
                          required
                          value={numberOfStudents}
                          onChange={(e) => { setNumberOfStudents(e.target.value !== "" ? parseInt(e.target.value) : ""); setErrors(prev => ({ ...prev, numberOfStudents: "" })); }}
                          placeholder="e.g. 30"
                          className={fieldCls("numberOfStudents")}
                        />
                        {/* Presets */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {[15, 30, 50, 100].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => { setNumberOfStudents(preset); setErrors(prev => ({ ...prev, numberOfStudents: "" })); }}
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-md border transition-all ${numberOfStudents === preset
                                  ? "bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm"
                                  : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                                }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                        {errors.numberOfStudents && <p className="text-[11px] font-semibold text-red-500">{errors.numberOfStudents}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="modal-questionCount" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--foreground-muted)]">
                          <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                          Questions Count
                        </Label>
                        <input
                          id="modal-questionCount"
                          type="number"
                          min="1"
                          max="50"
                          required
                          value={questionCount}
                          onChange={(e) => { setQuestionCount(e.target.value !== "" ? parseInt(e.target.value) : ""); setErrors(prev => ({ ...prev, questionCount: "" })); }}
                          placeholder="e.g. 40"
                          className={fieldCls("questionCount")}
                        />
                        {/* Presets */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {[10, 25, 40, 50].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => { setQuestionCount(preset); setErrors(prev => ({ ...prev, questionCount: "" })); }}
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-md border transition-all ${questionCount === preset
                                  ? "bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm"
                                  : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                                }`}
                            >
                              {preset} Qs
                            </button>
                          ))}
                        </div>
                        {errors.questionCount && <p className="text-[11px] font-semibold text-red-500">{errors.questionCount}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="modal-examDurationMins" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--foreground-muted)]">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          Duration (Mins)
                        </Label>
                        <input
                          id="modal-examDurationMins"
                          type="number"
                          min="1"
                          required
                          value={examDurationMins}
                          onChange={(e) => { setExamDurationMins(e.target.value !== "" ? parseInt(e.target.value) : ""); setErrors(prev => ({ ...prev, examDurationMins: "" })); }}
                          placeholder="e.g. 60"
                          className={fieldCls("examDurationMins")}
                        />
                        {/* Presets */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {[30, 60, 90, 120].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => { setExamDurationMins(preset); setErrors(prev => ({ ...prev, examDurationMins: "" })); }}
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-md border transition-all ${examDurationMins === preset
                                  ? "bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm"
                                  : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                                }`}
                            >
                              {preset}m
                            </button>
                          ))}
                        </div>
                        {errors.examDurationMins && <p className="text-[11px] font-semibold text-red-500">{errors.examDurationMins}</p>}
                      </div>
                    </div>

                    {/* Segmented Control for Options per Question */}
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--foreground-muted)]">
                        <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                        Options per Question
                      </Label>
                      <div className="flex items-center bg-slate-50 border border-slate-200 p-1 rounded-xl gap-1">
                        {[2, 3, 4, 5].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => { setAnswersPerQuestion(preset); setErrors(prev => ({ ...prev, answersPerQuestion: "" })); }}
                            className={`relative flex-1 py-1.5 text-xs font-bold transition-all rounded-lg ${answersPerQuestion === preset
                                ? "text-indigo-600 font-extrabold"
                                : "text-slate-500 hover:text-slate-800"
                              }`}
                          >
                            <span className="relative z-10">{preset} Options</span>
                            {answersPerQuestion === preset && (
                              <motion.div
                                layoutId="activeAnswersCount"
                                className="absolute inset-0 bg-white border border-slate-200/50 rounded-lg shadow-sm"
                                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                              />
                            )}
                          </button>
                        ))}
                      </div>
                      {errors.answersPerQuestion && <p className="text-[11px] font-semibold text-red-500">{errors.answersPerQuestion}</p>}
                    </div>

                    {/* Info banner */}
                    <div className="flex items-start gap-2.5 bg-indigo-50/60 border border-indigo-100/70 rounded-xl px-3.5 py-2.5">
                      <CheckCircle2 className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] text-indigo-700 font-medium leading-relaxed">
                        After creating this paper, you'll be taken to the <strong>question editor</strong> where you can add and configure each question.
                      </p>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-5">
                      <button
                        type="button"
                        id="create-exam-modal-cancel-btn"
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-slate-400 transition-all active:scale-95 disabled:opacity-40"
                      >
                        Cancel
                      </button>

                      <Button
                        type="submit"
                        id="create-exam-submit-btn"
                        disabled={loading}
                        className="h-10 px-6 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-500/20 gap-2 transition-all active:scale-[0.98]"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            {editingPaper ? "Saving…" : "Creating…"}
                          </>
                        ) : (
                          <>
                            {editingPaper ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Save Changes
                              </>
                            ) : (
                              <>
                                <PlusCircle className="w-3.5 h-3.5" />
                                Create Paper
                                <ArrowRight className="w-3.5 h-3.5" />
                              </>
                            )}
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
