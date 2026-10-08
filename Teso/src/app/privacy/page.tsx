import React from 'react';
import { Navbar } from "@/components/shared/Navbar";

export default function PrivacyPage() {
  return (
    <div className="dark min-h-screen bg-[#071027] text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 pt-32 pb-20 relative z-10">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-slate-100">
          Privacy Policy
        </h1>
        <p className="text-sm text-[#98a6b2] mb-12">
          Last Updated: June 2026
        </p>

        <div className="prose prose-invert max-w-none text-[#98a6b2] space-y-8 leading-relaxed">
          <p className="text-lg text-slate-300">
            TESO values your privacy and is committed to protecting your personal information. This Privacy Policy explains how TESO collects, uses, stores, and protects your data.
          </p>

          <hr className="border-slate-800" />

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-200">1. Information We Collect</h2>

            <div className="space-y-2">
              <h3 className="text-md font-semibold text-slate-300">Account Information</h3>
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
              <h3 className="text-md font-semibold text-slate-300">Examination Information</h3>
              <p>We may collect:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Examination responses</li>
                <li>Scores and grades</li>
                <li>Submission timestamps</li>
                <li>Exam participation records</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-md font-semibold text-slate-300">Learning Activity Data</h3>
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
              <h3 className="text-md font-semibold text-slate-300">Technical Information</h3>
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
            <h2 className="text-xl font-semibold text-slate-200">2. How We Use Information</h2>
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
            <h2 className="text-xl font-semibold text-slate-200">3. AI and Learning Analytics</h2>
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
            <h2 className="text-xl font-semibold text-slate-200">4. Cookies and Tracking</h2>
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
            <h2 className="text-xl font-semibold text-slate-200">5. Data Sharing</h2>
            <p>TESO does not sell personal information. Information may be shared with:</p>

            <div className="space-y-2 pl-4">
              <h3 className="text-md font-semibold text-slate-300">Educational Institutions</h3>
              <p>When participating in institution-hosted exams, relevant examination data may be shared with authorized educators.</p>

              <h3 className="text-md font-semibold text-slate-300">Service Providers</h3>
              <p>Trusted providers supporting: cloud hosting, authentication, analytics, file storage, and email delivery.</p>

              <h3 className="text-md font-semibold text-slate-300">Legal Requirements</h3>
              <p>TESO may disclose information when required by law or to protect platform security.</p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-200">6. Data Security</h2>
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
            <h2 className="text-xl font-semibold text-slate-200">7. Data Retention</h2>
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
            <h2 className="text-xl font-semibold text-slate-200">8. Children's Privacy</h2>
            <p>TESO may be used by students under 18. Where required, educational institutions, parents, or guardians are responsible for providing appropriate consent.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-200">9. Your Rights</h2>
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
            <h2 className="text-xl font-semibold text-slate-200">10. Third-Party Services</h2>
            <p>TESO may integrate with third-party services including: Supabase, AWS S3, YouTube, Google Authentication Providers, and Email Service Providers. These services operate under their own privacy policies.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-200">11. International Data Processing</h2>
            <p>User information may be processed and stored in data centers located in different countries depending on service providers used by TESO.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-200">12. Changes to This Policy</h2>
            <p>TESO may update this Privacy Policy periodically. Updates will be published on this page with a revised effective date.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-200">13. Contact Us</h2>
            <p>For privacy-related inquiries:</p>
            <p>
              <strong>Email:</strong> <a href="mailto:learnfromteso@gmail.com" className="text-blue-400 hover:underline">learnfromteso@gmail.com</a>
            </p>
            <p>
              <strong>Website:</strong> <a href="https://teso.lk" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">teso.lk</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
