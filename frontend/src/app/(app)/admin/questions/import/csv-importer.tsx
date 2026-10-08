"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { approveAndImportQuestionsAction } from "@/app/actions/admin";
import type { AdminSubjectRow } from "@/lib/db/admin";

export type StagedQuestion = {
  id: string;
  stem: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  explanation: string;
  isValid: boolean;
  validationError?: string;
  isSelected: boolean;
};

export function CsvImporter({
  subjects,
  defaultSubjectId,
}: {
  subjects: AdminSubjectRow[];
  defaultSubjectId?: string;
}) {
  const router = useRouter();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    defaultSubjectId || (subjects[0]?.id ?? "")
  );
  const [csvText, setCsvText] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [stagedQuestions, setStagedQuestions] = useState<StagedQuestion[]>([]);
  const [step, setStep] = useState<"input" | "review" | "done">("input");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultSummary, setResultSummary] = useState<{
    inserted: number;
    errors: string[];
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Download sample CSV template
  const downloadSampleTemplate = () => {
    const csvContent =
      'question,answer_a,answer_b,answer_c,answer_d,correct_answer,explanation\n' +
      '"What is the SI unit of electric current?","Ampere","Volt","Ohm","Watt","A","Ampere is the base unit of electric current in the International System of Units."\n' +
      '"Which planet is known as the Red Planet?","Venus","Mars","Jupiter","Saturn","B","Iron oxide on its surface gives Mars a reddish appearance."\n' +
      '"What is the acceleration due to gravity on Earth approximately?","4.9 m/s²","9.8 m/s²","12.4 m/s²","1.6 m/s²","B","Standard gravity on Earth is defined as 9.80665 m/s²."\n' +
      '"In simple harmonic motion, where is the speed of the particle maximum?","At maximum displacement","At the equilibrium position","Halfway to amplitude","It remains constant","B","Velocity reaches its peak as the object passes through equilibrium."\n';

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "teso_questions_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Robust CSV parser supporting quotes and escaped quotes
  const parseCsvData = (text: string) => {
    setErrorMessage(null);
    const lines = parseCSVToRows(text);
    if (lines.length === 0) {
      setErrorMessage("The CSV file or text is empty.");
      return;
    }

    let headerIndex = -1;
    let colIndices = {
      stem: 0,
      optA: 1,
      optB: 2,
      optC: 3,
      optD: 4,
      correct: 5,
      explanation: 6,
    };

    // Check if first row is a header
    const firstRowLower = lines[0].map((c) => c.toLowerCase().trim().replace(/[\s_-]+/g, ""));
    const isHeader =
      firstRowLower.some((c) => c.includes("question") || c.includes("stem") || c.includes("prompt")) &&
      firstRowLower.some((c) => c.includes("answer") || c.includes("option") || c.includes("correct"));

    if (isHeader) {
      headerIndex = 0;
      // map columns
      firstRowLower.forEach((col, idx) => {
        if (col === "question" || col === "stem" || col === "prompt" || col === "questiontext") {
          colIndices.stem = idx;
        } else if (col === "answera" || col === "optiona" || col === "answer1" || col === "option1" || col === "a") {
          colIndices.optA = idx;
        } else if (col === "answerb" || col === "optionb" || col === "answer2" || col === "option2" || col === "b") {
          colIndices.optB = idx;
        } else if (col === "answerc" || col === "optionc" || col === "answer3" || col === "option3" || col === "c") {
          colIndices.optC = idx;
        } else if (col === "answerd" || col === "optiond" || col === "answer4" || col === "option4" || col === "d") {
          colIndices.optD = idx;
        } else if (col.includes("correct") || col === "key" || col === "answer") {
          colIndices.correct = idx;
        } else if (col.includes("explanation") || col.includes("reason") || col.includes("solution")) {
          colIndices.explanation = idx;
        }
      });
    }

    const dataRows = isHeader ? lines.slice(1) : lines;

    const parsed: StagedQuestion[] = [];

    dataRows.forEach((row, i) => {
      // ignore completely empty lines
      if (row.length === 0 || row.every((c) => c.trim() === "")) return;

      const stem = (row[colIndices.stem] ?? "").trim();
      const optionA = (row[colIndices.optA] ?? "").trim();
      const optionB = (row[colIndices.optB] ?? "").trim();
      const optionC = (row[colIndices.optC] ?? "").trim();
      const optionD = (row[colIndices.optD] ?? "").trim();
      let rawCorrect = (row[colIndices.correct] ?? "").trim();
      const explanation = (row[colIndices.explanation] ?? "").trim();

      // Normalize correct answer
      let correctOption = "";
      const upperCorrect = rawCorrect.toUpperCase();

      if (["A", "B", "C", "D"].includes(upperCorrect)) {
        correctOption = upperCorrect;
      } else if (["1", "2", "3", "4"].includes(upperCorrect)) {
        correctOption = ["A", "B", "C", "D"][parseInt(upperCorrect, 10) - 1];
      } else if (upperCorrect.startsWith("OPTION") || upperCorrect.startsWith("ANSWER")) {
        const letter = upperCorrect.replace(/^(OPTION|ANSWER)[\s_:]*/, "").trim();
        if (["A", "B", "C", "D"].includes(letter)) {
          correctOption = letter;
        }
      } else if (rawCorrect.length > 0) {
        // match against option text
        if (optionA && rawCorrect.toLowerCase() === optionA.toLowerCase()) correctOption = "A";
        else if (optionB && rawCorrect.toLowerCase() === optionB.toLowerCase()) correctOption = "B";
        else if (optionC && rawCorrect.toLowerCase() === optionC.toLowerCase()) correctOption = "C";
        else if (optionD && rawCorrect.toLowerCase() === optionD.toLowerCase()) correctOption = "D";
      }

      // Validate
      const errors: string[] = [];
      if (!stem) errors.push("Missing question text");
      if (!optionA) errors.push("Missing Option A");
      if (!optionB) errors.push("Missing Option B");
      if (!optionC) errors.push("Missing Option C");
      if (!optionD) errors.push("Missing Option D");
      if (!correctOption) {
        errors.push(`Invalid correct answer "${rawCorrect || "(empty)"}" — must be A, B, C, or D`);
      }

      const isValid = errors.length === 0;

      parsed.push({
        id: `q_${Date.now()}_${i}`,
        stem,
        optionA,
        optionB,
        optionC,
        optionD,
        correctOption: correctOption || "A",
        explanation,
        isValid,
        validationError: errors.join(", "),
        isSelected: isValid, // Auto-select all valid rows
      });
    });

    if (parsed.length === 0) {
      setErrorMessage("No question rows could be found in the provided data.");
      return;
    }

    setStagedQuestions(parsed);
    setStep("review");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      parseCsvData(content);
    };
    reader.readAsText(file);
  };

  const toggleSelectAll = (checked: boolean) => {
    setStagedQuestions((prev) =>
      prev.map((q) => (q.isValid ? { ...q, isSelected: checked } : q))
    );
  };

  const toggleQuestionSelection = (id: string) => {
    setStagedQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, isSelected: !q.isSelected } : q))
    );
  };

  const removeStagedQuestion = (id: string) => {
    setStagedQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const updateStagedField = (
    id: string,
    field: keyof StagedQuestion,
    val: string
  ) => {
    setStagedQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        const updated = { ...q, [field]: val };
        // recheck validity
        const errs: string[] = [];
        if (!updated.stem.trim()) errs.push("Missing question text");
        if (!updated.optionA.trim()) errs.push("Missing Option A");
        if (!updated.optionB.trim()) errs.push("Missing Option B");
        if (!updated.optionC.trim()) errs.push("Missing Option C");
        if (!updated.optionD.trim()) errs.push("Missing Option D");
        if (!["A", "B", "C", "D"].includes(updated.correctOption)) {
          errs.push("Correct answer must be A, B, C, or D");
        }
        updated.isValid = errs.length === 0;
        updated.validationError = errs.join(", ");
        return updated;
      })
    );
  };

  const handleApproveAndImport = async () => {
    if (!selectedSubjectId) {
      setErrorMessage("Please select a target subject before approving questions.");
      return;
    }

    const selectedToImport = stagedQuestions.filter((q) => q.isSelected && q.isValid);
    if (selectedToImport.length === 0) {
      setErrorMessage("No valid questions are selected for approval.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = selectedToImport.map((q) => ({
        subjectId: selectedSubjectId,
        stem: q.stem,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctOption: q.correctOption,
        explanation: q.explanation || undefined,
      }));

      const res = await approveAndImportQuestionsAction(payload);

      if (!res.ok) {
        setErrorMessage(res.error || "Failed to import questions.");
        setIsSubmitting(false);
        return;
      }

      setResultSummary({
        inserted: res.inserted || 0,
        errors: res.errors || [],
      });
      setStep("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error approving questions.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = stagedQuestions.filter((q) => q.isValid).length;
  const selectedCount = stagedQuestions.filter((q) => q.isSelected && q.isValid).length;
  const invalidCount = stagedQuestions.length - validCount;
  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);

  return (
    <div>
      {errorMessage && (
        <div className="notice notice-red" style={{ marginBottom: "20px" }}>
          <p>
            <strong>Error:</strong> {errorMessage}
          </p>
        </div>
      )}

      {/* STEP 1: CSV INPUT */}
      {step === "input" && (
        <div className="stack" style={{ gap: "24px" }}>
          <div className="card">
            <h2 className="card-title">1. Select Target Subject & Format</h2>
            <p className="muted" style={{ margin: "4px 0 16px" }}>
              Every imported question will be added to the selected subject pool.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
              <label className="field">
                <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Target Subject *</span>
                <select
                  className="select"
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                >
                  <option value="" disabled>-- Select Subject --</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.stream})
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={downloadSampleTemplate}
                  className="btn btn-secondary"
                  style={{ height: "42px" }}
                >
                  Download Sample CSV Template
                </button>
              </div>
            </div>

            {subjects.length === 0 && (
              <p className="notice notice-yellow" style={{ marginTop: "16px" }}>
                You have not created any subjects yet. Please{" "}
                <Link href="/admin/subjects" style={{ textDecoration: "underline", fontWeight: 600 }}>
                  create a subject first
                </Link>.
              </p>
            )}
          </div>

          <div className="card">
            <h2 className="card-title">2. Upload CSV File or Paste Data</h2>
            <p className="muted" style={{ margin: "4px 0 16px" }}>
              Expected CSV Schema: <strong>question</strong>, <strong>answer_a</strong>, <strong>answer_b</strong>, <strong>answer_c</strong>, <strong>answer_d</strong>, <strong>correct_answer</strong>, <em>[explanation]</em>
            </p>

            {/* File Upload Box */}
            <div
              style={{
                border: "2px dashed var(--border-strong)",
                borderRadius: "var(--radius-lg)",
                padding: "32px 20px",
                textAlign: "center",
                backgroundColor: "var(--surface-muted)",
                cursor: "pointer",
                marginBottom: "20px",
              }}
              onClick={() => document.getElementById("csvFileInput")?.click()}
            >
              <input
                id="csvFileInput"
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
              <p style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "4px" }}>
                {fileName ? `Selected file: ${fileName}` : "Click here to choose a .CSV file from your device"}
              </p>
              <p className="muted" style={{ fontSize: "0.8125rem" }}>
                Accepts comma-delimited or quote-encapsulated UTF-8 CSV files
              </p>
            </div>

            <div style={{ textAlign: "center", margin: "12px 0", color: "var(--text-muted)", fontSize: "0.8125rem", fontWeight: 600 }}>
              &mdash; OR PASTE RAW CSV CONTENT BELOW &mdash;
            </div>

            <label className="field" style={{ marginBottom: "20px" }}>
              <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Paste CSV text</span>
              <textarea
                className="textarea"
                rows={8}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={'question,answer_a,answer_b,answer_c,answer_d,correct_answer\n"What is 2+2?","3","4","5","6","B"'}
                style={{ fontFamily: "monospace", fontSize: "0.8125rem" }}
              />
            </label>

            <button
              type="button"
              onClick={() => parseCsvData(csvText)}
              disabled={!csvText.trim()}
              className="btn btn-primary"
              style={{ width: "100%", padding: "12px" }}
            >
              Check & Verify CSV Data &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: STAGING, CHECK & APPROVE */}
      {step === "review" && (
        <div>
          {/* STATS & APPROVAL BAR */}
          <div
            className="card"
            style={{
              marginBottom: "24px",
              position: "sticky",
              top: "16px",
              zIndex: 10,
              boxShadow: "var(--shadow-md)",
              border: "1px solid var(--border-strong)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "16px",
              }}
            >
              <div>
                <span className="eyebrow" style={{ color: "var(--primary)" }}>Data Verification Stage</span>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "2px 0" }}>
                  Review & Approve Questions
                </h2>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "4px" }}>
                  <span className="badge badge-blue">
                    Target Subject: {currentSubject?.name ?? "Selected"}
                  </span>
                  <span className="badge badge-green">
                    Valid: {validCount}
                  </span>
                  {invalidCount > 0 && (
                    <span className="badge badge-red">
                      Issues: {invalidCount}
                    </span>
                  )}
                  <span className="badge badge-neutral">
                    Selected: {selectedCount}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setStep("input")}
                  className="btn btn-secondary"
                  disabled={isSubmitting}
                >
                  &larr; Back / Edit CSV
                </button>

                <button
                  type="button"
                  onClick={handleApproveAndImport}
                  disabled={selectedCount === 0 || isSubmitting}
                  className="btn btn-success"
                  style={{ padding: "10px 20px", fontWeight: 700, fontSize: "0.9375rem" }}
                >
                  {isSubmitting
                    ? "Approving & Saving..."
                    : `Approve & Add Selected (${selectedCount}) to Pool`}
                </button>
              </div>
            </div>

            {/* SELECTION SHORTCUTS */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "16px",
                paddingTop: "12px",
                borderTop: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => toggleSelectAll(true)}
                  className="btn btn-secondary btn-sm"
                >
                  Select All Valid
                </button>
                <button
                  type="button"
                  onClick={() => toggleSelectAll(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Deselect All
                </button>
              </div>

              <p className="muted" style={{ fontSize: "0.8125rem", margin: 0 }}>
                Carefully review each question and answer key below before approving.
              </p>
            </div>
          </div>

          {/* QUESTIONS LISTING FOR REVIEW */}
          <div className="stack" style={{ gap: "16px" }}>
            {stagedQuestions.map((q, idx) => (
              <div
                key={q.id}
                className="card"
                style={{
                  border: !q.isValid
                    ? "2px solid #fecaca"
                    : q.isSelected
                    ? "2px solid var(--primary-soft)"
                    : "1px solid var(--border)",
                  backgroundColor: !q.isValid ? "#fffaf0" : undefined,
                  transition: "all 0.15s ease",
                }}
              >
                {/* CARD HEADER */}
                <div className="row-between" style={{ marginBottom: "12px", alignItems: "flex-start", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <input
                      type="checkbox"
                      checked={q.isSelected}
                      disabled={!q.isValid}
                      onChange={() => toggleQuestionSelection(q.id)}
                      style={{ width: "18px", height: "18px", cursor: q.isValid ? "pointer" : "not-allowed" }}
                      id={`chk_${q.id}`}
                    />
                    <label
                      htmlFor={`chk_${q.id}`}
                      style={{ fontWeight: 700, fontSize: "0.9375rem", cursor: "pointer" }}
                    >
                      Question #{idx + 1}
                    </label>
                    {q.isValid ? (
                      <span className="badge badge-green">Ready to Approve</span>
                    ) : (
                      <span className="badge badge-red">Missing Required Data</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeStagedQuestion(q.id)}
                    className="btn btn-danger btn-sm"
                    title="Discard this row from import"
                  >
                    Remove
                  </button>
                </div>

                {/* VALIDATION WARNING */}
                {!q.isValid && (
                  <div className="notice notice-red" style={{ margin: "8px 0 16px", padding: "8px 12px" }}>
                    <p style={{ fontSize: "0.8125rem" }}>
                      ⚠️ <strong>Issue detected:</strong> {q.validationError}
                    </p>
                  </div>
                )}

                {/* EDITABLE QUESTION STEM */}
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ fontSize: "0.8125rem", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                    Question Stem / Text:
                  </label>
                  <textarea
                    className="textarea"
                    rows={2}
                    value={q.stem}
                    onChange={(e) => updateStagedField(q.id, "stem", e.target.value)}
                    placeholder="Enter question text..."
                  />
                </div>

                {/* 4 OPTIONS GRID WITH CORRECT ANSWER SELECTION */}
                <div>
                  <span style={{ fontSize: "0.8125rem", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                    4 Answer Choices (Select Correct Answer radio):
                  </span>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
                    {/* Option A */}
                    <div
                      style={{
                        padding: "10px",
                        borderRadius: "var(--radius)",
                        border: q.correctOption === "A" ? "2px solid var(--success)" : "1px solid var(--border)",
                        background: q.correctOption === "A" ? "var(--success-soft)" : "var(--surface-muted)",
                      }}
                    >
                      <div className="row-between" style={{ marginBottom: "4px" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.8125rem", color: q.correctOption === "A" ? "var(--success-text)" : undefined }}>
                          Option A
                        </span>
                        <label style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                          <input
                            type="radio"
                            name={`correct_${q.id}`}
                            value="A"
                            checked={q.correctOption === "A"}
                            onChange={() => updateStagedField(q.id, "correctOption", "A")}
                          />
                          <strong style={{ color: q.correctOption === "A" ? "var(--success-text)" : undefined }}>Correct</strong>
                        </label>
                      </div>
                      <input
                        type="text"
                        className="input"
                        value={q.optionA}
                        onChange={(e) => updateStagedField(q.id, "optionA", e.target.value)}
                        placeholder="Option A text..."
                      />
                    </div>

                    {/* Option B */}
                    <div
                      style={{
                        padding: "10px",
                        borderRadius: "var(--radius)",
                        border: q.correctOption === "B" ? "2px solid var(--success)" : "1px solid var(--border)",
                        background: q.correctOption === "B" ? "var(--success-soft)" : "var(--surface-muted)",
                      }}
                    >
                      <div className="row-between" style={{ marginBottom: "4px" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.8125rem", color: q.correctOption === "B" ? "var(--success-text)" : undefined }}>
                          Option B
                        </span>
                        <label style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                          <input
                            type="radio"
                            name={`correct_${q.id}`}
                            value="B"
                            checked={q.correctOption === "B"}
                            onChange={() => updateStagedField(q.id, "correctOption", "B")}
                          />
                          <strong style={{ color: q.correctOption === "B" ? "var(--success-text)" : undefined }}>Correct</strong>
                        </label>
                      </div>
                      <input
                        type="text"
                        className="input"
                        value={q.optionB}
                        onChange={(e) => updateStagedField(q.id, "optionB", e.target.value)}
                        placeholder="Option B text..."
                      />
                    </div>

                    {/* Option C */}
                    <div
                      style={{
                        padding: "10px",
                        borderRadius: "var(--radius)",
                        border: q.correctOption === "C" ? "2px solid var(--success)" : "1px solid var(--border)",
                        background: q.correctOption === "C" ? "var(--success-soft)" : "var(--surface-muted)",
                      }}
                    >
                      <div className="row-between" style={{ marginBottom: "4px" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.8125rem", color: q.correctOption === "C" ? "var(--success-text)" : undefined }}>
                          Option C
                        </span>
                        <label style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                          <input
                            type="radio"
                            name={`correct_${q.id}`}
                            value="C"
                            checked={q.correctOption === "C"}
                            onChange={() => updateStagedField(q.id, "correctOption", "C")}
                          />
                          <strong style={{ color: q.correctOption === "C" ? "var(--success-text)" : undefined }}>Correct</strong>
                        </label>
                      </div>
                      <input
                        type="text"
                        className="input"
                        value={q.optionC}
                        onChange={(e) => updateStagedField(q.id, "optionC", e.target.value)}
                        placeholder="Option C text..."
                      />
                    </div>

                    {/* Option D */}
                    <div
                      style={{
                        padding: "10px",
                        borderRadius: "var(--radius)",
                        border: q.correctOption === "D" ? "2px solid var(--success)" : "1px solid var(--border)",
                        background: q.correctOption === "D" ? "var(--success-soft)" : "var(--surface-muted)",
                      }}
                    >
                      <div className="row-between" style={{ marginBottom: "4px" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.8125rem", color: q.correctOption === "D" ? "var(--success-text)" : undefined }}>
                          Option D
                        </span>
                        <label style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                          <input
                            type="radio"
                            name={`correct_${q.id}`}
                            value="D"
                            checked={q.correctOption === "D"}
                            onChange={() => updateStagedField(q.id, "correctOption", "D")}
                          />
                          <strong style={{ color: q.correctOption === "D" ? "var(--success-text)" : undefined }}>Correct</strong>
                        </label>
                      </div>
                      <input
                        type="text"
                        className="input"
                        value={q.optionD}
                        onChange={(e) => updateStagedField(q.id, "optionD", e.target.value)}
                        placeholder="Option D text..."
                      />
                    </div>
                  </div>
                </div>

                {/* EXPLANATION */}
                <div style={{ marginTop: "12px" }}>
                  <input
                    type="text"
                    className="input"
                    value={q.explanation}
                    onChange={(e) => updateStagedField(q.id, "explanation", e.target.value)}
                    placeholder="Explanation for students (optional)..."
                    style={{ fontSize: "0.8125rem" }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* BOTTOM APPROVE BUTTON */}
          <div style={{ marginTop: "32px", textAlign: "right" }}>
            <button
              type="button"
              onClick={handleApproveAndImport}
              disabled={selectedCount === 0 || isSubmitting}
              className="btn btn-success"
              style={{ padding: "12px 28px", fontWeight: 700, fontSize: "1rem" }}
            >
              {isSubmitting
                ? "Approving & Saving..."
                : `Approve & Add Selected (${selectedCount}) Questions to Pool`}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: DONE / CONFIRMATION */}
      {step === "done" && resultSummary && (
        <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "var(--success-soft)",
              color: "var(--success)",
              fontSize: "2rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              fontWeight: 800,
            }}
          >
            ✓
          </div>

          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "8px" }}>
            Questions Successfully Approved & Imported!
          </h2>
          <p className="muted" style={{ maxWidth: "480px", margin: "0 auto 24px", fontSize: "1rem" }}>
            <strong>{resultSummary.inserted} questions</strong> were validated and successfully added to the <strong>{currentSubject?.name}</strong> question pool.
          </p>

          {resultSummary.errors.length > 0 && (
            <div className="notice notice-yellow" style={{ maxWidth: "600px", margin: "0 auto 24px", textAlign: "left" }}>
              <p style={{ fontWeight: 600, marginBottom: "4px" }}>Some rows encountered errors:</p>
              <ul style={{ paddingLeft: "20px", fontSize: "0.875rem" }}>
                {resultSummary.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href={`/admin/questions?subject=${selectedSubjectId}`}
              className="btn btn-primary"
              style={{ padding: "10px 20px" }}
            >
              View in Question Pool &rarr;
            </Link>
            <button
              type="button"
              onClick={() => {
                setCsvText("");
                setFileName("");
                setStagedQuestions([]);
                setResultSummary(null);
                setStep("input");
              }}
              className="btn btn-secondary"
            >
              Import More Questions
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Standard CSV Parser supporting quotes, double quotes, and line breaks inside quotes.
 */
function parseCSVToRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let token = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        token += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      row.push(token);
      token = "";
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      row.push(token);
      token = "";
      if (row.length > 1 || (row.length === 1 && row[0].trim() !== "")) {
        rows.push(row);
      }
      row = [];
    } else {
      token += char;
    }
  }

  if (token.length > 0 || row.length > 0) {
    row.push(token);
    if (row.length > 1 || (row.length === 1 && row[0].trim() !== "")) {
      rows.push(row);
    }
  }

  return rows;
}
