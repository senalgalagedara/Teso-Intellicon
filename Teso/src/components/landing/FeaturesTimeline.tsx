"use client";

import React from "react";
import { ListTodo, CalendarRange, BookOpenCheck, LineChart, Trophy } from "lucide-react";

export default function FeaturesTimeline() {
  const steps = [
    {
      step: "01",
      icon: <ListTodo className="w-6 h-6 text-[#38bdf8]" />,
      title: "Set Goals & Import Syllabus",
      subtitle: "Targeted Alignment",
      description: "Select your stream (Physical Science, Bio, Commerce, Arts, or O/Levels). Input your exam date and your target grades to set up your personal learning workspace."
    },
    {
      step: "02",
      icon: <CalendarRange className="w-6 h-6 text-emerald-400" />,
      title: "Generate Your Dynamic Timetable",
      subtitle: "Adaptive Scheduling",
      description: "Our scheduler automatically breaks down your entire syllabus into daily digestible tasks. Missed a day? The calendar adjusts dynamically without stress."
    },
    {
      step: "03",
      icon: <BookOpenCheck className="w-6 h-6 text-indigo-400" />,
      title: "Simulate Real Past Papers",
      subtitle: "Active Learning",
      description: "Solve years of actual papers in an interactive environment with countdown timers. Get immediate, item-by-item answer evaluation and review solutions."
    },
    {
      step: "04",
      icon: <LineChart className="w-6 h-6 text-[#5cf1ff]" />,
      title: "Analyze AI Performance Reports",
      subtitle: "Data-Driven Focus",
      description: "Our reports highlight exactly which sub-topics you got wrong, tracking your speed and accuracy over time to convert weaknesses into strengths."
    },
    {
      step: "05",
      icon: <Trophy className="w-6 h-6 text-amber-400" />,
      title: "Dominate the Stream Leaderboard",
      subtitle: "Gamified Motivation",
      description: "Stay consistent with daily study streaks, unlock achievements, and compare scores with peers in Sri Lanka to keep your motivation high."
    }
  ];

  return (
    <section className="w-full py-24 relative overflow-visible text-left">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
          <span className="text-blue-400 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30">
            How It Works
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Your Path to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-[#38bdf8]">Exam Mastery</span>
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            From initial goals to exam day confidence, TESO guides you through every step of your preparation.
          </p>
        </div>

        {/* Timeline Container */}
        <div className="relative border-l border-slate-800/80 md:border-l-0 md:flex md:flex-col md:items-center space-y-16 md:space-y-0">
          
          {/* Vertical connecting line for desktop */}
          <div className="hidden md:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-gradient-to-b from-blue-500/40 via-cyan-500/40 to-purple-500/10" />

          {steps.map((step, index) => {
            const isEven = index % 2 === 0;

            return (
              <div 
                key={index}
                className={`relative w-full md:grid md:grid-cols-2 md:gap-16 items-center md:pb-16 last:pb-0`}
              >
                {/* Timeline Dot (Desktop only, positioned in the center line) */}
                <div className="hidden md:flex absolute top-6 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-slate-900 border-2 border-slate-800 items-center justify-center z-20 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                  <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" />
                </div>

                {/* Left Side Content (Even indices on left, odd indices blank on desktop) */}
                <div className={`pl-8 md:pl-0 ${isEven ? "md:text-right md:pr-4" : "md:col-start-2 md:pl-4"}`}>
                  
                  {/* Mobile Timeline Dot */}
                  <div className="md:hidden absolute top-1.5 left-[-1.3rem] w-10 h-10 rounded-full bg-slate-900 border-2 border-slate-800 flex items-center justify-center z-20">
                    <div className="w-3 h-3 rounded-full bg-blue-400" />
                  </div>

                  <div className={`inline-block w-full max-w-xl group relative p-8 rounded-3xl border border-slate-800/80 bg-[#0b1420]/30 backdrop-blur-xl hover:border-blue-500/30 hover:bg-[#0b1420]/50 transition-all duration-300`}>
                    
                    {/* Floating Step Number */}
                    <div className={`absolute top-6 ${isEven ? "right-6" : "right-6 md:left-6 md:right-auto"} text-5xl font-black text-slate-800/50 group-hover:text-blue-500/10 transition-colors pointer-events-none select-none`}>
                      {step.step}
                    </div>

                    <div className={`flex flex-col gap-4 ${isEven ? "md:items-end md:text-right" : "md:items-start md:text-left"}`}>
                      {/* Icon */}
                      <div className="w-12 h-12 bg-slate-900/80 border border-slate-800/80 rounded-xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300">
                        {step.icon}
                      </div>

                      <div>
                        <span className="text-blue-400 font-bold text-xs uppercase tracking-widest">
                          {step.subtitle}
                        </span>
                        <h3 className="text-xl font-extrabold mt-1 text-slate-100 group-hover:text-white transition-colors">
                          {step.title}
                        </h3>
                      </div>

                      <p className="text-slate-400 text-sm leading-relaxed max-w-md">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Empty spacer block to make grid balance (desktop only) */}
                <div className="hidden md:block" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
