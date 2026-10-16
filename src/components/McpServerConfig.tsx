'use client';

import { useState } from 'react';
import { Check, Copy, LockKeyhole } from 'lucide-react';
import { CodeBlock } from '@/components/CodeBlock';
import { auth } from '@/lib/firebase';

const MCP_ENDPOINT = 'https://www.ad-together.org/api/mcp';

export default function McpServerConfig() {
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setError(null);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError('Could not copy to the clipboard.');
    }
  };

  const copyFreshAuthorizationHeader = async () => {
    const user = auth.currentUser;
    if (!user) {
      setError('Sign in to the owner dashboard before generating an MCP authorization header.');
      return;
    }

    try {
      const token = await user.getIdToken(true);
      await copyText('authorization', `Authorization: Bearer ${token}`);
    } catch {
      setError('Could not refresh the Firebase ID token. Please sign in again and retry.');
    }
  };

  const streamableConfig = `{
  "mcpServers": {
    "adtogether": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote@latest",
        "${MCP_ENDPOINT}",
        "--header",
        "Authorization: Bearer YOUR_FRESH_FIREBASE_ID_TOKEN"
      ]
    }
  }
}`;

  return (
    <div className="mt-4 p-4 bg-zinc-100/50 dark:bg-black/20 rounded-xl border border-zinc-200/80 dark:border-white/5">
      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200 mb-2 flex items-center gap-2">
        <LockKeyhole className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        Connect to the MCP Server
      </h4>
      <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3 leading-relaxed">
        Account tools use a Firebase ID token from the signed-in account owner. App IDs are public integration identifiers and are never accepted as MCP credentials.
      </p>

      <div className="space-y-3 rounded-xl border border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-zinc-900/40 p-4">
        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
          Use Streamable HTTP and send a fresh Firebase ID token in the <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">Authorization</code> header on every request. While signed in as the owner, copy a fresh header below and paste it into a client that supports request headers. Legacy SSE is disabled because it cannot safely carry this credential.
        </p>
        <button
          type="button"
          onClick={() => copyText('endpoint', MCP_ENDPOINT)}
          className="w-full flex items-center justify-between gap-3 text-left text-xs px-3 py-2.5 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 text-amber-600 dark:text-amber-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-amber-500/50 shadow-sm font-mono"
          title="Copy Streamable HTTP endpoint"
        >
          <span className="break-all">{MCP_ENDPOINT}</span>
          <span className="shrink-0 p-1.5 bg-zinc-100 dark:bg-black/30 rounded-md border border-zinc-200 dark:border-zinc-800">
            {copied === 'endpoint' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
          </span>
        </button>
        <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-white/10">
          <CodeBlock language="json" title="mcp.json" code={streamableConfig} />
        </div>
        <button
          type="button"
          onClick={copyFreshAuthorizationHeader}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          {copied === 'authorization' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          Copy fresh authorization header
        </button>
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
}
