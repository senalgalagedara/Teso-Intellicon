"use client";

import { useEffect, useRef } from 'react';

interface LottiePlayerProps {
  animationPath: string;
  className?: string;
}

export function LottiePlayer({ animationPath, className }: LottiePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let isCancelled = false;

    // Dynamically import lottie-web to ensure it is only loaded on the client side
    import('lottie-web')
      .then((lottieModule) => {
        if (isCancelled || !containerRef.current) return;

        // Clear container to prevent duplicate animation nodes in React Strict Mode
        containerRef.current.innerHTML = '';

        const lottie = lottieModule.default || lottieModule;

        animRef.current = lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          path: animationPath,
        });
      })
      .catch((err) => {
        console.error("Failed to load lottie-web library", err);
      });

    return () => {
      isCancelled = true;
      if (animRef.current) {
        animRef.current.destroy();
        animRef.current = null;
      }
    };
  }, [animationPath]);

  return (
    <div 
      ref={containerRef} 
      className={className} 
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
    />
  );
}
