import Link from "next/link";

const STEPS = [
  {
    title: "Check answers and understand your mistakes",
    body: "Every paper is scored immediately, with reviewed explanations for the questions you missed.",
  },
  {
    title: "Revise the theory behind each question",
    body: "Each concept links to the theory and approved study resources you need to close the gap.",
  },
  {
    title: "Track topic progress across your saved papers",
    body: "Your learning history shows which topics are improving and which still need practice.",
  },
];

export default function HomePage() {
  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" className="app-brand">
            <span className="brand-mark" aria-hidden="true">
              T
            </span>
            Teso
          </Link>
          <nav className="site-nav" aria-label="Site">
            <Link href="/exams">Exams</Link>
            <Link href="/sign-in">Sign in</Link>
            <Link href="/dashboard" className="btn btn-secondary">
              My account
            </Link>
          </nav>
        </div>
      </header>

      <main className="container">
        <section className="home-intro">
          <p className="eyebrow">Self-study platform</p>
          <h1>Learn what each paper tells you.</h1>
          <p className="home-lede">
            Choose your subject and language, take a self-assessment, and review explanations and
            theory for the parts you missed. Your next paper revisits those topics and checks
            earlier knowledge.
          </p>
          <div className="home-actions">
            <Link href="/exams/self-assessment" className="btn btn-primary">
              Start self-assessment
            </Link>
            <Link href="/sign-up" className="btn btn-secondary">
              Create student account
            </Link>
          </div>
        </section>

        <hr className="divider" />

        <section>
          <h2 className="section-title" style={{ marginTop: 0 }}>
            How it works
          </h2>
          <ol className="steps">
            {STEPS.map((step, index) => (
              <li key={step.title} className="step">
                <span className="step-num" aria-hidden="true">
                  {index + 1}
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="site-footer">
        Teso Intellicon — course platform where students join by invitation and teacher accounts
        are approved by an admin.
      </footer>
    </>
  );
}
