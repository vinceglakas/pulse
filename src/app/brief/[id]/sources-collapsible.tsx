"use client";

import { useState } from "react";
import type { SourcePost } from "@/lib/types";

export function SourcesCollapsible({ sources }: { sources: SourcePost[] }) {
  const [open, setOpen] = useState(false);

  if (sources.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-xl mb-6 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Sources ({sources.length})
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="px-6 pb-5">
          <ul className="space-y-3">
            {sources.slice(0, 10).map((source, i) => (
              <li key={i}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 group"
                >
                  <span className="text-xs font-mono text-gray-400 mt-0.5 shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <span className="text-sm text-indigo-600 group-hover:text-indigo-700 underline underline-offset-2 line-clamp-1">
                      {source.title}
                    </span>
                    <span className="block text-xs text-gray-400 mt-0.5">
                      {source.source}
                      {source.score > 0 && ` · ${source.score} points`}
                    </span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
