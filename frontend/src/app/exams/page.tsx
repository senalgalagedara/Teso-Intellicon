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
            <Link href="/?tab=history">පුහුණු ඉතිහාසය</Link>
            <Link href="/sign-in">ඇතුළු වන්න</Link>
            <Link href="/" className="btn btn-secondary">
              මුල් පිටුව
            </Link>
          </nav>
        </div>
      </header>

      <main className="container" style={{ maxWidth: 860 }}>
        <div className="page-head">
          <div>
            <p className="eyebrow">විභාග</p>
            <h1 style={{ marginTop: 8 }}>පවතින සම්පත්</h1>
            <p className="page-subtitle">
              ප්‍රශ්න පත්‍රයක් ස්වාධීනව සම්පූර්ණ කර, ඔබේ ලකුණු, සංකල්ප දක්ෂතාව,
              පැහැදිලි කිරීම් සහ අධ්‍යයන සම්පත් සමාලෝචනය කරන්න.
            </p>
          </div>
        </div>

        <section className="card">
          <div className="row-between">
            <div>
              <h2 className="card-title">ස්වයං ඇගයීම</h2>
              <p className="muted" style={{ marginTop: 6, maxWidth: "56ch" }}>
                ඔබේ විෂය සහ භාෂාවට අදාළ ප්‍රශ්න පත්‍රයක් තෝරන්න. ප්‍රතිඵල ඔබේ ගිණුමේ සුරකින අතර,
                මීළඟ ප්‍රශ්න පත්‍රයේදී ඔබ අතපසු වූ මාතෘකා නැවත ඉදිරිපත් කෙරේ.
              </p>
            </div>
            <Link className="btn btn-primary" href="/exams/self-assessment">
              ප්‍රශ්න පත්‍රයක් තෝරන්න
            </Link>
          </div>
        </section>
      </main>

      <footer className="site-footer">Teso Intellicon</footer>
    </>
  );
}
