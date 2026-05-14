"use client";

import { useDraggablePanel } from "./useDraggablePanel";

export default function Legend() {
  const { panelStyle, isDragging, handleProps } = useDraggablePanel("hantaspread.panel.legend");

  return (
    <div
      className="frost-panel absolute left-3 top-3 z-50 rounded-xl px-2.5 py-2 text-[10px] md:bottom-[126px] md:left-4 md:top-auto md:max-w-[170px]"
      style={panelStyle}
      role="note"
      aria-label="Map legend"
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="font-display font-semibold uppercase tracking-[0.12em] text-cyan-100">Legend</p>
        <button
          type="button"
          aria-label="Move legend panel"
          title="Drag to move legend panel"
          className={`flex h-6 w-6 touch-none select-none items-center justify-center rounded-full border border-cyan-300/35 text-cyan-100 transition ${
            isDragging ? "cursor-grabbing bg-cyan-400/28" : "cursor-grab bg-cyan-400/14 hover:bg-cyan-400/24"
          }`}
          {...handleProps}
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
            <circle cx="4" cy="4" r="1.1" />
            <circle cx="8" cy="4" r="1.1" />
            <circle cx="12" cy="4" r="1.1" />
            <circle cx="4" cy="8" r="1.1" />
            <circle cx="8" cy="8" r="1.1" />
            <circle cx="12" cy="8" r="1.1" />
            <circle cx="4" cy="12" r="1.1" />
            <circle cx="8" cy="12" r="1.1" />
            <circle cx="12" cy="12" r="1.1" />
          </svg>
        </button>
      </div>

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
