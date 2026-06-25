'use client';

import { useState } from 'react';
import AccountSidebar from './AccountSidebar';
import AccountTopbar from './AccountTopbar';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';

export default function AccountShell({
  email,
  isAdmin,
  children,
}: {
  email: string;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="selection:bg-[#9933c1] selection:text-white dark:bg-zinc-950 transition-colors duration-200">
      <AccountSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} isAdmin={isAdmin} />

      <div className="lg:pl-64 flex flex-col min-h-screen transition-all duration-300">
        <AccountTopbar setIsOpen={setSidebarOpen} email={email} isAdmin={isAdmin} />

        <main className="flex-1 py-8">
          <div className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {children}
              </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
