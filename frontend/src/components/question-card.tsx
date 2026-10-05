"use client";

import React, { useState } from "react";
import { PublicQuestion } from "@/lib/db/questions";
import { submitAnswerAction, getNextQuestionAction } from "@/app/actions/practice";

export function QuestionCard({
  courseId,
  initialQuestion,
  initialServeId,
  initialReason,
}: {
  courseId: string;
  initialQuestion: PublicQuestion;
  initialServeId: string;
  initialReason: string;
}) {
  const [question, setQuestion] = useState<PublicQuestion>(initialQuestion);
  const [serveId, setServeId] = useState<string>(initialServeId);
  const [reason, setReason] = useState<string>(initialReason);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoadingNext, setIsLoadingNext] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Result state
  const [result, setResult] = useState<{
    is_correct: boolean;
    correct_option: string;
    explanation: string | null;
    diagnosis?: {
      label: string;
      p_mastery: number;
    };
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOption || isSubmitting || result) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    // Client-side unique attempt UUID (v4)
    const attemptId = crypto.randomUUID();

    try {
      const res = await submitAnswerAction({
        attemptId,
        serveId,
        chosenOption: selectedOption,
      });

      if (!res.ok) {
        setErrorMessage(res.error);
      } else {
        setResult({
          is_correct: res.is_correct,
          correct_option: res.correct_option,
          explanation: res.explanation,
          diagnosis: res.diagnosis,
        });
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to submit attempt.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = async () => {
    setIsLoadingNext(true);
    setErrorMessage(null);
    try {
      const res = await getNextQuestionAction(courseId);
      if (!res.ok) {
        setErrorMessage(res.error);
      } else {
        setQuestion(res.question);
        setServeId(res.serveId);
        setReason(res.reason);
        setSelectedOption(null);
        setResult(null);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load next question.");
    } finally {
      setIsLoadingNext(false);
    }
  };

  const getDiagnosisBadge = (label: string) => {
    switch (label) {
      case "solid":
        return { text: "Solid understanding", bg: "rgba(16, 185, 129, 0.15)", color: "#10b981" };
      case "lucky_guess":
        return { text: "Lucky guess (unusually fast)", bg: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" };
      case "careless_error":
        return { text: "Careless error (fast slip / peer trap)", bg: "rgba(249, 115, 22, 0.15)", color: "#f97316" };
      case "conceptual_gap":
        return { text: "Conceptual gap (requires review)", bg: "rgba(244, 63, 94, 0.15)", color: "#f43f5e" };
      default:
        return { text: label, bg: "rgba(255, 255, 255, 0.1)", color: "#94a3b8" };
    }
  };

  return (
    <div className="glass-card" style={{ padding: "1.75rem", position: "relative" }}>
      {/* Engine Reason Pill */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <span
          style={{
            fontSize: "0.8rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontWeight: 700,
            padding: "0.25rem 0.75rem",
            borderRadius: "9999px",
            background: "rgba(99, 102, 241, 0.2)",
            color: "var(--accent-purple)",
            border: "1px solid rgba(99, 102, 241, 0.3)",
          }}
        >
          Adaptive Target: {reason}
        </span>
        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Difficulty Level: {question.teacher_difficulty} / 3
        </span>
      </div>

      {/* Stem */}
      <h3 style={{ fontSize: "1.2rem", fontWeight: 600, lineHeight: 1.6, marginBottom: "1.5rem" }}>
        {question.stem}
      </h3>

      {/* Options Form */}
      <form onSubmit={handleSubmit}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {question.options.map((opt) => {
            const isSelected = selectedOption === opt.id;
            const isSubmitted = result !== null;
            const isCorrectAnswer = result?.correct_option === opt.id;
            const isWrongSelection = isSubmitted && isSelected && !isCorrectAnswer;

            let borderColor = isSelected ? "var(--accent-purple)" : "var(--bg-card-border)";
            let bgColor = isSelected ? "rgba(99, 102, 241, 0.1)" : "rgba(255, 255, 255, 0.02)";

            if (isSubmitted) {
              if (isCorrectAnswer) {
                borderColor = "var(--accent-emerald)";
                bgColor = "rgba(16, 185, 129, 0.15)";
              } else if (isWrongSelection) {
                borderColor = "var(--accent-rose)";
                bgColor = "rgba(244, 63, 94, 0.15)";
              }
            }

            return (
              <label
                key={opt.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "1rem 1.25rem",
                  borderRadius: "var(--radius-md)",
                  border: `1px solid ${borderColor}`,
                  background: bgColor,
                  cursor: isSubmitted ? "default" : "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <input
                  type="radio"
                  name="option"
                  value={opt.id}
                  checked={isSelected}
                  disabled={isSubmitted}
                  onChange={() => setSelectedOption(opt.id)}
                  style={{ accentColor: "var(--accent-purple)" }}
                />
                <span style={{ fontWeight: 700, minWidth: "1.5rem", color: "var(--text-main)" }}>
                  {opt.id}.
                </span>
                <span style={{ color: "var(--text-main)", fontSize: "1rem" }}>{opt.text}</span>
              </label>
            );
          })}
        </div>

        {errorMessage && (
          <p style={{ color: "var(--accent-rose)", marginBottom: "1rem", fontSize: "0.9rem" }}>
            {errorMessage}
          </p>
        )}

        {!result ? (
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!selectedOption || isSubmitting}
            style={{ width: "100%", padding: "0.9rem", fontWeight: 600, fontSize: "1rem" }}
          >
            {isSubmitting ? "Evaluating attempt..." : "Submit Answer"}
          </button>
        ) : (
          <div style={{ marginTop: "1rem" }}>
            {/* Feedback Banner */}
            <div
              style={{
                padding: "1.25rem",
                borderRadius: "var(--radius-md)",
                background: result.is_correct ? "rgba(16, 185, 129, 0.12)" : "rgba(244, 63, 94, 0.12)",
                border: `1px solid ${result.is_correct ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.3)"}`,
                marginBottom: "1.25rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <h4 style={{ fontWeight: 700, color: result.is_correct ? "var(--accent-emerald)" : "var(--accent-rose)" }}>
                  {result.is_correct ? "✓ Correct Response!" : "✗ Incorrect"}
                </h4>
                {result.diagnosis && (
                  <span
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      padding: "0.2rem 0.6rem",
                      borderRadius: "9999px",
                      background: getDiagnosisBadge(result.diagnosis.label).bg,
                      color: getDiagnosisBadge(result.diagnosis.label).color,
                    }}
                  >
                    Diagnosis: {getDiagnosisBadge(result.diagnosis.label).text}
                  </span>
                )}
              </div>

              {result.explanation ? (
                <div style={{ marginTop: "0.75rem", fontSize: "0.95rem", color: "var(--text-main)", lineHeight: 1.6 }}>
                  <strong>Explanation: </strong> {result.explanation}
                </div>
              ) : (
                <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
                  No teacher explanation provided for this question.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="btn btn-primary"
              disabled={isLoadingNext}
              style={{ width: "100%", padding: "0.9rem", fontWeight: 600, fontSize: "1rem" }}
            >
              {isLoadingNext ? "Selecting next adaptive question..." : "Next Question →"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
