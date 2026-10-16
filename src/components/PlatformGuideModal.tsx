"use client";

import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Globe } from 'lucide-react';
import { CodeBlock } from '@/components/CodeBlock';

interface AdUnit {
  id: string;
  name: string;
}

interface PlatformGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  appId?: string;
  adUnits?: AdUnit[];
  initialPlatform?: Platform;
}

export type Platform = 'wordpress' | 'wix' | 'squarespace' | 'weebly' | 'webflow';

export default function PlatformGuideModal({
  isOpen,
  onClose,
  appId = 'YOUR_APP_ID',
  adUnits = [],
  initialPlatform = 'wordpress',
}: PlatformGuideModalProps) {
  const [prevPlatform, setPrevPlatform] = useState<Platform>(initialPlatform);
  const [activeTab, setActiveTab] = useState<Platform>(initialPlatform);
  const [selectedAdUnit, setSelectedAdUnit] = useState<string>(
    adUnits.length > 0 ? adUnits[0].id : 'YOUR_AD_UNIT_ID'
  );
  const [isCopied, setIsCopied] = useState(false);

  if (initialPlatform !== prevPlatform) {
    setPrevPlatform(initialPlatform);
    setActiveTab(initialPlatform);
  }
  
  // Close on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const htmlSnippet = `<!-- Load AdTogether SDK -->
<script src="https://www.ad-together.org/sdk.js" data-app-id="${appId}" defer></script>

<!-- Ad Banner Container -->
<div 
  data-ad-unit="${selectedAdUnit}" 
  style="width: 100%; min-height: 50px;"
></div>`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(htmlSnippet);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const platforms = [
    { id: 'wordpress', name: 'WordPress', color: 'bg-blue-600' },
    { id: 'wix', name: 'Wix', color: 'bg-black dark:bg-white dark:text-black text-white' },
    { id: 'squarespace', name: 'Squarespace', color: 'bg-zinc-800' },
    { id: 'weebly', name: 'Weebly', color: 'bg-indigo-500' },
    { id: 'webflow', name: 'Webflow', color: 'bg-blue-500' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#0A0A0A] w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header & Tabs */}
        <div className="flex-none border-b border-zinc-200 dark:border-zinc-800 p-4 sm:px-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-zinc-900 dark:text-white">
              <Globe className="w-5 h-5 text-amber-500" />
              Website Builder Guides
            </h2>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 dark:text-zinc-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-1">
            {platforms.map(p => (
              <button
                key={p.id}
                onClick={() => setActiveTab(p.id as Platform)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === p.id 
                    ? `${p.color} text-white shadow-md` 
                    : 'bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Split Pane Content */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-[400px]">
          
          {/* Left Pane: Instructions */}
          <div className="flex-1 overflow-y-auto p-6 lg:border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#050505]">
            <h3 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white">
              Add ads to {platforms.find(p => p.id === activeTab)?.name}
            </h3>
            
            {activeTab === 'wordpress' && (
              <div className="space-y-6">
                <Step number={1} title="Open your Page or Post editor" desc="Navigate to the page or post where you want the ad to appear." />
                <Step number={2} title="Add a Custom HTML Block" desc="Click the '+' button to add a new block, search for 'Custom HTML', and add it to your layout." />
                <Step number={3} title="Paste your code" desc="Paste the personalized code from the right panel into the block. Click 'Preview' to test it." />
                
                <Callout type="info" title="Site-wide Ads">
                  Want ads on every page? Use a plugin like <strong>WPCode</strong> to automatically inject the script into your site&apos;s header or footer.
                </Callout>
              </div>
            )}

            {activeTab === 'wix' && (
              <div className="space-y-6">
                <Step number={1} title="Add an Embed Element" desc="In the Wix Editor, click '+' (Add Elements) > Embed Code > Embed HTML." />
                <Step number={2} title="Paste the Snippet" desc="Select 'Code', paste your personalized code snippet from the right panel, and click Update." />
                <Step number={3} title="Resize the Box" desc="Drag the corners of the embed box to fit your desired banner size (e.g., 320x50 or 728x90)." />
                
                <Callout type="warning" title="Wix Limitations">
                  Wix places on-page embeds in a sandboxed iframe. For full-screen interstitials, you must inject the code via <strong>Settings &gt; Custom Code</strong> in your Wix Dashboard (requires Premium).
                </Callout>
              </div>
            )}

            {activeTab === 'squarespace' && (
              <div className="space-y-6">
                <Step number={1} title="Edit your page layout" desc="Click 'Edit' on the page where you want the ad." />
                <Step number={2} title="Add a Code Block" desc="Hover over an insertion point, click '+', and select the 'Code' block." />
                <Step number={3} title="Paste & Save" desc="Make sure 'HTML' is selected and 'Display Source' is UNCHECKED. Paste your code and save." />
                
                <Callout type="warning" title="Editor Preview Disabled">
                  Squarespace disables scripts while you are logged in to the editor. You must view your live site (or use an incognito window) to see the ad load.
                </Callout>
              </div>
            )}

            {activeTab === 'weebly' && (
              <div className="space-y-6">
                <Step number={1} title="Drag the Embed Code element" desc="From the left sidebar, find the 'Embed Code' (</>) element and drag it onto your page." />
                <Step number={2} title="Edit Custom HTML" desc="Click inside the element and select 'Edit Custom HTML'." />
                <Step number={3} title="Paste & Publish" desc="Paste your personalized snippet. Publish your site to see the ad live." />
              </div>
            )}

            {activeTab === 'webflow' && (
              <div className="space-y-6">
                <Step number={1} title="Add an Embed Component" desc="Open the Add panel (+) and drag an 'Embed' component onto your canvas." />
                <Step number={2} title="Paste the Snippet" desc="In the code editor window that appears, paste your personalized snippet." />
                <Step number={3} title="Publish to test" desc="Webflow does not execute scripts in the Designer. Publish to your .webflow.io staging domain to test." />
                
                <Callout type="info" title="Site-wide Head Code">
                  If you want sitewide tracking, you can also place the script tag in your Project Settings &gt; Custom Code.
                </Callout>
              </div>
            )}
          </div>

          {/* Right Pane: Code & Verification */}
          <div className="flex-1 p-6 flex flex-col bg-white dark:bg-[#0A0A0A] overflow-y-auto relative">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-white uppercase tracking-wider mb-2">
                1. Select Ad Unit
              </h4>
              {adUnits.length > 0 ? (
                <select 
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-zinc-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  value={selectedAdUnit}
                  onChange={(e) => setSelectedAdUnit(e.target.value)}
                >
                  {adUnits.map(unit => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.id})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-500 text-sm">
                  Placeholder Unit ID (Create an account to get real IDs)
                </div>
              )}
            </div>

            <div className="mb-4 flex-1">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">
                  2. Copy Snippet
                </h4>
                <button 
                  onClick={copyToClipboard}
                  className="text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {isCopied ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
              
              <div className="rounded-xl overflow-hidden shadow-inner border border-zinc-200 dark:border-zinc-800">
                <CodeBlock language="html" code={htmlSnippet} />
              </div>
            </div>

            {/* Verification Status */}
            <div className="mt-auto bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 flex items-center gap-3">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Waiting for first impression...</p>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/70">Install the snippet on your site and load the page to verify.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function Step({ number, title, desc }: { number: number, title: string, desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-none w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-700 dark:text-zinc-300 text-sm border border-zinc-300 dark:border-zinc-700">
        {number}
      </div>
      <div>
        <h4 className="font-semibold text-zinc-900 dark:text-white text-lg">{title}</h4>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">{desc}</p>
      </div>
    </div>
  );
}

function Callout({ title, children, type = 'info' }: { title: string, children: React.ReactNode, type?: 'info' | 'warning' }) {
  const colors = type === 'warning' 
    ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900/50 text-orange-800 dark:text-orange-200' 
    : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50 text-blue-800 dark:text-blue-200';
    
  return (
    <div className={`p-4 rounded-xl border ${colors}`}>
      <h5 className="font-bold mb-1">{title}</h5>
      <p className="text-sm opacity-90 leading-relaxed">{children}</p>
    </div>
  );
}
