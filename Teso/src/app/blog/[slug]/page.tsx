import { blogPosts } from '@/lib/blog-data';
import { notFound } from 'next/navigation';
import { Navbar } from "@/components/shared/Navbar";
import { ShareButton } from "@/components/blog/ShareButton";
import Link from 'next/link';
import { ArrowLeft, Clock, User, Calendar } from 'lucide-react';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = decodeURIComponent(resolvedParams.slug);
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    return {
      title: 'Post Not Found | TESO Education',
      description: 'The requested blog post could not be found.',
    };
  }

  return {
    title: post.title,
    description: post.excerpt,
    keywords: [
      post.category,
      'Education',
      'Sri Lanka',
      'Advanced Level',
      'Ordinary Level',
      'Study Tips',
      'Exam Preparation',
      post.title
    ],
    authors: [{ name: post.author }],
    creator: post.author,
    publisher: 'TESO Education',
    applicationName: 'TESO Education',
    alternates: {
      canonical: `https://teso.lk/blog/${post.slug}`,
    },
    openGraph: {
      title: `${post.title} | TESO Education`,
      description: post.excerpt,
      url: `https://teso.lk/blog/${post.slug}`,
      siteName: 'TESO Education',
      locale: 'en_US',
      type: 'article',
      publishedTime: post.dateValue ? post.dateValue.toISOString() : undefined,
      authors: [post.author],
      section: post.category,
      tags: [post.category, 'Education', 'Sri Lanka'],
      images: [
        {
          url: post.image,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${post.title} | TESO Education`,
      description: post.excerpt,
      images: [post.image],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  // Await params to support Next.js 15+ (safe in older versions too as awaiting non-promise returns value)
  const resolvedParams = await params;
  const slug = decodeURIComponent(resolvedParams.slug);
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="dark min-h-screen bg-[#071027] text-white">
      <Navbar />
      
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[20%] w-[400px] h-[400px] bg-cyan-500/5 blur-[100px] rounded-full mix-blend-screen" />
      </div>

      <div className="relative z-10 pt-24 pb-20">
        <article className="max-w-4xl mx-auto px-6">
          <Link 
            href="/blog" 
            className="inline-flex items-center text-slate-400 hover:text-white mb-8 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Articles
          </Link>

          {/* Header */}
          <div className="mb-10 text-center">
            <div className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-medium mb-6">
              {post.category}
            </div>
            
            <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight text-white">
              {post.title}
            </h1>
            
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400 border-y border-slate-800 py-6">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" />
                <span>{post.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>{post.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>{post.readTime}</span>
              </div>
              <div className="flex items-center gap-2 border-l border-slate-800 pl-6">
                <ShareButton url={`/blog/${post.slug}`} title={post.title} />
              </div>
            </div>
          </div>

          {/* Featured Image */}
          <div className="aspect-video w-full relative rounded-2xl overflow-hidden mb-12 border border-slate-800 shadow-2xl">
            <img 
              src={post.image} 
              alt={post.title} 
              className="w-full h-full object-cover"
            />
          </div>

          {/* Content */}
          <div 
            className="prose prose-invert prose-lg max-w-none text-slate-300 prose-headings:text-white prose-a:text-blue-400 hover:prose-a:text-blue-300 prose-strong:text-white prose-li:marker:text-blue-500"
            dangerouslySetInnerHTML={{ __html: post.content || '' }}
          />
        </article>
      </div>

       {/* Footer */}
       <div className="max-w-7xl mx-auto px-6 pt-10 border-t border-slate-800/50 flex justify-between items-center text-xs text-slate-500">
           <span>© 2026 TESO Education.</span>
           <div className="flex gap-4">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
           </div>
        </div>
    </div>
  );
}
