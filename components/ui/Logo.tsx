import { cn } from '@/lib/utils';
import React from 'react';
import Image from 'next/image';
import isologo from '@/images/isologo.svg';
import logotipo from '@/images/logotipo.svg';

interface LogoProps {
  className?: string;
  isDark?: boolean;
}

export default function Logo({ className, isDark = false }: LogoProps) {
  return (
    <div className={cn("flex flex-row items-center gap-2", className)}>
      <Image 
        src={isologo}
        alt="QuieroSIM isologo"
        className={cn("h-7 sm:h-8 w-auto", isDark ? "brightness-0 invert" : "")}
      />
      <Image 
        src={logotipo}
        alt="QuieroSIM logotipo"
        className={cn("h-4 sm:h-5 w-auto", isDark ? "brightness-0 invert" : "")}
      />
    </div>
  );
}
