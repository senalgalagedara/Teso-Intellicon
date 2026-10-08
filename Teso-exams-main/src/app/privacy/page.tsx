"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[var(--background)] text-[var(--foreground)] selection:bg-indigo-500/20">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-indigo-400/5 blur-[140px] rounded-full" />
      </div>

      {/* Navbar */}
      <header className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-5 border-b border-[var(--border)]/50 bg-[var(--background)]/80 backdrop-blur-md sticky top-0">
        <Link href="/" className="flex items-center gap-3 group" aria-label="Teso Exams Home">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/10 group-hover:scale-105 transition-transform">
            <Image
              src="/teso-logo.png"
              alt="Teso"
              width={50}
              height={50}
              className="object-contain rounded-xl"
            />
          </div>
          <span className="text-[var(--foreground)] font-bold text-lg tracking-tight">
            Teso <span className="gradient-text">Exams</span>
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
          <span className="text-[var(--border)] hidden sm:inline">|</span>
          <span className="tabular-nums text-[var(--foreground-subtle)] hidden sm:inline">{time}</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-4xl mx-auto px-6 py-16 w-full">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-[var(--foreground)]">
          Privacy Policy
        </h1>
        <p className="text-sm text-[var(--foreground-muted)] mb-12">
          Last Updated: June 2026
        </p>

        <div className="space-y-8 text-[var(--foreground-muted)] leading-relaxed">
          <p className="text-lg text-[var(--foreground)]">
            TESO values your privacy and is committed to protecting your personal information. This Privacy Policy explains how TESO collects, uses, stores, and protects your data.
          </p>

          <hr className="border-[var(--border)]" />

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[var(--foreground)]">1. Information We Collect</h2>

            <div className="space-y-2">
              <h3 className="text-md font-semibold text-[var(--foreground)]">Account Information</h3>
              <p>When you register, we may collect:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Full name</li>
                <li>Email address</li>
                <li>Educational institution</li>
                <li>Grade level</li>
                <li>Subjects of study</li>
                <li>Profile information</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-md font-semibold text-[var(--foreground)]">Examination Information</h3>
              <p>We may collect:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Examination responses</li>
                <li>Scores and grades</li>
                <li>Submission timestamps</li>
                <li>Exam participation records</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-md font-semibold text-[var(--foreground)]">Learning Activity Data</h3>
              <p>We may collect:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Lesson completion history</li>
                <li>Quiz performance</li>
                <li>Study sessions</li>
                <li>Revision activity</li>
                <li>Learning preferences</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-md font-semibold text-[var(--foreground)]">Technical Information</h3>
              <p>We may collect:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Device type</li>
                <li>Browser information</li>
                <li>IP address</li>
                <li>Session identifiers</li>
                <li>System logs</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--foreground)]">2. How We Use Information</h2>
            <p>TESO uses collected data to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Provide platform services</li>
              <li>Authenticate users</li>
              <li>Generate personalized study plans</li>
              <li>Deliver AI-powered recommendations</li>
              <li>Analyze learning progress</li>
              <li>Improve platform performance</li>
              <li>Prevent fraud and abuse</li>
              <li>Provide customer support</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--foreground)]">3. AI and Learning Analytics</h2>
            <p>TESO uses algorithms and AI systems to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Estimate learning progress</li>
              <li>Generate revision schedules</li>
              <li>Recommend educational content</li>
              <li>Produce performance insights</li>
            </ul>
            <p>These processes are designed to improve the learning experience and do not make legally significant decisions.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--foreground)]">4. Cookies and Tracking</h2>
            <p>TESO uses cookies and similar technologies to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Maintain login sessions</li>
              <li>Remember preferences</li>
              <li>Improve platform performance</li>
              <li>Analyze usage patterns</li>
            </ul>
            <p>Users may disable cookies through browser settings, though some features may not function correctly.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--foreground)]">5. Data Sharing</h2>
            <p>TESO does not sell personal information. Information may be shared with:</p>

            <div className="space-y-2 pl-4">
              <h3 className="text-md font-semibold text-[var(--foreground)]">Educational Institutions</h3>
              <p>When participating in institution-hosted exams, relevant examination data may be shared with authorized educators.</p>

              <h3 className="text-md font-semibold text-[var(--foreground)]">Service Providers</h3>
              <p>Trusted providers supporting: cloud hosting, authentication, analytics, file storage, and email delivery.</p>

              <h3 className="text-md font-semibold text-[var(--foreground)]">Legal Requirements</h3>
              <p>TESO may disclose information when required by law or to protect platform security.</p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--foreground)]">6. Data Security</h2>
            <p>TESO implements reasonable technical and organizational measures, including:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Encrypted connections (HTTPS)</li>
              <li>Secure authentication systems</li>
              <li>Access controls</li>
              <li>Infrastructure monitoring</li>
              <li>Regular security updates</li>
            </ul>
            <p>However, no system can guarantee absolute security.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--foreground)]">7. Data Retention</h2>
            <p>TESO retains information only as long as necessary to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Provide services</li>
              <li>Meet legal obligations</li>
              <li>Resolve disputes</li>
              <li>Maintain educational records</li>
            </ul>
            <p>Users may request account deletion subject to applicable legal requirements.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--foreground)]">8. Children's Privacy</h2>
            <p>TESO may be used by students under 18. Where required, educational institutions, parents, or guardians are responsible for providing appropriate consent.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--foreground)]">9. Your Rights</h2>
            <p>Depending on applicable laws, users may have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Access personal information</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of data</li>
              <li>Withdraw consent where applicable</li>
              <li>Request data portability</li>
            </ul>
            <p>Requests may be submitted via email.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--foreground)]">10. Third-Party Services</h2>
            <p>TESO may integrate with third-party services including: Supabase, AWS S3, YouTube, Google Authentication Providers, and Email Service Providers. These services operate under their own privacy policies.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--foreground)]">11. International Data Processing</h2>
            <p>User information may be processed and stored in data centers located in different countries depending on service providers used by TESO.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--foreground)]">12. Changes to This Policy</h2>
            <p>TESO may update this Privacy Policy periodically. Updates will be published on this page with a revised effective date.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--foreground)]">13. Contact Us</h2>
            <p>For privacy-related inquiries:</p>
            <p>
              <strong>Email:</strong> <a href="mailto:learnfromteso@gmail.com" className="text-indigo-500 hover:underline">learnfromteso@gmail.com</a>
            </p>
            <p>
              <strong>Website:</strong> <a href="https://teso.lk" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">teso.lk</a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[var(--border)]/50 px-6 py-5 flex items-center justify-between text-xs text-[var(--foreground-subtle)]">
        <span>© {new Date().getFullYear()} Teso Exams</span>
        <div className="flex items-center gap-4">
          <Link href="/terms" className="hover:text-[var(--foreground)] transition-colors">
            Terms & Conditions
          </Link>
          <Link href="/" className="hover:text-[var(--foreground)] transition-colors">
            Home
          </Link>
        </div>
      </footer>
    </div>
  );
}
