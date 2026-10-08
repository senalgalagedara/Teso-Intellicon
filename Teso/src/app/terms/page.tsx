import React from 'react';
import { Navbar } from "@/components/shared/Navbar";

export default function TermsPage() {
  return (
    <div className="dark min-h-screen bg-[#071027] text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 pt-32 pb-20 relative z-10">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-slate-100">
          Terms & Conditions
        </h1>
        <p className="text-sm text-[#98a6b2] mb-12">
          Last Updated: June 2026
        </p>

        <div className="prose prose-invert max-w-none text-[#98a6b2] space-y-8 leading-relaxed">
          <p className="text-lg text-slate-300">
            Welcome to TESO. By accessing or using TESO, including teso.lk, exam.teso.lk, and related services, you agree to comply with these Terms and Conditions.
          </p>

          <hr className="border-slate-800" />

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-200">1. About TESO</h2>
            <p>TESO is an educational technology platform that provides:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>AI-powered learning and study planning</li>
              <li>Online examination hosting</li>
              <li>Student performance analytics</li>
              <li>Adaptive learning recommendations</li>
              <li>Educational content and resources</li>
            </ul>
            <p>TESO is intended for students, educators, tutors, schools, institutes, universities, and organizations.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-200">2. User Accounts</h2>
            <p>To access certain features, you may be required to create an account.</p>
            <p>You agree to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Provide accurate information</li>
              <li>Keep login credentials secure</li>
              <li>Maintain updated account information</li>
              <li>Be responsible for activities conducted under your account</li>
            </ul>
            <p>TESO reserves the right to suspend or terminate accounts that violate these terms.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-200">3. Examination Services</h2>
            <p>TESO provides a platform for educators and institutions to create and host examinations.</p>
            <p>TESO does not guarantee:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Examination results</li>
              <li>Academic outcomes</li>
              <li>Admission decisions</li>
              <li>Employment opportunities</li>
            </ul>
            <p>Educators are solely responsible for:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Examination content</li>
              <li>Answer keys</li>
              <li>Grading criteria</li>
              <li>Candidate eligibility requirements</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-200">4. Student Responsibilities</h2>
            <p>Students must:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Provide accurate identity information</li>
              <li>Complete examinations honestly</li>
              <li>Avoid cheating or unauthorized assistance</li>
              <li>Not share examination materials without permission</li>
            </ul>
            <p>TESO reserves the right to invalidate exam sessions suspected of academic misconduct.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-200">5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Attempt unauthorized access to systems</li>
              <li>Disrupt platform operations</li>
              <li>Upload malicious software</li>
              <li>Reverse engineer platform components</li>
              <li>Use automated bots without permission</li>
              <li>Abuse or harass other users</li>
            </ul>
            <p>Violations may result in account suspension or permanent termination.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-200">6. Intellectual Property</h2>
            <p>All TESO branding, software, algorithms, content, interfaces, logos, and designs are the property of TESO.</p>
            <p>Users may not:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Copy platform software</li>
              <li>Reproduce platform content without authorization</li>
              <li>Resell TESO services without written permission</li>
            </ul>
            <p>Educators retain ownership of examination content they upload.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-200">7. AI Recommendations</h2>
            <p>TESO's AI systems generate:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Study plans</li>
              <li>Revision schedules</li>
              <li>Learning recommendations</li>
              <li>Performance insights</li>
            </ul>
            <p>These recommendations are provided for educational assistance only and should not be considered guaranteed academic advice.</p>
            <p>TESO makes no guarantee regarding examination performance or academic results.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-200">8. Data Storage</h2>
            <p>TESO may store:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>User profiles</li>
              <li>Examination responses</li>
              <li>Study progress</li>
              <li>Learning analytics</li>
              <li>Uploaded educational materials</li>
            </ul>
            <p>Data is stored securely using industry-standard practices.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-200">9. Service Availability</h2>
            <p>While TESO strives for high availability, we do not guarantee uninterrupted access.</p>
            <p>Service interruptions may occur due to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Maintenance</li>
              <li>Infrastructure failures</li>
              <li>Internet connectivity issues</li>
              <li>Third-party service outages</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-200">10. Payments and Refunds</h2>
            <p>Paid plans are billed according to selected subscription or usage plans.</p>
            <p>Unless required by law:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Payments are non-refundable</li>
              <li>Subscription fees are charged in advance</li>
              <li>Enterprise agreements may have separate terms</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-200">11. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, TESO shall not be liable for:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Academic losses</li>
              <li>Examination failures</li>
              <li>Lost data resulting from user actions</li>
              <li>Indirect or consequential damages</li>
              <li>Business interruptions</li>
            </ul>
            <p>Use of the platform is at your own risk.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-200">12. Termination</h2>
            <p>TESO may suspend or terminate access if:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Terms are violated</li>
              <li>Fraudulent activity is detected</li>
              <li>Platform security is threatened</li>
            </ul>
            <p>Users may discontinue use at any time.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-200">13. Changes to Terms</h2>
            <p>TESO may update these Terms periodically.</p>
            <p>Continued use of the platform after updates constitutes acceptance of the revised Terms.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-200">14. Contact Information</h2>
            <p>For questions regarding these Terms:</p>
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
