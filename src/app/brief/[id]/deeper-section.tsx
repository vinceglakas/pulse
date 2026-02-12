"use client";

import { useMemo } from "react";

function generateFollowUps(topic: string, keyThemes: string[]): string[] {
  // Generate 3 follow-up research suggestions based on the brief
  const suggestions: string[] = [];

  if (keyThemes.length >= 2) {
    // Use key themes to derive follow-ups
    const theme1 = keyThemes[0].split(/[,.]/).filter(s => s.trim().length > 5)[0]?.trim();
    const theme2 = keyThemes[1].split(/[,.]/).filter(s => s.trim().length > 5)[0]?.trim();
    if (theme1) suggestions.push(theme1);
    if (theme2) suggestions.push(theme2);
  }

  // Add generic follow-ups based on topic
  const topicWords = topic.split(/\s+/).slice(0, 4).join(" ");
  suggestions.push(`${topicWords} pricing models`);
  suggestions.push(`${topicWords} competitive landscape`);
  suggestions.push(`${topicWords} adoption timeline`);

  // Return first 3 unique, cleaned up
  return [...new Set(suggestions)]
    .map(s => s.replace(/^[-•]\s*/, "").trim())
    .filter(s => s.length > 5 && s.length < 60)
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
    <div className="mb-8 p-5 bg-purple-50 border border-purple-100 rounded-xl">
      <p className="text-sm font-bold text-purple-700 mb-3">Want to go deeper?</p>
      <div className="flex flex-wrap gap-2">
        {followUps.map((suggestion, i) => (
          <a
            key={i}
            href={`/search?q=${encodeURIComponent(suggestion)}`}
            className="inline-flex items-center px-4 py-2 text-sm text-purple-600 bg-white border border-purple-200 rounded-full hover:bg-purple-100 hover:border-purple-300 transition-colors"
          >
            {suggestion}
          </a>
        ))}
      </div>
    </div>
  );
}
