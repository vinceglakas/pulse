"use client";

import { useState } from "react";

export function ShareButtons({
  url,
  topic,
  briefText,
}: {
  url: string;
  topic: string;
  briefText: string;
}) {
  const [copied, setCopied] = useState(false);
  const [emailDraft, setEmailDraft] = useState(false);

  const snippet = briefText.slice(0, 200) + (briefText.length > 200 ? "..." : "");

  const tweetText = encodeURIComponent(
    `Just ran a research brief on "${topic}" using @RunPulsed — here's what the internet is saying 👇\n\n${url}`
  );

  const linkedInUrl = encodeURIComponent(url);

  const emailSubject = encodeURIComponent(`Research Brief: ${topic}`);
  const emailBody = encodeURIComponent(
    `Hey,\n\nI found some interesting research on "${topic}" and thought you'd want to see it.\n\nKey takeaway:\n${snippet}\n\nFull brief: ${url}\n\nGenerated with Pulsed (runpulsed.ai)`
  );

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 mb-6">
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
        Share This Brief
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Tweet */}
        <a
          href={`https://twitter.com/intent/tweet?text=${tweetText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-gray-900 hover:bg-gray-50 transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-gray-900 flex items-center justify-center transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-gray-600 group-hover:text-white transition-colors">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-gray-700">Tweet</span>
        </a>

        {/* LinkedIn */}
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${linkedInUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-[#0a66c2] hover:bg-blue-50 transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full bg-blue-50 group-hover:bg-[#0a66c2] flex items-center justify-center transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-[#0a66c2] group-hover:text-white transition-colors">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-gray-700">LinkedIn</span>
        </a>

        {/* Email Draft */}
        <a
          href={`mailto:?subject=${emailSubject}&body=${emailBody}`}
          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full bg-indigo-50 group-hover:bg-indigo-600 flex items-center justify-center transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600 group-hover:text-white transition-colors">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-gray-700">Email</span>
        </a>

        {/* Copy Link */}
        <button
          onClick={copyLink}
          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full bg-green-50 group-hover:bg-green-600 flex items-center justify-center transition-colors">
            {copied ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 group-hover:text-white transition-colors">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            )}
          </div>
          <span className="text-xs font-semibold text-gray-700">
            {copied ? "Copied!" : "Copy Link"}
          </span>
        </button>
      </div>
    </div>
  );
}
