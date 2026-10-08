"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const timelineData = [
  {
    week: "Week 1",
    day: "21",
    month: "June",
    title: "Introduction to cybersecurity and online safety",
  },
  {
    week: "Week 2",
    day: "28",
    month: "June",
    title: "Interactive learning with real-world scenarios",
  },
  {
    week: "Week 3",
    day: "5",
    month: "July",
    title: "Technical walk-throughs and challenge breakdowns",
  },
  {
    week: "Week 4",
    day: "12",
    month: "July",
    title: "Mentorship and platform guidance by HashX",
  },
  {
    week: "Final Week",
    day: "19",
    month: "July",
    title: "Team-based cybersecurity challenge hosted via HashX",
  },
];

const Timeline = () => {
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const ctx = gsap.context(() => {
    cardsRef.current.forEach((card, index) => {
      if (!card) return;

      const horizontalLine = card.querySelector('.timeline-line-horizontal');
      const verticalLine = card.querySelector('.timeline-line-vertical');
      const dot = card.querySelector('.timeline-dot');

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: card,
          start: 'top 80%',
          end: 'bottom center',
          scrub: 1,
        },
      });

      // 1. Reveal Card
      tl.fromTo(
        card,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1, ease: 'power2.out' }
      );

      // 2. Animate Horizontal Line
      if (horizontalLine) {
        const isLeft = index % 2 === 0;
        tl.fromTo(
          horizontalLine,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 1,
            ease: 'power2.out',
            transformOrigin: isLeft ? "left center" : "right center",
          },
          "-=0.5"
        );
      }

      // 3. Reveal Dot
      if (dot) {
          tl.fromTo(
              dot,
              { scale: 0, opacity: 0 },
              { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.7)" },
              "-=0.2"
          );
      }

      // 4. Animate Vertical Line (Downwards)
      if (verticalLine) {
        tl.fromTo(
          verticalLine,
          { scaleY: 0 },
          {
            scaleY: 1,
            duration: 1,
            ease: 'power2.out',
            transformOrigin: 'top center',
          },
          "-=0.2"
        );
      }
    });

    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="relative w-full py-20 px-4 md:px-0 text-white z-10 overflow-visible">
      
      {/* Background Particles - Only Render on Client */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {mounted && [...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-blue-500/10 blur-[1px] animate-pulse"
            style={{
              width: `${Math.random() * 4 + 2}px`,
              height: `${Math.random() * 4 + 2}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 5 + 3}s`,
              opacity: Math.random() * 0.5 + 0.2,
            }}
          />
        ))}
      </div>

      <div className="max-w-6xl mx-auto flex flex-col gap-32">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-10 text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">
          Course Timeline
        </h2>

        {timelineData.map((item, index) => {
          const isLeft = index % 2 === 0;
          const isLast = index === timelineData.length - 1;

          return (
            <div
              key={index}
              ref={(el) => { cardsRef.current[index] = el; }}
              className={`relative flex w-full md:items-center ${isLeft ? 'md:justify-start' : 'md:justify-end'} justify-center`}
            >
              <div className="w-full md:w-[45%] relative group">
                
                {/* Connecting Lines & Dot (Desktop Only) */}
                {!isLast && (
                  <div className="hidden md:block absolute top-[50%] -translate-y-[50%] w-full h-full pointer-events-none">
                     {/* Horizontal Line connecting to center */}
                     <div
                      className={`timeline-line-horizontal absolute top-[50%] h-[2px] bg-blue-500/50
                        ${isLeft ? 'left-[100%]' : 'right-[100%]'} 
                        w-[24%] 
                      `}
                    />
                    
                    {/* Vertical Line Drop */}
                    <div
                      className={`timeline-line-vertical absolute top-[50%] w-[2px] bg-blue-500/50
                        ${isLeft ? '-right-[24%]' : '-left-[24%]'} 
                        h-[calc(100%+8rem)] 
                      `}
                    />
                    
                    {/* Corner Dot */}
                    <div 
                        className={`timeline-dot absolute top-[50%] w-3 h-3 rounded-full bg-blue-500 border border-blue-300 shadow-[0_0_10px_#3b82f6] z-10
                            ${isLeft ? '-right-[24%]' : '-left-[24%]'}
                             -translate-y-1/2 translate-x-[50%]
                             ${!isLeft && '-translate-x-[50%]'}
                        `}
                    />
                  </div>
                )}


                {/* Card Content */}
                <div className="relative bg-[#0b1420] border border-[#1e293b] p-6 rounded-2xl shadow-xl hover:border-blue-500/50 transition-all duration-300 z-20 group">
                    <div className={`absolute -top-5 ${isLeft ? '-right-5' : '-left-5'} bg-blue-600 rounded-xl p-3 shadow-lg flex flex-col items-center justify-center min-w-[70px] z-30 group-hover:scale-110 transition-transform duration-300`}>
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">{item.month}</span>
                        <span className="text-xl font-bold">{item.day}</span>
                    </div>

                    <div className="flex flex-col gap-2">
                         <span className="text-blue-400 font-medium text-xs tracking-[0.2em] uppercase">
                            {item.week}
                        </span>
                        <h3 className="text-lg md:text-xl font-semibold text-slate-100 leading-snug group-hover:text-blue-200 transition-colors">
                            {item.title}
                        </h3>
                    </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default Timeline;
