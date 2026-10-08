import React from "react";

export function MasteryBar({
  topicName,
  pMastery,
  status,
}: {
  topicName: string;
  pMastery: number;
  status: "weak" | "progressing" | "mastered";
}) {
  const percentage = Math.round(pMastery * 100);

  let barColor = "var(--accent-blue)";
  let badgeColor = "rgba(59, 130, 246, 0.15)";
  let textColor = "var(--accent-blue)";
  let statusText = "Progressing";

  if (status === "mastered") {
    barColor = "var(--accent-emerald)";
    badgeColor = "rgba(16, 185, 129, 0.15)";
    textColor = "var(--accent-emerald)";
    statusText = "Mastered (≥95%)";
  } else if (status === "weak") {
    barColor = "var(--accent-rose)";
    badgeColor = "rgba(244, 63, 94, 0.15)";
    textColor = "var(--accent-rose)";
    statusText = "Weak (<60%)";
  }

  return (
    <div style={{ marginBottom: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem", alignItems: "center" }}>
        <span style={{ fontWeight: 500, fontSize: "0.95rem" }}>{topicName}</span>
        <span
          style={{
            fontSize: "0.75rem",
            padding: "0.2rem 0.6rem",
            borderRadius: "9999px",
            background: badgeColor,
            color: textColor,
            fontWeight: 600,
          }}
        >
          {statusText} · {percentage}%
        </span>
      </div>
      <div
        style={{
          width: "100%",
          height: "8px",
          background: "rgba(255, 255, 255, 0.08)",
          borderRadius: "9999px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            background: barColor,
            transition: "width 0.4s ease-in-out",
          }}
        />
      </div>
    </div>
  );
}
