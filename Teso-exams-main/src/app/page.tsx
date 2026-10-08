"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Keyboard,
  Zap,
  Shield,
  BarChart3,
  CheckCircle,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Star,
  Users,
  Award,
  Sparkles,
  Globe,
  Clock,
  Lock,
  ChevronRight,
  Check,
  HelpCircle,
  FileText,
  Smartphone,
  Cpu
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import ScrollExpand from "@/components/ui/ScrollExpand";
import ScrollReveal from "@/components/ui/ScrollReveal";

export default function Home() {
  const [examCode, setExamCode] = useState("");
  const [error, setError] = useState("");
  const [time, setTime] = useState("");
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Typewriter effect state
  const words = ["Teachers.", "Schools.", "Institutes."];
  const [wordIndex, setWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const targetWord = words[wordIndex];
    const typingSpeed = isDeleting ? 40 : 80;

    if (!isDeleting && currentText === targetWord) {
      const timeout = setTimeout(() => setIsDeleting(true), 2000);
      return () => clearTimeout(timeout);
    }

    if (isDeleting && currentText === "") {
      setIsDeleting(false);
      setWordIndex((prev) => (prev + 1) % words.length);
      return;
    }

    const timeout = setTimeout(() => {
      setCurrentText(
        isDeleting
          ? targetWord.substring(0, currentText.length - 1)
          : targetWord.substring(0, currentText.length + 1)
      );
    }, typingSpeed);

    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, wordIndex]);


  const videoRef = useRef<HTMLVideoElement | null>(null);
  const router = useRouter();
  const { user, loading } = useAuth();
  const studyPlatformUrl =
    process.env.NEXT_PUBLIC_STUDY_PLATFORM_URL || "http://localhost:3000";

  // Live clock
  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Video autoplay handle
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        setIsPlaying(false);
      });
    }
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleJoin = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!examCode.trim()) {
      setError("Please enter an exam code");
      return;
    }
    if (examCode.length < 4) {
      setError("Invalid exam code format");
      return;
    }
    router.push(`/candidate/identity?examCode=${encodeURIComponent(examCode)}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--background)] text-[var(--foreground)] selection:bg-indigo-500/20 overflow-x-clip">
      {/* ── Ambient Glow Backgrounds ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-indigo-500/12 blur-[150px] rounded-full" />
        <div className="absolute top-[35%] -right-40 w-[600px] h-[600px] bg-purple-500/10 blur-[160px] rounded-full" />
        <div className="absolute top-[70%] -left-40 w-[600px] h-[600px] bg-blue-500/10 blur-[160px] rounded-full" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* ── Header / Navbar ── */}
      <header className="relative z-50 flex items-center justify-between px-4 sm:px-8 lg:px-12 py-2.5 sm:py-3 border-b border-[var(--border)]/60 bg-[var(--background)]/80 backdrop-blur-xl sticky top-0 transition-all">
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="Teso Exams Home">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-indigo-500/10 border border-indigo-500/20 shadow-sm shadow-indigo-500/10 group-hover:scale-105 transition-transform overflow-hidden">
            <Image
              src="/teso-logo.png"
              alt="Teso"
              width={38}
              height={38}
              className="object-contain"
            />
          </div>
          <span className="text-[var(--foreground)] font-extrabold text-lg tracking-tight">
            Teso <span className="text-indigo-600 dark:text-indigo-400">Exams</span>
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-[var(--foreground-muted)]">
            <a href="#features" className="hover:text-indigo-500 transition-colors">
              Features
            </a>
            <a href="#demo" className="hover:text-indigo-500 transition-colors">
              Video Demo
            </a>
            <a href="#pricing" className="hover:text-indigo-500 transition-colors">
              Pricing
            </a>
            <a href="#reviews" className="hover:text-indigo-500 transition-colors">
              Reviews
            </a>
            {!loading && user ? (
              <Link
                href={studyPlatformUrl}
                className="hover:text-indigo-500 transition-colors"
              >
                Study Platform
              </Link>
            ) : null}
            <span className="text-[var(--border)]">|</span>
            <span className="tabular-nums text-xs text-[var(--foreground-subtle)] font-mono">{time}</span>
          </div>

          <div className="flex items-center gap-3">
            {!loading && !user && (
              <Link
                href="/auth/sign-in"
                className="hidden sm:inline-flex text-sm font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)] px-2.5 py-1.5 transition-colors"
              >
                Sign in
              </Link>
            )}

            {!loading && (
              <Link
                href={user ? "/host/create" : "/auth/sign-up"}
                id="navbar-cta-btn"
              >
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md shadow-indigo-500/20 transition-all active:scale-95 text-xs sm:text-sm px-4 h-9"
                  size="sm"
                >
                  {user ? "Exam Dashboard" : "Get Started Free"}
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            )}
          </div>
        </nav>
      </header>

      <main className="relative z-10 flex-1 flex flex-col">
        {/* ── 1. Hero Section ── */}
        <section className="relative px-4 sm:px-8 lg:px-12 pt-6 pb-12 lg:pt-10 lg:pb-16 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Content Column */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="lg:col-span-6 flex flex-col items-start text-left space-y-6"
            >


              {/* Increased Font Size Title */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-[var(--foreground)] tracking-tight leading-[1.08]">
                Sri Lanka&apos;s Best Exam Hosting Platform for
                <br />
                <span className="text-indigo-600 dark:text-indigo-400 inline-flex items-center mt-1">
                  {currentText}
                  <span className="inline-block w-[3px] h-[0.85em] bg-indigo-600 dark:bg-indigo-400 ml-1.5 align-middle animate-pulse rounded-full" />
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-[var(--foreground-muted)] max-w-xl font-normal leading-relaxed">
                Create, host, and evaluate exams effortlessly with automated grading and smart anti-cheat proctoring for Sri Lankan institutes.
              </p>

              {/* Action Box: Google Meet style input & CTA button */}
              <div className="w-full pt-2">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">

                  {/* Join with code - Google Meet Style Input Box */}
                  <form
                    onSubmit={handleJoin}
                    className="flex flex-1 items-center gap-2 relative w-full sm:w-auto max-w-md"
                  >
                    <div className="relative flex-1 flex items-center">
                      <div className="absolute left-3.5 text-gray-400 dark:text-zinc-400 pointer-events-none flex items-center">
                        <Keyboard className="w-5 h-5" />
                      </div>
                      <input
                        id="exam-code-input"
                        type="text"
                        placeholder="Enter a code or link"
                        className="w-full h-12 pl-11 pr-4 bg-[var(--background)]/80 dark:bg-zinc-900/60 border border-slate-300 dark:border-zinc-700 hover:border-indigo-400 dark:hover:border-indigo-500 focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-base font-medium text-[var(--foreground)] placeholder:text-gray-400 dark:placeholder:text-zinc-500 transition-all uppercase tracking-wider shadow-sm"
                        value={examCode}
                        onChange={(e) => {
                          setExamCode(e.target.value.toUpperCase());
                          setError("");
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!examCode.trim()}
                      className={`h-12 px-5 rounded-xl font-bold text-base transition-all flex items-center justify-center shrink-0 ${examCode.trim()
                        ? "text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 active:scale-95 cursor-pointer"
                        : "text-gray-400 dark:text-zinc-600 cursor-not-allowed"
                        }`}
                    >
                      Join
                    </button>

                    <AnimatePresence>
                      {error && (
                        <motion.p
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          className="absolute -bottom-6 left-0 text-xs font-semibold text-red-500"
                        >
                          {error}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </form>
                </div>
              </div>
            </motion.div>

            {/* Right SVG Illustration Column */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              className="lg:col-span-6 flex items-center justify-center lg:justify-end relative"
            >
              <div className="relative w-full max-w-[600px] lg:max-w-[720px] xl:max-w-[820px] lg:ml-auto lg:-mr-6 xl:-mr-12">
                {/* Ambient glow behind image */}
                <div className="absolute -inset-6 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-3xl blur-3xl opacity-75 pointer-events-none" />

                <Image
                  src="/Exams-bro.svg"
                  alt="Sri Lanka's Best Exam Hosting Platform"
                  width={750}
                  height={750}
                  priority
                  className="relative w-full h-auto object-contain drop-shadow-2xl"
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── 2. Video Showcase Section ── */}
        <section id="demo" className="relative w-full py-8 overflow-visible">
          <ScrollExpand
            src="/Teso Web.mp4"
            mediaType="video"
            title="Experience Teso Exams in Action"
            scrollHint="Scroll to expand demo"
            useWindowScroll
            startWidth={44}
            startHeight={56}
            startRadius={24}
            endRadius={0}
            mediaZoom={1.35}
            scrollDistance={1.6}
            holdDistance={0.6}
            smoothing={0.08}
            overlayScrim={0.55}
          >
            <div className="max-w-xl text-center space-y-4 px-6">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Walkthrough
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
                Every Paper, Every Student, Managed Seamlessly
              </h2>
              <p className="text-sm sm:text-base text-gray-200 drop-shadow">
                Effortless exam creation, real-time proctoring, and automated result generation tailored for Sri Lanka.
              </p>
            </div>
          </ScrollExpand>
        </section>

        {/* ── ScrollReveal Section ── */}
        <section className="relative px-6 lg:px-12 py-12 max-w-5xl mx-auto text-center">
          <ScrollReveal
            baseOpacity={0.1}
            enableBlur={true}
            baseRotation={4}
            blurStrength={8}
            containerClassName="my-6"
            textClassName="text-[var(--foreground)] font-bold tracking-tight text-center"
          >
            Empowering teachers, tuition institutes, and schools across Sri Lanka with effortless exam creation, instant result analytics, and uncompromised anti-cheat integrity.
          </ScrollReveal>
        </section>

        {/* ── 3. Features Section ── */}
        <section id="features" className="relative px-6 lg:px-12 py-20 bg-[var(--background-secondary)]/50 border-y border-[var(--border)]/60">
          <div className="max-w-6xl mx-auto">
            <div className="text-center space-y-3 mb-14">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Everything You Need</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--foreground)] tracking-tight">
                Designed for Sri Lankan Education
              </h2>
              <p className="text-base text-[var(--foreground-muted)] max-w-2xl mx-auto">
                Purpose-built tools to simplify examination workflows for individual tutors, tuition complexes, and schools.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: Zap,
                  color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
                  title: "Instant MCQ & Essay Builder",
                  description: "Create MCQ questions, structured papers, or uploads with rich formatting and diagram attachments in minutes.",
                },
                {
                  icon: Shield,
                  color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
                  title: "Smart Anti-Cheat Proctoring",
                  description: "Automatic tab-switching detection, copy-paste protection, and fullscreen enforcement to maintain strict integrity.",
                },
                {
                  icon: Globe,
                  color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
                  title: "Tri-Lingual Support",
                  description: "Supports Sinhala Unicode, Tamil, and English languages seamlessly for local A/L and O/L syllabuses.",
                },
                {
                  icon: BarChart3,
                  color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
                  title: "Real-Time Auto Grading",
                  description: "Instantaneous score calculation upon paper submission with comprehensive diagnostic analytics for teachers.",
                },
                {
                  icon: Smartphone,
                  color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
                  title: "Mobile Optimized Experience",
                  description: "Candidates can comfortably take exams from smartphones, tablets, or computers without installing any app.",
                },
                {
                  icon: Cpu,
                  color: "text-pink-500 bg-pink-500/10 border-pink-500/20",
                  title: "Low Bandwidth Autosave",
                  description: "Built for Sri Lankan network conditions. Answers are continually saved offline even if connectivity drops.",
                },
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className="p-6 rounded-2xl bg-[var(--background-card)] border border-[var(--border)] hover:border-indigo-500/40 transition-all hover:shadow-xl hover:shadow-indigo-500/5 group"
                >
                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-5 ${feature.color} group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--foreground)] mb-2 group-hover:text-indigo-500 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-[var(--foreground-muted)] leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. Pricing Section ── */}
        <section id="pricing" className="relative px-6 lg:px-12 py-20 max-w-6xl mx-auto w-full">
          <div className="text-center space-y-3 mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-500">Transparent Pricing</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--foreground)] tracking-tight">
              Flexible Plans for Every Educator
            </h2>
            <p className="text-base text-[var(--foreground-muted)] max-w-xl mx-auto">
              Start for free with basic exam hosting, or unlock advanced proctoring and unlimited candidates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {/* Free Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="p-8 rounded-2xl bg-[var(--background-card)] border border-[var(--border)] flex flex-col justify-between"
            >
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-subtle)]">Free Starter</span>
                <div className="mt-4 mb-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-[var(--foreground)]">LKR 0</span>
                  <span className="text-sm text-[var(--foreground-muted)]">/month</span>
                </div>
                <p className="text-xs text-[var(--foreground-muted)] mb-6">Perfect for trying out Teso Exams with small batches.</p>
                <div className="space-y-3 border-t border-[var(--border)]/60 pt-6 text-sm text-[var(--foreground-muted)]">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Up to 25 candidates per exam</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Instant MCQ auto-grading</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Standard anti-cheat logs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Sinhala & English support</span>
                  </div>
                </div>
              </div>
              <Link href="/auth/sign-up" className="mt-8">
                <Button className="w-full bg-[var(--background-secondary)] hover:bg-[var(--border)] text-[var(--foreground)] font-bold rounded-xl h-11 border border-[var(--border)]">
                  Get Started Free
                </Button>
              </Link>
            </motion.div>

            {/* Tutor Pro Plan (Highlighted) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="p-8 rounded-2xl bg-[var(--background-card)] border-2 border-indigo-500 shadow-xl shadow-indigo-500/15 relative flex flex-col justify-between"
            >
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full tracking-wider shadow-md">
                Most Popular for Tutors
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-500">Tutor Pro</span>
                <div className="mt-4 mb-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-[var(--foreground)]">LKR 4,900</span>
                  <span className="text-sm text-[var(--foreground-muted)]">/month</span>
                </div>
                <p className="text-xs text-[var(--foreground-muted)] mb-6">Designed for tuition classes and subject teachers.</p>
                <div className="space-y-3 border-t border-[var(--border)]/60 pt-6 text-sm text-[var(--foreground-muted)]">
                  <div className="flex items-center gap-2 font-semibold text-[var(--foreground)]">
                    <Check className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>Up to 300 candidates per exam</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>Advanced Smart Anti-Cheat</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>Export CSV & PDF Reports</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>Custom Branding & Logos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>Priority WhatsApp Support</span>
                  </div>
                </div>
              </div>
              <Link href="/auth/sign-up" className="mt-8">
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-11 shadow-lg shadow-indigo-500/25">
                  Start Pro Trial
                </Button>
              </Link>
            </motion.div>

            {/* Institution Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="p-8 rounded-2xl bg-[var(--background-card)] border border-[var(--border)] flex flex-col justify-between"
            >
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-500">Institution</span>
                <div className="mt-4 mb-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-[var(--foreground)]">LKR 14,900</span>
                  <span className="text-sm text-[var(--foreground-muted)]">/month</span>
                </div>
                <p className="text-xs text-[var(--foreground-muted)] mb-6">For large schools, institutes, and tuition complexes.</p>
                <div className="space-y-3 border-t border-[var(--border)]/60 pt-6 text-sm text-[var(--foreground-muted)]">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>Unlimited Candidates & Exams</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>Multi-Teacher Admin Accounts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>Dedicated Domain Integration</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>24/7 SLA & Phone Support</span>
                  </div>
                </div>
              </div>
              <Link href="/auth/sign-up" className="mt-8">
                <Button className="w-full bg-[var(--background-secondary)] hover:bg-[var(--border)] text-[var(--foreground)] font-bold rounded-xl h-11 border border-[var(--border)]">
                  Contact Sales
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* ── 5. Reviews / Testimonials Section ── */}
        <section id="reviews" className="relative px-6 lg:px-12 py-20 bg-[var(--background-secondary)]/50 border-t border-[var(--border)]/60">
          <div className="max-w-6xl mx-auto">
            <div className="text-center space-y-3 mb-14">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">Loved by Educators</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--foreground)] tracking-tight">
                Trusted Across Sri Lanka
              </h2>
              <p className="text-base text-[var(--foreground-muted)] max-w-xl mx-auto">
                Here is how Teso Exams is helping tutors and students streamline their digital assessment workflow.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  quote:
                    "Checking 300 MCQ papers used to take me two full days after every monthly test. With Teso Exams, results and rankings are generated immediately upon submission!",
                  author: "Mr. Ruwan Perera",
                  role: "A/L Chemistry Tutor (Nugegoda)",
                  stars: 5,
                },
                {
                  quote:
                    "The tab-monitoring anti-cheat features give me full confidence when conducting online term tests. Students love how clean and easy it is to use on their phones.",
                  author: "Dr. Sanduni de Silva",
                  role: "Senior Lecturer & Tutor (Kandy)",
                  stars: 5,
                },
                {
                  quote:
                    "The exam interface is super fast even on my 3G mobile connection. Being able to review explanations right after finishing has boosted my exam confidence.",
                  author: "Kusal Mendis",
                  role: "A/L Science Candidate (Colombo)",
                  stars: 5,
                },
              ].map((review, i) => (
                <motion.div
                  key={review.author}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="p-6 rounded-2xl bg-[var(--background-card)] border border-[var(--border)] shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(review.stars)].map((_, index) => (
                        <Star key={index} className="w-4 h-4 fill-amber-400" />
                      ))}
                    </div>
                    <p className="text-sm text-[var(--foreground)] italic leading-relaxed">
                      &quot;{review.quote}&quot;
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-[var(--border)]/60 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-bold text-xs flex items-center justify-center shadow-md">
                      {review.author[0]}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[var(--foreground)]">{review.author}</div>
                      <div className="text-[11px] text-[var(--foreground-muted)]">{review.role}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 6. FAQ Section ── */}
        <section className="relative px-6 lg:px-12 py-20 max-w-4xl mx-auto w-full">
          <div className="text-center space-y-3 mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-500">FAQ</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--foreground)] tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "How do candidates join an exam?",
                a: "Candidates simply visit the Teso Exams homepage, enter the 4-character exam code provided by their teacher, and enter their name. No complicated account creation needed!",
              },
              {
                q: "Does Teso Exams support Sinhala and Tamil languages?",
                a: "Yes! Full Unicode Sinhala, Tamil, and English text formats are supported, along with mathematical formulas, diagrams, and image uploads.",
              },
              {
                q: "What anti-cheat measures are available?",
                a: "Teso Exams monitors tab switching, prevents copying and pasting questions, enforces fullscreen mode, and logs all candidate activity during the session.",
              },
              {
                q: "Can I export student scores to Excel or PDF?",
                a: "Absolutely. Hosts can view real-time score leaderboards and export full detailed analytics reports in CSV/Excel format with a single click.",
              },
            ].map((faq, index) => (
              <div
                key={faq.q}
                className="rounded-xl border border-[var(--border)] bg-[var(--background-card)] overflow-hidden transition-all"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left font-bold text-sm text-[var(--foreground)] hover:text-indigo-500 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronRight
                    className={`w-4 h-4 transition-transform duration-200 ${activeFaq === index ? "rotate-90 text-indigo-500" : "text-[var(--foreground-subtle)]"
                      }`}
                  />
                </button>
                {activeFaq === index && (
                  <div className="px-6 pb-4 text-xs text-[var(--foreground-muted)] leading-relaxed border-t border-[var(--border)]/40 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-[var(--border)]/60 bg-[var(--background-secondary)]/80 px-6 lg:px-16 py-12 text-sm text-[var(--foreground-muted)]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-10 mb-12">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/10 border border-indigo-500/20">
                <Image src="/teso-logo.png" alt="Teso" width={32} height={32} />
              </div>
              <span className="text-[var(--foreground)] font-extrabold text-lg tracking-tight">
                Teso <span className="text-indigo-500">Exams</span>
              </span>
            </Link>
            <p className="text-xs text-[var(--foreground-muted)] leading-relaxed max-w-sm">
              Sri Lanka&apos;s premier digital examination hosting platform. Simplifying exam creation, proctoring, and auto-grading for modern educators.
            </p>
          </div>

          {/* Links Col 1 */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">Product</div>
            <ul className="space-y-2 text-xs">
              <li><a href="#features" className="hover:text-indigo-500 transition-colors">Features</a></li>
              <li><a href="#demo" className="hover:text-indigo-500 transition-colors">Video Demo</a></li>
              <li><a href="#pricing" className="hover:text-indigo-500 transition-colors">Pricing Plans</a></li>
              <li><Link href="/host" className="hover:text-indigo-500 transition-colors">Create Exam</Link></li>
            </ul>
          </div>

          {/* Links Col 2 */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">Platform</div>
            <ul className="space-y-2 text-xs">
              <li><Link href={studyPlatformUrl} className="hover:text-indigo-500 transition-colors">Study Platform</Link></li>
              <li><Link href="/auth/sign-in" className="hover:text-indigo-500 transition-colors">Teacher Sign In</Link></li>
              <li><Link href="/auth/sign-up" className="hover:text-indigo-500 transition-colors">Register Account</Link></li>
            </ul>
          </div>

          {/* Links Col 3 */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">Legal</div>
            <ul className="space-y-2 text-xs">
              <li><Link href="/privacy" className="hover:text-indigo-500 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-indigo-500 transition-colors">Terms of Service</Link></li>
              <li><a href="mailto:support@teso.lk" className="hover:text-indigo-500 transition-colors">Contact Support</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-6 border-t border-[var(--border)]/60 flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--foreground-subtle)] gap-4">
          <span>© {new Date().getFullYear()} Teso Exams Platform. All rights reserved. Made in Sri Lanka.</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              All Systems Operational
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
