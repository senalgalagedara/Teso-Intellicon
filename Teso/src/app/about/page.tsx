"use client";

import { Navbar } from "@/components/shared/Navbar";
import { Mail, Phone, MapPin, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { resolveGoogleFormUrl } from "@/app/actions/resolve-form";

export default function AboutPage() {
  const [formUrl, setFormUrl] = useState<string>("");

  useEffect(() => {
    async function fetchFormUrl() {
      const url = await resolveGoogleFormUrl();
      setFormUrl(url);
    }
    fetchFormUrl();
  }, []);

  return (
    <div className="dark min-h-screen bg-[#071027] text-white overflow-hidden relative">
      {/* Background Glows */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[10%] right-[10%] w-[600px] h-[600px] bg-blue-600/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[20%] left-[-5%] w-[400px] h-[400px] bg-cyan-500/5 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <Navbar />

      <main className="max-w-7xl mx-auto px-6 pt-40 pb-20 relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-24">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-tight">
            About <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5cf1ff] via-[#4fd1ff] to-[#38bdf8]">TESO</span>
          </h1>
          <p className="text-[#98a6b2] text-xl max-w-3xl mx-auto leading-relaxed">
            Empowering students with smart tools and data-driven insights to master their exams and unlock their full potential.
          </p>
        </div>



        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Contact Details */}
          <div className="space-y-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Get In <span className="text-blue-400">Touch</span></h2>
              <p className="text-slate-400 text-lg leading-relaxed">
                Have questions or feedback? We'd love to hear from you. Reach out to us through any of these channels or send us a message directly.
              </p>
            </div>

            <div className="space-y-8">
              <div className="flex items-center gap-6 group">
                <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                  <Mail className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Email Us</p>
                  <p className="text-lg font-bold text-slate-200">learnfromteso@gmail.com</p>
                </div>
              </div>

              <div className="flex items-center gap-6 group">
                <div className="w-14 h-14 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                  <Phone className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Call Us</p>
                  <p className="text-lg font-bold text-slate-200">0714909564</p>
                </div>
              </div>

              <div className="flex items-center gap-6 group">
                <div className="w-14 h-14 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <MapPin className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Visit Us</p>
                  <p className="text-lg font-bold text-slate-200">11th Lane, Isurupura, Malabe</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form / Google Form Embed */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 blur-2xl rounded-[2rem] opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative p-6 md:p-8 rounded-[2rem] border border-slate-800 bg-[#0b1420]/80 backdrop-blur-2xl shadow-2xl min-h-[600px] flex flex-col justify-center items-center">
              {formUrl ? (
                <iframe
                  src={formUrl}
                  width="100%"
                  height="650"
                  className="rounded-2xl border-0 bg-transparent"
                  allowFullScreen
                >
                  Loading…
                </iframe>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                  <p className="text-slate-400 text-sm">Loading Feedback Form...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-32 py-12 border-t border-slate-800/50 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-bold text-white tracking-tighter">TESO</h2>
            <p className="text-slate-500 text-xs uppercase tracking-widest mt-1 font-semibold">Self Study Platform for Sri Lankan Students</p>
          </div>
          <div className="flex flex-wrap justify-center gap-8 text-sm font-medium text-slate-400">
            <Link href="/about" className="hover:text-blue-400 transition-colors">About</Link>
            <Link href="/pricing" className="hover:text-blue-400 transition-colors">Pricing</Link>
            <Link href="/privacy" className="hover:text-blue-400 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-blue-400 transition-colors">Terms</Link>
          </div>
          <p className="text-slate-600 text-xs font-medium">
            © 2026 TESO Education.
          </p>
        </div>
      </footer>
    </div>
  );
}
