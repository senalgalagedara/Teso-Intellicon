import { Metadata } from 'next';
import BlogClient from './BlogClient';

export const metadata: Metadata = {
  title: 'Blog - Study Tips & Educational Insights',
  description: 'Read the latest stories, study tips, and educational insights from TESO. Stay updated with resources to help you excel in your G.C.E. Advanced Level journey.',
  keywords: [
    'TESO Education Blog', 
    'Study Tips', 
    'A/L Exam Tips', 
    'Education Sri Lanka', 
    'Advanced Level Guide',
    'Student Resources'
  ],
  authors: [{ name: 'TESO Education' }],
  creator: 'TESO Education',
  publisher: 'TESO Education',
  applicationName: 'TESO Education',
  alternates: {
    canonical: 'https://teso.lk/blog',
  },
  openGraph: {
    title: 'Blog | TESO Education - Study Tips & Educational Insights',
    description: 'Stories, tips, and insights to help you excel in your educational journey.',
    url: 'https://teso.lk/blog',
    siteName: 'TESO Education',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: 'https://teso.lk/og-blog.png', // Ideally you should have a default OG image
        width: 1200,
        height: 630,
        alt: 'TESO Education Blog',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog | TESO Education',
    description: 'Stories, tips, and insights to help you excel in your educational journey.',
    images: ['https://teso.lk/og-blog.png'],
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

export default function BlogPage() {
  return <BlogClient />;
}
