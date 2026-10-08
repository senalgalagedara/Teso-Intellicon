"use client";

import React, { useState, useEffect, useRef } from "react";
import { saveExamQuestion, deleteExamQuestion } from "@/app/actions/papers";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Loader2, Trash2, Save, ChevronLeft, ChevronRight,
  ImagePlus, X, Check, CheckCircle2, AlertCircle,
  Camera, ChevronDown, FileText,
} from "lucide-react";
import { toast } from "sonner";

/* ── Types ── */
interface QuestionData {
  id?: string;  // cuid from Prisma schema
  questionNumber: number;
  questionText?: string;
  topic?: string | null;
  difficulty?: string;
  correctAnswer1?: number;
  correctAnswer2?: number | null;
  updatedAt?: string;
  images?: { url: string }[];
  questionImage?: string | null;
  [key: string]: unknown;
}
interface Paper {
  id: string;
  title: string;
  questionCount: number | null;
  answersPerQuestion: number | null;
}

/* ── Difficulty config ── */
const DIFF: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
  Easy: { label: "Easy", dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-300" },
  Medium: { label: "Medium", dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-300" },
  Hard: { label: "Hard", dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50", border: "border-red-300" },
};

/* ── Option letter helper ── */
const LETTERS = ["A", "B", "C", "D", "E"];

/* ─────────────────────────────────────────────
   Compact image upload cell
───────────────────────────────────────────── */
function ImageCell({
  existingUrl,
  newFile,
  onNew,
  onClear,
}: {
  existingUrl?: string | null;
  newFile?: File | null;
  onNew: (f: File) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const src = newFile ? URL.createObjectURL(newFile) : existingUrl;

  return (
    <div
      onClick={() => ref.current?.click()}
      className={`relative w-16 h-16 rounded-xl border-2 flex-shrink-0 overflow-hidden cursor-pointer transition-all group ${src
        ? "border-blue-400 shadow-sm"
        : "border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/60"
        }`}
    >
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onNew(f);
          e.target.value = "";
        }}
      />
      {src ? (
        <>
          <img src={src} alt="" className="w-full h-full object-cover" />
          <div className={`absolute top-0.5 left-0.5 text-[7px] font-black px-1 py-0.5 rounded uppercase tracking-wide ${newFile ? "bg-emerald-500 text-white" : "bg-blue-600 text-white"}`}>
            {newFile ? "New" : "Saved"}
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white items-center justify-center hidden group-hover:flex"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-0.5 select-none">
          <Camera className="w-4 h-4 text-blue-300 group-hover:text-blue-500 transition-colors" />
          <span className="text-[9px] text-blue-300 group-hover:text-blue-500 font-bold transition-colors">Photo</span>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Difficulty pill dropdown
───────────────────────────────────────────── */
function DiffPill({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const d = DIFF[value] ?? DIFF.Medium;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 h-7 px-3 rounded-lg border text-[11px] font-bold transition-all ${d.text} ${d.bg} ${d.border}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${d.dot}`} />
        {d.label}
        <ChevronDown className={`w-3 h-3 ml-0.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden w-32"
          >
            {Object.entries(DIFF).map(([k, cfg]) => (
              <button
                key={k}
                type="button"
                onClick={() => { onChange(k); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-bold hover:bg-slate-50 transition-colors ${cfg.text}`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                {cfg.label}
                {value === k && <Check className="w-3 h-3 ml-auto" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main export
───────────────────────────────────────────── */
export default function ManageQuestionsClient({
  paper,
  existingQuestions,
}: {
  paper: Paper;
  existingQuestions: QuestionData[];
}) {
  const router = useRouter();
  const [currentIdx, setCurrentIdx] = useState(0);

  const total = paper.questionCount || 0;
  const answersPerQ = paper.answersPerQuestion || 5;
  const currentNum = currentIdx + 1;
  const existingData = existingQuestions.find((q) => q.questionNumber === currentNum);
  const savedSet = new Set(existingQuestions.map((q) => q.questionNumber));
  const savedCount = savedSet.size;

  return (
    <div className="min-h-screen" style={{ background: "#f0f5ff" }}>
      {/* ── Top Nav Bar ── */}
      <div className="sticky top-12 z-30 bg-white border-b-2 border-blue-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-13 flex items-center justify-between gap-3 py-2.5">
          {/* Back + Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push("/host/create")}
              id="back-to-dashboard-btn"
              className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 transition-colors font-bold text-xs uppercase tracking-widest flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:block">Dashboard</span>
            </button>
            <div className="w-px h-5 bg-blue-100 hidden sm:block flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-800 truncate leading-snug">{paper.title}</p>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none">Question Editor</p>
            </div>
          </div>

          {/* Prev / Q counter / Next */}
          <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-xl p-1">
            <button
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
              className="h-8 px-3 rounded-lg bg-white border border-blue-200 shadow-sm text-blue-700 font-black text-[11px] uppercase disabled:opacity-30 hover:bg-blue-50 transition-all flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />Prev
            </button>
            <div className="px-3 text-xs font-black text-blue-900 min-w-[90px] text-center">
              Q{currentNum} <span className="text-blue-400 font-semibold">/ {total}</span>
            </div>
            <button
              onClick={() => setCurrentIdx((i) => Math.min(total - 1, i + 1))}
              disabled={currentIdx === total - 1}
              className="h-8 px-3 rounded-lg bg-white border border-blue-200 shadow-sm text-blue-700 font-black text-[11px] uppercase disabled:opacity-30 hover:bg-blue-50 transition-all flex items-center gap-1"
            >
              Next<ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Status */}
          <div className="hidden sm:block">
            {existingData ? (
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-300 px-3 py-1.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" /> Saved
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full">
                <AlertCircle className="w-3.5 h-3.5" /> Draft
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-1 md:grid-cols-[1fr_240px] gap-4">

        {/* ── LEFT: Question Form ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
          >
            <QuestionForm
              paperId={paper.id}
              questionNumber={currentNum}
              existingData={existingData}
              answersPerQuestion={answersPerQ}
              onRefresh={() => router.refresh()}
              onNext={() => setCurrentIdx((i) => Math.min(total - 1, i + 1))}
              isLast={currentIdx === total - 1}
            />
          </motion.div>
        </AnimatePresence>

        {/* ── RIGHT: Question Map ── */}
        <aside className="md:sticky md:top-[112px] md:self-start w-full">
          <div className="bg-white rounded-2xl border-2 border-blue-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-blue-600 px-4 py-3">
              <p className="text-xs font-black text-white uppercase tracking-wider">Questions</p>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-1.5 bg-blue-500/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-500"
                    style={{ width: `${total ? (savedCount / total) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-blue-200 font-bold whitespace-nowrap">{savedCount}/{total}</span>
              </div>
            </div>

            {/* Grid — 7 columns, medium padding and gap */}
            <div className="p-3 grid gap-1.5" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
              {Array.from({ length: total }).map((_, i) => {
                const num = i + 1;
                const saved = savedSet.has(num);
                const active = currentIdx === i;
                return (
                  <button
                    key={num}
                    onClick={() => setCurrentIdx(i)}
                    title={`Question ${num}${saved ? " (saved)" : ""}`}
                    className={`relative aspect-square rounded-md text-[12px] font-black transition-all leading-none flex items-center justify-center ${active
                      ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-300 scale-110 z-10"
                      : saved
                        ? "bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200"
                        : "bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200 hover:text-slate-700"
                      }`}
                  >
                    {num}
                    {/* Saved dot */}
                    {saved && !active && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-500 border border-white" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="px-3 py-2.5 border-t border-blue-50 flex items-center justify-between gap-2 bg-slate-50/50">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-blue-600 inline-block" />
                <span className="text-[10px] text-slate-500 font-bold leading-none">Current</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-blue-100 border border-blue-300 inline-block" />
                <span className="text-[10px] text-slate-500 font-bold leading-none">Saved</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-slate-100 border border-slate-200 inline-block" />
                <span className="text-[10px] text-slate-500 font-bold leading-none">Empty</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Question Form
───────────────────────────────────────────── */
function QuestionForm({
  paperId,
  questionNumber,
  existingData,
  answersPerQuestion,
  onRefresh,
  onNext,
  isLast,
}: {
  paperId: string;
  questionNumber: number;
  existingData?: QuestionData;
  answersPerQuestion: number;
  onRefresh: () => void;
  onNext: () => void;
  isLast: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [questionText, setQuestionText] = useState(existingData?.questionText || "");
  const [topic, setTopic] = useState(existingData?.topic || "");
  const [difficulty, setDifficulty] = useState(existingData?.difficulty || "Medium");
  const [answers, setAnswers] = useState<string[]>(
    Array.from({ length: answersPerQuestion }, (_, i) => (existingData?.[`answer${i + 1}`] as string) || "")
  );
  const [correctAnswer, setCorrectAnswer] = useState(existingData?.correctAnswer1?.toString() || "1");
  const [correctAnswer2, setCorrectAnswer2] = useState(existingData?.correctAnswer2?.toString() || "none");

  // Images
  const [qImages, setQImages] = useState<File[]>([]);
  const [aImages, setAImages] = useState<(File | null)[]>(Array.from({ length: answersPerQuestion }, () => null));
  const [deletedQImg, setDeletedQImg] = useState(false);
  const [deletedAImgs, setDeletedAImgs] = useState<boolean[]>(Array(answersPerQuestion).fill(false));

  const existingQImgs: { url: string }[] =
    existingData?.images || (existingData?.questionImage ? [{ url: existingData.questionImage as string }] : []);
  const existingAImgs: (string | null)[] = Array.from(
    { length: answersPerQuestion },
    (_, i) => (existingData?.[`answer${i + 1}Image`] as string) || null
  );

  // Reset on question change
  useEffect(() => {
    setQuestionText(existingData?.questionText || "");
    setTopic(existingData?.topic || "");
    setDifficulty(existingData?.difficulty || "Medium");
    setAnswers(Array.from({ length: answersPerQuestion }, (_, i) => (existingData?.[`answer${i + 1}`] as string) || ""));
    setCorrectAnswer(existingData?.correctAnswer1?.toString() || "1");
    setCorrectAnswer2(existingData?.correctAnswer2?.toString() || "none");
    setQImages([]);
    setAImages(Array.from({ length: answersPerQuestion }, () => null));
    setDeletedQImg(false);
    setDeletedAImgs(Array(answersPerQuestion).fill(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionNumber]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    if (existingData?.id) fd.append("id", existingData.id.toString());
    fd.set("paperId", paperId);
    fd.set("questionNumber", questionNumber.toString());
    fd.set("questionText", questionText);
    fd.set("topic", topic);
    fd.set("difficulty", difficulty);
    for (let i = 0; i < answersPerQuestion; i++) fd.set(`answer${i + 1}`, answers[i]);
    fd.set("correctAnswer1", correctAnswer);
    if (correctAnswer2 !== "none") fd.set("correctAnswer2", correctAnswer2);
    qImages.forEach((f) => fd.append("questionImages", f));
    for (let i = 0; i < answersPerQuestion; i++) {
      if (aImages[i]) fd.set(`answer${i + 1}Image`, aImages[i]!);
    }

    // Add deletion flags
    fd.set("deleteQuestionImage", deletedQImg ? "true" : "false");
    for (let i = 0; i < answersPerQuestion; i++) {
      fd.set(`deleteAnswerImage${i + 1}`, deletedAImgs[i] ? "true" : "false");
    }

    try {
      const res = await saveExamQuestion(fd);
      if (res.success) {
        toast.success(existingData?.id ? `Q${questionNumber} updated!` : `Q${questionNumber} saved!`);
        setQImages([]);
        setAImages(Array.from({ length: answersPerQuestion }, () => null));
        setDeletedQImg(false);
        setDeletedAImgs(Array(answersPerQuestion).fill(false));
        onRefresh();
        if (!isLast) onNext();
      } else {
        console.error("Save failed:", res.error);
        toast.error(`Save failed: ${res.error ?? "Unknown error"}`, { duration: 6000 });
      }
    } catch (err) {
      console.error("Save exception:", err);
      toast.error(`Save exception: ${err instanceof Error ? err.message : String(err)}`, { duration: 6000 });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!existingData?.id) return;
    if (!confirm("Delete this question? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await deleteExamQuestion(existingData.id);
      if (res.success) { toast.success("Deleted"); onRefresh(); }
      else toast.error("Delete failed: " + res.error);
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  const busy = saving || deleting;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* ═══════════════════════════════════════
          SECTION 1 — QUESTION DETAILS
      ═══════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border-2 border-blue-200 shadow-sm overflow-hidden">
        {/* Section header bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-blue-600">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <span className="text-white font-black text-sm">{questionNumber}</span>
            </div>
            <div>
              <p className="text-white font-black text-sm leading-none">Question {questionNumber}</p>
              <p className="text-blue-200 text-[10px] font-medium mt-0.5">
                {existingData
                  ? `Last saved ${new Date(existingData.updatedAt!).toLocaleDateString()}`
                  : "Not saved yet"}
              </p>
            </div>
          </div>
          <DiffPill value={difficulty} onChange={setDifficulty} />
        </div>

        {/* Form fields */}
        <div className="p-5 space-y-4">
          {/* Topic */}
          <div>
            <label className="block text-[11px] font-black text-blue-700 uppercase tracking-widest mb-1.5">
              Topic <span className="text-blue-300 font-medium normal-case tracking-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Photosynthesis"
              className="w-full h-10 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 px-3 text-sm text-slate-800 placeholder:text-slate-300 bg-slate-50 outline-none transition-all"
            />
          </div>

          {/* Question text */}
          <div>
            <label className="block text-[11px] font-black text-blue-700 uppercase tracking-widest mb-1.5">
              Question Text
            </label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Type the question here…"
              rows={3}
              className="w-full rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 bg-slate-50 outline-none transition-all resize-y leading-relaxed"
            />
          </div>

          {/* Question images */}
          <div>
            <label className="block text-[11px] font-black text-blue-700 uppercase tracking-widest mb-2">
              Question Images <span className="text-blue-300 font-medium normal-case tracking-normal">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-blue-50 border-2 border-blue-100 min-h-[80px] items-center">
              {/* Existing */}
              {!deletedQImg && existingQImgs.map((img, i) => (
                <div key={`eq${i}`} className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-blue-300 shadow-sm flex-shrink-0 group">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute top-0.5 left-0.5 bg-blue-600 text-white text-[7px] font-black px-1 rounded uppercase">Saved</div>
                  <button
                    type="button"
                    onClick={() => {
                      setDeletedQImg(true);
                      setQImages([]);
                    }}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white items-center justify-center hidden group-hover:flex"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
              {/* New files */}
              {qImages.map((f, i) => (
                <div key={`nq${i}`} className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-emerald-400 shadow-sm flex-shrink-0 group">
                  <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                  <div className="absolute top-0.5 left-0.5 bg-emerald-500 text-white text-[7px] font-black px-1 rounded uppercase">New</div>
                  <button
                    type="button"
                    onClick={() => setQImages((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white items-center justify-center hidden group-hover:flex"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
              {/* Add button */}
              {((existingQImgs.length === 0 || deletedQImg) && qImages.length === 0) && (
                <label className="w-16 h-16 rounded-xl border-2 border-dashed border-blue-300 flex flex-col items-center justify-center gap-0.5 cursor-pointer hover:border-blue-500 hover:bg-blue-100 transition-all group flex-shrink-0">
                  <ImagePlus className="w-5 h-5 text-blue-300 group-hover:text-blue-500 transition-colors" />
                  <span className="text-[9px] text-blue-300 group-hover:text-blue-500 font-bold transition-colors">Add</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setQImages([e.target.files[0]]);
                        setDeletedQImg(false);
                      }
                    }}
                  />
                </label>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          SECTION 2 — ANSWER OPTIONS
      ═══════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border-2 border-blue-200 shadow-sm overflow-hidden">
        {/* Section header */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-700">
          <p className="text-white font-black text-sm uppercase tracking-wide">Answer Options</p>
          <span className="text-slate-400 text-[11px] font-bold">{answersPerQuestion} options — click letter to mark correct</span>
        </div>

        <div className="p-4 space-y-2.5">
          {Array.from({ length: answersPerQuestion }).map((_, i) => {
            const num = i + 1;
            const ns = num.toString();
            const isPrimary = correctAnswer === ns;
            const isAlt = correctAnswer2 === ns;
            const isCorrect = isPrimary || isAlt;

            return (
              <div
                key={num}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${isPrimary
                  ? "border-blue-500 bg-blue-50 shadow-sm"
                  : isAlt
                    ? "border-indigo-400 bg-indigo-50/60"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                  }`}
              >
                {/* Letter button → marks as primary correct */}
                <button
                  type="button"
                  onClick={() => setCorrectAnswer(ns)}
                  title="Set as correct answer"
                  className={`w-9 h-9 rounded-lg flex-shrink-0 font-black text-sm flex items-center justify-center transition-all ${isPrimary
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white border-2 border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600"
                    }`}
                >
                  {isPrimary ? <Check className="w-4 h-4" /> : LETTERS[i]}
                </button>

                {/* Label + badge */}
                <div className="w-14 flex-shrink-0">
                  <p className={`text-[10px] font-black uppercase tracking-wide leading-none ${isPrimary ? "text-blue-700" : isAlt ? "text-indigo-700" : "text-slate-400"
                    }`}>
                    Opt {num}
                  </p>
                  {isPrimary && <p className="text-[8px] text-blue-500 font-bold mt-0.5">Primary ✓</p>}
                  {isAlt && <p className="text-[8px] text-indigo-500 font-bold mt-0.5">Alt ✓</p>}
                </div>

                {/* Text input */}
                <input
                  type="text"
                  value={answers[i]}
                  onChange={(e) => {
                    const next = [...answers];
                    next[i] = e.target.value;
                    setAnswers(next);
                  }}
                  placeholder={`Enter text for option ${num}`}
                  className={`flex-1 h-9 rounded-lg border-2 px-3 text-sm placeholder:text-slate-300 outline-none transition-all bg-white ${isPrimary
                    ? "border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-blue-900"
                    : isAlt
                      ? "border-indigo-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-indigo-900"
                      : "border-slate-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-50 text-slate-800"
                    }`}
                />

                {/* Image slot */}
                <ImageCell
                  existingUrl={deletedAImgs[i] ? null : existingAImgs[i]}
                  newFile={aImages[i]}
                  onNew={(f) => {
                    const nextFiles = [...aImages];
                    nextFiles[i] = f;
                    setAImages(nextFiles);
                    const nextDeleted = [...deletedAImgs];
                    nextDeleted[i] = false;
                    setDeletedAImgs(nextDeleted);
                  }}
                  onClear={() => {
                    if (aImages[i]) {
                      const nextFiles = [...aImages];
                      nextFiles[i] = null;
                      setAImages(nextFiles);
                    } else {
                      const nextDeleted = [...deletedAImgs];
                      nextDeleted[i] = true;
                      setDeletedAImgs(nextDeleted);
                    }
                  }}
                />
              </div>
            );
          })}

          {/* Alt correct answer strip */}
          <div className="mt-1 pt-3 border-t-2 border-dashed border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex-shrink-0">
                Alt. correct answer:
              </span>
              <button
                type="button"
                onClick={() => setCorrectAnswer2("none")}
                className={`h-7 px-3 rounded-lg text-[11px] font-bold border transition-all ${correctAnswer2 === "none"
                  ? "bg-slate-700 text-white border-slate-700"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                  }`}
              >
                None
              </button>
              {Array.from({ length: answersPerQuestion }).map((_, i) => {
                const ns = (i + 1).toString();
                const active = correctAnswer2 === ns;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCorrectAnswer2(active ? "none" : ns)}
                    className={`h-7 px-3 rounded-lg text-[11px] font-bold border transition-all ${active
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                      }`}
                  >
                    {LETTERS[i]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          ACTION BAR
      ═══════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border-2 border-blue-100 shadow-sm px-5 py-3.5 flex items-center justify-between gap-3">
        {existingData?.id ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm border-2 border-red-200 transition-all disabled:opacity-50"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        ) : <div />}

        <button
          type="submit"
          id={`save-question-${questionNumber}-btn`}
          disabled={busy}
          className="flex items-center gap-2 h-10 px-7 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-sm shadow-md shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {existingData?.id ? "Update" : `Save Q${questionNumber}`}
              {!isLast && <ChevronRight className="w-4 h-4" />}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
