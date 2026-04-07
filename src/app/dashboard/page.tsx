"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { Coins, Plus, Activity, LogOut, Globe, Image as ImageIcon } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [ads, setAds] = useState<any[]>([]);
  const [totalImpressions, setTotalImpressions] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showDocs, setShowDocs] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);
      
      try {
        // Fetch User Data for Credits
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserData(userSnap.data());
        }

        // Fetch user's ads
        const q = query(collection(db, "ads"), where("ownerUid", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);
        const adsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        let imp = 0;
        let clk = 0;
        adsData.forEach((ad: any) => {
          imp += ad.impressions || 0;
          clk += ad.clicks || 0;
        });
        
        setTotalImpressions(imp);
        setTotalClicks(clk);
        setAds(adsData);
      } catch (e) {
        console.error("Error fetching data:", e);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = () => {
    auth.signOut();
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex-grow w-full max-w-6xl mx-auto animate-in fade-in duration-500">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-zinc-400 mt-1">Manage your ads and sharing credits.</p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/create-ad"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)]"
          >
            <Plus className="w-5 h-5" />
            Create Ad
          </Link>
          <button 
            onClick={() => setShowDocs(!showDocs)}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
          >
            Instructions
          </button>
          <button 
            onClick={handleLogout}
            className="p-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
            title="Log out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        {/* Credit Card */}
        <div className="bg-gradient-to-br from-blue-900/40 to-black border border-blue-500/20 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[40px] rounded-full" />
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30 text-blue-400">
              <Coins className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-medium text-zinc-300">Available Credits</h3>
          </div>
          <p className="text-5xl font-bold text-white mb-2">{userData?.credits || 0}</p>
          <p className="text-sm text-green-400/80 bg-green-400/10 inline-block px-2 py-1 rounded border border-green-400/20">
            Earn more by showing ads
          </p>
        </div>

        {/* Active Ads */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-white">
              <Globe className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-medium text-zinc-300">Active Campaigns</h3>
          </div>
          <p className="text-5xl font-bold text-white mb-2">{ads.length}</p>
          <p className="text-sm text-zinc-500">Currently running globally</p>
        </div>

        {/* Global Impressions */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-white">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-medium text-zinc-300">Total Impressions</h3>
          </div>
          <p className="text-5xl font-bold text-white mb-2">{totalImpressions}</p>
          <p className="text-sm text-zinc-500">Network views so far</p>
        </div>

        {/* Total Clicks */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-white">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-medium text-zinc-300">Total Clicks</h3>
          </div>
          <p className="text-5xl font-bold text-white mb-2">{totalClicks}</p>
          <p className="text-sm text-zinc-500">Clicks across all campaigns</p>
        </div>
      </div>

      {showDocs && (
        <div className="mb-12 bg-white/5 border border-white/10 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-4">Integration Instructions</h2>
          <p className="text-zinc-400 mb-6">Choose your platform to integrate the AdTogether SDK and start earning credits instantly.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-black/50 p-6 rounded-xl border border-white/5">
              <h3 className="text-lg font-semibold text-blue-400 mb-3">React / Next.js</h3>
              <pre className="text-xs text-zinc-300 bg-black p-3 rounded-lg overflow-x-auto border border-white/10 mb-3">
                {`import { AdTogether } from 'web-sdk';
import { AdTogetherBanner } from 'web-sdk/react';

// Initialize
AdTogether.initialize({ appId: 'YOUR_APP_ID' });

// Use Banner
<AdTogetherBanner 
  adUnitId="home_banner" 
  theme="dark"
/>`}
              </pre>
            </div>
            <div className="bg-black/50 p-6 rounded-xl border border-white/5">
              <h3 className="text-lg font-semibold text-blue-400 mb-3">Flutter</h3>
              <pre className="text-xs text-zinc-300 bg-black p-3 rounded-lg overflow-x-auto border border-white/10 mb-3">
                {`import 'package:adtogether_sdk/adtogether_sdk.dart';

// Initialize
await AdTogether.initialize(appId: 'YOUR_APP_ID');

// Use Banner
AdTogetherBanner(
  adUnitId: 'home_banner',
  width: double.infinity,
  height: 80,
)`}
              </pre>
            </div>
            <div className="bg-black/50 p-6 rounded-xl border border-white/5">
              <h3 className="text-lg font-semibold text-blue-400 mb-3">iOS (SwiftUI)</h3>
              <pre className="text-xs text-zinc-300 bg-black p-3 rounded-lg overflow-x-auto border border-white/10 mb-3">
                {`import AdTogether

// Initialize
AdTogether.shared.initialize(appId: "YOUR_APP_ID")

// Use Banner
AdTogetherView(adUnitID: "home_banner")
    .frame(height: 80)`}
              </pre>
            </div>
            <div className="bg-black/50 p-6 rounded-xl border border-white/5">
              <h3 className="text-lg font-semibold text-blue-400 mb-3">Android (View/XML)</h3>
              <pre className="text-xs text-zinc-300 bg-black p-3 rounded-lg overflow-x-auto border border-white/10 mb-3">
                {`import com.adtogether.sdk.*

// Initialize
AdTogether.initialize(context, "YOUR_APP_ID")

// Code Setup
val adView = AdTogetherView(context)
adView.loadAd("home_banner")`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Ads List */}
      <div>
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-blue-400" />
          Your Advertisement Creatives
        </h2>
        
        {ads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-white/5 border border-white/10 border-dashed rounded-2xl text-center">
            <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mb-4">
              <Globe className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No active ads right now</h3>
            <p className="text-zinc-400 max-w-sm mb-6">
              Create an ad creative, set your target country, and use your credits to get it seen.
            </p>
            <Link
              href="/create-ad"
              className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
            >
              Upload First Ad
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ads.map((ad) => (
              <div key={ad.id} className="bg-black border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-colors group">
                <div className="h-40 bg-zinc-900 relative">
                  {ad.imageUrl ? (
                    <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600">No Image</div>
                  )}
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs border border-white/10">
                    Target: {ad.targetCountry}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-white truncate">{ad.title}</h3>
                  <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{ad.description}</p>
                  
                  <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs text-zinc-500 bg-white/5 px-2 py-1 rounded">
                      {ad.active ? "Active" : "Paused"}
                    </span>
                    <div className="flex gap-4">
                      <span className="text-sm text-zinc-400">👁 {ad.impressions || 0}</span>
                      <span className="text-sm text-zinc-400">👆 {ad.clicks || 0}</span>
                    </div>
                    <a href={ad.clickUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-400 hover:text-blue-300">
                      Preview Link →
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
