'use client';

import { useRouter } from 'next/navigation';
import Logo from '@/components/ui/Logo';
import QuieroButton from '@/components/ui/QuieroButton';
import { Lock } from 'lucide-react';
import { useTheme } from '@/components/admin/ThemeProvider';
import { useEffect, useState } from 'react';

export default function AdminLoginPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/admin');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-gradient-to-b dark:from-[#18181b] dark:to-black px-4 relative overflow-hidden transition-colors duration-300">
      
      {/* Decorative blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#9933c1] rounded-full blur-[100px] dark:blur-[150px] opacity-10 dark:opacity-20 pointer-events-none transition-all"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#b3ff6b] rounded-full blur-[100px] dark:blur-[150px] opacity-20 dark:opacity-10 pointer-events-none transition-all"></div>

      <div className="max-w-md w-full bg-white/80 dark:bg-zinc-900/50 backdrop-blur-xl rounded-3xl shadow-xl dark:shadow-2xl p-8 border border-zinc-200 dark:border-white/10 relative z-10 transition-colors duration-300">
        
        <div className="flex justify-center mb-10">
          <Logo isDark={mounted ? theme === 'dark' : true} />
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight transition-colors">Acceso Restringido</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 transition-colors">Panel de Administración • QuieroSIM</p>
        </div>

        <form className="space-y-5" onSubmit={handleLogin}>
          <div>
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 transition-colors">Email</label>
            <input 
              type="email" 
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-black/50 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#9933c1] focus:border-transparent transition-all"
              placeholder="admin@quierosim.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 transition-colors">Contraseña</label>
            <input 
              type="password" 
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-black/50 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#9933c1] focus:border-transparent transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          
          <div className="pt-6">
            <QuieroButton 
              variant="secondary"
              type="submit"
              className="w-full py-3.5 text-base flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              Iniciar Sesión
            </QuieroButton>
          </div>
        </form>

        <div className="mt-8 text-center">
          <button 
            type="button"
            onClick={() => router.push('/')} 
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            &larr; Volver a la web pública
          </button>
        </div>
      </div>
    </div>
  );
}
