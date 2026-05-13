export default function Legend() {
  return (
    <div
      className="frost-panel absolute left-3 top-3 z-20 rounded-xl px-2.5 py-2 text-[10px] md:bottom-[96px] md:left-4 md:top-auto md:max-w-[170px]"
      role="note"
      aria-label="Map legend"
    >
      <p className="font-display mb-1 font-semibold uppercase tracking-[0.12em] text-cyan-100">Legend</p>

      <div className="mb-1 flex items-center gap-1.5">
        <span
          className="h-3 w-3 rounded-full border border-cyan-300 bg-cyan-400"
          aria-hidden="true"
        />
        <span className="leading-tight text-slate-200">
          <strong>Confirmed</strong> official
        </span>
      </div>

      <div className="mb-1.5 flex items-center gap-1.5">
        <span
          className="h-3 w-3 rounded-full border border-orange-300 bg-orange-500/30"
          aria-hidden="true"
        />
        <span className="leading-tight text-slate-200">
          <strong>Signal</strong> mention
        </span>
      </div>

      <p className="mb-0.5 font-semibold text-slate-200">Tier</p>
      <ul className="space-y-0 leading-tight text-slate-300">
        <li>
          <span className="inline-block w-4 text-center font-bold text-green-700">A</span> Official
        </li>
        <li>
          <span className="inline-block w-4 text-center font-bold text-blue-700">B</span> Science
        </li>
        <li>
          <span className="inline-block w-4 text-center font-bold text-yellow-700">C</span> Media
        </li>
        <li>
          <span className="inline-block w-4 text-center font-bold text-slate-500">D</span> Other
        </li>
      </ul>

      <p className="mt-1 text-[9px] leading-tight text-slate-400">Size follows log(count)</p>
      <p className="text-[9px] leading-tight text-slate-500">
        Positioned away from player controls
      </p>
    </div>
  );
}
