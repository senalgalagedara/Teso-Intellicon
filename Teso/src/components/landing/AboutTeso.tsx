"use client";

import React from "react";
import { Brain, Target, Calendar, BarChart3, GraduationCap, CheckCircle2 } from "lucide-react";

export default function AboutTeso() {
  const pillars = [
    {
      icon: <Brain className="w-8 h-8 text-[#38bdf8]" />,
      title: "Active Spaced Repetition",
      description: "Our platform tracks your answers and automatically schedules revisions for questions and topics you struggled with, securing long-term memory retention."
    },
    {
      icon: <Target className="w-8 h-8 text-emerald-400" />,
      title: "Targeted Syllabus Mapping",
      description: "Never get lost in notes. Visualize the entire curriculum in an interactive progress tree. Know exactly what percentage of the syllabus you've mastered."
    },
    {
      icon: <Calendar className="w-8 h-8 text-purple-400" />,
      title: "Adaptive Study Timetable",
      description: "Our AI generates a custom timetable for your exams. If you miss a study session, the scheduler dynamically adjusts to keep you on course."
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-[#5cf1ff]" />,
      title: "Granular Performance Analytics",
      description: "Receive deep insights after every simulated past paper. View time spent per question, accuracy metrics, and exact focus recommendations."
    }
  ];

  return (
    <section className="w-full py-24 relative overflow-visible text-left">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 blur-[150px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="grid lg:grid-cols-12 gap-12 items-center mb-16">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-semibold tracking-wider text-blue-400 uppercase">
              <GraduationCap className="w-4 h-4" />
              SaaS Exam Hub
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              A Smarter Way to Master Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5cf1ff] via-[#4fd1ff] to-[#38bdf8]">National Exams</span>
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed">
              Preparing for critical exams like A/Levels and O/Levels shouldn't feel like navigating in the dark. 
              TESO converts standard textbooks and daunting past papers into an engaging, data-driven journey, 
              giving you the precision tools of a top-tier scholar.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 pt-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <span className="text-sm font-semibold text-slate-300">100% Curriculum Covered</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <span className="text-sm font-semibold text-slate-300">Instant Performance Scoring</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <span className="text-sm font-semibold text-slate-300">Spaced-Repetition Cards</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <span className="text-sm font-semibold text-slate-300">Gamified Study Streaks</span>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-5 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/15 to-cyan-500/15 rounded-3xl blur-2xl opacity-60" />
            <div className="relative bg-[#0b1420]/80 border border-slate-800 p-8 rounded-3xl backdrop-blur-xl shadow-2xl flex flex-col justify-between h-full min-h-[300px]">
              <div>
                <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Platform Activity</span>
                <h3 className="text-3xl font-bold mt-2 text-white">Metrics that matter.</h3>
                <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                  Join thousands of high achievers who rely on TESO every day to organize, study, and measure their progress.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-6 mt-8 pt-6 border-t border-slate-800/80">
                <div>
                  <p className="text-4xl font-extrabold text-[#38bdf8] tracking-tight">10k+</p>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">Students Registered</p>
                </div>
                <div>
                  <p className="text-4xl font-extrabold text-[#5cf1ff] tracking-tight">1.5M+</p>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">Questions Solved</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {pillars.map((pillar, i) => (
            <div
              key={i}
              className="group relative p-8 rounded-3xl border border-slate-800/80 bg-[#0b1420]/30 backdrop-blur-xl hover:border-blue-500/40 hover:bg-[#0b1420]/50 transition-all duration-300"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-2xl group-hover:bg-blue-600/10 transition-colors pointer-events-none" />
              <div className="w-14 h-14 bg-slate-900/80 border border-slate-800/80 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300">
                {pillar.icon}
              </div>
              <h3 className="text-xl font-bold mt-6 mb-3 text-slate-100 group-hover:text-white transition-colors">
                {pillar.title}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
