"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  PlusCircle, Calendar, Users, Hash,
  Search, Trash2, Clock, CheckCircle2,
  Copy, Check, Play, Monitor, Trophy, BarChart3,
  Edit2, Loader2, FileText, LayoutGrid, List, Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { deleteExamPaper } from "@/app/actions/papers";
import CreateExamModal from "@/components/CreateExamModal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

type Paper = {
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

function statusConfig(status: string) {
  switch (status) {
    case "APPROVED":
      return { label: "Approved", color: "text-emerald-600 bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" };
    case "ACTIVE":
      return { label: "Active", color: "text-blue-600 bg-blue-50 border-blue-200", dot: "bg-blue-500 animate-pulse" };
    case "ENDED":
      return { label: "Ended", color: "text-slate-500 bg-slate-100 border-slate-200", dot: "bg-slate-400" };
    case "REJECTED":
      return { label: "Rejected", color: "text-red-600 bg-red-50 border-red-200", dot: "bg-red-500" };
    default:
      return { label: "Pending", color: "text-amber-600 bg-amber-50 border-amber-200", dot: "bg-amber-400" };
  }
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export default function CreateExamClient({ papers, hostId }: { papers: Paper[]; hostId: string }) {
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"tile" | "list">("tile");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPaper, setEditingPaper] = useState<Paper | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState<{ id: string; title: string } | null>(null);
  const router = useRouter();

  const handleEdit = (paper: Paper) => {
    setEditingPaper(paper);
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingPaper(null);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Exam code copied!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDelete = (id: string, title: string) => {
    setExamToDelete({ id, title });
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!examToDelete) return;
    setDeleteConfirmOpen(false);
    setDeletingId(examToDelete.id);
    try {
      const res = await deleteExamPaper(examToDelete.id);
      if (res.success) {
        toast.success("Exam deleted");
        router.refresh();
      } else {
        toast.error("Failed to delete exam");
      }
    } finally {
      setDeletingId(null);
      setExamToDelete(null);
    }
  };

  const filtered = papers.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full min-h-[calc(100vh-48px)] px-6 py-8 max-w-6xl mx-auto">
      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 left-1/3 w-[500px] h-[400px] bg-indigo-400/6 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[350px] bg-violet-400/5 blur-[100px] rounded-full" />
      </div>

      {/* Header row */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-3xl font-black text-[var(--foreground)] tracking-tight">Host Exam</h1>
          <p className="text-sm text-[var(--foreground-muted)] mt-1">Manage and set up your exams.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            id="create-exam-add-btn"
            onClick={() => { setEditingPaper(null); setShowCreateModal(true); }}
            className="h-10 px-5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold rounded-xl text-sm shadow-md shadow-indigo-500/20 gap-1.5 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Create Paper
          </Button>
        </div>
      </motion.div>

      {/* Search + View Toggle + Exam List */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wider">All Exam Papers</h2>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--foreground-subtle)]" />
              <input
                type="text"
                placeholder="Search by title or code…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 h-8 w-56 rounded-lg border border-[var(--border)] bg-white text-[var(--foreground)] text-xs placeholder:text-[var(--foreground-subtle)] focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 transition-all"
              />
            </div>

            {/* View mode toggle */}
            <div className="flex items-center gap-1 bg-slate-50 border border-[var(--border)] p-1 rounded-xl">
              <button
                onClick={() => setViewMode("tile")}
                className={`p-1.5 rounded-lg transition-all ${viewMode === "tile" ? "bg-white shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-700"}`}
                title="Tile view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-white shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-700"}`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm">
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4">
                <FileText className="w-7 h-7 text-indigo-400" />
              </div>
              <p className="text-base font-bold text-[var(--foreground)] mb-1">
                {search ? "No exams match your search" : "No exams yet"}
              </p>
              <p className="text-sm text-[var(--foreground-muted)] max-w-xs">
                {search ? "Try a different keyword." : "Create your first exam paper to get started."}
              </p>
              {!search && (
                <Button
                  onClick={() => { setEditingPaper(null); setShowCreateModal(true); }}
                  className="mt-5 h-9 px-5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold rounded-xl text-sm gap-2 shadow-md shadow-indigo-500/20 transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  Create First Exam
                </Button>
              )}
            </div>
          </div>
        )}

        {/* TILE VIEW */}
        {filtered.length > 0 && viewMode === "tile" && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filtered.map((paper, i) => {
                const sc = statusConfig(paper.status);
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: i * 0.04 }}
                    key={paper.id}
                    className={`group bg-white border border-[var(--border)] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between ${deletingId === paper.id ? "opacity-40 pointer-events-none" : ""}`}
                  >
                    {/* Card Top */}
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <div className="flex-1 min-w-0">
                          {/* Code + copy */}
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="inline-block px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-[10px] font-black text-indigo-700 rounded-lg uppercase tracking-wider font-mono">
                              {paper.code}
                            </span>
                            <button
                              onClick={() => handleCopyCode(paper.code)}
                              className="p-1 text-slate-400 hover:text-indigo-600 transition-all rounded"
                              title="Copy Code"
                            >
                              {copiedCode === paper.code ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                            {/* Status badge */}
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ml-auto ${sc.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                              {sc.label}
                            </span>
                          </div>
                          <h3 className="text-base font-black text-[var(--foreground)] line-clamp-2 leading-tight">
                            {paper.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button
                            onClick={() => handleEdit(paper)}
                            className="p-1.5 text-slate-300 hover:text-indigo-600 transition-all rounded-lg hover:bg-indigo-50"
                            title="Edit Exam Details"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(paper.id, paper.title)}
                            disabled={deletingId === paper.id}
                            className="p-1.5 text-slate-300 hover:text-red-500 transition-all rounded-lg hover:bg-red-50"
                            title="Delete Exam"
                          >
                            {deletingId === paper.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Meta info */}
                      <div className="grid grid-cols-2 gap-2 mb-5">
                        <div className="flex items-center gap-2 p-2.5 bg-slate-50/80 border border-slate-100 rounded-xl">
                          <Calendar className="w-4 h-4 text-violet-400 shrink-0" />
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</p>
                            <p className="text-xs font-bold text-[var(--foreground)]">
                              {paper.examDate ? new Date(paper.examDate).toLocaleDateString([], { month: "short", day: "numeric" }) : "—"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2.5 bg-slate-50/80 border border-slate-100 rounded-xl">
                          <Hash className="w-4 h-4 text-indigo-400 shrink-0" />
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Questions</p>
                            <p className="text-xs font-bold text-[var(--foreground)]">{paper.questionCount ?? "—"} Items</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 mt-auto">
                      {/* Row 1: Start + Monitor */}
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          href={`/host/lobby/${paper.code}`}
                          className="flex items-center justify-center gap-1.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-500/20 transition-all active:scale-95"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Start
                        </Link>
                        <Link
                          href={`/host/monitor/${paper.code}`}
                          className="flex items-center justify-center gap-1.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all active:scale-95"
                        >
                          <Monitor className="w-3.5 h-3.5" />
                          Monitor
                        </Link>
                      </div>

                      {/* Row 2: Ranks + Analytics */}
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          href={`/host/leaderboard/${paper.id}`}
                          className="flex items-center justify-center gap-1.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-xl border border-amber-100 transition-all active:scale-95"
                        >
                          <Trophy className="w-3.5 h-3.5" />
                          Ranks
                        </Link>
                        <Link
                          href={`/host/results/${paper.id}`}
                          className="flex items-center justify-center gap-1.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-100 transition-all active:scale-95"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          Analytics
                        </Link>
                      </div>

                      {/* Row 3: Manage Questions */}
                      <Link
                        href={`/host/papers/${paper.id}/questions`}
                        className="flex items-center justify-center gap-1.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all active:scale-95"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Manage Questions
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* LIST VIEW */}
        {filtered.length > 0 && viewMode === "list" && (
          <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
            <AnimatePresence>
              {filtered.map((paper, i) => {
                const sc = statusConfig(paper.status);
                return (
                  <motion.div
                    key={paper.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ delay: i * 0.04 }}
                    className={`group flex flex-col lg:flex-row items-start lg:items-center gap-4 px-5 py-4 border-b border-[var(--border)] last:border-b-0 hover:bg-slate-50/80 transition-colors ${deletingId === paper.id ? "opacity-40 pointer-events-none" : ""}`}
                  >
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-indigo-500" />
                    </div>

                    {/* Title + code */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-bold text-[var(--foreground)] truncate">{paper.title}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] text-[var(--foreground-muted)] font-mono">{paper.code}</p>
                        <button
                          onClick={() => handleCopyCode(paper.code)}
                          className="text-slate-400 hover:text-indigo-600 transition-all"
                          title="Copy code"
                        >
                          {copiedCode === paper.code ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    {/* Meta chips */}
                    <div className="hidden md:flex items-center gap-4 text-[11px] text-[var(--foreground-muted)]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(paper.examDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {paper.questionCount ?? "—"} Qs
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {paper.numberOfStudents ?? "—"} seats
                      </span>
                    </div>

                    {/* Status badge */}
                    <span className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${sc.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                      {sc.label}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link href={`/host/lobby/${paper.code}`} title="Start Session">
                        <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition-all">
                          <Play className="w-3 h-3 fill-current" />
                          Start
                        </button>
                      </Link>
                      <Link href={`/host/monitor/${paper.code}`} title="Monitor Session">
                        <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-all">
                          <Monitor className="w-3 h-3" />
                          Monitor
                        </button>
                      </Link>
                      <Link href={`/host/leaderboard/${paper.id}`} title="Leaderboard">
                        <button className="w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center text-amber-600 transition-all">
                          <Trophy className="w-3.5 h-3.5" />
                        </button>
                      </Link>
                      <Link href={`/host/results/${paper.id}`} title="Analytics">
                        <button className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-600 transition-all">
                          <BarChart3 className="w-3.5 h-3.5" />
                        </button>
                      </Link>
                      <Link href={`/host/papers/${paper.id}/questions`} title="Manage Questions">
                        <button className="w-8 h-8 rounded-lg hover:bg-indigo-50 flex items-center justify-center text-[var(--foreground-muted)] hover:text-indigo-600 transition-all">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </Link>
                      <button
                        onClick={() => handleEdit(paper)}
                        title="Edit Exam Details"
                        className="w-8 h-8 rounded-lg hover:bg-indigo-50 flex items-center justify-center text-[var(--foreground-muted)] hover:text-indigo-600 transition-all"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(paper.id, paper.title)}
                        disabled={deletingId === paper.id}
                        title="Delete"
                        className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-[var(--foreground-muted)] hover:text-red-500 transition-all"
                      >
                        {deletingId === paper.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Create Exam Modal */}
      <CreateExamModal
        hostId={hostId}
        isOpen={showCreateModal}
        onClose={handleCloseModal}
        editingPaper={editingPaper}
      />

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Exam Paper?"
        description={examToDelete ? `Are you sure you want to delete "${examToDelete.title}"? This cannot be undone.` : "Are you sure you want to delete this exam paper? This cannot be undone."}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />
    </div>
  );
}
