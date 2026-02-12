"use client";

import { useMemo } from "react";

function generateFollowUps(topic: string, keyThemes: string[]): string[] {
  const suggestions: string[] = [];
  const topicShort = topic.split(/\s+/).slice(0, 4).join(" ");

  // Pull compelling angles from key themes
  if (keyThemes.length >= 1) {
    const words = keyThemes[0].split(/\s+/).slice(0, 6).join(" ");
    if (words.length > 10) suggestions.push(words);
  }
  if (keyThemes.length >= 3) {
    const words = keyThemes[2].split(/\s+/).slice(0, 6).join(" ");
    if (words.length > 10) suggestions.push(words);
  }

  // Add action-oriented follow-ups
  suggestions.push(`Who's winning in ${topicShort}?`);
  suggestions.push(`${topicShort} vs competitors`);
  suggestions.push(`Future of ${topicShort}`);

  return [...new Set(suggestions)]
    .map(s => s.replace(/^[-•]\s*/, "").trim())
    .filter(s => s.length > 5 && s.length < 55)
    .slice(0, 3);
}

export function DeeperSection({
  topic,
  briefText,
  keyThemes,
}: {
  topic: string;
  briefText: string;
  keyThemes: string[];
}) {
  const followUps = useMemo(
    () => generateFollowUps(topic, keyThemes),
    [topic, keyThemes]
  );

  if (followUps.length === 0) return null;

  return (
    <div className="mb-8 p-6 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl">
      <p className="text-base font-bold text-purple-700 mb-4">🔍 Want to go deeper?</p>
      <div className="flex flex-wrap gap-2">
        {followUps.map((suggestion, i) => (
          <a
            key={i}
            href={`/search?q=${encodeURIComponent(suggestion)}`}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-purple-700 bg-white border-2 border-purple-200 rounded-full hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all shadow-sm hover:shadow-md cursor-pointer"
          >
            {suggestion}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </a>
        ))}
      </div>
    </div>
  );
}
