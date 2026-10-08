import { Navbar } from "@/components/shared/Navbar";
import { Check, Zap } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Pricing | TESO",
  description: "Simple and transparent pricing for Teso students.",
};

export default function PricingPage() {
  const plans = [
    {
      name: "Free Plan",
      price: "0",
      description: "Perfect for students getting started with their exam preparation.",
      features: [
        "Access to Past Papers",
        "Basic Study Planner",
        "Personal Todo List",
        "Basic Analytics",
        "Community Access"
      ],
      buttonText: "Get Started",
      popular: false,
    },
    {
      name: "Subscription Plan",
      price: "0",
      originalPrice: "999",
      description: "Advanced AI-powered tools to supercharge your learning journey.",
      features: [
        "Everything in Free Plan",
        "AI Paper Analysis (Coming Soon)",
        "Smart Study Recommendations",
        "Advanced Progress Tracking",
        "Priority Support",
        "Detailed Performance Reports"
      ],
      buttonText: "Start Free Trial",
      popular: true,
    }
  ];

  return (
    <div className="dark min-h-screen bg-[#071027] text-white overflow-hidden relative">
      {/* Background Glows */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen animate-pulse" />
        <div className="absolute bottom-[-10%] right-[20%] w-[400px] h-[400px] bg-cyan-500/5 blur-[100px] rounded-full mix-blend-screen" />
      </div>

      <Navbar />

      <main className="max-w-7xl mx-auto px-6 pt-40 pb-20 relative z-10">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
            Simple <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5cf1ff] to-[#38bdf8]">Pricing</span>
          </h1>
          <p className="text-[#98a6b2] text-lg max-w-2xl mx-auto leading-relaxed">
            Choose the plan that's right for you. All plans are currently free as we roll out our premium AI features.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col p-8 rounded-3xl border transition-all duration-500 group ${plan.popular
                  ? "bg-[#0b1420]/80 border-blue-500/50 shadow-[0_20px_50px_rgba(56,189,248,0.15)] scale-105"
                  : "bg-[#0b1420]/40 border-slate-800 hover:border-slate-700"
                } backdrop-blur-xl`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#38bdf8] to-blue-600 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20">
                  Most Popular
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-2 text-slate-100">{plan.name}</h3>
                <p className="text-[#98a6b2] text-sm">{plan.description}</p>
              </div>

              <div className="mb-8 flex items-baseline gap-2">
                <span className="text-5xl font-bold text-white">LKR {plan.price}</span>
                <span className="text-slate-400 text-sm font-medium">/month</span>
                {plan.originalPrice && (
                  <span className="text-slate-500 line-through text-xl ml-2 font-medium">LKR {plan.originalPrice}</span>
                )}
              </div>

              <ul className="space-y-4 mb-10 flex-grow">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-slate-300 text-sm">
                    <div className="mt-1 bg-blue-500/20 rounded-full p-1 border border-blue-500/30">
                      <Check className="w-3 h-3 text-blue-400" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/auth/sign-up"
                className={`w-full py-4 rounded-2xl font-bold text-center transition-all duration-300 ${plan.popular
                    ? "bg-[#38bdf8] text-slate-950 hover:shadow-[0_10px_30px_rgba(56,189,248,0.4)] hover:scale-[1.02]"
                    : "bg-slate-800/50 text-white hover:bg-slate-700/80 border border-slate-700"
                  }`}
              >
                {plan.buttonText}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-24 p-10 rounded-3xl border border-blue-500/20 bg-[#0b1420]/60 backdrop-blur-xl shadow-2xl max-w-3xl mx-auto text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-500/10 border border-blue-500/30 rounded-2xl mb-6 shadow-inner">
              <Zap className="w-7 h-7 text-[#38bdf8]" fill="currentColor" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Wait, Everything is Free?</h2>
            <p className="text-[#98a6b2] leading-relaxed">
              Yes! We are currently in our beta phase. Our advanced AI features are still under development.
              Once implemented, they will be part of the Subscription Plan, but for now, you can explore everything TESO has to offer at no cost.
            </p>
          </div>
        </div>
      </main>

      <footer className="mt-20 py-12 border-t border-slate-800/50 relative z-10">
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
