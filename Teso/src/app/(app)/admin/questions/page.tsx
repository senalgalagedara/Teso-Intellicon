"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  BookOpen,
  Filter,
  Sparkles,
  Layers,
  CheckCircle2,
  Image as ImageIcon,
  BarChart3,
  Loader2,
  X,
  HelpCircle,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAdminSubjects,
  getAdminTopics,
  getAdminSubtopics,
  getAdminQuestions,
  createAdminQuestion,
  getAdminQuestionAnalytics,
} from "@/app/actions/revision-actions";

export default function AdminQuestionsPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [subtopics, setSubtopics] = useState<any[]>([]);
  const [selectedSubtopicId, setSelectedSubtopicId] = useState<string>("");
  const [levelFilter, setLevelFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // New Question Form State
  const [formSubjectId, setFormSubjectId] = useState<string>("");
  const [formTopicId, setFormTopicId] = useState<string>("");
  const [formSubtopicId, setFormSubtopicId] = useState<string>("");
  const [formLevel, setFormLevel] = useState<"AL" | "OL">("AL");
  const [formQuestionText, setFormQuestionText] = useState<string>("");
  const [formQuestionImage, setFormQuestionImage] = useState<string>("");

  const [ans1Text, setAns1Text] = useState<string>("");
  const [ans1Image, setAns1Image] = useState<string>("");
  const [ans2Text, setAns2Text] = useState<string>("");
  const [ans2Image, setAns2Image] = useState<string>("");
  const [ans3Text, setAns3Text] = useState<string>("");
  const [ans3Image, setAns3Image] = useState<string>("");
  const [ans4Text, setAns4Text] = useState<string>("");
  const [ans4Image, setAns4Image] = useState<string>("");
  const [ans5Text, setAns5Text] = useState<string>("");
  const [ans5Image, setAns5Image] = useState<string>("");

  const [correctKey, setCorrectKey] = useState<number>(1);
  const [hasAdditionalKey, setHasAdditionalKey] = useState<boolean>(false);
  const [additionalKey, setAdditionalKey] = useState<number | "bonus">(2);
  const [explanationText, setExplanationText] = useState<string>("");
  const [explanationImage, setExplanationImage] = useState<string>("");
  const [initialDiff, setInitialDiff] = useState<number>(0.5);

  // Load initial subjects
  useEffect(() => {
    async function initSubjects() {
      try {
        const subs = await getAdminSubjects();
        setSubjects(subs);
        if (subs.length > 0) {
          setSelectedSubjectId(subs[0].id);
          setFormSubjectId(subs[0].id);
        }
      } catch (err: any) {
        console.error("Failed to load subjects:", err);
      }
    }
    initSubjects();
  }, []);

  // Cascade topics on subject select
  useEffect(() => {
    if (!selectedSubjectId) {
      setTopics([]);
      setSelectedTopicId("");
      return;
    }
    async function loadTopics() {
      try {
        const tops = await getAdminTopics(selectedSubjectId);
        setTopics(tops);
        if (tops.length > 0) setSelectedTopicId(tops[0].id);
        else setSelectedTopicId("");
      } catch (err) {
        console.error(err);
      }
    }
    loadTopics();
  }, [selectedSubjectId]);

  // Cascade subtopics on topic select
  useEffect(() => {
    if (!selectedTopicId) {
      setSubtopics([]);
      setSelectedSubtopicId("");
      return;
    }
    async function loadSubtopics() {
      try {
        const subs = await getAdminSubtopics(selectedTopicId);
        setSubtopics(subs);
        if (subs.length > 0) setSelectedSubtopicId(subs[0].id);
        else setSelectedSubtopicId("");
      } catch (err) {
        console.error(err);
      }
    }
    loadSubtopics();
  }, [selectedTopicId]);

  // Load questions
  const loadQuestionList = async () => {
    setLoading(true);
    try {
      const data = await getAdminQuestions({
        subjectId: selectedSubjectId || undefined,
        topicId: selectedTopicId || undefined,
        subtopicId: selectedSubtopicId || undefined,
        examLevel: levelFilter || undefined,
        search: searchQuery || undefined,
      });
      setQuestions(data);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load questions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestionList();
  }, [selectedSubjectId, selectedTopicId, selectedSubtopicId, levelFilter]);

  // Handle Create Question Submission
  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubtopicId || !formQuestionText.trim()) {
      toast.error("Please fill in the subtopic and question text.");
      return;
    }

    if (formLevel === "AL" && !ans5Text.trim() && !ans5Image.trim()) {
      toast.error("G.C.E. A/L questions require 5 answer options.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        subject_id: formSubjectId,
        topic_id: formTopicId,
        subtopic_id: formSubtopicId,
        exam_level: formLevel,
        question_text: formQuestionText,
        question_image_url: formQuestionImage || null,
        answer_1_text: ans1Text || null,
        answer_1_image_url: ans1Image || null,
        answer_2_text: ans2Text || null,
        answer_2_image_url: ans2Image || null,
        answer_3_text: ans3Text || null,
        answer_3_image_url: ans3Image || null,
        answer_4_text: ans4Text || null,
        answer_4_image_url: ans4Image || null,
        answer_5_text: formLevel === "AL" ? ans5Text || null : null,
        answer_5_image_url: formLevel === "AL" ? ans5Image || null : null,
        correct_answer_number: Number(correctKey),
        additional_correct_answer_number: hasAdditionalKey
          ? additionalKey === "bonus"
            ? -1
            : Number(additionalKey)
          : null,
        explanation_text: explanationText || null,
        explanation_image_url: explanationImage || null,
        initial_difficulty: Number(initialDiff),
        time_limit_seconds: formLevel === "AL" ? 90 : 60,
      };

      await createAdminQuestion(payload);
      toast.success("Question created successfully with Duolingo calibration base!");
      setIsModalOpen(false);
      resetForm();
      loadQuestionList();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create question");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormQuestionText("");
    setFormQuestionImage("");
    setAns1Text("");
    setAns1Image("");
    setAns2Text("");
    setAns2Image("");
    setAns3Text("");
    setAns3Image("");
    setAns4Text("");
    setAns4Image("");
    setAns5Text("");
    setAns5Image("");
    setCorrectKey(1);
    setHasAdditionalKey(false);
    setExplanationText("");
    setExplanationImage("");
  };

  const getDifficultyBadge = (score: number) => {
    if (score < 0.35) return <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Easy ({score.toFixed(2)})</span>;
    if (score < 0.65) return <span className="px-2 py-0.5 rounded text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20">Medium ({score.toFixed(2)})</span>;
    if (score < 0.85) return <span className="px-2 py-0.5 rounded text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">Hard ({score.toFixed(2)})</span>;
    return <span className="px-2 py-0.5 rounded text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20">Expert ({score.toFixed(2)})</span>;
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-primary" />
            Question Bank Workbench
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage subject curricula, create 4-choice (O/L) & 5-choice (A/L) questions, and monitor real-time Duolingo dynamic difficulty calibration.
          </p>
        </div>
        <button
          onClick={() => {
            setFormSubjectId(selectedSubjectId);
            setFormTopicId(selectedTopicId);
            setFormSubtopicId(selectedSubtopicId);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-medium px-4 py-2.5 rounded-lg shadow hover:opacity-90 transition"
        >
          <Plus className="w-4 h-4" />
          Add Question
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
        {/* Subject Filter */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Subject</label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.exam_level})
              </option>
            ))}
          </select>
        </div>

        {/* Topic Filter */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Topic</label>
          <select
            value={selectedTopicId}
            onChange={(e) => setSelectedTopicId(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
          >
            <option value="">All Topics</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                Unit {t.topic_number}: {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Subtopic Filter */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Subtopic</label>
          <select
            value={selectedSubtopicId}
            onChange={(e) => setSelectedSubtopicId(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
          >
            <option value="">All Subtopics</option>
            {subtopics.map((st) => (
              <option key={st.id} value={st.id}>
                {st.subtopic_code} {st.name}
              </option>
            ))}
          </select>
        </div>

        {/* Exam Level Filter */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Level</label>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
          >
            <option value="">All Levels</option>
            <option value="AL">A/L (5 choices)</option>
            <option value="OL">O/L (4 choices)</option>
          </select>
        </div>

        {/* Search */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Search</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadQuestionList()}
              className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
        </div>
      </div>

      {/* Questions Data Table */}
      <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
            <p className="text-sm">Fetching questions & difficulty metrics...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <HelpCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-base font-medium">No questions found</p>
            <p className="text-xs mt-1">Try adjusting the filter or click "Add Question" to seed questions.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b border-border/40 text-xs text-muted-foreground font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">Level</th>
                  <th className="py-3 px-4">Question Prompt</th>
                  <th className="py-3 px-4">Correct Key</th>
                  <th className="py-3 px-4">Attempts</th>
                  <th className="py-3 px-4">Empirical Acc</th>
                  <th className="py-3 px-4">Dynamic Diff (Duolingo)</th>
                  <th className="py-3 px-4">Elo Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {questions.map((q) => (
                  <tr key={q.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${q.exam_level === "AL" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "bg-sky-500/10 text-sky-400 border border-sky-500/20"}`}>
                        {q.exam_level}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-md">
                      <p className="line-clamp-2 text-foreground font-medium">{q.question_text}</p>
                      {q.question_image_url && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                          <ImageIcon className="w-3 h-3" /> Has Image
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-primary">Option {q.correct_answer_number}</span>
                      {q.additional_correct_answer_number && (
                        <span className="text-xs text-muted-foreground block">
                          alt: {q.additional_correct_answer_number === -1 ? "Bonus" : `Option ${q.additional_correct_answer_number}`}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-mono">
                      {q.total_attempts}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-medium">
                        {(q.historical_accuracy * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {getDifficultyBadge(q.difficulty_score)}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                      {Math.round(q.elo_rating)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Question Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex justify-between items-center border-b border-border/40 pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <Sparkles className="w-5 h-5 text-primary" />
                Author New Question
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuestion} className="space-y-6">
              {/* Scope & Level Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Subject *</label>
                  <select
                    value={formSubjectId}
                    onChange={(e) => setFormSubjectId(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                    required
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.exam_level})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Exam Level *</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormLevel("AL")}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition ${formLevel === "AL" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                    >
                      A/L (5 options)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormLevel("OL")}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition ${formLevel === "OL" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                    >
                      O/L (4 options)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Subtopic *</label>
                  <select
                    value={formSubtopicId}
                    onChange={(e) => setFormSubtopicId(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                    required
                  >
                    <option value="">Select Subtopic</option>
                    {subtopics.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.subtopic_code} {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Question Stem */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground block">Question Text * (Markdown supported)</label>
                <textarea
                  rows={3}
                  value={formQuestionText}
                  onChange={(e) => setFormQuestionText(e.target.value)}
                  placeholder="Enter the question prompt here..."
                  className="w-full bg-background border border-border rounded-lg p-3 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
                  required
                />
                <input
                  type="text"
                  placeholder="Question Image URL (optional, e.g. https://...)"
                  value={formQuestionImage}
                  onChange={(e) => setFormQuestionImage(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              {/* Answer Choices */}
              <div className="space-y-4 border-t border-border/40 pt-4">
                <h3 className="text-sm font-bold text-foreground">Answer Choices</h3>

                {/* Option 1 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Choice 1 Text"
                    value={ans1Text}
                    onChange={(e) => setAns1Text(e.target.value)}
                    className="bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground"
                  />
                  <input
                    type="text"
                    placeholder="Choice 1 Image URL (optional)"
                    value={ans1Image}
                    onChange={(e) => setAns1Image(e.target.value)}
                    className="bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground"
                  />
                </div>

                {/* Option 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Choice 2 Text"
                    value={ans2Text}
                    onChange={(e) => setAns2Text(e.target.value)}
                    className="bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground"
                  />
                  <input
                    type="text"
                    placeholder="Choice 2 Image URL (optional)"
                    value={ans2Image}
                    onChange={(e) => setAns2Image(e.target.value)}
                    className="bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground"
                  />
                </div>

                {/* Option 3 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Choice 3 Text"
                    value={ans3Text}
                    onChange={(e) => setAns3Text(e.target.value)}
                    className="bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground"
                  />
                  <input
                    type="text"
                    placeholder="Choice 3 Image URL (optional)"
                    value={ans3Image}
                    onChange={(e) => setAns3Image(e.target.value)}
                    className="bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground"
                  />
                </div>

                {/* Option 4 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Choice 4 Text"
                    value={ans4Text}
                    onChange={(e) => setAns4Text(e.target.value)}
                    className="bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground"
                  />
                  <input
                    type="text"
                    placeholder="Choice 4 Image URL (optional)"
                    value={ans4Image}
                    onChange={(e) => setAns4Image(e.target.value)}
                    className="bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground"
                  />
                </div>

                {/* Option 5 (A/L Only) */}
                {formLevel === "AL" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Choice 5 Text (Required for A/L)"
                      value={ans5Text}
                      onChange={(e) => setAns5Text(e.target.value)}
                      className="bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground"
                    />
                    <input
                      type="text"
                      placeholder="Choice 5 Image URL (optional)"
                      value={ans5Image}
                      onChange={(e) => setAns5Image(e.target.value)}
                      className="bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground"
                    />
                  </div>
                )}
              </div>

              {/* Correct Answer Keys & Scoring */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border/40 pt-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Primary Correct Key *</label>
                  <select
                    value={correctKey}
                    onChange={(e) => setCorrectKey(Number(e.target.value))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                  >
                    <option value={1}>Option 1</option>
                    <option value={2}>Option 2</option>
                    <option value={3}>Option 3</option>
                    <option value={4}>Option 4</option>
                    {formLevel === "AL" && <option value={5}>Option 5</option>}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-muted-foreground">Secondary Key / Bonus</label>
                    <label className="text-[11px] text-primary flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasAdditionalKey}
                        onChange={(e) => setHasAdditionalKey(e.target.checked)}
                        className="rounded"
                      />
                      Enable Dual-Key
                    </label>
                  </div>
                  {hasAdditionalKey ? (
                    <select
                      value={additionalKey}
                      onChange={(e) => setAdditionalKey(e.target.value === "bonus" ? "bonus" : Number(e.target.value))}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                    >
                      <option value={1}>Option 1 also accepted</option>
                      <option value={2}>Option 2 also accepted</option>
                      <option value={3}>Option 3 also accepted</option>
                      <option value={4}>Option 4 also accepted</option>
                      {formLevel === "AL" && <option value={5}>Option 5 also accepted</option>}
                      <option value="bonus">All Correct / Bonus (-1)</option>
                    </select>
                  ) : (
                    <p className="text-xs text-muted-foreground py-2">Single correct answer scheme</p>
                  )}
                </div>
              </div>

              {/* Explanation & Baseline Difficulty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border/40 pt-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Explanation</label>
                  <textarea
                    rows={2}
                    placeholder="Step-by-step solution..."
                    value={explanationText}
                    onChange={(e) => setExplanationText(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Initial Baseline Difficulty</label>
                  <select
                    value={initialDiff}
                    onChange={(e) => setInitialDiff(Number(e.target.value))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                  >
                    <option value={0.25}>Easy (0.25 baseline)</option>
                    <option value={0.50}>Medium (0.50 baseline)</option>
                    <option value={0.75}>Hard (0.75 baseline)</option>
                  </select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    *Will adjust dynamically via Duolingo Elo/IRT as students answer.
                  </p>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-medium px-5 py-2 rounded-lg hover:opacity-90 transition disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
