import Link from "next/link";

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
      </main>
    </>
  );
}
