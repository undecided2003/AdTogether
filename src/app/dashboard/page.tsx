"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, deleteDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { Coins, Plus, Activity, LogOut, Globe, Image as ImageIcon, MousePointerClick, MapPin, Check, Key, Copy, Eye, EyeOff, X } from "lucide-react";
import Link from "next/link";
import { CodeBlock } from "@/components/CodeBlock";
import { COUNTRIES } from "@/lib/countries";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [ads, setAds] = useState<any[]>([]);
  const [totalImpressions, setTotalImpressions] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showDocs, setShowDocs] = useState(false);
  
  // Profile settings state
  const [editingCountry, setEditingCountry] = useState(false);
  const [newCountry, setNewCountry] = useState("");
  const [savingCountry, setSavingCountry] = useState(false);
  
  // API key state
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [generatingKey, setGeneratingKey] = useState(false);
  
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
          setNewCountry(userSnap.data().country || "Unknown");
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

  const handleUpdateCountry = async () => {
    if (!user || newCountry === userData?.country) {
      setEditingCountry(false);
      return;
    }
    setSavingCountry(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { country: newCountry });
      setUserData({ ...userData, country: newCountry });
      setEditingCountry(false);
    } catch (e) {
      console.error("Failed to update country", e);
    } finally {
      setSavingCountry(false);
    }
  };

  const handleToggleAdStatus = async (adId: string, currentStatus: boolean) => {
    try {
      const adRef = doc(db, "ads", adId);
      await updateDoc(adRef, { active: !currentStatus });
      setAds(ads.map(ad => ad.id === adId ? { ...ad, active: !currentStatus } : ad));
    } catch (e) {
      console.error("Failed to toggle ad status", e);
    }
  };

  const handleDeleteAd = async (adId: string) => {
    if (!window.confirm("Are you sure you want to delete this campaign? This action cannot be undone.")) return;
    try {
      const adRef = doc(db, "ads", adId);
      await deleteDoc(adRef);
      setAds(ads.filter(ad => ad.id !== adId));
    } catch (e) {
      console.error("Failed to delete ad", e);
    }
  };

  const handleGenerateApiKey = async () => {
    if (!user) return;
    const currentKeys = userData?.apiKeys || (userData?.apiKey ? [userData.apiKey] : []);
    if (currentKeys.length >= 3) {
      alert("You can only generate up to 3 API keys.");
      return;
    }
    
    setGeneratingKey(true);
    try {
      const newKey = `at_${crypto.randomUUID().replace(/-/g, '')}`;
      const updatedKeys = [...currentKeys, newKey];
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { apiKeys: updatedKeys, apiKey: updatedKeys[0] });
      setUserData({ ...userData, apiKeys: updatedKeys, apiKey: updatedKeys[0] });
      setShowApiKey(prev => ({ ...prev, [newKey]: true }));
    } catch (e) {
      console.error("Failed to generate API key", e);
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleDeleteApiKey = async (keyToDelete: string) => {
    if (!user) return;
    if (!window.confirm("Are you sure you want to delete this API key? Apps using it will fail to track impressions.")) return;
    const currentKeys = userData?.apiKeys || (userData?.apiKey ? [userData.apiKey] : []);
    const updatedKeys = currentKeys.filter((k: string) => k !== keyToDelete);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { apiKeys: updatedKeys, apiKey: updatedKeys[0] || null });
      setUserData({ ...userData, apiKeys: updatedKeys, apiKey: updatedKeys[0] || null });
    } catch (e) {
      console.error("Failed to delete API key", e);
    }
  };

  const copyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    alert("API Key copied to clipboard!");
  };

  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="flex-grow w-full max-w-6xl mx-auto animate-in fade-in duration-500">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 pb-6 border-b border-zinc-200 dark:border-white/10">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Dashboard</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage your campaigns and sharing credits.</p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/create-ad"
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm dark:shadow-[0_0_15px_rgba(245,158,11,0.3)]"
          >
            <Plus className="w-5 h-5" />
            Create Campaign
          </Link>
          <button 
            onClick={() => setShowDocs(!showDocs)}
            className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
          >
            Instructions
          </button>
          <button 
            onClick={handleLogout}
            className="p-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 dark:border-white/10 dark:hover:bg-white/5 dark:text-zinc-400 dark:hover:text-white transition-colors"
            title="Log out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
        {/* Credit Card */}
        <div className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/40 dark:to-black border border-amber-200 dark:border-amber-500/20 rounded-2xl p-6 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[40px] rounded-full" />
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-500/20 rounded-xl border border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400">
              <Coins className="w-5 h-5" />
            </div>
            <h3 className="text-md font-medium text-zinc-700 dark:text-zinc-300">Credits</h3>
          </div>
          <p className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">{userData?.credits || 0}</p>
          <p className="text-xs text-green-700 dark:text-green-400/80 bg-green-100 dark:bg-green-400/10 inline-block px-2 py-1 rounded border border-green-200 dark:border-green-400/20 truncate max-w-full">
            Earn more by showing ads
          </p>
        </div>

        {/* Active Ads */}
        <div className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-zinc-50 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-white">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="text-md font-medium text-zinc-700 dark:text-zinc-300">Campaigns</h3>
          </div>
          <p className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">{ads.length}</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">Currently active</p>
        </div>

        {/* Global Impressions */}
        <div className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-zinc-50 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-white">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-md font-medium text-zinc-700 dark:text-zinc-300">Impressions</h3>
          </div>
          <p className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">{totalImpressions}</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">Network views</p>
        </div>

        {/* Total Clicks */}
        <div className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-zinc-50 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-white">
              <MousePointerClick className="w-5 h-5" />
            </div>
            <h3 className="text-md font-medium text-zinc-700 dark:text-zinc-300">Clicks</h3>
          </div>
          <p className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">{totalClicks}</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">Across campaigns</p>
        </div>

        {/* CTR */}
        <div className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-zinc-50 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-white">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-md font-medium text-zinc-700 dark:text-zinc-300">CTR</h3>
          </div>
          <p className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">{ctr}%</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">Click-through rate</p>
        </div>
      </div>

      {/* Credit System Explanation */}
      <div className="mb-12 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden relative shadow-sm">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="flex-grow z-10">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-2">
            <Coins className="w-5 h-5 text-amber-500 dark:text-amber-400" /> How Credits Work
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-4 md:mb-0">
            AdTogether is a fair, 1-to-1 ad exchange. Every time you show an ad in your app, you earn <strong className="text-amber-600 dark:text-amber-300">1 credit</strong>. Every time your ad is shown in someone else's app, you spend <strong className="text-amber-600 dark:text-amber-300">1 credit</strong>. 
          </p>
        </div>
        <div className="flex shrink-0 gap-4 z-10 w-full md:w-auto">
          <div className="bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 flex-1 md:flex-none">
            <div className="text-green-600 dark:text-green-400 text-sm font-semibold mb-1">+ Earn</div>
            <div className="text-zinc-500 dark:text-zinc-400 text-xs text-balance">Integrate SDK & show ads</div>
          </div>
          <div className="bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 flex-1 md:flex-none">
            <div className="text-amber-600 dark:text-amber-400 text-sm font-semibold mb-1">- Spend</div>
            <div className="text-zinc-500 dark:text-zinc-400 text-xs text-balance">Your ads are shown globally</div>
          </div>
        </div>
      </div>

      {/* Target Profile Notice */}
      {userData && (
        <div className="mb-12 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-500/10 rounded-full text-amber-600 dark:text-amber-400">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Targeting Profile</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Your ads show to users in similar demographics. Your current location is set to: <strong className="text-amber-600 dark:text-amber-300">{userData.country}</strong>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {editingCountry ? (
              <div className="flex gap-2 w-full">
                <select
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value)}
                  className="bg-white dark:bg-black/50 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-2 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Unknown">Select Country...</option>
                  <option value="global">Global (Worldwide)</option>
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleUpdateCountry}
                  disabled={savingCountry}
                  className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-xl transition flex items-center justify-center gap-2"
                >
                  {savingCountry ? "..." : <Check className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingCountry(true)}
                className="w-full sm:w-auto bg-white hover:bg-zinc-50 dark:bg-white/5 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-white px-5 py-2.5 rounded-xl transition"
              >
                {userData.country === "Unknown" ? "Set Location" : "Update"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* API Key Section */}
      {userData && (
        <div className="mb-12 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-zinc-100 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-white">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">API Keys</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Manage your API keys (up to 3). Use them to authenticate with the SDK.
                </p>
              </div>
            </div>
            
            {(!(userData.apiKeys || (userData.apiKey ? [userData.apiKey] : [])).length || (userData.apiKeys || (userData.apiKey ? [userData.apiKey] : [])).length < 3) && (
              <button
                onClick={handleGenerateApiKey}
                disabled={generatingKey}
                className="w-full sm:w-auto bg-zinc-100 hover:bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-white px-5 py-2.5 rounded-xl font-medium transition-colors whitespace-nowrap"
              >
                {generatingKey ? "Generating..." : "Generate Key"}
              </button>
            )}
          </div>
          
          {(userData.apiKeys || (userData.apiKey ? [userData.apiKey] : [])).length > 0 && (
            <div className="mt-6 space-y-3">
              {(userData.apiKeys || (userData.apiKey ? [userData.apiKey] : [])).map((key: string) => (
                <div key={key} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-white/10 rounded-xl p-4 gap-4">
                  <div className="font-mono text-sm text-zinc-800 dark:text-zinc-200 truncate pr-4">
                    {showApiKey[key] ? key : "•".repeat(40)}
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                    <button
                      onClick={() => setShowApiKey(prev => ({ ...prev, [key]: !prev[key] }))}
                      className="p-2 bg-white hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-white/10 rounded-lg text-zinc-600 dark:text-zinc-400 transition-colors"
                      title={showApiKey[key] ? "Hide Key" : "Show Key"}
                    >
                      {showApiKey[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => copyApiKey(key)}
                      className="p-2 bg-white hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-white/10 rounded-lg text-zinc-600 dark:text-zinc-400 transition-colors"
                      title="Copy Key"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteApiKey(key)}
                      className="p-2 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 border border-red-100 dark:border-red-500/20 rounded-lg text-red-600 dark:text-red-400 transition-colors"
                      title="Delete Key"
                    >
                       <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showDocs && (
        <div className="mb-12 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">Integration Instructions</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mb-6">Choose your platform to integrate the AdTogether SDK and start earning credits instantly.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-zinc-50 dark:bg-black/50 p-6 rounded-xl border border-zinc-200 dark:border-white/5 flex flex-col">
              <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-400 mb-3 flex-none">React / Next.js</h3>
              <CodeBlock 
                language="tsx"
                code={`import { AdTogether } from 'web-sdk';
import { AdTogetherBanner } from 'web-sdk/react';

// Initialize
AdTogether.initialize({ apiKey: '${userData?.apiKeys?.[0] || userData?.apiKey || 'YOUR_API_KEY'}' });

// Use Banner
<AdTogetherBanner 
  adUnitId="home_banner" 
  theme="dark"
/>`} 
              />
            </div>
            <div className="bg-zinc-50 dark:bg-black/50 p-6 rounded-xl border border-zinc-200 dark:border-white/5 flex flex-col">
              <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-400 mb-3 flex-none">Flutter</h3>
              <CodeBlock
                language="dart"
                code={`import 'package:adtogether_sdk/adtogether_sdk.dart';

// Initialize
await AdTogether.initialize(apiKey: '${userData?.apiKeys?.[0] || userData?.apiKey || 'YOUR_API_KEY'}');

// Use Banner
AdTogetherBanner(
  adUnitId: 'home_banner',
  width: double.infinity,
  height: 80,
)`}
              />
            </div>
            <div className="bg-zinc-50 dark:bg-black/50 p-6 rounded-xl border border-zinc-200 dark:border-white/5 flex flex-col">
              <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-400 mb-3 flex-none">iOS (SwiftUI)</h3>
              <CodeBlock
                language="swift"
                code={`import AdTogether

// Initialize
AdTogether.shared.initialize(apiKey: "${userData?.apiKeys?.[0] || userData?.apiKey || 'YOUR_API_KEY'}")

// Use Banner
AdTogetherView(adUnitID: "home_banner")
    .frame(height: 80)`}
              />
            </div>
            <div className="bg-zinc-50 dark:bg-black/50 p-6 rounded-xl border border-zinc-200 dark:border-white/5 flex flex-col">
              <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-400 mb-3 flex-none">Android (View/XML)</h3>
              <CodeBlock
                language="kotlin"
                code={`import com.adtogether.sdk.*

// Initialize
AdTogether.initialize(context, "${userData?.apiKeys?.[0] || userData?.apiKey || 'YOUR_API_KEY'}")

// Code Setup
val adView = AdTogetherView(context)
adView.loadAd("home_banner")`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Ads List */}
      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-amber-500 dark:text-amber-400" />
          Your Campaigns
        </h2>
        
        {ads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-white/5 border border-zinc-300 dark:border-white/10 border-dashed rounded-2xl text-center shadow-sm">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mb-4">
              <Globe className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">No active campaigns right now</h3>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mb-6">
              Create a campaign, set your target country, and use your credits to get it seen.
            </p>
            <Link
              href="/create-ad"
              className="bg-zinc-100 hover:bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
            >
              Create First Campaign
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ads.map((ad) => (
              <div key={ad.id} className="bg-white dark:bg-black border border-zinc-200 dark:border-white/10 rounded-2xl overflow-hidden hover:border-zinc-300 dark:hover:border-white/20 transition-colors group shadow-sm">
                <div className="h-40 bg-zinc-100 dark:bg-zinc-900 relative">
                  {ad.imageUrl ? (
                    <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover opacity-90 dark:opacity-80 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400 dark:text-zinc-600">No Image</div>
                  )}
                  <div className="absolute top-3 right-3 bg-white/80 dark:bg-black/60 backdrop-blur px-2 py-1 rounded text-xs border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300">
                    Target: {ad.targetCountry}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white truncate">{ad.title}</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">{ad.description}</p>
                  
                  <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-white/10 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">👁 {ad.impressions || 0}   👆 {ad.clicks || 0}</span>
                      <a href={ad.clickUrl} target="_blank" rel="noreferrer" className="text-sm text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300">
                        Preview Link →
                      </a>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-white/5">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleAdStatus(ad.id, ad.active)}
                          className={`text-xs px-3 py-1.5 rounded transition ${ad.active ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700' : 'bg-amber-100 text-amber-600 hover:bg-amber-200 border border-amber-200 dark:bg-amber-600/20 dark:text-amber-400 dark:hover:bg-amber-600/30 dark:border-amber-500/20'}`}
                        >
                          {ad.active ? "Pause" : "Resume"}
                        </button>
                        <button
                          onClick={() => handleDeleteAd(ad.id)}
                          className="text-xs px-3 py-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 dark:border-red-500/20 transition"
                        >
                          Delete
                        </button>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded border ${ad.active ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' : 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-white/10'}`}>
                        {ad.active ? "Active" : "Paused"}
                      </span>
                    </div>
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
