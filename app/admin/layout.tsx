import { ThemeProvider } from '@/components/admin/ThemeProvider';

// Layout base de TODO /admin (login incluido): solo tema y fondo.
// El guard de sesión+rol vive en (panel)/layout.tsx; el proxy ya exige sesión.
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <div className="bg-zinc-50 dark:bg-[#18181b] min-h-screen text-zinc-900 dark:text-zinc-100 font-sans antialiased transition-colors duration-300">
        {children}
      </div>
    </ThemeProvider>
  );
}
