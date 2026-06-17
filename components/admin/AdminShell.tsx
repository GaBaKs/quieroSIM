'use client';

import { useState } from 'react';
import Sidebar from '@/components/admin/Sidebar';
import Topbar from '@/components/admin/Topbar';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import type { AdminSubRole } from '@/server/types';

/** Shell visual del panel (sidebar + topbar). El guard vive en el layout server. */
export default function AdminShell({
  email,
  subRole,
  children,
}: {
  email: string;
  subRole: AdminSubRole | null;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="selection:bg-[#9933c1] selection:text-white">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} subRole={subRole} />

      <div className="lg:pl-64 flex flex-col min-h-screen transition-all duration-300">
        <Topbar setIsOpen={setSidebarOpen} email={email} subRole={subRole} />

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
  );
}
