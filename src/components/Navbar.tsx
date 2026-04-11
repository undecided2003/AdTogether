"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { Menu, X, LogOut, User as UserIcon } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { AdTogether } from '@adtogether/web-sdk';
import { AdTogetherBanner } from '@adtogether/web-sdk/react';

function ExampleAdPreview() {
  return (
    <div className="py-2">
      <AdTogetherBanner 
        adUnitId="example_banner" 
        className="w-full"
      />
    </div>
  );
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showExampleAd, setShowExampleAd] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    try {
      AdTogether.initialize({ apiKey: 'at_a6fc73caffd44e2d8e8e058538dc8c70' });
    } catch (e) {
      console.error('Error initializing AdTogether', e);
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowExampleAd(false);
      }
    }
    if (showExampleAd) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExampleAd]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="sticky w-full z-50 top-0 left-0 border-b border-zinc-200 dark:border-white/10 bg-white/50 dark:bg-black/50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between p-4 px-6 md:px-12">
        <Link href="/" className="flex items-center">
          <Image
            src="/adtogether_logo.png"
            alt="AdTogether"
            width={140}
            height={36}
            className="object-contain"
            priority
          />
        </Link>
        
        {/* Mobile menu button */}
        <div className="flex md:hidden order-3 pl-4">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-zinc-600 dark:text-gray-400 hover:text-zinc-900 dark:hover:text-white focus:outline-none"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        <div className={`w-full md:w-auto md:order-2 md:flex md:items-center md:space-x-4 transition-all duration-300 ${isOpen ? 'block mt-4' : 'hidden'}`}>
          <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4 pb-4 md:pb-0">
            <div className="relative" ref={popoverRef}>
              <button
                className="text-zinc-600 dark:text-zinc-300 hover:text-amber-500 dark:hover:text-amber-400 font-medium rounded-lg text-sm px-4 py-2 transition-colors duration-300"
                onClick={() => setShowExampleAd(!showExampleAd)}
              >
                Example Ad
              </button>
              
              {showExampleAd && (
                <div className="absolute top-full mt-2 right-0 md:left-1/2 md:right-auto md:-translate-x-1/2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl p-4 shadow-2xl z-50 w-[320px] sm:w-[400px]">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Live AdTogether Preview</span>
                    <button onClick={() => setShowExampleAd(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <ExampleAdPreview />
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-3 text-center">Powered by the AdTogether Web SDK</p>
                </div>
              )}
            </div>
            <Link
              href="/docs"
              className="text-zinc-600 dark:text-zinc-300 hover:text-amber-500 dark:hover:text-amber-400 font-medium rounded-lg text-sm px-4 py-2 transition-colors duration-300"
              onClick={() => setIsOpen(false)}
            >
              Docs
            </Link>
            {!loading && (
              <>
                {user ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="text-zinc-900 dark:text-white hover:text-amber-500 dark:hover:text-amber-400 font-medium rounded-lg text-sm px-4 py-2 transition-colors duration-300 flex items-center gap-2"
                      onClick={() => setIsOpen(false)}
                    >
                      <UserIcon className="w-4 h-4" />
                      Dashboard
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="text-zinc-600 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 font-medium rounded-lg text-sm px-4 py-2 transition-colors duration-300 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="text-zinc-900 dark:text-white hover:text-amber-500 dark:hover:text-amber-400 font-medium rounded-lg text-sm px-4 py-2 transition-colors duration-300"
                      onClick={() => setIsOpen(false)}
                    >
                      Log in
                    </Link>
                    <Link
                      href="/login"
                      className="text-zinc-900 bg-amber-500 hover:bg-amber-400 font-medium rounded-lg text-sm px-5 py-2 transition-all duration-300 shadow-[0_0_15px_rgba(245,158,11,0.3)] dark:shadow-[0_0_15px_rgba(245,158,11,0.5)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] dark:hover:shadow-[0_0_25px_rgba(245,158,11,0.8)] inline-block w-fit"
                      onClick={() => setIsOpen(false)}
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
