interface FooterProps {
  className?: string;
}

export default function Footer({ className = "" }: FooterProps) {
  return (
    <footer
      className={`z-20 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-cyan-300/20 bg-slate-950/86 px-4 py-2 text-xs text-slate-300 backdrop-blur-xl ${className}`}
      role="contentinfo"
    >
      <span className="font-semibold text-cyan-100">Not medical advice.</span>
      <span>Do not infer local risk from mentions/signals.</span>
      <span className="text-slate-400">Official counts come from ECDC/national agencies.</span>
      <a
        href="/methodology"
        className="ml-auto rounded-full border border-slate-600/80 bg-slate-900/70 px-2.5 py-1 text-cyan-200 hover:border-cyan-300/70 hover:text-cyan-100"
      >
        Methodology & Limitations →
      </a>
    </footer>
  );
}
