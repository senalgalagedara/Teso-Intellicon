import Link from "next/link";
export default function Exams() {
  return <main className="container" style={{ maxWidth: 960 }}><Link href="/">← Teso home</Link><h1 style={{ margin: "24px 0" }}>Exams & available resources</h1><section className="glass-card"><h2>Self-assessment</h2><p style={{ margin: "16px 0" }}>Select a published paper. Complete it independently, then review your saved score, concept performance, explanations and study resources.</p><Link className="btn btn-primary" href="/exams/self-assessment">Choose a paper →</Link></section></main>;
}
