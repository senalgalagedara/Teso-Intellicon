import Link from "next/link";

export default function Exams() {
  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" className="app-brand">
            <span className="brand-mark" aria-hidden="true">
              T
            </span>
            Teso Intellicon
          </Link>
          <nav className="site-nav" aria-label="Site">
            <Link href="/sign-in">Sign in</Link>
            <Link href="/dashboard" className="btn btn-secondary">
              My account
            </Link>
          </nav>
        </div>
      </header>

      <main className="container" style={{ maxWidth: 860 }}>
        <div className="page-head">
          <div>
            <p className="eyebrow">Exams</p>
            <h1 style={{ marginTop: 8 }}>Available resources</h1>
            <p className="page-subtitle">
              Complete a paper independently, then review your saved score, concept performance,
              explanations and study resources.
            </p>
          </div>
        </div>

        <section className="card">
          <div className="row-between">
            <div>
              <h2 className="card-title">Self-assessment</h2>
              <p className="muted" style={{ marginTop: 6, maxWidth: "56ch" }}>
                Select a published paper in your subject and language. Results are saved to your
                account, and your next paper revisits the topics you missed.
              </p>
            </div>
            <Link className="btn btn-primary" href="/exams/self-assessment">
              Choose a paper
            </Link>
          </div>
        </section>
      </main>

      <footer className="site-footer">Teso Intellicon</footer>
    </>
  );
}
