'use client';

import { useState } from 'react';
import Sidebar from '@/components/admin/Sidebar';
import Topbar from '@/components/admin/Topbar';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { ThemeProvider } from '@/components/admin/ThemeProvider';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // If we are on the login page, just render the children without the shell
  if (pathname === '/admin/login') {
    return (
      <ThemeProvider>
        <div className="bg-zinc-50 dark:bg-[#18181b] min-h-screen text-zinc-900 dark:text-zinc-100 font-sans antialiased transition-colors duration-300">
          {children}
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="bg-zinc-50 dark:bg-[#18181b] min-h-screen text-zinc-900 dark:text-zinc-100 font-sans antialiased selection:bg-[#9933c1] selection:text-white transition-colors duration-300">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        
        <div className="lg:pl-64 flex flex-col min-h-screen transition-all duration-300">
          <Topbar setIsOpen={setSidebarOpen} />
          
          <main className="flex-1 py-8">
            <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
