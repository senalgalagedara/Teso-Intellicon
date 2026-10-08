"use client";
import React from 'react';
import { motion, Variants } from 'framer-motion';

interface BlurTextProps {
  text: string;
  delay?: number;
  className?: string;
  animateBy?: 'words' | 'letters';
  direction?: 'top' | 'bottom';
  onAnimationComplete?: () => void;
}

const BlurText = ({
  text,
  delay = 200,
  animateBy = 'words',
  direction = 'top',
  onAnimationComplete,
  className = '',
}: BlurTextProps) => {
  const elements = animateBy === 'words' ? text.split(' ') : text.split('');
  
  const container: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: delay / 1000,
      },
    },
  };

  const item: Variants = {
    hidden: {
      filter: 'blur(10px)',
      opacity: 0,
      y: direction === 'top' ? -20 : 20, 
    },
    visible: {
      filter: 'blur(0px)',
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      },
    },
  };

  return (
    <motion.p
      className={className}
      variants={container}
      initial="hidden"
      animate="visible"
      onAnimationComplete={onAnimationComplete} 
    >
      {elements.map((el, i) => (
        <React.Fragment key={i}>
          <motion.span variants={item} style={{ display: 'inline-block' }}>
            {el}
          </motion.span>
          {animateBy === 'words' && i < elements.length - 1 && ' '}
        </React.Fragment>
      ))}
    </motion.p>
  );
};

export default BlurText;
