import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About – HantaSpread",
  description: "About HantaSpread: a hantavirus activity visualization tool.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 shadow-sm px-6 py-3 flex items-center gap-4">
        <Link href="/" className="text-blue-700 font-bold text-lg hover:underline">
          HantaSpread
        </Link>
        <nav className="ml-auto flex gap-4 text-sm text-slate-500">
          <Link href="/" className="hover:text-blue-600">← Map</Link>
          <Link href="/methodology" className="hover:text-blue-600">Methodology</Link>
        </nav>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        <h1 className="text-3xl font-bold text-slate-900">About HantaSpread</h1>

        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-sm text-amber-900">
          <strong>⚠ Not medical advice.</strong> This is a demonstration tool using mock data.
          It is not a clinical resource and should not be used for health decisions.
        </div>

        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">What is HantaSpread?</h2>
          <p className="text-slate-700 text-sm leading-relaxed">
            HantaSpread is an MVP web application that visualizes hantavirus activity across Europe
            and globally. It maintains a strict separation between <strong>confirmed surveillance
            data</strong> (official case counts from national health agencies) and{" "}
            <strong>signals/mentions</strong> (unverified notices, media reports, and preliminary
            information).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Who is it for?</h2>
          <p className="text-slate-700 text-sm leading-relaxed">
            Adults interested in understanding hantavirus trends in Europe. The primary audience
            includes outdoor enthusiasts, public health students, journalists, and researchers
            who want a transparent overview of the current situation without mixing uncertain
            signals with confirmed data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Data in the MVP</h2>
          <p className="text-slate-700 text-sm leading-relaxed">
            In this MVP, all data is <strong>illustrative mock data</strong>. The case counts,
            signal records, and source URLs are constructed for demonstration purposes and do not
            represent real surveillance data. Future versions will connect to official data sources
            via adapters (see the{" "}
            <Link href="/methodology" className="text-blue-600 underline">
              Methodology page
            </Link>
            ).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Technical Stack</h2>
          <ul className="text-slate-700 text-sm space-y-1 list-disc list-inside ml-2">
            <li>Next.js 14 (App Router) + TypeScript</li>
            <li>React 18 + Tailwind CSS</li>
            <li>MapLibre GL JS (map rendering)</li>
            <li>Recharts (trend charts)</li>
            <li>Zod (runtime data validation)</li>
            <li>No database — in-memory cache + JSON mock data</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Core Design Principles</h2>
          <ul className="text-slate-700 text-sm space-y-1 list-disc list-inside ml-2">
            <li>Confirmed and signal data are <strong>never mixed</strong> in aggregates.</li>
            <li>Every data element shows a confidence badge (CONFIRMED or SIGNAL).</li>
            <li>Every record links to its source URL.</li>
            <li>Uncertainty is communicated explicitly and prominently.</li>
            <li>The Norway lens indicator is labeled as a heuristic, not a prediction.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Credits & Disclaimer</h2>
          <p className="text-slate-700 text-sm leading-relaxed">
            Built as a demonstration MVP. OpenStreetMap tiles used under the{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              className="text-blue-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              ODbL license
            </a>
            . This application is not affiliated with any health agency. All mock data is
            fictional and for illustrative purposes only.
          </p>
        </section>
      </main>

      <footer className="bg-slate-800 text-slate-300 text-xs px-6 py-3 mt-10 text-center">
        Not medical advice. HantaSpread MVP — illustrative data only.
      </footer>
    </div>
  );
}
