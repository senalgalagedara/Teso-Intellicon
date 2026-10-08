"use client";

import Link from "next/link";
import Image from "next/image";
import { Check, X, ArrowRight, Grid, HelpCircle, Settings } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "@/components/providers/AuthProvider";

const plans = [
  {
    name: "Free Plan",
    subtitle: "For new educators",
    price: "LKR 0",
    period: "",
    description: "Perfect for teachers and tutors getting started with online exams.",
    capacityLabel: "Student Limit",
    capacityValue: "Up to 30 students/month",
    features: [
      "Create MCQ exams",
      "Basic quiz hosting",
      "Automatic marking",
      "Exam result generation",
      "Basic student analytics"
    ],
    buttonText: "Get Started Free",
    highlight: false
  },
  {
    name: "Pay-As-You-Go",
    subtitle: "Occasional exams",
    price: "Per Exam",
    period: "",
    description: "Ideal for tutors who conduct exams occasionally and only pay when they host an exam.",
    capacityLabel: "Students per Exam",
    tiers: [
      { range: "Up to 100 students", price: "LKR 500" },
      { range: "101 – 250 students", price: "LKR 1,000" },
      { range: "251 – 500 students", price: "LKR 2,000" }
    ],
    features: [
      "All Free Plan features",
      "Unlimited exam creation",
      "Large student support",
      "Detailed result analytics",
      "Exam history & reports"
    ],
    buttonText: "Start Hosting Exams",
    highlight: false
  },
  {
    name: "Enterprise Plan",
    subtitle: "Custom solution",
    price: "Custom Pricing",
    period: "",
    description: "For universities, government institutions, and large organizations.",
    capacityLabel: "Student Capacity",
    capacityValue: "Custom infrastructure",
    features: [
      "Everything in Business",
      "Dedicated infrastructure",
      "Custom integrations",
      "SSO / LMS integration",
      "Advanced security controls",
      "Dedicated account manager",
      "SLA & onboarding support"
    ],
    buttonText: "Contact Sales",
  }
];

const comparisonFeatures = [
  {
    name: "MCQ Exams",
    free: "yes",
    payg: "yes",
    enterprise: "yes"
  },
  {
    name: "Automatic Marking",
    free: "yes",
    payg: "yes",
    enterprise: "yes"
  },
  {
    name: "Student Analytics",
    free: "Basic",
    payg: "Detailed",
    enterprise: "Advanced"
  },
  {
    name: "Custom Branding",
    free: "no",
    payg: "no",
    enterprise: "yes"
  },
  {
    name: "Multiple Teachers",
    free: "no",
    payg: "no",
    enterprise: "yes"
  },
  {
    name: "Priority Support",
    free: "no",
    payg: "no",
    enterprise: "yes"
  },
  {
    name: "Custom Integrations",
    free: "no",
    payg: "no",
    enterprise: "yes"
  },
  {
    name: "Dedicated Infrastructure",
    free: "no",
    payg: "no",
    enterprise: "yes"
  }
];

