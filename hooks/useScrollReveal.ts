'use client';

export function useScrollReveal() {
  const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } 
    }
  };

  const fadeLeft = {
    hidden: { opacity: 0, x: -30 },
    visible: { 
      opacity: 1, 
      x: 0, 
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } 
    }
  };

  const fadeRight = {
    hidden: { opacity: 0, x: 30 },
    visible: { 
      opacity: 1, 
      x: 0, 
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } 
    }
  };

  const stagger = {
    hidden: {},
    visible: { 
      transition: { staggerChildren: 0.1 } 
    }
  };

  const staggerBenefits = {
    hidden: {},
    visible: { 
      transition: { staggerChildren: 0.08 } 
    }
  };

  return { fadeUp, fadeLeft, fadeRight, stagger, staggerBenefits };
}
export type ScrollRevealHook = ReturnType<typeof useScrollReveal>;
