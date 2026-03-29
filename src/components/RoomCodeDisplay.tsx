"use client";

import { useState } from "react";

interface RoomCodeDisplayProps {
  code: string;
}

export function RoomCodeDisplay({ code }: RoomCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-white/60 text-sm uppercase tracking-wider">Room Code</span>
      <button
        onClick={handleCopy}
        className="group flex items-center gap-3 bg-black/30 rounded-xl px-6 py-3 border border-white/20 hover:border-white/40 transition-all"
      >
        <span className="text-3xl font-mono font-bold tracking-[0.3em] text-white">
          {code}
        </span>
        <span className="text-white/40 group-hover:text-white/70 text-sm transition-colors">
          {copied ? "Copied!" : "Copy"}
        </span>
      </button>
    </div>
  );
}
