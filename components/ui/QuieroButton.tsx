'use client';

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface QuieroButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
  showArrow?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
}

export default function QuieroButton({
  children,
  variant = 'primary',
  className = '',
  showArrow = false,
  onClick,
  type = 'button',
  disabled = false,
}: QuieroButtonProps) {

  const variants = {
    primary: {
      wrapper: 'bg-[#56a100]',       // sombra inferior verde oscuro
      top: 'bg-[#83ff00] text-black border-[#56a100]',
    },
    secondary: {
      wrapper: 'bg-[#4a007a]',       // sombra inferior violeta oscuro
      top: 'bg-[#9933c1] text-white border-[#4a007a]',
    },
    outline: {
      wrapper: 'bg-[#56a100]',
      top: 'bg-transparent text-[#83ff00] border-[#83ff00]',
    },
  };

  const v = variants[variant];

  // Distribute utility classes: pad/text/font classes go to top span to support proper 3D translation
  const words = className ? className.split(/\s+/) : [];
  const topClasses: string[] = [];
  const wrapperClasses: string[] = [];

  words.forEach(word => {
    if (
      word.startsWith('p-') || 
      word.startsWith('px-') || 
      word.startsWith('py-') || 
      word.startsWith('pt-') || 
      word.startsWith('pb-') || 
      word.startsWith('pl-') || 
      word.startsWith('pr-') ||
      word.startsWith('text-') ||
      word.startsWith('font-')
    ) {
      topClasses.push(word);
    } else {
      wrapperClasses.push(word);
    }
  });

  const hasPadding = topClasses.some(c => 
    c.startsWith('p-') || 
    c.startsWith('px-') || 
    c.startsWith('py-') || 
    c.startsWith('pt-') || 
    c.startsWith('pb-') || 
    c.startsWith('pl-') || 
    c.startsWith('pr-')
  );

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.98 }}
      style={{ borderRadius: '0.75em' }}
      className={cn(
        'group relative border-none cursor-pointer font-bold text-[15px] select-none p-0 outline-none inline-block align-middle',
        disabled && 'opacity-60 pointer-events-none',
        v.wrapper,
        wrapperClasses.join(' ')
      )}
    >
      <span
        className={cn(
          'button_top flex items-center justify-center gap-2 font-bold',
          'border-2 rounded-[0.75em] w-full h-full',
          'transition-transform duration-100 ease-in-out',
          '-translate-y-[0.22em]',
          'group-hover:-translate-y-[0.36em]',
          'group-active:translate-y-0',
          !hasPadding && 'px-6 py-4',
          v.top,
          topClasses.join(' ')
        )}
      >
        {children}
        {showArrow && (
          <span className="inline-block transition-transform duration-150 group-hover:translate-x-1">
            →
          </span>
        )}
      </span>
    </motion.button>
  );
}
