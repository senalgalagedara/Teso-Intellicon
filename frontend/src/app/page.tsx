import Link from "next/link";
export default function HomePage() {
  return <main className="container" style={{paddingTop: "8vh", maxWidth: 1000}}>
    <nav className="row-between"><Link className="app-brand gradient-text" href="/">Teso Intellicon</Link><Link className="btn btn-secondary" href="/dashboard">My account</Link></nav>
    <section className="glass-card" style={{marginTop: 56, padding: "clamp(24px, 5vw, 64px)"}}>
      <p className="muted">A clearer path from practice to progress</p>
      <h1 className="gradient-text" style={{fontSize: "clamp(36px, 6vw, 64px)", margin: "20px 0"}}>Learn what each paper tells you.</h1>
      <p className="page-subtitle">Choose your subject and language, take a self-assessment, and review explanations and theory for the parts you missed. Your next paper revisits those topics and checks earlier knowledge.</p>
      <div className="inline-form" style={{marginTop: 28}}><Link href="/exams/self-assessment" className="btn btn-primary">Start self-assessment</Link><Link href="/sign-up" className="btn btn-secondary">Create student account</Link></div>
    </section>
    <div className="stack" style={{margin: "32px 0"}}>{["Check answers and understand your mistakes", "Revise the theory behind each question", "Track topic progress across your saved papers"].map((text,i)=><div key={text} className="glass-card"><span className="badge badge-blue">0{i+1}</span><h2 className="card-title" style={{marginTop: 12}}>{text}</h2></div>)}</div>
  </main>;
}
