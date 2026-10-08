"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Navbar } from "@/components/shared/Navbar";
import { ShareButton } from "@/components/blog/ShareButton";
import { ArrowLeft, Calendar, TrendingUp, Sun, Moon, Eye } from 'lucide-react';
import { blogPosts } from '@/lib/blog-data';

export default function BlogClient() {
  const [sortBy, setSortBy] = useState<'latest' | 'popularity'>('latest');

  const sortedPosts = [...blogPosts].sort((a, b) => {
    if (sortBy === 'latest') {
      return b.dateValue.getTime() - a.dateValue.getTime();
    } else {
      return b.popularity - a.popularity;
    }
  });

  return (
    <div className="dark min-h-screen bg-[#071027] text-white">
      <Navbar />
      
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[20%] w-[400px] h-[400px] bg-cyan-500/5 blur-[100px] rounded-full mix-blend-screen" />
      </div>

      <div className="relative z-10 pt-24 pb-20">
        {/* Header */}
        <section className="px-6 py-16 text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
              <span className="block text-white">Read.</span>
              <span className="block text-slate-400">Learn.</span>
              <span className="block bg-gradient-to-r from-blue-400 via-green-400 to-cyan-400 bg-clip-text text-transparent">
                Grow.
              </span>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Stories, tips, and insights to help you excel in your educational journey.
            </p>
        </section>

        {/* Filter Section */}
        <section className="px-6 pb-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-6 pb-6 border-b border-slate-800">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                All Articles
              </h2>
              
              <div className="flex items-center gap-3">
                <div className="bg-slate-900/50 p-1 rounded-lg border border-slate-800 flex gap-1">
                  <button
                    onClick={() => setSortBy('latest')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                      sortBy === 'latest'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    Latest
                  </button>
                  <button
                    onClick={() => setSortBy('popularity')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                      sortBy === 'popularity'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    Popular
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Blog Grid */}
        <section className="px-6 pb-24">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {sortedPosts.map((post) => (
                <div
                  key={post.id}
                  className="group relative block bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden hover:border-blue-500/40 hover:bg-slate-900/60 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1"
                >
                  <Link
                    href={`/blog/${post.slug}`}
                    className="absolute inset-0 z-10"
                  >
                    <span className="sr-only">View {post.title}</span>
                  </Link>
                  
                <div className="aspect-[16/10] overflow-hidden relative bg-slate-800 pointer-events-none">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-full text-xs font-medium text-blue-400 shadow-lg">
                            {post.category}
                        </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 flex flex-col h-[280px] pointer-events-none">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-3 font-medium">
                        <span className="text-slate-400">{post.date}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                        <span>{post.readTime}</span>
                    </div>
                    
                    <h3 className="text-xl font-bold mb-3 text-slate-100 group-hover:text-blue-400 transition-colors line-clamp-2 leading-tight">
                      {post.title}
                    </h3>
                    
                    <p className="text-sm text-slate-400 line-clamp-3 leading-relaxed mb-6 flex-1">
                      {post.excerpt}
                    </p>

                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-800/50 relative z-20 pointer-events-auto">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-300">{post.author}</span>
                      </div>
                        <ShareButton url={`/blog/${post.slug}`} title={post.title} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Simple Footer */}
        <div className="max-w-7xl mx-auto px-6 pt-10 border-t border-slate-800/50 flex justify-between items-center text-xs text-slate-500">
           <span>© 2026 TESO Education.</span>
           <Link href="/" className="hover:text-white transition-colors">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}