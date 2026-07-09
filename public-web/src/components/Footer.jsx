export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative z-20 border-t border-white/10 bg-black px-4 py-8 sm:px-6 md:px-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Gennetex" className="h-7 w-auto opacity-90" />
          <span className="font-semibold tracking-tight">GENNETEX</span>
        </div>
        <p className="text-sm text-gray-500">© {year} Gennetex. Бүх эрх хуулиар хамгаалагдсан.</p>
      </div>
    </footer>
  );
}
