import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center flex-grow text-center w-full max-w-5xl mx-auto space-y-16 animate-in fade-in zoom-in duration-1000 slide-in-from-bottom-8">
      
      {/* Hero Section */}
      <div className="space-y-6 pt-16 md:pt-24 relative">
        {/* Background glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-blue-600/20 blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 bg-purple-600/20 blur-[100px] rounded-full pointer-events-none -z-10" />

        <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 backdrop-blur-sm px-3 py-1 text-sm text-blue-200 uppercase tracking-wider">
          <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
          PEER-TO-PEER AD EXCHANGE
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/40 drop-shadow-sm pb-2 uppercase">
          Shown an ad,<br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">get an ad shown.</span>
        </h1>

        <p className="max-w-3xl mx-auto text-lg md:text-xl text-zinc-400 font-light leading-relaxed">
          Stop paying for expensive user acquisition—instead, trade impressions with 
          fellow creators. Serve one ad, earn one credit, and grow your app globally 
          without a marketing budget.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 font-semibold transition-all duration-300 shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_40px_rgba(37,99,235,0.6)] transform hover:-translate-y-1"
          >
            Start Earning Credits
          </Link>
          <Link
            href="/docs"
            className="w-full sm:w-auto flex items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white px-8 py-4 font-medium backdrop-blur-md transition-all duration-300"
          >
            Read the Docs
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full pt-16 border-t border-white/5">
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors text-left space-y-4">
          <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-2xl">
            🌍
          </div>
          <h3 className="text-xl font-bold text-white">Reciprocal Growth</h3>
          <p className="text-zinc-400 leading-relaxed text-sm">
            Stop paying for users—trade for them. Serve ads locally to generate high-value credits that put your app in front of an audience worldwide.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors text-left space-y-4">
          <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-2xl">
            🚀
          </div>
          <h3 className="text-xl font-bold text-white">Developer First</h3>
          <p className="text-zinc-400 leading-relaxed text-sm">
            A drop-in SDK designed for one project to support iOS, Android, and Web. Native, banner, and interstitial formats supported with zero overhead.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors text-left space-y-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-2xl">
            💎
          </div>
          <h3 className="text-xl font-bold text-white">Transparent Economy</h3>
          <p className="text-zinc-400 leading-relaxed text-sm">
            Our fair-trade system balances impressions by value. If you serve a high-tier interstitial, you get a high-tier interstitial back. Guaranteed.
          </p>
        </div>
      </div>
    </div>
  );
}
