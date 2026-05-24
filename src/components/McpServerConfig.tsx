'use client';

import { useState, useEffect } from 'react';
import { Check, Copy, FileJson, Link as LinkIcon, Monitor, Sparkles } from 'lucide-react';
import { CodeBlock } from '@/components/CodeBlock';

const MCP_ORIGIN = 'https://www.ad-together.org';

interface McpServerConfigProps {
  initialAppId?: string;
}

export default function McpServerConfig({ initialAppId }: McpServerConfigProps) {
  const [mcpAppId, setMcpAppId] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedAppId = localStorage.getItem('adtogether_mcp_appid');
    if (savedAppId) {
      setMcpAppId(savedAppId);
    } else if (initialAppId) {
      setMcpAppId(initialAppId);
    }
  }, [initialAppId]);

  const validateAppId = (id: string) => {
    if (!id) return '';
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return 'App ID contains invalid characters.';
    }
    if (id.length < 5) {
      return 'App ID is too short.';
    }
    return '';
  };

  const handleAppIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newId = e.target.value.trim();
    setMcpAppId(newId);

    if (newId) {
      const validationError = validateAppId(newId);
      setError(validationError);
      if (!validationError) {
        localStorage.setItem('adtogether_mcp_appid', newId);
      }
    } else {
      setError('');
      localStorage.removeItem('adtogether_mcp_appid');
    }
  };

  const appIdQuery = mcpAppId ? `?appId=${encodeURIComponent(mcpAppId)}` : '';
  const cursorUrl = `${MCP_ORIGIN}/api/mcp${appIdQuery}`;
  const antigravityUrl = `${MCP_ORIGIN}/api/mcp/sse${appIdQuery}`;
  const appIdPlaceholder = mcpAppId || 'YOUR_APP_ID';

  const copyText = async (key: string, text: string) => {
    if (error) return;
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const cursorJson = `{
  "mcpServers": {
    "adtogether": {
      "url": "${cursorUrl}"
    }
  }
}`;

  const antigravityJson = `{
  "mcpServers": {
    "adtogether": {
      "type": "sse",
      "url": "${antigravityUrl}"
    }
  }
}`;

  return (
    <div className="mt-4 p-4 bg-zinc-100/50 dark:bg-black/20 rounded-xl border border-zinc-200/80 dark:border-white/5">
      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200 mb-2">Connect to our MCP Server</h4>
      <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3 leading-relaxed">
        Give your AI assistant access to campaigns, App IDs, and validation tools. Use the Cursor setup for Streamable HTTP (recommended in Cursor). Use the Antigravity setup for legacy SSE.
      </p>

      <div className="mb-6">
        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-400 mb-1.5 block uppercase tracking-wider">
          Enter your App ID
        </label>
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Enter your App ID (e.g. adt-123...)"
            value={mcpAppId}
            onChange={handleAppIdChange}
            className={`w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border ${error ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-700'} rounded-lg text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500 dark:focus:border-amber-500 transition-all shadow-sm`}
          />
          {error && (
            <span className="text-red-500 text-[10px] mt-1 absolute -bottom-4 left-1">{error}</span>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Cursor */}
        <div className="space-y-4 rounded-xl border border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-zinc-900/40 p-4">
          <h5 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            Cursor (Streamable HTTP)
          </h5>
          <ol className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2 list-decimal list-inside leading-relaxed">
            <li>Open <strong>Cursor Settings → MCP</strong>.</li>
            <li>Add a new server and choose <strong>URL</strong> (not SSE).</li>
            <li>Paste the URL below. Keep <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">appId</code> in the query string.</li>
            <li>Save once — avoid editing the URL while connected (reconnects can fail mid-save).</li>
          </ol>
          <button
            type="button"
            onClick={() => copyText('cursor', cursorUrl)}
            disabled={!!error}
            className={`w-full flex items-center justify-between gap-3 text-left text-xs px-3 py-2.5 bg-white dark:bg-zinc-900 rounded-lg border font-mono transition-all group
              ${error
                ? 'border-zinc-100 dark:border-zinc-800 text-zinc-400 cursor-not-allowed'
                : 'hover:bg-zinc-50 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-800 text-amber-600 dark:text-amber-400 hover:border-amber-500/50 shadow-sm'
              }`}
            title="Copy Cursor MCP URL"
          >
            <span className="break-all">{cursorUrl}</span>
            <span className="shrink-0 p-1.5 bg-zinc-100 dark:bg-black/30 rounded-md border border-zinc-200 dark:border-zinc-800">
              {copiedKey === 'cursor' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <LinkIcon className="w-3.5 h-3.5 text-zinc-400" />}
            </span>
          </button>
          <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-white/10">
            <CodeBlock language="json" title="cursor_mcp.json (optional)" code={cursorJson} />
          </div>
        </div>

        {/* Antigravity */}
        <div className="space-y-4 rounded-xl border border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-zinc-900/40 p-4">
          <h5 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            Antigravity (SSE)
          </h5>
          <ol className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2 list-decimal list-inside leading-relaxed">
            <li>In Antigravity MCP settings, add a server with <strong>type: sse</strong>.</li>
            <li>Use the SSE endpoint URL below (not the Cursor URL).</li>
            <li>Or paste the JSON config into your MCP file.</li>
          </ol>
          <button
            type="button"
            onClick={() => copyText('antigravity', antigravityUrl)}
            disabled={!!error}
            className={`w-full flex items-center justify-between gap-3 text-left text-xs px-3 py-2.5 bg-white dark:bg-zinc-900 rounded-lg border font-mono transition-all group
              ${error
                ? 'border-zinc-100 dark:border-zinc-800 text-zinc-400 cursor-not-allowed'
                : 'hover:bg-zinc-50 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-800 text-violet-600 dark:text-violet-400 hover:border-violet-500/50 shadow-sm'
              }`}
            title="Copy Antigravity SSE URL"
          >
            <span className="break-all">{antigravityUrl}</span>
            <span className="shrink-0 p-1.5 bg-zinc-100 dark:bg-black/30 rounded-md border border-zinc-200 dark:border-zinc-800">
              {copiedKey === 'antigravity' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <LinkIcon className="w-3.5 h-3.5 text-zinc-400" />}
            </span>
          </button>
          <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-white/10">
            <CodeBlock language="json" title="antigravity_mcp.json" code={antigravityJson} />
          </div>
        </div>
      </div>

      <p className="text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-500 italic mt-4">
        Claude Desktop and other stdio-only clients: use <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">npx mcp-remote</code> with Bearer auth — see the README MCP section.
      </p>
    </div>
  );
}
