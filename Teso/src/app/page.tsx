"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import ScrollExpand from "@/components/ui/ScrollExpand";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Mail,
  MapPin,
  Send,
  CheckCircle2,
  ChevronDown,
  Loader2,
  AlertCircle
} from "lucide-react";

export default function LandingPage() {
  const [pricingTab, setPricingTab] = useState<"exam" | "selfStudy">("exam");
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", message: "", role: "student" });
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const videoSection = document.getElementById("video");
      const pricingSection = document.getElementById("pricing");
      if (!videoSection) return;

      const videoRect = videoSection.getBoundingClientRect();
      const pricingRect = pricingSection?.getBoundingClientRect();

      const inVideoRange = videoRect.top <= window.innerHeight * 0.6;
      const reachedPricing = pricingRect ? pricingRect.top <= window.innerHeight * 0.5 : false;

      // Dark theme is active ONLY while scrolling through the video section
      if (inVideoRange && !reachedPricing) {
        setIsDarkTheme(true);
      } else {
        setIsDarkTheme(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      setContactSubmitted(true);
      setFormData({ name: "", email: "", message: "", role: "student" });
    } catch (err: any) {
      setSubmitError(err.message || "Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const heroContent = {
    headlineLine1: "Self-Study Smarter.",
    headlineLine2: "Host Exams Effortlessly.",
    description: "Sri Lanka's best self study and Exam Hosting platform.",
  };

  return (
    <>
      <title>Teso | Self Study and Exam Hosting Platform</title>
      <meta name="description" content="Sri Lanka's best self study and Exam Hosting platform. Turn your exam preparation into an engaging journey." />

      <div
        className={`min-h-screen transition-colors duration-700 selection:bg-blue-600 selection:text-white relative font-sans ${isDarkTheme
          ? "bg-[#090d16] text-slate-100"
          : "bg-gradient-to-b from-[#cbe0fc] via-[#e9f2fe] to-[#ffffff] text-[#0f172a]"
          }`}
      >
        {/* Dynamic Glass Orbs & Ambient Glows */}
        <div
          className={`absolute top-[-100px] left-[-100px] w-[650px] h-[650px] rounded-full blur-[130px] pointer-events-none -z-10 animate-float transition-all duration-700 ${isDarkTheme
            ? "bg-gradient-to-tr from-[#1e40af]/30 to-[#3b82f6]/20"
            : "bg-gradient-to-tr from-[#3b82f6]/25 to-[#60a5fa]/20"
            }`}
        />
        <div
          className={`absolute top-[15%] right-[-120px] w-[750px] h-[750px] rounded-full blur-[150px] pointer-events-none -z-10 animate-float-delayed transition-all duration-700 ${isDarkTheme
            ? "bg-gradient-to-bl from-[#1d4ed8]/20 via-[#0284c7]/20 to-transparent"
            : "bg-gradient-to-bl from-[#2563eb]/15 via-[#93c5fd]/25 to-white/60"
            }`}
        />
        <div
          className={`absolute top-[45%] left-[10%] w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none -z-10 transition-all duration-700 ${isDarkTheme ? "bg-sky-900/20" : "bg-sky-200/35"
            }`}
        />

        {/* ============================================================= */}
        {/* 1. NAVBAR */}
        {/* ============================================================= */}
        <header className="sticky top-3 z-50 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={`rounded-full px-6 sm:px-8 py-2 sm:py-2.5 shadow-lg backdrop-blur-xl flex items-center justify-between transition-all duration-500 ${isDarkTheme
              ? "bg-slate-900/90 text-white border-0 shadow-black/50"
              : "bg-white/90 text-slate-900 border border-slate-200/70 shadow-slate-950/5"
              }`}
          >
            {/* LOGO */}
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/icon.png"
                alt="Teso Logo"
                width={50}
                height={50}
                className="w-10.5 h-10.5 object-contain hover:scale-105 transition-transform cursor-pointer"
              />
              <span
                className={`font-semibold text-xl sm:text-2xl tracking-tight transition-colors duration-500 ${isDarkTheme ? "text-white" : "text-slate-900"
                  }`}
              >
                Teso
              </span>
            </Link>

            {/* MAIN NAV LINKS */}
            <nav
              className={`hidden md:flex items-center gap-7 lg:gap-9 font-medium text-base transition-colors duration-500 ${isDarkTheme ? "text-slate-300" : "text-slate-700"
                }`}
            >
              <a href="#video" className="hover:text-blue-500 transition-colors cursor-pointer">
                Features
              </a>
              <a href="#pricing" className="hover:text-blue-500 transition-colors cursor-pointer">
                Pricing
              </a>
              <a href="#contact" className="hover:text-blue-500 transition-colors cursor-pointer">
                Contact Us
              </a>
            </nav>

            {/* RIGHT ACTION BUTTONS */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              <Link
                href="https://exam.teso.lk"
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full font-medium text-xs sm:text-sm border transition-all duration-300 cursor-pointer ${isDarkTheme
                  ? "bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border-slate-700/80 hover:text-white"
                  : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200/80 hover:text-slate-900"
                  }`}
              >
                <span>Try exam platform</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>

              <Link
                href="/auth/sign-in"
                className="group flex items-center gap-1.5 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full font-semibold text-xs sm:text-sm shadow-sm hover:shadow-md bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 transition-all duration-300 cursor-pointer"
              >
                <span>Get started</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-90 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </header>

        {/* ============================================================= */}
        {/* 2. HEADER (HERO SECTION) */}
        {/* ============================================================= */}
        <section id="hero" className="relative pt-8 pb-16 md:pt-14 md:pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* LEFT COLUMN: Text Content */}
            <div className="lg:col-span-6 space-y-7 z-20 transform -translate-x-[10px] translate-y-[40px] md:translate-y-[60px]">
              {/* Main Headline */}
              <div className="space-y-1">
                <h1
                  className={`text-3xl sm:text-5xl lg:text-6xl xl:text-6xl font-inter-200 tracking-tight leading-[1.05] whitespace-nowrap transition-colors duration-500 ${isDarkTheme ? "text-white" : "text-slate-900"
                    }`}
                >
                  {heroContent.headlineLine1}
                </h1>
                <h1
                  className={`text-3xl sm:text-5xl lg:text-6xl xl:text-6xl font-inter-200 tracking-tight leading-[1.05] whitespace-nowrap transition-colors duration-500 ${isDarkTheme ? "text-white" : "text-slate-900"
                    }`}
                >
                  {heroContent.headlineLine2}
                </h1>
              </div>
              <p
                className={`text-base sm:text-lg lg:text-xl font-normal max-w-md leading-relaxed transition-colors duration-500 ${isDarkTheme ? "text-slate-300" : "text-slate-600"
                  }`}
              >
                {heroContent.description}
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <Link
                  href="/auth/sign-in"
                  className="group flex items-center gap-3 bg-[#18181b] hover:bg-black text-white px-6 py-3.5 rounded-full font-semibold text-base shadow-xl shadow-blue-950/10 hover:shadow-2xl transition-all duration-200 transform hover:-translate-y-0.5 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <span className="pr-2">Get started</span>
                </Link>
              </div>
            </div>

            {/* RIGHT COLUMN: Hero Cutout */}
            <div className="lg:col-span-6 relative flex justify-center lg:justify-end items-end mt-4 lg:mt-0 z-10">
              <img
                src="/hero-woman.png"
                alt="Teso AI Education"
                className="w-full max-w-[640px] sm:max-w-[720px] lg:max-w-[850px] h-auto max-h-[750px] object-contain object-bottom select-none pointer-events-none transform scale-110 sm:scale-120 lg:scale-130 origin-bottom translate-x-[10px] translate-y-[60px]"
              />
            </div>
          </div>

          {/* GLOW LAYER AT BOTTOM WITH BLUR */}
          <div
            className={`absolute -bottom-[40px] left-1/2 -translate-x-1/2 w-screen h-[100px] blur-[30px] pointer-events-none z-30 transition-all duration-700 ${isDarkTheme ? "bg-[#090d16]/90" : "bg-white/90"
              }`}
          />
        </section>


        {/* ============================================================= */}
        {/* 4. VIDEO */}
        {/* ============================================================= */}
        <section id="video" className="relative z-40 w-full">
          <ScrollExpand
            src="/Teso Web.mp4"
            mediaType="video"
            alt="Teso Platform Walkthrough"
            title="Discover Exam Platform"
            scrollHint="Scroll down to expand video"
            useWindowScroll
            startWidth={52}
            startHeight={64}
            startRadius={24}
            endRadius={0}
            mediaZoom={1.3}
            scrollDistance={1.2}
            holdDistance={1.6}
            smoothing={0.08}
            overlayScrim={0.45}
          >
          </ScrollExpand>
        </section>

        {/* ============================================================= */}
        {/* 5. PRICING */}
        {/* ============================================================= */}
        <section id="pricing" className="relative z-40 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center space-y-3 mb-12">
            <h2
              className={`text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight transition-colors duration-500 ${isDarkTheme ? "text-white" : "text-[#0f172a]"
                }`}
            >
              Pricing.
            </h2>
            <p
              className={`text-base sm:text-lg max-w-2xl mx-auto font-normal transition-colors duration-500 ${isDarkTheme ? "text-slate-400" : "text-[#64748b]"
                }`}
            >
              Choose the plan that&apos;s right for your class, institution, or organization.
            </p>

            {/* Platform Tab Switcher */}
            <div
              className={`inline-flex items-center p-1.5 rounded-full mt-6 border transition-all duration-500 ${isDarkTheme ? "bg-slate-900/90 border-slate-800" : "bg-slate-200/60 border-slate-200/80"
                }`}
            >
              <button
                onClick={() => setPricingTab("exam")}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer ${pricingTab === "exam"
                  ? isDarkTheme
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-[#0f172a] shadow-sm"
                  : isDarkTheme
                    ? "text-slate-400 hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Exam Platform
              </button>
              <button
                onClick={() => setPricingTab("selfStudy")}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer ${pricingTab === "selfStudy"
                  ? isDarkTheme
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-[#0f172a] shadow-sm"
                  : isDarkTheme
                    ? "text-slate-400 hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Self Study Platform
              </button>
            </div>
          </div>

          {/* TAB 1: EXAM PLATFORM */}
          {pricingTab === "exam" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-7 items-stretch">
              {/* Free Plan */}
              <div
                className={`rounded-[32px] p-8 border transition-all duration-500 flex flex-col justify-between ${isDarkTheme
                  ? "bg-slate-900/90 border-slate-800 text-white shadow-2xl"
                  : "bg-white border-slate-200/70 text-[#0f172a] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-xl"
                  }`}
              >
                <div>
                  <div>
                    <h3 className={`text-2xl sm:text-[26px] font-bold tracking-tight ${isDarkTheme ? "text-white" : "text-[#0f172a]"}`}>
                      Free Plan
                    </h3>
                    <span className="text-[11px] font-bold text-[#2563eb] tracking-wider uppercase mt-1 block">
                      FOR NEW EDUCATORS
                    </span>
                  </div>

                  <div className="mt-5 mb-4">
                    <span className={`text-4xl sm:text-[42px] font-extrabold tracking-tight ${isDarkTheme ? "text-white" : "text-[#0f172a]"}`}>
                      LKR 0
                    </span>
                  </div>

                  <p className={`text-sm leading-relaxed font-normal mb-8 min-h-[44px] ${isDarkTheme ? "text-slate-400" : "text-[#64748b]"}`}>
                    Perfect for teachers and tutors getting started with online exams.
                  </p>

                  {/* STUDENT LIMIT */}
                  <div className="mb-8">
                    <span className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-3">
                      STUDENT LIMIT
                    </span>
                    <div
                      className={`border rounded-2xl py-3 px-4.5 font-bold text-sm transition-colors duration-500 ${isDarkTheme ? "bg-slate-800/80 border-slate-700 text-white" : "bg-[#f8fafc] border-slate-100 text-[#0f172a]"
                        }`}
                    >
                      Up to 30 students/month
                    </div>
                  </div>

                  {/* FEATURES INCLUDE */}
                  <div className="mb-6">
                    <span className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-4">
                      FEATURES INCLUDE
                    </span>
                    <ul className="space-y-3.5 text-sm">
                      <li className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-[#3b82f6] stroke-[2.5] shrink-0" />
                        <span className={`font-medium ${isDarkTheme ? "text-slate-300" : "text-[#475569]"}`}>Create MCQ exams</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-[#3b82f6] stroke-[2.5] shrink-0" />
                        <span className={`font-medium ${isDarkTheme ? "text-slate-300" : "text-[#475569]"}`}>Basic quiz hosting</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-[#3b82f6] stroke-[2.5] shrink-0" />
                        <span className={`font-medium ${isDarkTheme ? "text-slate-300" : "text-[#475569]"}`}>Automatic marking</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-[#3b82f6] stroke-[2.5] shrink-0" />
                        <span className={`font-medium ${isDarkTheme ? "text-slate-300" : "text-[#475569]"}`}>Exam result generation</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-[#3b82f6] stroke-[2.5] shrink-0" />
                        <span className={`font-medium ${isDarkTheme ? "text-slate-300" : "text-[#475569]"}`}>Basic student analytics</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <Link
                  href="https://exam.teso.lk"
                  className={`w-full py-3.5 px-6 rounded-full font-semibold text-sm transition-all duration-200 cursor-pointer shadow-sm mt-6 text-center block ${isDarkTheme ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-[#0f172a] hover:bg-black text-white"
                    }`}
                >
                  Get Started Free
                </Link>
              </div>

              {/* Pay-As-You-Go */}
              <div
                className={`rounded-[32px] p-8 border transition-all duration-500 flex flex-col justify-between ${isDarkTheme
                  ? "bg-slate-900/90 border-slate-800 text-white shadow-2xl"
                  : "bg-white border-slate-200/70 text-[#0f172a] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-xl"
                  }`}
              >
                <div>
                  <div>
                    <h3 className={`text-2xl sm:text-[26px] font-bold tracking-tight ${isDarkTheme ? "text-white" : "text-[#0f172a]"}`}>
                      Pay-As-You-Go
                    </h3>
                    <span className="text-[11px] font-bold text-[#2563eb] tracking-wider uppercase mt-1 block">
                      OCCASIONAL EXAMS
                    </span>
                  </div>

                  <div className="mt-5 mb-4">
                    <span className={`text-4xl sm:text-[42px] font-extrabold tracking-tight ${isDarkTheme ? "text-white" : "text-[#0f172a]"}`}>
                      Per Exam
                    </span>
                  </div>

                  <p className={`text-sm leading-relaxed font-normal mb-8 min-h-[44px] ${isDarkTheme ? "text-slate-400" : "text-[#64748b]"}`}>
                    Ideal for tutors who conduct exams occasionally and only pay when they host an exam.
                  </p>

                  {/* STUDENTS PER EXAM */}
                  <div className="mb-8">
                    <span className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-3">
                      STUDENTS PER EXAM
                    </span>
                    <div
                      className={`border rounded-2xl p-4 space-y-3 text-sm transition-colors duration-500 ${isDarkTheme ? "bg-slate-800/80 border-slate-700" : "bg-[#f8fafc] border-slate-100"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${isDarkTheme ? "text-slate-300" : "text-[#475569]"}`}>Up to 100 students</span>
                        <span className={`font-bold ${isDarkTheme ? "text-white" : "text-[#0f172a]"}`}>LKR 500</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${isDarkTheme ? "text-slate-300" : "text-[#475569]"}`}>101 – 250 students</span>
                        <span className={`font-bold ${isDarkTheme ? "text-white" : "text-[#0f172a]"}`}>LKR 1,000</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${isDarkTheme ? "text-slate-300" : "text-[#475569]"}`}>251 – 500 students</span>
                        <span className={`font-bold ${isDarkTheme ? "text-white" : "text-[#0f172a]"}`}>LKR 2,000</span>
                      </div>
                    </div>
                  </div>

                  {/* FEATURES INCLUDE */}
                  <div className="mb-6">
                    <span className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-4">
                      FEATURES INCLUDE
                    </span>
                    <ul className="space-y-3.5 text-sm">
                      <li className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-[#3b82f6] stroke-[2.5] shrink-0" />
                        <span className={`font-medium ${isDarkTheme ? "text-slate-300" : "text-[#475569]"}`}>All Free Plan features</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-[#3b82f6] stroke-[2.5] shrink-0" />
                        <span className={`font-medium ${isDarkTheme ? "text-slate-300" : "text-[#475569]"}`}>Unlimited exam creation</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-[#3b82f6] stroke-[2.5] shrink-0" />
                        <span className={`font-medium ${isDarkTheme ? "text-slate-300" : "text-[#475569]"}`}>Large student support</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-[#3b82f6] stroke-[2.5] shrink-0" />
                        <span className={`font-medium ${isDarkTheme ? "text-slate-300" : "text-[#475569]"}`}>Detailed result analytics</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-[#3b82f6] stroke-[2.5] shrink-0" />
                        <span className={`font-medium ${isDarkTheme ? "text-slate-300" : "text-[#475569]"}`}>Exam history & reports</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <Link
                  href="https://exam.teso.lk"
                  className={`w-full py-3.5 px-6 rounded-full font-semibold text-sm transition-all duration-200 cursor-pointer shadow-sm mt-6 text-center block ${isDarkTheme ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-[#0f172a] hover:bg-black text-white"
                    }`}
                >
                  Start Hosting Exams
                </Link>
              </div>

              {/* Enterprise Plan */}
              <div
                className={`rounded-[32px] p-8 border transition-all duration-500 flex flex-col justify-between ${isDarkTheme
                  ? "bg-slate-900/90 border-slate-800 text-white shadow-2xl"
                  : "bg-white border-slate-200/70 text-[#0f172a] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-xl"
                  }`}
              >
                <div>
                  <div>
                    <h3 className={`text-2xl sm:text-[26px] font-bold tracking-tight ${isDarkTheme ? "text-white" : "text-[#0f172a]"}`}>
                      Enterprise Plan
                    </h3>
                    <span className="text-[11px] font-bold text-[#2563eb] tracking-wider uppercase mt-1 block">
                      CUSTOM SOLUTION
                    </span>
                  </div>

                  <div className="mt-5 mb-4">
                    <span className={`text-4xl sm:text-[42px] font-extrabold tracking-tight ${isDarkTheme ? "text-white" : "text-[#0f172a]"}`}>
                      Custom Pricing
                    </span>
                  </div>

                  <p className={`text-sm leading-relaxed font-normal mb-8 min-h-[44px] ${isDarkTheme ? "text-slate-400" : "text-[#64748b]"}`}>
                    For universities, government institutions, and large organizations.
                  </p>

                  {/* STUDENT CAPACITY */}
                  <div className="mb-8">
                    <span className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-3">
                      STUDENT CAPACITY
                    </span>
                    <div
                      className={`border rounded-2xl py-3 px-4.5 font-bold text-sm transition-colors duration-500 ${isDarkTheme ? "bg-slate-800/80 border-slate-700 text-white" : "bg-[#f8fafc] border-slate-100 text-[#0f172a]"
                        }`}
                    >
                      Custom infrastructure
                    </div>
                  </div>

                  {/* FEATURES INCLUDE */}
                  <div className="mb-6">
                    <span className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-4">
                      FEATURES INCLUDE
                    </span>
                    <ul className="space-y-3.5 text-sm">
                      <li className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-[#3b82f6] stroke-[2.5] shrink-0" />
                        <span className={`font-medium ${isDarkTheme ? "text-slate-300" : "text-[#475569]"}`}>Everything in Business</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-[#3b82f6] stroke-[2.5] shrink-0" />
                        <span className={`font-medium ${isDarkTheme ? "text-slate-300" : "text-[#475569]"}`}>Dedicated infrastructure</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-[#3b82f6] stroke-[2.5] shrink-0" />
                        <span className={`font-medium ${isDarkTheme ? "text-slate-300" : "text-[#475569]"}`}>Custom integrations</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-[#3b82f6] stroke-[2.5] shrink-0" />
                        <span className={`font-medium ${isDarkTheme ? "text-slate-300" : "text-[#475569]"}`}>SSO / LMS integration</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-[#3b82f6] stroke-[2.5] shrink-0" />
                        <span className={`font-medium ${isDarkTheme ? "text-slate-300" : "text-[#475569]"}`}>Advanced security controls</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-[#3b82f6] stroke-[2.5] shrink-0" />
                        <span className={`font-medium ${isDarkTheme ? "text-slate-300" : "text-[#475569]"}`}>Dedicated account manager</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-[#3b82f6] stroke-[2.5] shrink-0" />
                        <span className={`font-medium ${isDarkTheme ? "text-slate-300" : "text-[#475569]"}`}>SLA & onboarding support</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <a
                  href="#contact"
                  className={`w-full py-3.5 px-6 rounded-full font-semibold text-sm transition-all duration-200 cursor-pointer shadow-sm mt-6 text-center block ${isDarkTheme ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-[#0f172a] hover:bg-black text-white"
                    }`}
                >
                  Contact Sales
                </a>
              </div>
            </div>
          )}

          {/* TAB 2: SELF STUDY PLATFORM */}
          {pricingTab === "selfStudy" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-7 max-w-4xl mx-auto items-stretch">
              {/* Self Study - Free Plan */}
              <div
                className={`rounded-[32px] p-8 sm:p-9 border transition-all duration-500 flex flex-col justify-between ${isDarkTheme
                  ? "bg-slate-900/90 border-slate-800 text-white shadow-2xl"
                  : "bg-white border-slate-200/70 text-[#0f172a] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-xl"
                  }`}
              >
                <div>
                  <div>
                    <h3 className={`text-2xl sm:text-[26px] font-bold tracking-tight ${isDarkTheme ? "text-white" : "text-[#0f172a]"}`}>
                      Free Plan
                    </h3>
                    <span className="text-[11px] font-bold text-[#2563eb] tracking-wider uppercase mt-1 block">
                      FOR INDIVIDUAL STUDENTS
                    </span>
                  </div>

                  <div className="mt-5 mb-4">
                    <span className={`text-4xl sm:text-[42px] font-extrabold tracking-tight ${isDarkTheme ? "text-white" : "text-[#0f172a]"}`}>
                      LKR 0
                    </span>
                    <span className={`font-medium text-sm ${isDarkTheme ? "text-slate-400" : "text-[#64748b]"}`}> / month</span>
                  </div>

                  <p className={`text-sm leading-relaxed font-normal mb-8 min-h-[44px] ${isDarkTheme ? "text-slate-400" : "text-[#64748b]"}`}>
                    Perfect for students getting started with their exam preparation.
                  </p>

                  {/* FEATURES INCLUDE */}
                  <div className="mb-6">
                    <span className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-4">
                      FEATURES INCLUDE
                    </span>
                    <ul className="space-y-3.5 text-sm">
                      <li className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-[#3b82f6] stroke-[2.5] shrink-0" />
                        <span className={`font-medium ${isDarkTheme ? "text-slate-300" : "text-[#475569]"}`}>Access to Past Papers</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-[#3b82f6] stroke-[2.5] shrink-0" />
                        <span className={`font-medium ${isDarkTheme ? "text-slate-300" : "text-[#475569]"}`}>Basic Study Planner</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-[#3b82f6] stroke-[2.5] shrink-0" />
                        <span className={`font-medium ${isDarkTheme ? "text-slate-300" : "text-[#475569]"}`}>Personal Todo List</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-[#3b82f6] stroke-[2.5] shrink-0" />
                        <span className={`font-medium ${isDarkTheme ? "text-slate-300" : "text-[#475569]"}`}>Basic Analytics</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-[#3b82f6] stroke-[2.5] shrink-0" />
                        <span className={`font-medium ${isDarkTheme ? "text-slate-300" : "text-[#475569]"}`}>Community Access</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <Link
                  href="/auth/sign-in"
                  className={`w-full py-3.5 px-6 rounded-full font-semibold text-sm transition-all duration-200 cursor-pointer shadow-sm mt-6 text-center block ${isDarkTheme ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-[#0f172a] hover:bg-black text-white"
                    }`}
                >
                  Get Started
                </Link>
              </div>

              {/* Self Study - Subscription Plan */}
              <div
                className={`rounded-[32px] p-8 sm:p-9 border transition-all duration-500 flex flex-col justify-between ${isDarkTheme
                  ? "bg-slate-900/90 border-slate-800 text-white shadow-2xl"
                  : "bg-white border-slate-200/70 text-[#0f172a] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-xl"
                  }`}
              >
                <div>
                  <div>
                    <h3 className={`text-2xl sm:text-[26px] font-bold tracking-tight ${isDarkTheme ? "text-white" : "text-[#0f172a]"}`}>
                      Subscription Plan
                    </h3>
                    <span className="text-[11px] font-bold text-[#2563eb] tracking-wider uppercase mt-1 block">
                      ADVANCED AI TOOLS
                    </span>
                  </div>

                  <div className="mt-5 mb-4">
                    <span className={`text-4xl sm:text-[42px] font-extrabold tracking-tight ${isDarkTheme ? "text-white" : "text-[#0f172a]"}`}>
                      LKR 1,000
                    </span>
                    <span className={`font-medium text-sm ${isDarkTheme ? "text-slate-400" : "text-[#64748b]"}`}> / month</span>
                  </div>

                  <p className={`text-sm leading-relaxed font-normal mb-8 min-h-[44px] ${isDarkTheme ? "text-slate-400" : "text-[#64748b]"}`}>
                    Advanced AI-powered tools to supercharge your learning journey.
                  </p>

                  {/* FEATURES INCLUDE */}
                  <div className="mb-6">
                    <span className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-4">
                      FEATURES INCLUDE
                    </span>
                    <ul className="space-y-3.5 text-sm">
                      <li className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-[#3b82f6] stroke-[2.5] shrink-0" />
                        <span className={`font-medium ${isDarkTheme ? "text-slate-300" : "text-[#475569]"}`}>Everything in Free Plan</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-[#3b82f6] stroke-[2.5] shrink-0" />
                        <span className={`font-medium ${isDarkTheme ? "text-slate-300" : "text-[#475569]"}`}>
                          AI Paper Analysis <span className="text-xs text-[#2563eb] font-normal ml-1">(Coming Soon)</span>
                        </span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-[#3b82f6] stroke-[2.5] shrink-0" />
                        <span className={`font-medium ${isDarkTheme ? "text-slate-300" : "text-[#475569]"}`}>Smart Study Recommendations</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-[#3b82f6] stroke-[2.5] shrink-0" />
                        <span className={`font-medium ${isDarkTheme ? "text-slate-300" : "text-[#475569]"}`}>Advanced Progress Tracking</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-[#3b82f6] stroke-[2.5] shrink-0" />
                        <span className={`font-medium ${isDarkTheme ? "text-slate-300" : "text-[#475569]"}`}>Priority Support</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-[#3b82f6] stroke-[2.5] shrink-0" />
                        <span className={`font-medium ${isDarkTheme ? "text-slate-300" : "text-[#475569]"}`}>Detailed Performance Reports</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <Link
                  href="/auth/sign-in"
                  className={`w-full py-3.5 px-6 rounded-full font-semibold text-sm transition-all duration-200 cursor-pointer shadow-sm mt-6 text-center block ${isDarkTheme ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-[#0f172a] hover:bg-black text-white"
                    }`}
                >
                  Start Free Trial
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* ============================================================= */}
        {/* 6. CONTACT US */}
        {/* ============================================================= */}
        <section id="contact" className="relative z-40 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div
            className={`backdrop-blur-xl rounded-3xl p-8 sm:p-12 border transition-all duration-500 ${isDarkTheme
              ? "bg-slate-900/90 border-slate-800 text-white shadow-2xl"
              : "bg-white/90 border-slate-200/80 text-slate-900 shadow-2xl"
              }`}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left info */}
              <div className="lg:col-span-5 space-y-6">
                <span
                  className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors duration-500 ${isDarkTheme ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-700"
                    }`}
                >
                  <Mail className="w-3.5 h-3.5" /> Get In Touch
                </span>
                <h2 className={`text-3xl sm:text-4xl font-bold tracking-tight ${isDarkTheme ? "text-white" : "text-slate-900"}`}>
                  Let&apos;s Talk About Your Learning Goals
                </h2>
                <p className={`leading-relaxed ${isDarkTheme ? "text-slate-400" : "text-slate-600"}`}>
                  Have questions about hosting exams or using Teso for self-study? Send us a message and our team will get back to you promptly.
                </p>

                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-500 ${isDarkTheme ? "bg-blue-900/40 text-blue-400" : "bg-blue-50 text-blue-600"
                        }`}
                    >
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <span className={`text-xs block ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>Email Us</span>
                      <span className={`font-semibold ${isDarkTheme ? "text-white" : "text-slate-900"}`}>contact.tesolk@gmail.com</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-500 ${isDarkTheme ? "bg-blue-900/40 text-blue-400" : "bg-blue-50 text-blue-600"
                        }`}
                    >
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <span className={`text-xs block ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>Location</span>
                      <span className={`font-semibold ${isDarkTheme ? "text-white" : "text-slate-900"}`}>Colombo, Sri Lanka</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right form */}
              <div
                className={`lg:col-span-7 rounded-2xl p-6 sm:p-8 border transition-all duration-500 ${isDarkTheme ? "bg-slate-950/60 border-slate-800/80" : "bg-slate-50 border-slate-200/60"
                  }`}
              >
                {contactSubmitted ? (
                  <div className="text-center py-12 space-y-4">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h3 className={`text-2xl font-bold ${isDarkTheme ? "text-white" : "text-slate-900"}`}>Message Received!</h3>
                    <p className={`max-w-md mx-auto ${isDarkTheme ? "text-slate-400" : "text-slate-600"}`}>
                      Thank you for reaching out. A representative from the Teso team will be in contact with you shortly.
                    </p>
                    <button
                      onClick={() => setContactSubmitted(false)}
                      className={`mt-4 px-6 py-2 rounded-full font-medium text-sm transition-colors ${isDarkTheme ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-slate-900 hover:bg-black text-white"
                        }`}
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5">
                      <div className="space-y-2">
                        <label className={`block text-xs font-semibold uppercase tracking-wider ${isDarkTheme ? "text-slate-300" : "text-slate-700"}`}>
                          Your Name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="John Doe"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className={`w-full h-12 px-4 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300 shadow-sm ${isDarkTheme
                            ? "bg-slate-900/90 border-slate-800 text-white placeholder-slate-500"
                            : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"
                            }`}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className={`block text-xs font-semibold uppercase tracking-wider ${isDarkTheme ? "text-slate-300" : "text-slate-700"}`}>
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="john@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className={`w-full h-12 px-4 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300 shadow-sm ${isDarkTheme
                            ? "bg-slate-900/90 border-slate-800 text-white placeholder-slate-500"
                            : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"
                            }`}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className={`block text-xs font-semibold uppercase tracking-wider ${isDarkTheme ? "text-slate-300" : "text-slate-700"}`}>
                        I am a...
                      </label>
                      <div className="relative w-full">
                        <select
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                          className={`w-full h-12 px-4 pr-10 rounded-xl text-sm border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300 shadow-sm ${isDarkTheme
                            ? "bg-slate-900/90 border-slate-800 text-white"
                            : "bg-white border-slate-200 text-slate-900"
                            }`}
                        >
                          <option value="student" className={isDarkTheme ? "bg-slate-900 text-white" : ""}>
                            Student / Self-Learner
                          </option>
                          <option value="teacher" className={isDarkTheme ? "bg-slate-900 text-white" : ""}>
                            Teacher / Educator
                          </option>
                          <option value="institution" className={isDarkTheme ? "bg-slate-900 text-white" : ""}>
                            Institute / School Administrator
                          </option>
                        </select>
                        <ChevronDown className={`w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className={`block text-xs font-semibold uppercase tracking-wider ${isDarkTheme ? "text-slate-300" : "text-slate-700"}`}>
                        Message
                      </label>
                      <textarea
                        rows={4}
                        required
                        placeholder="Tell us how we can help..."
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className={`w-full px-4 py-3.5 rounded-xl text-sm border resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300 shadow-sm ${isDarkTheme
                          ? "bg-slate-900/90 border-slate-800 text-white placeholder-slate-500"
                          : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"
                          }`}
                      ></textarea>
                    </div>

                    {submitError && (
                      <div className="flex items-center gap-2.5 p-3.5 rounded-xl text-xs sm:text-sm bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{submitError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`w-full flex items-center justify-center gap-2 h-12 px-6 rounded-xl font-semibold text-sm transition-all shadow-md ${isSubmitting ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
                        } ${isDarkTheme ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-slate-900 hover:bg-black text-white"
                        }`}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending Message...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Message</span>
                          <Send className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* 7. FOOTER */}
        {/* ============================================================= */}
        <footer
          className={`w-full pt-20 pb-12 px-6 sm:px-8 border-t relative z-40 transition-colors duration-700 ${isDarkTheme ? "bg-[#05070d] border-slate-800/80 text-white" : "bg-white border-slate-200/80 text-slate-900"
            }`}
        >
          <div className="max-w-6xl mx-auto">
            {/* TOP 3-COLUMN LAYOUT */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16 pb-16 md:pb-24">
              {/* COLUMN 1: Say hi */}
              <div className="space-y-2">
                <span className={`text-sm font-normal block ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>
                  Try Demo
                </span>
                <a
                  href="#contact"
                  className={`group inline-flex items-center gap-1 text-2xl sm:text-3xl font-medium tracking-tight transition-colors ${isDarkTheme ? "text-white hover:text-blue-400" : "text-slate-900 hover:text-blue-600"
                    }`}
                >
                  <span>Contact Us</span>
                  <ArrowUpRight className="w-6 h-6 stroke-[2] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              </div>

              {/* COLUMN 2: Connect on */}
              <div className="space-y-2">
                <span className={`text-sm font-normal block ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>
                  Connect on
                </span>
                <Link
                  href="https://www.linkedin.com/company/110522430/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group inline-flex items-center gap-1 text-2xl sm:text-3xl font-medium tracking-tight transition-colors ${isDarkTheme ? "text-white hover:text-blue-400" : "text-slate-900 hover:text-blue-600"
                    }`}
                >
                  <span>LinkedIn</span>
                  <ArrowUpRight className="w-6 h-6 stroke-[2] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>
              </div>

              {/* COLUMN 3: Follow us */}
              <div className="space-y-2">
                <span className={`text-sm font-normal block ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>
                  Follow us
                </span>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <Link
                    href="https://www.instagram.com/tesoapp_official/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group inline-flex items-center gap-1 text-2xl sm:text-3xl font-medium tracking-tight transition-colors ${isDarkTheme ? "text-white hover:text-blue-400" : "text-slate-900 hover:text-blue-600"
                      }`}
                  >
                    <span>Instagram</span>
                    <ArrowUpRight className="w-6 h-6 stroke-[2] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </Link>
                  <Link
                    href="https://www.facebook.com/profile.php?id=61585551411249"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group inline-flex items-center gap-1 text-2xl sm:text-3xl font-medium tracking-tight transition-colors ${isDarkTheme ? "text-white hover:text-blue-400" : "text-slate-900 hover:text-blue-600"
                      }`}
                  >
                    <span>Facebook</span>
                    <ArrowUpRight className="w-6 h-6 stroke-[2] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>

            {/* BOTTOM BAR: COPYRIGHT & LINKS */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm font-normal">
              <span className={isDarkTheme ? "text-slate-400" : "text-slate-500"}>© 2026 TESO Education.</span>

              <div className={`flex items-center gap-2 font-semibold text-sm sm:text-base ${isDarkTheme ? "text-white" : "text-slate-900"}`}>
                <Link href="/privacy" className="hover:text-blue-500 transition-colors">
                  Privacy Policy
                </Link>
                <span className={`font-normal ${isDarkTheme ? "text-slate-700" : "text-slate-300"}`}>|</span>
                <Link href="/terms" className="hover:text-blue-500 transition-colors">
                  Terms & Conditions
                </Link>
                <span className={`font-normal ${isDarkTheme ? "text-slate-700" : "text-slate-300"}`}>|</span>
                <a href="#contact" className="hover:text-blue-500 transition-colors">
                  Contact
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}