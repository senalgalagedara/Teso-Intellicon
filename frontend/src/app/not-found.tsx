import Link from "next/link";

export default function NotFound() {
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
            <Link href="/?tab=history">Attempt History</Link>
            <Link href="/sign-in">Sign in</Link>
          </nav>
        </div>
      </header>

      <main className="container">
        <section className="home-intro">
          <p className="eyebrow">404</p>
          <h1>Page not found</h1>
          <p className="home-lede">
            That link doesn&apos;t point to anything on Teso. It may have moved or been removed.
          </p>
          <div className="home-actions">
            <Link href="/" className="btn btn-primary">
              Back to home
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}