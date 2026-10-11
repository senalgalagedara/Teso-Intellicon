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
            <Link href="/?tab=history">පුහුණු ඉතිහාසය</Link>
            <Link href="/sign-in">ඇතුළු වන්න</Link>
          </nav>
        </div>
      </header>

      <main className="container">
        <section className="home-intro">
          <p className="eyebrow">404</p>
          <h1>පිටුව හමු නොවීය</h1>
          <p className="home-lede">
            මෙම සබැඳිය කිසිදු පිටුවකට යොමු නොවේ. එය ඉවත් කර හෝ වෙනත් ස්ථානයකට මාරු කර තිබිය හැක.
          </p>
          <div className="home-actions">
            <Link href="/" className="btn btn-primary">
              මුල් පිටුවට
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}