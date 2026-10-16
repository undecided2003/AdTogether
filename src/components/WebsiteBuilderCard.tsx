"use client";

import { useState } from 'react';
import { Globe } from 'lucide-react';
import PlatformGuideModal from '@/components/PlatformGuideModal';

const AD_UNITS = [
  { id: 'home_banner', name: 'Homepage Banner' },
  { id: 'sidebar', name: 'Sidebar Ad' },
  { id: 'interstitial', name: 'Interstitial Popup' },
];

export default function WebsiteBuilderCard() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        title="Open Website Builder Guides"
        className="flex flex-col p-6 h-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0A0A0A] hover:border-amber-400 dark:hover:border-[#FFCE2A] transition-all group shadow-sm hover:shadow-md text-left"
      >
        <div className="w-10 h-10 mb-4 grayscale opacity-80 group-hover:opacity-100 group-hover:grayscale-0 transition-all flex items-center justify-center">
          <Globe className="w-10 h-10" />
        </div>
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-[#FFCE2A] transition-colors">Website Builders</h3>
        <p className="text-xs font-mono text-zinc-500 mt-1 truncate" title="WordPress, Wix, Squarespace">WordPress, Wix, Squarespace</p>
        
        <div className="mt-auto pt-6 flex justify-between items-center text-sm border-t border-zinc-100 dark:border-zinc-800">
          <span className="text-zinc-500">Integration</span>
          <span className="font-semibold text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-xs">HTML Snippet</span>
        </div>
      </button>

      <PlatformGuideModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialPlatform="wordpress"
        adUnits={AD_UNITS}
      />
    </>
  );
}