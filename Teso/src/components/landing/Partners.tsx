"use client";

import React from "react";
import { School, ShieldCheck, Cpu, Library, Award } from "lucide-react";

export default function Partners() {
  const partners = [
    {
      name: "Royal College",
      type: "Top School Adoption",
      logo: <School className="w-8 h-8 text-[#38bdf8]" />,
      description: "Students from Royal College utilize our exam portal for physics and chemistry MCQ practice."
    },
    {
      name: "Visakha Vidyalaya",
      type: "Top School Adoption",
      logo: <Library className="w-8 h-8 text-emerald-400" />,
      description: "Ranked students from Visakha utilize TESO biology mock practice and spaced-repetition schedules."
    },
    {
      name: "HashX Academy",
      type: "Strategic Sponsor",
      logo: <ShieldCheck className="w-8 h-8 text-indigo-400" />,
      description: "Collaborates on hosting cybersecurity and STEM challenges to encourage digital skill development."
    },
    {
      name: "Ananda College",
      type: "Top School Adoption",
      logo: <Cpu className="w-8 h-8 text-cyan-400" />,
      description: "Supports teachers in recommending our smart timetable tools to organize subject revisions."
    },
    {
      name: "TESO Education Trust",
      type: "Sponsor & Quality Board",
      logo: <Award className="w-8 h-8 text-amber-400" />,
      description: "Ensures syllabus mapping and simulated answers strictly follow national curriculum criteria."
    }
  ];

  return (
    <section className="w-full py-24 relative overflow-visible text-left">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        
        {/* Header */}
        <div className="grid md:grid-cols-12 gap-8 items-center mb-16">
          <div className="md:col-span-6 space-y-4">
            <span className="text-blue-400 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30">
              Trusted Ecosystem
            </span>
            <h2 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
              Backed by Top <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-[#38bdf8]">Colleges & Academies</span>
            </h2>
          </div>
          <div className="md:col-span-6">
            <p className="text-slate-400 text-sm leading-relaxed">
              We collaborate with high school educators, digital learning mentors like HashX, and national curators to deliver top-tier, accurate, and syllabus-compliant study tools for Sri Lankan students.
            </p>
          </div>
        </div>

        {/* Partners Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {partners.map((partner, i) => (
            <div
              key={i}
              className="group relative p-6 rounded-3xl border border-slate-800/80 bg-[#0b1420]/30 backdrop-blur-xl hover:border-blue-500/30 hover:bg-[#0b1420]/50 transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 bg-slate-900/80 border border-slate-800/80 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  {partner.logo}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                    {partner.type}
                  </span>
                  <h3 className="text-base font-bold text-slate-200 mt-1 group-hover:text-white transition-colors">
                    {partner.name}
                  </h3>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  {partner.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
