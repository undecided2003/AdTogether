"use client";

import { useState, useEffect, useRef } from 'react';
import { X, Play } from 'lucide-react';
import { AdTogether } from '@adtogether/web-sdk';
import { AdTogetherBanner, AdTogetherInterstitial } from '@adtogether/web-sdk/react';

function ExampleAdPreview({ onShowInterstitial }: { onShowInterstitial: () => void }) {
  return (
    <div className="py-2 flex flex-col space-y-6">
      <div>
        <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 mb-3 uppercase tracking-[0.2em]">Banner Ad Component</div>
        <div className="rounded-xl overflow-hidden border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-black/20">
          <AdTogetherBanner 
            adUnitId="example_banner" 
            showCloseButton={true}
            className="w-full"
            onAdClosed={() => console.log('Banner closed in preview')}
          />
        </div>
      </div>
      
      <div>
        <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 mb-3 uppercase tracking-[0.2em]">Interstitial Ad Trigger</div>
        <button
          onClick={onShowInterstitial}
          className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] group"
        >
          <div className="p-1 bg-black/10 rounded-full group-hover:scale-110 transition-transform">
            <Play className="w-3 h-3 fill-current" />
          </div>
          Show Interstitial Ad
        </button>
      </div>
    </div>
  );
}

export default function ExampleAdsButton() {
  const [showPopover, setShowPopover] = useState(false);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      // Use the project's default example key
      // Initialize the SDK with your App ID and Bundle ID
      AdTogether.initialize({ 
        appId: 'at_f57425e89a9545eda1162baeedb78636',
        bundleId: 'com.adtogether.demo'
      });
    } catch (e) {
      console.error('Error initializing AdTogether', e);
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    }
    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPopover]);

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        onClick={() => setShowPopover(!showPopover)}
        className="flex items-center justify-center rounded border border-zinc-300 dark:border-zinc-700 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white px-8 py-4 font-semibold transition-colors duration-200"
      >
        Example Ads
      </button>

      {showPopover && (
        <div className="absolute top-full mt-4 left-0 sm:left-auto sm:right-0 bg-white dark:bg-[#0F0F0F] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-50 w-[320px] sm:w-[380px] animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-5">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-widest leading-none mb-1">Live SDK Preview</span>
              <span className="text-sm font-bold text-zinc-900 dark:text-white">AdTogether Web Core v0.1.23</span>
            </div>
            <button 
              onClick={() => setShowPopover(false)} 
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <ExampleAdPreview onShowInterstitial={() => {
            setShowInterstitial(true);
            setShowPopover(false);
          }} />
          
          <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
              <p className="text-[10px] text-zinc-400 dark:text-zinc-600 font-medium whitespace-nowrap">SDK v0.1.23 active and connected</p>
            </div>
            <p className="text-[9px] text-zinc-400 dark:text-zinc-700 max-w-[240px] leading-relaxed">
              * Analytics now include auto-detected bundleId, platform, and environment metadata for better tracking.
            </p>
          </div>
        </div>
      )}

      <AdTogetherInterstitial
        adUnitId="example_interstitial"
        isOpen={showInterstitial}
        onClose={() => setShowInterstitial(false)}
        closeDelay={3}
      />
    </div>
  );
}