export default function PricingPage() {
  const { user, loading } = useAuth();
  const studyPlatformUrl = process.env.NEXT_PUBLIC_STUDY_PLATFORM_URL || "http://localhost:3000";

  const renderCellContent = (val: string) => {
    if (val === "yes") {
      return (
        <div className="flex justify-center">
          <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center">
            <Check className="w-4 h-4 text-emerald-600" />
          </div>
        </div>
      );
    }
    if (val === "no") {
      return (
        <div className="flex justify-center">
          <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center">
            <X className="w-3.5 h-3.5 text-slate-300" />
          </div>
        </div>
      );
    }

    let badgeStyles = "bg-slate-100 text-slate-700 border-slate-200";
    if (val === "Basic") {
      badgeStyles = "bg-blue-50 text-blue-700 border-blue-100";
    } else if (val === "Detailed") {
      badgeStyles = "bg-indigo-50 text-indigo-700 border-indigo-100";
    } else if (val === "Advanced") {
      badgeStyles = "bg-purple-50 text-purple-700 border-purple-100 font-semibold";
    }

    return (
      <div className="flex justify-center">
        <span className={`px-3 py-1 rounded-full text-xs border ${badgeStyles}`}>
          {val}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#5f6368] font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Navbar (Consistent with Landing) */}
      <header className="flex items-center justify-between px-6 py-4 w-full border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/teso-logo.png"
              alt="Teso Logo"
              width={40}
              height={40}
              className="object-contain"
            />
            <span className="text-[22px] font-medium text-[#5f6368] tracking-tight">Teso Exams</span>
          </Link>
        </div>

        <div className="flex items-center gap-6 text-[#5f6368]">
          <div className="hidden sm:flex items-center gap-6 mr-4 font-medium text-[15px]">
            <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
            <Link href="/pricing" className="text-blue-600 font-bold">Pricing</Link>
            {!loading && user ? (
              <Link href={studyPlatformUrl} className="hover:text-blue-600 transition-colors font-bold">Study Platform</Link>
            ) : !loading ? (
              <Link href="/auth/sign-in" className="hover:text-blue-600 transition-colors">Sign in</Link>
            ) : null}
          </div>
          {!loading && (
            <div className="flex items-center gap-2">
              {user ? (
                <Link
                  href="/host/create"
                  className="bg-[#1a73e8] text-white px-6 py-2.5 rounded-[4px] font-medium hover:bg-[#1557b0] transition-all shadow-sm hover:shadow-md whitespace-nowrap text-[15px]"
                >
                  Exam Dashboard
                </Link>
              ) : (
                <Link
                  href="/auth/sign-up"
                  className="bg-[#1a73e8] text-white px-6 py-2.5 rounded-[4px] font-medium hover:bg-[#1557b0] transition-all shadow-sm hover:shadow-md whitespace-nowrap text-[15px]"
                >
                  Get Started
                </Link>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Pricing Content */}
      <main className="flex-1 flex flex-col items-center py-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-3xl mb-16 space-y-4"
        >
          <h1 className="text-5xl font-normal text-[#202124] tracking-tight">
            Simple, transparent pricing.
          </h1>
          <p className="text-xl text-[#5f6368] font-light">
            Choose the plan that's right for your class, institution, or organization.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative flex flex-col p-6 rounded-3xl border ${plan.highlight
                ? "border-[#1a73e8] shadow-[0_20px_50px_rgba(26,115,232,0.12)] ring-1 ring-[#1a73e8]"
                : "border-slate-200 hover:border-slate-300 transition-all shadow-sm hover:shadow-md"
                } bg-white`}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#1a73e8] text-white text-[11px] font-bold rounded-full uppercase tracking-wider shadow-sm">
                  Most Popular
                </div>
              )}

              <div className="mb-6 flex-1">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-[#202124] mb-1">{plan.name}</h3>
                  <p className="text-xs text-[#1a73e8] font-semibold tracking-wide uppercase">{plan.subtitle}</p>
                </div>

                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-semibold text-[#202124]">
                    {plan.price}
                  </span>
                  {plan.period && <span className="text-sm text-[#5f6368] font-normal">{plan.period}</span>}
                </div>

                <p className="text-sm text-[#5f6368] leading-relaxed mb-6">
                  {plan.description}
                </p>

                {/* Capacity Section */}
                <div className="mb-6 pt-4 border-t border-slate-100">
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {plan.capacityLabel}
                  </span>

                  {plan.capacityValue && (
                    <span className="inline-flex items-center text-sm font-semibold text-[#202124] bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 w-full">
                      {plan.capacityValue}
                    </span>
                  )}

                  {plan.tiers && (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2">
                      {plan.tiers.map((tier, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-[#5f6368] pb-1.5 border-b border-slate-200/50 last:border-b-0 last:pb-0">
                          <span>{tier.range}</span>
                          <span className="font-semibold text-[#202124]">{tier.price}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Features List */}
                <div className="pt-4 border-t border-slate-100">
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Features Include
                  </span>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-xs leading-relaxed text-[#5f6368]">
                        <div className="mt-0.5 w-4 h-4 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-[#1a73e8]" />
                        </div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href={
                    plan.name === "Enterprise Plan"
                      ? "mailto:learnfromteso@gmail.com"
                      : user
                        ? "/host/create"
                        : "/auth/sign-up"
                  }
                  className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm ${plan.highlight
                    ? "bg-[#1a73e8] text-white hover:bg-[#1557b0] shadow-md shadow-blue-100"
                    : "bg-slate-50 text-[#202124] hover:bg-slate-100 border border-slate-200"
                    }`}
                >
                  {plan.buttonText}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Feature Comparison Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-32 w-full max-w-6xl px-4"
        >
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl font-normal text-[#202124] tracking-tight">Feature Comparison</h2>
            <p className="text-lg text-[#5f6368] font-light">
              Compare features across our plans to find the right fit for your needs.
            </p>
          </div>

          <div className="w-full border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-sm font-medium text-[#202124]">
                  <th className="py-5 px-6 font-semibold w-2/5">Feature</th>
                  <th className="py-5 px-4 font-semibold text-center w-1/5">Free</th>
                  <th className="py-5 px-4 font-semibold text-center w-1/5">Pay-As-You-Go</th>
                  <th className="py-5 px-4 font-semibold text-center w-1/5">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-[#5f6368]">
                {comparisonFeatures.map((feat) => (
                  <tr key={feat.name} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-medium text-[#202124]">{feat.name}</td>
                    <td className="py-4 px-4 text-center">{renderCellContent(feat.free)}</td>
                    <td className="py-4 px-4 text-center">{renderCellContent(feat.payg)}</td>
                    <td className="py-4 px-4 text-center">{renderCellContent(feat.enterprise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>


        {/* FAQ Preview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-24 text-center space-y-6"
        >
          <h2 className="text-2xl font-normal text-[#202124]">Frequently asked questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left max-w-4xl">
            <div className="space-y-2">
              <h4 className="font-bold text-[#202124]">Can I cancel my plan?</h4>
              <p className="text-sm leading-relaxed">Yes, you can cancel your subscription at any time from your host dashboard. You'll retain access until the end of your billing cycle.</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-[#202124]">What counts as an "exam"?</h4>
              <p className="text-sm leading-relaxed">An exam is any scheduled session where candidates join to answer questions. Practice tests and drafts do not count towards your limit.</p>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Minimal Footer */}
      <footer className="py-12 border-t border-slate-100 flex flex-col items-center gap-6">
        <div className="flex items-center gap-8 text-sm">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <Link href="/privacy" className="hover:text-blue-600">Privacy</Link>
          <Link href="/terms" className="hover:text-blue-600">Terms</Link>
          <Link href="mailto:learnfromteso@gmail.com" className="hover:text-blue-600">Support</Link>
        </div>
        <p className="text-xs text-slate-400">© {new Date().getFullYear()} Teso Exams. All rights reserved.</p>
      </footer>
    </div>
  );
}
