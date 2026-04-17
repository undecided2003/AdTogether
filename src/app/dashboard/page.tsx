"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, deleteDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { Coins, Plus, Activity, LogOut, Globe, Image as ImageIcon, MousePointerClick, MapPin, Check, Key, Copy, Eye, EyeOff, X, ChevronDown, ChevronUp, Monitor, Pencil, Smartphone, Shield, ShieldAlert, ArrowDownUp, TrendingUp } from "lucide-react";
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
  
  // App ID state
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [generating, setGenerating] = useState(false);
  
  // App ID labeling state
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [editLabelValue, setEditLabelValue] = useState("");
  
  // Origin tracking state
  const [originsModalAdId, setOriginsModalAdId] = useState<string | null>(null);
  
  // Earnings log state
  const [showEarnings, setShowEarnings] = useState(false);
  
  // App ID copying state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
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

  const handleToggleBlockSource = async (adId: string, source: string, isBlocked: boolean) => {
    try {
      const adRef = doc(db, "ads", adId);
      if (isBlocked) {
        await updateDoc(adRef, {
          blockedOrigins: arrayRemove(source)
        });
        setAds(ads.map(ad => ad.id === adId ? { ...ad, blockedOrigins: (ad.blockedOrigins || []).filter((o: string) => o !== source) } : ad));
      } else {
        await updateDoc(adRef, {
          blockedOrigins: arrayUnion(source)
        });
        setAds(ads.map(ad => ad.id === adId ? { ...ad, blockedOrigins: [...(ad.blockedOrigins || []), source] } : ad));
      }
    } catch (e) {
      console.error("Failed to toggle block status", e);
      alert("Failed to update blocklist");
    }
  };

  const handleGenerateApiKey = async () => {
    if (!user) return;
    const label = newKeyLabel.trim();
    if (!label) {
      alert("Please enter an app or website name for this key.");
      return;
    }
    const currentKeys = userData?.apiKeys || (userData?.apiKey ? [userData.apiKey] : []);
    if (currentKeys.length >= 3) {
      alert("You can only generate up to 3 App IDs.");
      return;
    }
    
    setGenerating(true);
    try {
      const newKey = `at_${crypto.randomUUID().replace(/-/g, '')}`;
      const updatedKeys = [...currentKeys, newKey];
      const currentLabels = userData?.apiKeyLabels || {};
      const updatedLabels = { ...currentLabels, [newKey]: label };
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { apiKeys: updatedKeys, apiKey: updatedKeys[0], apiKeyLabels: updatedLabels });
      setUserData({ ...userData, apiKeys: updatedKeys, apiKey: updatedKeys[0], apiKeyLabels: updatedLabels });
      setShowApiKey(prev => ({ ...prev, [newKey]: true }));
      setNewKeyLabel("");
      setShowNewKeyForm(false);
    } catch (e) {
      console.error("Failed to generate App ID", e);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteApiKey = async (keyToDelete: string) => {
    if (!user) return;
    const label = userData?.apiKeyLabels?.[keyToDelete] || 'this key';
    if (!window.confirm(`Are you sure you want to delete the App ID for "${label}"? Apps using it will fail to track impressions.`)) return;
    const currentKeys = userData?.apiKeys || (userData?.apiKey ? [userData.apiKey] : []);
    const updatedKeys = currentKeys.filter((k: string) => k !== keyToDelete);
    const currentLabels = { ...(userData?.apiKeyLabels || {}) };
    delete currentLabels[keyToDelete];
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { apiKeys: updatedKeys, apiKey: updatedKeys[0] || null, apiKeyLabels: currentLabels });
      setUserData({ ...userData, apiKeys: updatedKeys, apiKey: updatedKeys[0] || null, apiKeyLabels: currentLabels });
    } catch (e) {
      console.error("Failed to delete App ID", e);
    }
  };

  const handleUpdateLabel = async (key: string) => {
    if (!user) return;
    const label = editLabelValue.trim();
    if (!label) return;
    try {
      const currentLabels = { ...(userData?.apiKeyLabels || {}) };
      currentLabels[key] = label;
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { apiKeyLabels: currentLabels });
      setUserData({ ...userData, apiKeyLabels: currentLabels });
      setEditingLabel(null);
    } catch (e) {
      console.error("Failed to update label", e);
    }
  };

  const copyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
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
            <Coins className="w-5 h-5 text-amber-500 dark:text-amber-400" /> How Credits Work to Increase Conversions
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-4 md:mb-0">
            AdTogether is a fair ad exchange: <strong>"Show an ad, get an ad shown"</strong>. Showing or placing a banner ad has a base cost/reward of <strong className="text-amber-600 dark:text-amber-300">1 credit</strong>. Interstitial ads (full screen) are more engaging and have a base cost/reward of <strong className="text-amber-600 dark:text-amber-300">5 credits</strong> per impression.
            <br/><br/>
            <strong>Note:</strong> Final credit rates are multiplied by a geographic tier multiplier (up to 5x) based on the location of the user viewing the ad to ensure maximum value as you grow your audience.
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

      {/* Credit Earnings Log */}
      {userData?.earningsLog && Object.keys(userData.earningsLog).length > 0 && (
        <div className="mb-12 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowEarnings(!showEarnings)}
            className="w-full flex items-center justify-between p-6 hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-500/10 rounded-xl border border-green-200 dark:border-green-500/20 text-green-600 dark:text-green-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Credit Earnings</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Campaigns shown by your apps that earned you credits
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 px-3 py-1 rounded-lg">
                +{Object.values(userData.earningsLog as Record<string, any>).reduce((sum: number, e: any) => sum + (e.creditsEarned || 0), 0)} credits earned
              </span>
              {showEarnings ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
            </div>
          </button>
          
          {showEarnings && (
            <div className="px-6 pb-6">
              <div className="grid grid-cols-1 gap-3">
                {Object.entries(userData.earningsLog as Record<string, any>)
                  .sort(([, a], [, b]) => (b.creditsEarned || 0) - (a.creditsEarned || 0))
                  .map(([adId, entry]) => {
                    const apiKeys = userData.apiKeys || (userData.apiKey ? [userData.apiKey] : []);
                    const keyLabel = entry.apiKey && userData.apiKeyLabels?.[entry.apiKey]
                      ? userData.apiKeyLabels[entry.apiKey]
                      : 'Unknown App';
                    const maskedKey = entry.apiKey ? `${entry.apiKey.substring(0, 6)}...${entry.apiKey.slice(-4)}` : '—';
                    
                    return (
                      <div
                        key={adId}
                        className="bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:border-zinc-300 dark:hover:border-white/20 transition-colors"
                      >
                        {/* Campaign image + info */}
                        <div className="flex items-center gap-3 flex-grow min-w-0">
                          <div className="w-12 h-12 rounded-lg bg-zinc-200 dark:bg-zinc-800 overflow-hidden shrink-0 border border-zinc-200 dark:border-white/10">
                            {entry.adImageUrl ? (
                              <img src={entry.adImageUrl} alt={entry.adTitle} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-400 dark:text-zinc-600">
                                <ImageIcon className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-zinc-900 dark:text-white truncate text-sm">
                              {entry.adTitle || 'Unknown Campaign'}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                entry.adType === 'interstitial'
                                  ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20'
                                  : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                              }`}>
                                {entry.adType === 'interstitial' ? 'INTERSTITIAL' : 'BANNER'}
                              </span>
                              <span className="text-xs text-zinc-400 dark:text-zinc-500 truncate" title={`Ad ID: ${adId}`}>
                                {adId.substring(0, 8)}...
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 sm:gap-6 shrink-0 w-full sm:w-auto">
                          <div className="flex flex-col items-center">
                            <span className="text-lg font-bold text-zinc-900 dark:text-white">{(entry.impressions || 0).toLocaleString()}</span>
                            <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Views</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-lg font-bold text-zinc-900 dark:text-white">{(entry.clicks || 0).toLocaleString()}</span>
                            <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Clicks</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-lg font-bold text-green-600 dark:text-green-400">+{(entry.creditsEarned || 0).toLocaleString()}</span>
                            <span className="text-[10px] uppercase tracking-wider text-green-500/80 dark:text-green-500/60">Credits</span>
                          </div>
                          <div className="flex flex-col items-center min-w-0">
                            <div className="flex items-center gap-1">
                              <Smartphone className="w-3 h-3 text-amber-500 dark:text-amber-400 shrink-0" />
                              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[100px]" title={`${keyLabel} (${entry.apiKey})`}>
                                {keyLabel}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 truncate max-w-[100px]" title={entry.apiKey}>
                              {maskedKey}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

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

      {/* App ID Section */}
      {userData && (
        <div className="mb-12 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-zinc-100 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-white">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">App IDs</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  One App ID per app or website (up to 3). Each ID tracks its own traffic.
                </p>
              </div>
            </div>
            
            {(!(userData.apiKeys || (userData.apiKey ? [userData.apiKey] : [])).length || (userData.apiKeys || (userData.apiKey ? [userData.apiKey] : [])).length < 3) && !showNewKeyForm && (
              <button
                onClick={() => setShowNewKeyForm(true)}
                className="w-full sm:w-auto bg-zinc-100 hover:bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-white px-5 py-2.5 rounded-xl font-medium transition-colors whitespace-nowrap flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add App
              </button>
            )}
          </div>

          {/* New key creation form */}
          {showNewKeyForm && (
            <div className="mt-6 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-amber-500" />
                Register a new app or website
              </h4>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder='e.g. "My Blog" or "Adventure Book"'
                  value={newKeyLabel}
                  onChange={(e) => setNewKeyLabel(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerateApiKey()}
                  className="flex-grow bg-white dark:bg-black/50 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerateApiKey}
                    disabled={generating || !newKeyLabel.trim()}
                    className="px-4 py-2 bg-zinc-900 border border-transparent dark:bg-zinc-800 text-white dark:text-zinc-200 text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {generating ? "Generating..." : "Generate App ID"}
                  </button>
                  <button
                    onClick={() => { setShowNewKeyForm(false); setNewKeyLabel(""); }}
                    className="p-2.5 rounded-xl border border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {(userData.apiKeys || (userData.apiKey ? [userData.apiKey] : [])).length > 0 && (
            <div className="mt-6 space-y-3">
              {(userData.apiKeys || (userData.apiKey ? [userData.apiKey] : [])).map((key: string) => {
                const label = userData?.apiKeyLabels?.[key] || 'Unlabeled App';
                return (
                  <div key={key} className="bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-white/10 rounded-xl p-4">
                    {/* Label row */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                        {editingLabel === key ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editLabelValue}
                              onChange={(e) => setEditLabelValue(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleUpdateLabel(key)}
                              className="bg-white dark:bg-black/50 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-1 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                              autoFocus
                            />
                            <button
                              onClick={() => handleUpdateLabel(key)}
                              className="p-1 text-amber-600 dark:text-amber-400 hover:text-amber-500 transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingLabel(null)}
                              className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingLabel(key); setEditLabelValue(label); }}
                            className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors group"
                          >
                            {label}
                            <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteApiKey(key)}
                        className="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 border border-red-100 dark:border-red-500/20 rounded-lg text-red-600 dark:text-red-400 transition-colors"
                        title="Delete App ID"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {/* Key row */}
                    <div className="flex items-center gap-2">
                      <div className="font-mono text-xs text-zinc-600 dark:text-zinc-400 truncate flex-grow bg-zinc-100 dark:bg-zinc-900/50 rounded-lg px-3 py-2 border border-zinc-200 dark:border-white/5">
                        {showApiKey[key] ? key : "•".repeat(40)}
                      </div>
                      <button
                        onClick={() => setShowApiKey(prev => ({ ...prev, [key]: !prev[key] }))}
                        className="p-2 bg-white hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-white/10 rounded-lg text-zinc-600 dark:text-zinc-400 transition-colors shrink-0"
                        title={showApiKey[key] ? "Hide App ID" : "Show App ID"}
                      >
                        {showApiKey[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => copyApiKey(key)}
                        className="p-2 bg-white hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-white/10 rounded-lg text-zinc-600 dark:text-zinc-400 transition-colors shrink-0"
                        title="Copy App ID"
                      >
                        {copiedKey === key ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
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
                title="React / Next.js"
                code={`"use client";
import { useState } from 'react';
import { AdTogether } from '@adtogether/web-sdk';
import { AdTogetherBanner, AdTogetherInterstitial } from '@adtogether/web-sdk/react';

// Initialize
AdTogether.initialize({ appId: '${userData?.apiKeys?.[0] || userData?.apiKey || 'YOUR_APP_ID'}' });

// Banner Ad
<AdTogetherBanner 
  adUnitId="home_banner" 
  theme="dark" 
  onAdLoaded={() => console.log('Ad loaded!')}
  onAdFailedToLoad={(e) => console.error(e)}
/>

// Interstitial Ad
const [showAd, setShowAd] = useState(false);
<AdTogetherInterstitial
  adUnitId="level_complete"
  isOpen={showAd}
  onClose={() => setShowAd(false)}
  closeDelay={3}
  onAdLoaded={() => console.log('Ad loaded!')},
  onAdFailedToLoad={(e) => console.error(e)}
/>`} 
              />
            </div>
            <div className="bg-zinc-50 dark:bg-black/50 p-6 rounded-xl border border-zinc-200 dark:border-white/5 flex flex-col">
              <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-400 mb-3 flex-none">Flutter</h3>
              <CodeBlock
                language="dart"
                title="Flutter"
                code={`import 'package:adtogether_sdk/adtogether_sdk.dart';

// Initialize
await AdTogether.initialize(appId: '${userData?.apiKeys?.[0] || userData?.apiKey || 'YOUR_APP_ID'}');

// Banner Ad
AdTogetherBanner(
  adUnitId: 'home_banner',
  size: AdSize.banner,
  onAdLoaded: () => print('Ad loaded!'),
  onAdFailedToLoad: (error) => print('Error: $error'),
)

// Interstitial Ad
AdTogetherInterstitial.show(
  context: context,
  adUnitId: 'level_complete',
  closeDelay: const Duration(seconds: 3),
  onAdLoaded: () => print('Ad loaded!'),
  onAdFailedToLoad: (error) => print('Error: $error'),
);`}
              />
            </div>
            <div className="bg-zinc-50 dark:bg-black/50 p-6 rounded-xl border border-zinc-200 dark:border-white/5 flex flex-col">
              <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-400 mb-3 flex-none">React Native</h3>
              <CodeBlock
                language="tsx"
                title="React Native"
                code={`import { AdTogether, AdTogetherBanner, AdTogetherInterstitial } from '@adtogether/react-native-sdk';

// Initialize
AdTogether.initialize({ appId: '${userData?.apiKeys?.[0] || userData?.apiKey || 'YOUR_APP_ID'}' });

// Banner Ad
<AdTogetherBanner 
  adUnitId="home_banner" 
  onAdLoaded={() => console.log('Ad loaded!')}
  onAdFailedToLoad={(e) => console.error(e)}
/>

// Interstitial Ad
const [showAd, setShowAd] = useState(false);
<AdTogetherInterstitial
  adUnitId="level_complete"
  isOpen={showAd}
  onClose={() => setShowAd(false)}
  onAdLoaded={() => console.log('Ad loaded!')}
  onAdFailedToLoad={(e) => console.error(e)}
/>`}
              />
            </div>
            <div className="bg-zinc-50 dark:bg-black/50 p-6 rounded-xl border border-zinc-200 dark:border-white/5 flex flex-col">
              <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-400 mb-3 flex-none">iOS (SwiftUI)</h3>
              <CodeBlock
                language="swift"
                title="iOS (SwiftUI)"
                code={`import AdTogether

// Initialize
AdTogether.initialize(appId: "${userData?.apiKeys?.[0] || userData?.apiKey || 'YOUR_APP_ID'}")

// Banner Ad
AdTogetherView(
    adUnitID: "home_banner",
    onAdLoaded: { print("Ad loaded!") },
    onAdFailedToLoad: { error in print("Error: \(error)") }
)
.frame(height: 50)

// Interstitial Ad
Button("Show Interstitial") {
    showAd = true
}
.fullScreenCover(isPresented: $showAd) {
    AdTogetherInterstitialView(
        adUnitID: "level_complete",
        closeDelay: 3,
        onAdLoaded: { print("Ad loaded!") },
        onAdFailedToLoad: { error in print("Error: \(error)") }
    ) { showAd = false }
}`}
              />
            </div>
            <div className="bg-zinc-50 dark:bg-black/50 p-6 rounded-xl border border-zinc-200 dark:border-white/5 flex flex-col">
              <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-400 mb-3 flex-none">Android (Compose)</h3>
              <CodeBlock
                language="kotlin"
                title="Android (Compose)"
                code={`import com.adtogether.sdk.AdTogether
import com.adtogether.sdk.views.AdTogetherView
import com.adtogether.sdk.views.AdTogetherInterstitial

// Initialize
AdTogether.initialize(context, "${userData?.apiKeys?.[0] || userData?.apiKey || 'YOUR_APP_ID'}")

// Banner Ad
AdTogetherView(
    adUnitId = "home_banner",
    onAdLoaded = { println("Ad loaded!") },
    onAdFailedToLoad = { println("Error: $it") }
)

// Interstitial Ad
if (showAd) {
    AdTogetherInterstitial(
        adUnitId = "level_complete",
        closeDelay = 3,
        onAdLoaded = { println("Ad loaded!") },
        onDismiss = { showAd = false }
    )
}`}
              />
            </div>
            <div className="bg-zinc-50 dark:bg-black/50 p-6 rounded-xl border border-zinc-200 dark:border-white/5 flex flex-col">
              <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-400 mb-3 flex-none">HTML / Script Tag</h3>
              <CodeBlock
                language="html"
                title="CDN / Script Tag"
                code={`<!-- Add to <head> -->
<script src="https://adtogether.relaxsoftwareapps.com/sdk.js" defer></script>

<!-- Place where you want the ad -->
<div 
  data-ad-unit="home_banner" 
  style="width: 100%; max-width: 320px; min-height: 50px;"
></div>`}
              />
            </div>
            <div className="bg-zinc-50 dark:bg-black/50 p-6 rounded-xl border border-zinc-200 dark:border-white/5 flex flex-col md:col-span-2">
              <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-400 mb-3 flex-none">REST API (Custom Integration)</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <CodeBlock
                  language="bash"
                  title="1. Fetch Ad (GET)"
                  code={`curl -X GET "https://adtogether.relaxsoftwareapps.com/api/ads/serve?country=global"`}
                />
                <CodeBlock
                  language="bash"
                  title="2. Track Impression (POST)"
                  code={`curl -X POST "https://adtogether.relaxsoftwareapps.com/api/ads/impression" \\
  -H "Content-Type: application/json" \\
  -d '{"adId": "AD_ID_FROM_SERVING", "token": "TOKEN_FROM_SERVING"}'`}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ads List */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            Your Campaigns
          </h2>
          
          {ads.length > 0 && (
            <Link
              href="/create-ad"
              className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Campaign
            </Link>
          )}
        </div>
        
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
                  <div className="absolute top-3 right-3 flex gap-1.5">
                    <div className={`backdrop-blur px-2 py-1 rounded text-[10px] font-bold border ${
                      ad.adType === 'interstitial' 
                        ? 'bg-purple-100/90 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30' 
                        : 'bg-amber-100/90 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
                    }`}>
                      {ad.adType === 'interstitial' ? 'INTERSTITIAL' : 'BANNER'}
                    </div>
                    <div className="bg-white/80 dark:bg-black/60 backdrop-blur px-2 py-1 rounded text-xs border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300">
                      {ad.targetCountry}
                    </div>
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

                    {/* Traffic Sources */}
                    {(ad.origins && Object.keys(ad.origins).length > 0) && (
                      <div className="pt-2 border-t border-zinc-100 dark:border-white/5">
                        <button
                          onClick={() => setOriginsModalAdId(ad.id)}
                          className="flex items-center justify-between w-full text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors py-1"
                        >
                          <span className="flex items-center gap-1.5">
                            <Monitor className="w-3.5 h-3.5" />
                            Traffic Sources ({Object.keys(ad.origins).length})
                          </span>
                          <span className="text-amber-600 dark:text-amber-400">View & Manage</span>
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-white/5">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleAdStatus(ad.id, ad.active)}
                          className={`text-xs px-3 py-1.5 rounded transition ${ad.active ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700' : 'bg-amber-100 text-amber-600 hover:bg-amber-200 border border-amber-200 dark:bg-amber-600/20 dark:text-amber-400 dark:hover:bg-amber-600/30 dark:border-amber-500/20'}`}
                        >
                          {ad.active ? "Pause" : "Resume"}
                        </button>
                        <Link
                          href={`/edit-ad/${ad.id}`}
                          className="text-xs px-3 py-1.5 rounded bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition flex items-center justify-center"
                        >
                          Edit
                        </Link>
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
            
            {/* Add New Campaign Card */}
            <Link href="/create-ad" className="bg-white dark:bg-black/20 border-2 border-dashed border-zinc-200 dark:border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-zinc-500 hover:text-amber-500 hover:border-amber-400 dark:hover:border-amber-500/50 hover:bg-amber-50 dark:hover:bg-amber-500/5 transition-all group min-h-[250px] shadow-sm">
              <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform group-hover:bg-amber-100 dark:group-hover:bg-amber-500/20">
                <Plus className="w-6 h-6" />
              </div>
              <span className="font-semibold text-lg text-zinc-700 dark:text-zinc-300 group-hover:text-amber-600 dark:group-hover:text-amber-400">Add Campaign</span>
            </Link>
          </div>
        )}
      </div>

      {/* Traffic Sources Modal */}
      {originsModalAdId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Traffic Sources</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Manage where your campaign is being displayed</p>
                </div>
              </div>
              <button 
                onClick={() => setOriginsModalAdId(null)}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto">
              <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 mb-6">
                <h4 className="font-semibold text-zinc-900 dark:text-amber-600 dark:text-amber-400 flex items-center gap-2 mb-2">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  Traffic Quality Control
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3">
                  Below is a list of all external apps and websites currently generating impressions and clicks for this campaign. 
                  AdTogether operates an open network, meaning any integrated app might display your ad.
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Use the <Shield className="w-3.5 h-3.5 inline mx-1 text-zinc-500" /> icon to <strong className="text-zinc-900 dark:text-white">block</strong> specific traffic sources that are underperforming or appear suspicious. Blocked sources will no longer be able to spend your credits on this campaign.
                </p>
              </div>

              {(() => {
                const modalAd = ads.find(a => a.id === originsModalAdId);
                if (!modalAd || !modalAd.origins || Object.keys(modalAd.origins).length === 0) {
                  return (
                    <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                      No traffic sources recorded yet.
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-2">
                    {Object.entries(modalAd.origins as Record<string, number>)
                      .sort(([, a], [, b]) => b - a)
                      .map(([source, impressions]) => {
                        const clickCount = modalAd.clicksByOrigin?.[source] || 0;
                        const displayName = source.replace(/_/g, '.').replace(/unknown\.origin/, 'Unknown');
                        const isBlocked = modalAd.blockedOrigins?.includes(source) || false;
                        return (
                          <div key={source} className={`flex items-center justify-between border rounded-xl px-4 py-3 transition-colors ${
                            isBlocked 
                              ? 'bg-red-50/50 dark:bg-red-500/5 border-red-100 dark:border-red-500/10' 
                              : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20'
                          }`}>
                            <div className="flex items-center gap-3 overflow-hidden mr-4">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleBlockSource(modalAd.id, source, isBlocked);
                                }}
                                className={`p-2 rounded-lg shrink-0 transition-colors ${
                                  isBlocked 
                                    ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/30' 
                                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700 hover:text-red-500 dark:hover:text-red-400'
                                }`}
                                title={isBlocked ? "Unblock this traffic source" : "Block this traffic source"}
                              >
                                {isBlocked ? <ShieldAlert className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                              </button>
                              
                              <div className="w-9 h-9 shrink-0 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 rounded-lg overflow-hidden flex items-center justify-center p-1">
                                <img 
                                  src={`https://www.google.com/s2/favicons?domain=${displayName}&sz=64`}
                                  alt={displayName}
                                  className={`w-full h-full object-contain ${isBlocked ? 'opacity-50 grayscale' : ''}`}
                                />
                              </div>

                              <div>
                                <div className={`font-mono font-medium text-sm truncate ${isBlocked ? 'text-red-600 dark:text-red-400 opacity-60 line-through' : 'text-zinc-900 dark:text-white'}`} title={displayName}>
                                  {displayName}
                                </div>
                                <div className={`text-xs mt-0.5 ${isBlocked ? 'text-red-500/80 dark:text-red-400/80' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                  {isBlocked ? "Blocked from showing this ad" : "Active traffic source"}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end shrink-0">
                              <span className={`font-medium ${isBlocked ? 'text-red-500/60 dark:text-red-400/60' : 'text-zinc-900 dark:text-white'}`}>
                                {impressions.toLocaleString()} views
                              </span>
                              <span className={`text-xs mt-0.5 ${isBlocked ? 'text-red-500/60 dark:text-red-400/60' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                {clickCount.toLocaleString()} clicks
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
