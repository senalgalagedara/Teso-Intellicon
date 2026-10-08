"use client";

import React from "react";
import { Star, Quote } from "lucide-react";

export default function Reviews() {
  const testimonials = [
    {
      name: "Thilan Wijesinghe",
      role: "Physical Science Student",
      achievement: "From S to A in Combined Mathematics",
      comment: "TESO completely changed how I practiced Combined Math past papers. The interactive timers forced me to improve my speed, and the analytics showed exactly which topics (like Integration) needed more revision. Highly recommended!",
      rating: 5,
      avatarInitials: "TW"
    },
    {
      name: "Aparna Fernando",
      role: "Biology Student",
      achievement: "District Rank #12",
      comment: "I used the spaced repetition flashcard tools on TESO to memorize chemistry reactions and biology definitions. Knowing my exact progress percentage on each unit kept me super focused instead of guessing what to read next.",
      rating: 5,
      avatarInitials: "AF"
    },
    {
      name: "Mr. Kanishka Perera",
      role: "A/L Physics Educator",
      achievement: "Over 150+ students on the platform",
      comment: "As a teacher, I love how TESO helps students structure their daily study. The AI-generated study plan keeps them accountable, and the leaderboard introduces a fun competitive spirit that keeps them solving papers regularly.",
      rating: 5,
      avatarInitials: "KP"
    },
    {
      name: "Sachithra Silva",
      role: "Commerce Stream Student",
      achievement: "3 A's in 2025 A/L",
      comment: "TESO's dynamic timetable was a lifesaver. I was balancing tuition classes and school, and the scheduler helped me fit in past papers without feeling overwhelmed. The answer guides are extremely clear.",
      rating: 5,
      avatarInitials: "SS"
    },
    {
      name: "Nimmi Jayasekara",
      role: "Arts Stream Student",
      achievement: "Island Rank #45",
      comment: "The exam simulator on TESO is top-notch. It completely replicates the pressure of the real exam hall. I went from failing my school term tests to getting a high distinction in my final exams!",
      rating: 5,
      avatarInitials: "NJ"
    },
    {
      name: "Dhanushka Bandara",
      role: "O/L Student",
      achievement: "9 A's in O/L",
      comment: "The science and math practice modules on TESO made practicing fun rather than boring. The gamified streaks kept me coming back every single day to solve at least 15 questions.",
      rating: 5,
      avatarInitials: "DB"
    }
  ];

  return (
    <section className="w-full py-24 relative overflow-visible text-left">
      {/* Background Glow */}
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-600/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-4 md:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
          <span className="text-blue-400 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30">
            Success Stories
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Loved by <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-[#38bdf8]">Thousands of Students</span>
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            See how students across Sri Lanka turned their exam anxiety into peak performance.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="group relative p-8 rounded-3xl border border-slate-800/80 bg-[#0b1420]/30 backdrop-blur-xl hover:border-blue-500/30 hover:bg-[#0b1420]/50 transition-all duration-300 flex flex-col justify-between"
            >
              <div className="absolute top-6 right-6 text-slate-800 pointer-events-none group-hover:text-blue-500/20 transition-colors">
                <Quote className="w-8 h-8 rotate-180" />
              </div>
              
              <div className="space-y-4">
                {/* Rating Stars */}
                <div className="flex gap-1">
                  {[...Array(t.rating)].map((_, starIndex) => (
                    <Star key={starIndex} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                <p className="text-slate-300 text-sm leading-relaxed italic">
                  "{t.comment}"
                </p>
              </div>

              {/* Author profile */}
              <div className="flex items-center gap-4 mt-8 pt-6 border-t border-slate-800/50">
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm tracking-wide shadow-md">
                  {t.avatarInitials}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100 group-hover:text-white transition-colors">
                    {t.name}
                  </h4>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-[#38bdf8] font-bold uppercase tracking-wider">
                      {t.achievement}
                    </span>
                    <span className="text-[11px] text-slate-500 font-semibold">
                      {t.role}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
