'use client';

import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

const springConfig = { stiffness: 280, damping: 30, mass: 0.8 };

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={springConfig}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function cardReveal(index = 0) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { ...springConfig, delay: index * 0.05 },
  };
}

export function staggerContainer(delay = 0.05) {
  return {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: { staggerChildren: delay, delayChildren: 0.05 },
    },
  };
}

export function fadeSlideUp(index = 0) {
  return {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { ...springConfig, delay: index * 0.06 },
  };
}
