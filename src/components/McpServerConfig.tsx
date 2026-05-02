'use client';

import { useState, useEffect } from 'react';
import { Check, Copy, FileJson, Link as LinkIcon } from 'lucide-react';
import { CodeBlock } from '@/components/CodeBlock';

interface McpServerConfigProps {
  initialAppId?: string;
}

export default function McpServerConfig({ initialAppId }: McpServerConfigProps) {
  const [mcpAppId, setMcpAppId] = useState('');
  const [copiedMcpUrl, setCopiedMcpUrl] = useState(false);
  const [error, setError] = useState('');

  // Load from localStorage or prop on mount
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
    // Basic validation: mostly alphanumeric, dashes, and underscores
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

  const handleCopy = () => {
    if (error) return; // Don't copy if there's an error
    
    navigator.clipboard.writeText(`https://www.ad-together.org/api/mcp${mcpAppId ? `?apiKey=${mcpAppId}` : ''}`);
    setCopiedMcpUrl(true);
    setTimeout(() => setCopiedMcpUrl(false), 2000);
  };

  return (
    <div className="mt-4 p-4 bg-zinc-100/50 dark:bg-black/20 rounded-xl border border-zinc-200/80 dark:border-white/5">
      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200 mb-2">Connect to our MCP Server</h4>
      <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3 leading-relaxed">
        Get real-time access to user campaigns, API keys, and validation tools by connecting to our SSE MCP Server. Paste the URL directly into Cursor/Windsurf, or use the JSON configuration for Claude Desktop and other clients.
      </p>
      <div className="flex flex-col lg:flex-row gap-6 mt-6">
        <div className="flex-1 space-y-4">
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-400 mb-1.5 block uppercase tracking-wider">
              1. Enter your App ID
            </label>
            <div className="relative">
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

          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-400 mb-1.5 block uppercase tracking-wider">
              2. Use the SSE URL (for Cursor, Windsurf)
            </label>
            <button 
              onClick={handleCopy}
              disabled={!!error}
              className={`w-full flex items-center justify-between gap-3 text-left text-xs px-3 py-2.5 bg-white dark:bg-zinc-900 rounded-lg border font-mono transition-all group
                ${error 
                  ? 'border-zinc-100 dark:border-zinc-800 text-zinc-400 cursor-not-allowed' 
                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-800 text-amber-600 dark:text-amber-400 hover:border-amber-500/50 dark:hover:border-amber-500/50 shadow-sm'
                }
              `}
              title="Copy URL"
            >
              <span className="break-all">https://www.ad-together.org/api/mcp{mcpAppId ? `?apiKey=${mcpAppId}` : ''}</span>
              <span className={`shrink-0 p-1.5 bg-zinc-100 dark:bg-black/30 rounded-md border border-zinc-200 dark:border-zinc-800 transition-colors ${!error && 'group-hover:border-zinc-300 dark:group-hover:border-zinc-600'}`}>
                {copiedMcpUrl ? <Check className="w-3.5 h-3.5 text-green-500" /> : <LinkIcon className={`w-3.5 h-3.5 ${error ? 'text-zinc-500' : 'text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300'}`} />}
              </span>
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <h5 className="text-xs font-semibold text-zinc-700 dark:text-zinc-400 mb-1.5 flex items-center gap-1.5 uppercase tracking-wider">
            <FileJson className="w-3.5 h-3.5" />
            3. MCP Configuration (for Claude Desktop)
          </h5>
          <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-white/10 shadow-lg">
            <CodeBlock 
              language="json"
              title="mcp_config.json"
              code={`{
  "mcpServers": {
    "adtogether": {
      "type": "sse",
      "url": "https://www.ad-together.org/api/mcp?apiKey=${mcpAppId || 'YOUR_APP_ID'}"
    }
  }
}`}
            />
          </div>
          <p className="text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-500 italic mt-2">
            Paste this into your MCP configuration file (typically <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">claude_desktop_config.json</code>) to give your AI assistant direct access to your campaign data.
          </p>
        </div>
      </div>

    </div>
  );
}
