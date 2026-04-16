"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  language: string;
  code: string;
  title?: string;
}

export function CodeBlock({ language, code, title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code: ", err);
    }
  };

  return (
    <div className="group/code relative bg-zinc-100 dark:bg-black/60 border border-zinc-200 dark:border-white/5 rounded-xl overflow-hidden mb-1">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-white/5 bg-zinc-200/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 dark:bg-red-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 dark:bg-yellow-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 dark:bg-green-500/70" />
            </div>
            <span className="text-xs text-zinc-600 dark:text-zinc-500 font-mono ml-2">{title}</span>
          </div>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-300/50 dark:hover:bg-white/10 transition-all"
            title="Copy code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
      {!title && (
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 z-20 p-1.5 rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-300/50 dark:hover:bg-white/10 transition-all opacity-0 group-hover/code:opacity-100"
          title="Copy code"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      )}
      <pre className="p-4 overflow-x-auto text-[13px] font-mono leading-relaxed text-zinc-800 dark:text-zinc-300 bg-transparent">
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  );
}

