"use client";

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed w-full z-50 top-0 left-0 border-b border-white/10 bg-black/50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between p-4 px-6 md:px-12">
        <Link href="/" className="flex items-center space-x-3 rtl:space-x-reverse">
          <span className="self-center text-2xl font-bold whitespace-nowrap text-white">
            Ad<span className="text-blue-500">Together</span>
          </span>
        </Link>
        
        {/* Mobile menu button */}
        <div className="flex md:hidden order-3 pl-4">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-gray-400 hover:text-white focus:outline-none"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        <div className={`w-full md:w-auto md:order-2 md:flex md:items-center md:space-x-4 transition-all duration-300 ${isOpen ? 'block mt-4' : 'hidden'}`}>
          <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4 pb-4 md:pb-0">
            <Link
              href="/docs"
              className="text-zinc-300 hover:text-blue-400 font-medium rounded-lg text-sm px-4 py-2 transition-colors duration-300"
              onClick={() => setIsOpen(false)}
            >
              Docs
            </Link>
            <Link
              href="/login"
              className="text-white hover:text-blue-400 font-medium rounded-lg text-sm px-4 py-2 transition-colors duration-300"
              onClick={() => setIsOpen(false)}
            >
              Log in
            </Link>
            <Link
              href="/dashboard"
              className="text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-lg text-sm px-5 py-2 transition-all duration-300 shadow-[0_0_15px_rgba(37,99,235,0.5)] hover:shadow-[0_0_25px_rgba(37,99,235,0.8)] inline-block w-fit"
              onClick={() => setIsOpen(false)}
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
