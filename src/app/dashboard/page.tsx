"use client";

import { useEffect, useState, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User, sendEmailVerification } from "firebase/auth";
import { Coins, Plus, Activity, LogOut, Globe, Image as ImageIcon, MousePointerClick, MapPin, Check, Key, Copy, Eye, EyeOff, X, ChevronDown, ChevronUp, Monitor, Pencil, Smartphone, Shield, ShieldAlert, ArrowDownUp, TrendingUp, TrendingDown, Terminal, Bot } from "lucide-react";
import Link from "next/link";
import { CodeBlock } from "@/components/CodeBlock";
import McpServerConfig from "@/components/McpServerConfig";
import PlatformGuideModal, { Platform } from "@/components/PlatformGuideModal";
import { COUNTRIES } from "@/lib/countries";
import { CREDIT_AUTO_RESUME_THRESHOLD, MANUAL_PAUSE_FIELD } from "@/lib/credit-policy";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [ads, setAds] = useState<any[]>([]);
  const [totalImpressions, setTotalImpressions] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showDocs, setShowDocs] = useState(false);
  const [isPlatformModalOpen, setIsPlatformModalOpen] = useState(false);
  const [selectedPlatformModal, setSelectedPlatformModal] = useState<Platform>('wordpress');
  const [selectedCmsTab, setSelectedCmsTab] = useState<Platform>('wordpress');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d');
  const [showEarned, setShowEarned] = useState(true);
  const [showSpent, setShowSpent] = useState(true);
  const [showAdViews, setShowAdViews] = useState(true);
  const [showAdClicks, setShowAdClicks] = useState(true);
  const [showCampaignViews, setShowCampaignViews] = useState(false);
  const [showCampaignClicks, setShowCampaignClicks] = useState(false);
  const [chartAppFilter, setChartAppFilter] = useState<string>('all');
  
  // Profile settings state
  const [editingCountry, setEditingCountry] = useState(false);
  const [newCountry, setNewCountry] = useState("");
  const [savingCountry, setSavingCountry] = useState(false);
  
  // App ID state
  const [showAppId, setShowAppId] = useState<Record<string, boolean>>({});
  const [generating, setGenerating] = useState(false);
  
  // App ID labeling state
  const [newAppIdLabel, setNewAppIdLabel] = useState("");
  const [showNewAppIdForm, setShowNewAppIdForm] = useState(false);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [editLabelValue, setEditLabelValue] = useState("");
  
  // Origin tracking state
  const [originsModalAdId, setOriginsModalAdId] = useState<string | null>(null);
  const [expandedOrigin, setExpandedOrigin] = useState<string | null>(null);
  
  // Earnings log state
  const [showEarnings, setShowEarnings] = useState(false);
  const [expandedEarningsAdId, setExpandedEarningsAdId] = useState<string | null>(null);
  
  // App ID copying state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // App ID activity state
  const [expandedAppActivity, setExpandedAppActivity] = useState<Record<string, boolean>>({});

  // Ad preview modal state
  const [previewAd, setPreviewAd] = useState<any | null>(null);
  
  // Detailed metrics modal state
  const [metricsModalAd, setMetricsModalAd] = useState<any | null>(null);
  
  // Blocked ads per App ID state
  const [blockingAd, setBlockingAd] = useState<string | null>(null);

  const router = useRouter();
  
  const parseDateObj = (val: any) => {
    if (!val) return null;
    const d = val.time || val;
    if (d.toDate) return d.toDate();
    if (d.seconds) return new Date(d.seconds * 1000);
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const [emailUnverified, setEmailUnverified] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);
      
      try {
        await currentUser.reload();
        if (!currentUser.emailVerified) {
          setEmailUnverified(true);
          setLoading(false);
          return;
        }
        setEmailUnverified(false);
        await currentUser.getIdToken(true);

        // Fetch User Data for Credits
        const userRef = doc(db, "users", currentUser.uid);
        let userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          try {
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              credits: 75,
              country: "Unknown",
              appIds: [],
              appIdLabels: {},
              creditNotificationStage: 'none',
              createdAt: new Date().toISOString(),
            });
            userSnap = await getDoc(userRef);
          } catch (createErr) {
            console.error("Error provisioning user document:", createErr);
          }
        }
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
    if (!user) return;
    try {
      const nextActive = !currentStatus;
      const response = await fetch('/api/campaigns', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ action: 'status', adId, active: nextActive }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Failed to update campaign');
      setAds((currentAds) => currentAds.map(ad => ad.id === adId
        ? { ...ad, active: nextActive, autoPausedReason: null, [MANUAL_PAUSE_FIELD]: !nextActive }
        : ad));
    } catch (e) {
      console.error("Failed to toggle ad status", e);
      alert(e instanceof Error ? e.message : 'Failed to update campaign');
    }
  };

  const handleDeleteAd = async (adId: string) => {
    if (!window.confirm("Are you sure you want to delete this campaign? This action cannot be undone.")) return;
    if (!user) return;
    try {
      const response = await fetch('/api/campaigns', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ adId }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Failed to delete campaign');
      setAds((currentAds) => currentAds.filter(ad => ad.id !== adId));
    } catch (e) {
      console.error("Failed to delete ad", e);
      alert(e instanceof Error ? e.message : 'Failed to delete campaign');
    }
  };

  const handleToggleBlockSource = async (adId: string, source: string, isBlocked: boolean) => {
    if (!user) return;
    try {
      const nextBlocked = !isBlocked;
      const response = await fetch('/api/campaigns', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ action: 'block-origin', adId, source, blocked: nextBlocked }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Failed to update blocklist');
      setAds((currentAds) => currentAds.map(ad => ad.id === adId
        ? {
            ...ad,
            blockedOrigins: nextBlocked
              ? Array.from(new Set([...(ad.blockedOrigins || []), source]))
              : (ad.blockedOrigins || []).filter((origin: string) => origin !== source),
          }
        : ad));
    } catch (e) {
      console.error("Failed to toggle block status", e);
      alert(e instanceof Error ? e.message : 'Failed to update blocklist');
    }
  };

  const handleGenerateAppId = async () => {
    if (!user) return;
    const label = newAppIdLabel.trim();
    if (!label) {
      alert("Please enter an app or website name for this ID.");
      return;
    }
    // No limit on App IDs
    const currentIds = userData?.appIds || (userData?.appId ? [userData.appId] : []);
    
    setGenerating(true);
    try {
      const response = await fetch('/api/apps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ label }),
      });
      const result = await response.json();
      if (!response.ok || typeof result.appId !== 'string') {
        throw new Error(result.error || 'Failed to generate App ID');
      }
      const newId = result.appId;
      const updatedIds = [...currentIds, newId];
      const currentLabels = userData?.appIdLabels || {};
      const updatedLabels = { ...currentLabels, [newId]: result.label || label };
      setUserData({ ...userData, appIds: updatedIds, appIdLabels: updatedLabels });
      setShowAppId(prev => ({ ...prev, [newId]: true }));
      setNewAppIdLabel("");
      setShowNewAppIdForm(false);
    } catch (e) {
      console.error("Failed to generate App ID", e);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteAppId = async (idToDelete: string) => {
    if (!user) return;
    const label = userData?.appIdLabels?.[idToDelete] || 'this ID';
    if (!window.confirm(`Are you sure you want to delete the App ID for "${label}"? Apps using it will fail to track impressions.`)) return;
    const currentIds = userData?.appIds || (userData?.appId ? [userData.appId] : []);
    const updatedIds = currentIds.filter((id: string) => id !== idToDelete);
    const currentLabels = { ...(userData?.appIdLabels || {}) };
    delete currentLabels[idToDelete];
    try {
      const response = await fetch('/api/apps', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ appId: idToDelete }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to delete App ID');
      setUserData({ ...userData, appIds: updatedIds, appIdLabels: currentLabels });
    } catch (e) {
      console.error("Failed to delete App ID", e);
    }
  };

  const handleUpdateLabel = async (id: string) => {
    if (!user) return;
    const label = editLabelValue.trim();
    if (!label) return;
    try {
      const currentLabels = { ...(userData?.appIdLabels || {}) };
      const response = await fetch('/api/apps', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ appId: id, label }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update App ID label');
      currentLabels[id] = result.label || label;
      setUserData({ ...userData, appIdLabels: currentLabels });
      setEditingLabel(null);
    } catch (e) {
      console.error("Failed to update label", e);
    }
  };

  const copyAppId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggleBlockAdForApp = async (appId: string, adId: string, isCurrentlyBlocked: boolean) => {
    if (!user) return;
    setBlockingAd(adId);
    try {
      const userRef = doc(db, "users", user.uid);
      const currentBlockedMap = userData?.blockedAdsByAppId || {};
      const currentList: string[] = currentBlockedMap[appId] || [];
      let updatedList: string[];
      if (isCurrentlyBlocked) {
        updatedList = currentList.filter((id: string) => id !== adId);
      } else {
        updatedList = [...currentList, adId];
      }
      const updatedMap = { ...currentBlockedMap, [appId]: updatedList };
      await updateDoc(userRef, { blockedAdsByAppId: updatedMap });
      setUserData({ ...userData, blockedAdsByAppId: updatedMap });
    } catch (e) {
      console.error("Failed to toggle ad block", e);
      alert("Failed to update blocklist");
    } finally {
      setBlockingAd(null);
    }
  };

  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";

  const totalAdShown = userData?.earningsLog ? Object.values(userData.earningsLog as Record<string, any>).reduce((sum: number, e: any) => sum + (e.impressions || 0), 0) : 0;
  const totalCreditsEarned = userData?.dailyEarnings
    ? Object.values(userData.dailyEarnings as Record<string, number>).reduce((sum: number, v: number) => sum + (v || 0), 0)
    : 0;
  const totalApps = (userData?.appIds || (userData?.appId ? [userData.appId] : [])).length;
  const totalSpent = userData?.dailySpend
    ? Object.values(userData.dailySpend as Record<string, number>).reduce((sum: number, v: number) => sum + (v || 0), 0)
    : 0;

  const getPast30DaysSum = (dailyLog: Record<string, number> | undefined) => {
    if (!dailyLog) return 0;
    let sum = 0;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    for (const [dateStr, amount] of Object.entries(dailyLog)) {
      const entryDate = new Date(dateStr);
      if (isNaN(entryDate.getTime())) continue;
      
      const diffTime = now.getTime() - entryDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0 && diffDays < 30) {
        sum += amount;
      }
    }
    return sum;
  };

  const past30DaysEarned = getPast30DaysSum(userData?.dailyEarnings);
  const past30DaysSpent = getPast30DaysSum(userData?.dailySpend);

  const chartData = useMemo(() => {
    if (!userData) return [];
    
    // Use per-app data when a specific app is selected, otherwise aggregate
    const isFiltered = chartAppFilter !== 'all';
    const dailyEarnings = isFiltered
      ? (userData.dailyEarningsByApp?.[chartAppFilter] || {})
      : (userData.dailyEarnings || {});
    const dailySpend = userData.dailySpend || {}; // Spend is per-campaign, always aggregate
    const dailyImpressions = isFiltered
      ? (userData.dailyImpressionsByApp?.[chartAppFilter] || {})
      : (userData.dailyImpressions || {});
    const dailyClicks = isFiltered
      ? (userData.dailyClicksByApp?.[chartAppFilter] || {})
      : (userData.dailyClicks || {});
    // Advertiser-side: views/clicks of YOUR campaigns on other sites (always aggregate)
    const dailyAdvertiserImpressions = userData.dailyAdvertiserImpressions || {};
    const dailyAdvertiserClicks = userData.dailyAdvertiserClicks || {};
    
    // Get all unique dates
    const allDates = new Set([...Object.keys(dailyEarnings), ...Object.keys(dailySpend), ...Object.keys(dailyImpressions), ...Object.keys(dailyClicks), ...Object.keys(dailyAdvertiserImpressions), ...Object.keys(dailyAdvertiserClicks)]);
    
    // Sort dates chronologically
    const sortedDates = Array.from(allDates).sort();
    
    if (sortedDates.length === 0) return [];

    let filteredDates = sortedDates;
    if (timeRange !== 'all') {
      const days = timeRange === '7d' ? 7 : 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      filteredDates = sortedDates.filter(d => new Date(d) >= cutoffDate);
    }
    
    return filteredDates.map(date => ({
      date: new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      rawDate: date,
      earned: dailyEarnings[date] || 0,
      spent: dailySpend[date] || 0,
      adViews: dailyImpressions[date] || 0,
      adClicks: dailyClicks[date] || 0,
      campaignViews: dailyAdvertiserImpressions[date] || 0,
      campaignClicks: dailyAdvertiserClicks[date] || 0
    }));
  }, [userData, timeRange, chartAppFilter]);

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="flex-grow w-full max-w-6xl mx-auto animate-in fade-in duration-500">
      
      {emailUnverified && (
        <div className="mb-8 p-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-400">Email Verification Required</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">
              Please verify your email address ({user?.email}) to activate your account and receive your initial 75 credits.
            </p>
          </div>
          <button
            onClick={async () => {
              if (user) {
                setResendingEmail(true);
                try {
                  await sendEmailVerification(user);
                  setResendStatus("Verification email sent! Check your inbox.");
                } catch {
                  setResendStatus("Failed to send verification email. Try again shortly.");
                } finally {
                  setResendingEmail(false);
                }
              }
            }}
            disabled={resendingEmail}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-medium text-sm rounded-xl transition-colors disabled:opacity-50 shrink-0"
          >
            {resendingEmail ? "Sending..." : "Resend Verification Email"}
          </button>
        </div>
      )}
      {resendStatus && (
        <div className="mb-6 p-4 bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-800 dark:text-zinc-200 rounded-xl">
          {resendStatus}
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 pb-6 border-b border-zinc-200 dark:border-white/10">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Dashboard</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage your campaigns and sharing credits.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/create-ad"
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm dark:shadow-[0_0_15px_rgba(245,158,11,0.3)]"
          >
            <Plus className="w-5 h-5" />
            Create Campaign
          </Link>
          <button 
            onClick={() => {
              const element = document.getElementById("mcp-config");
              if (element) {
                element.scrollIntoView({ behavior: "smooth" });
              }
              setShowDocs(!showDocs);
            }}
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
        <div className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/40 dark:to-black border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 sm:p-6 relative overflow-hidden shadow-sm">
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
          <p className="mt-2 text-xs leading-4 text-zinc-600 dark:text-zinc-400">
            Credit-paused campaigns resume automatically at {CREDIT_AUTO_RESUME_THRESHOLD} credits. Manual pauses stay paused.
          </p>
        </div>

        {/* Active Ads */}
        <div className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 sm:p-6 shadow-sm">
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
        <div className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 sm:p-6 shadow-sm">
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
        <div className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 sm:p-6 shadow-sm">
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
        <div className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 sm:p-6 shadow-sm">
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

      {/* Publisher Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {/* Total Ads Shown (Publisher) */}
        <div className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-zinc-50 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-white">
              <Monitor className="w-5 h-5" />
            </div>
            <h3 className="text-md font-medium text-zinc-700 dark:text-zinc-300">Ads Published</h3>
          </div>
          <p className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">{totalAdShown.toLocaleString()}</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">Total ads shown on your apps</p>
        </div>

        {/* Total Credits Earned */}
        <div className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-50 dark:bg-green-500/10 rounded-xl border border-green-200 dark:border-green-500/20 text-green-600 dark:text-green-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-md font-medium text-zinc-700 dark:text-zinc-300">Total Earned</h3>
          </div>
          <p className="text-4xl font-bold text-green-600 dark:text-green-400 mb-1">+{totalCreditsEarned.toLocaleString()}</p>
          <p className="text-sm font-medium text-green-600/80 dark:text-green-400/80 mb-2">Past 30 days: +{past30DaysEarned.toLocaleString()}</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">Credits earned from publishing</p>
        </div>

        {/* Total Credits Spent */}
        <div className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400">
              <TrendingDown className="w-5 h-5" />
            </div>
            <h3 className="text-md font-medium text-zinc-700 dark:text-zinc-300">Total Spent</h3>
          </div>
          <p className="text-4xl font-bold text-amber-600 dark:text-amber-400 mb-1">-{totalSpent.toLocaleString()}</p>
          <p className="text-sm font-medium text-amber-600/80 dark:text-amber-400/80 mb-2">Past 30 days: -{past30DaysSpent.toLocaleString()}</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">Credits used for your campaigns</p>
        </div>

        {/* Total Apps */}
        <div className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-zinc-50 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-white">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="text-md font-medium text-zinc-700 dark:text-zinc-300">Registered Apps</h3>
          </div>
          <p className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">{totalApps.toLocaleString()}</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">Active App IDs</p>
        </div>
      </div>

      {/* Performance Overview Chart */}
      <div className="mb-12 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-100 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-white">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Performance Overview</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {chartAppFilter === 'all'
                  ? 'All apps combined'
                  : `Filtered: ${userData?.appIdLabels?.[chartAppFilter] || chartAppFilter.slice(0, 16) + '…'}`}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* App filter dropdown */}
            {(userData?.appIds || []).length > 0 && (
              <select
                value={chartAppFilter}
                onChange={e => setChartAppFilter(e.target.value)}
                className="text-xs font-medium px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                <option value="all">All Apps</option>
                {(userData?.appIds || []).map((id: string) => (
                  <option key={id} value={id}>
                    {userData?.appIdLabels?.[id] || id.slice(0, 20) + '…'}
                  </option>
                ))}
              </select>
            )}
            {/* Time range buttons */}
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-lg">
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${timeRange === '7d' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
              >
                7 Days
              </button>
              <button
                onClick={() => setTimeRange('30d')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${timeRange === '30d' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
              >
                30 Days
              </button>
              <button
                onClick={() => setTimeRange('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${timeRange === 'all' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
              >
                All Time
              </button>
            </div>
          </div>
        </div>

        {/* Series Toggle Switches */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <button
            onClick={() => setShowEarned(!showEarned)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${showEarned ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400' : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500'}`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${showEarned ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
            Credits Earned
          </button>
          <button
            onClick={() => setShowSpent(!showSpent)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${showSpent ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400' : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500'}`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${showSpent ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
            Credits Spent
          </button>
          <button
            onClick={() => setShowAdViews(!showAdViews)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${showAdViews ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400' : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500'}`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${showAdViews ? 'bg-blue-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
            Ad Views
          </button>
          <button
            onClick={() => setShowAdClicks(!showAdClicks)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${showAdClicks ? 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/30 text-violet-700 dark:text-violet-400' : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500'}`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${showAdClicks ? 'bg-violet-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
            Ad Clicks
          </button>
          <button
            onClick={() => setShowCampaignViews(!showCampaignViews)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${showCampaignViews ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400' : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500'}`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${showCampaignViews ? 'bg-rose-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
            Campaign Views
          </button>
          <button
            onClick={() => setShowCampaignClicks(!showCampaignClicks)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${showCampaignClicks ? 'bg-pink-50 dark:bg-pink-500/10 border-pink-200 dark:border-pink-500/30 text-pink-700 dark:text-pink-400' : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500'}`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${showCampaignClicks ? 'bg-pink-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
            Campaign Clicks
          </button>
        </div>

        <div className="h-[300px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEarned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAdViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAdClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCampaignViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCampaignClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-zinc-200 dark:text-white/10" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: 'currentColor' }} 
                  dy={10}
                  className="text-zinc-500 dark:text-zinc-400"
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: 'currentColor' }} 
                  dx={-10}
                  className="text-zinc-500 dark:text-zinc-400"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(24, 24, 27, 0.9)', 
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  itemStyle={{ fontSize: '14px', fontWeight: 500 }}
                />
                {showEarned && (
                  <Area 
                    type="monotone" 
                    dataKey="earned" 
                    name="Credits Earned" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorEarned)" 
                  />
                )}
                {showSpent && (
                  <Area 
                    type="monotone" 
                    dataKey="spent" 
                    name="Credits Spent" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorSpent)" 
                  />
                )}
                {showAdViews && (
                  <Area 
                    type="monotone" 
                    dataKey="adViews" 
                    name="Ad Views" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorAdViews)" 
                  />
                )}
                {showAdClicks && (
                  <Area 
                    type="monotone" 
                    dataKey="adClicks" 
                    name="Ad Clicks" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorAdClicks)" 
                  />
                )}
                {showCampaignViews && (
                  <Area 
                    type="monotone" 
                    dataKey="campaignViews" 
                    name="Campaign Views" 
                    stroke="#f43f5e" 
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    fillOpacity={1} 
                    fill="url(#colorCampaignViews)" 
                  />
                )}
                {showCampaignClicks && (
                  <Area 
                    type="monotone" 
                    dataKey="campaignClicks" 
                    name="Campaign Clicks" 
                    stroke="#ec4899" 
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    fillOpacity={1} 
                    fill="url(#colorCampaignClicks)" 
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400">
              <Activity className="w-8 h-8 mb-2 opacity-50" />
              <p>No activity data available for this time range.</p>
            </div>
          )}
        </div>
      </div>

      {/* Credit System Explanation */}
      <div className="mb-12 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden relative shadow-sm">
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
            className="w-full flex items-center justify-between p-4 sm:p-6 hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors"
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
                    const appIds = userData.appIds || (userData.appId ? [userData.appId] : []);
                    const keyLabel = entry.appId && userData.appIdLabels?.[entry.appId]
                      ? userData.appIdLabels[entry.appId]
                      : 'Unknown App';
                    const maskedKey = entry.appId ? `${entry.appId.substring(0, 6)}...${entry.appId.slice(-4)}` : '—';
                    return (
                      <div key={adId} className="flex flex-col bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl overflow-hidden hover:border-zinc-300 dark:hover:border-white/20 transition-colors">
                        <div 
                          className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 cursor-pointer"
                          onClick={() => setExpandedEarningsAdId(expandedEarningsAdId === adId ? null : adId)}
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
                              {entry.adDescription && (
                                <div className="text-xs mt-0.5 mb-1 truncate text-zinc-500 dark:text-zinc-400">
                                  {entry.adDescription}
                                </div>
                              )}
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
                                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[100px]" title={`${keyLabel} (${entry.appId})`}>
                                  {keyLabel}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 truncate max-w-[100px]" title={entry.appId}>
                                {maskedKey}
                              </span>
                            </div>
                            
                            <div className="text-zinc-400 pl-2">
                              {expandedEarningsAdId === adId ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </div>
                        </div>

                        {expandedEarningsAdId === adId && (
                          <div className="px-4 pb-4 pt-3 border-t border-zinc-100 dark:border-white/5 bg-white/50 dark:bg-black/20">
                            <div className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 font-semibold flex items-center justify-between">
                              <span>Recent Views</span>
                              <span>(Up to 40 latest)</span>
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-2">
                              {entry.recentViews && entry.recentViews.length > 0 ? (
                                entry.recentViews.slice().reverse().map((v: any, i: number) => {
                                  let timeStr = null;
                                  const dateToParse = v.time || v;
                                  if (dateToParse.toDate) timeStr = dateToParse.toDate().toLocaleString();
                                  else if (dateToParse.seconds) timeStr = new Date(dateToParse.seconds * 1000).toLocaleString();
                                  else {
                                    const d = new Date(dateToParse);
                                    timeStr = isNaN(d.getTime()) ? null : d.toLocaleString();
                                  }

                                  return (
                                    <div key={i} className="flex flex-wrap justify-between items-center text-xs text-zinc-700 dark:text-zinc-300 bg-white/80 dark:bg-black/40 px-3 py-2 rounded-lg border border-zinc-100 dark:border-white/5">
                                      <span className="font-medium text-zinc-600 dark:text-zinc-400">{timeStr}</span>
                                      <div className="flex items-center gap-2">
                                        {v.creditsEarned !== undefined && (
                                          <span className="text-green-600 dark:text-green-400 font-semibold text-[11px] bg-green-50 dark:bg-green-500/10 px-1.5 py-0.5 rounded border border-green-200 dark:border-green-500/20">
                                            +{v.creditsEarned} credits
                                          </span>
                                        )}
                                        {v.region && v.region !== 'Unknown' && (
                                          <span className="bg-zinc-100 dark:bg-white/10 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold">
                                            {v.region}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="text-xs text-zinc-500 italic text-center py-4">No recent view records stored yet.</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Target Profile Notice */}
  
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


      {/* App ID Section */}
      
        <div className="mb-12 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-zinc-100 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-white">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">App IDs</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  One App ID per app or website. Each ID tracks its own traffic.
                </p>
              </div>
            </div>
            
            {!showNewAppIdForm && (
              <button
                onClick={() => setShowNewAppIdForm(true)}
                className="w-full sm:w-auto bg-zinc-100 hover:bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-white px-5 py-2.5 rounded-xl font-medium transition-colors whitespace-nowrap flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add App
              </button>
            )}
          </div>

          {/* New key creation form */}
          {showNewAppIdForm && (
            <div className="mt-6 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-amber-500" />
                Register a new app or website
              </h4>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder='e.g. "My Blog" or "Adventure Book"'
                  value={newAppIdLabel}
                  onChange={(e) => setNewAppIdLabel(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerateAppId()}
                  className="flex-grow bg-white dark:bg-black/50 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerateAppId}
                    disabled={generating || !newAppIdLabel.trim()}
                    className="px-4 py-2 bg-zinc-900 border border-transparent dark:bg-zinc-800 text-white dark:text-zinc-200 text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {generating ? "Generating..." : "Generate App ID"}
                  </button>
                  <button
                    onClick={() => { setShowNewAppIdForm(false); setNewAppIdLabel(""); }}
                    className="p-2.5 rounded-xl border border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
          
{!userData ? (
            <div className="mt-6 flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-zinc-200 dark:border-white/10 rounded-xl text-center">
              <div className="w-12 h-12 bg-zinc-100 dark:bg-white/5 rounded-xl flex items-center justify-center mb-3 animate-pulse">
                <Smartphone className="w-6 h-6 text-zinc-400" />
              </div>
              <div className="h-3 w-32 bg-zinc-200 dark:bg-white/10 rounded animate-pulse mb-2" />
              <div className="h-2 w-48 bg-zinc-100 dark:bg-white/5 rounded animate-pulse" />
            </div>
          ) : (() => {
  const appIds = userData.appIds || (userData.appId ? [userData.appId] : []);
  
  if (appIds.length === 0 && !showNewAppIdForm) {
    return (
      <div className="mt-6 flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-zinc-200 dark:border-white/10 rounded-xl text-center">
        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center mb-3">
          <Smartphone className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">No apps registered yet</h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 max-w-xs">
          Register your first app or website to get an App ID and start earning credits by showing ads.
        </p>
        <button
          onClick={() => setShowNewAppIdForm(true)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add your first app
        </button>
      </div>
    );
  }

  return appIds.length > 0 ? (
    <div className="mt-6 space-y-3">
      {appIds.map((key: string) => {
        // ... existing map contents unchanged
      })}
    </div>
  ) : null;
})()}


        </div>
     

      {/* MCP Server Instructions */}

        <div id="mcp-config" className="mb-12 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-zinc-100 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-white">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Are you an AI Coding Assistant?</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Connect to our MCP Server to automatically retrieve App IDs and validate implementations.
                </p>
              </div>
            </div>
          </div>
          <McpServerConfig />
        </div>

      {/* CMS & Website Builder Quick Access Banner */}
      <div className="mb-12 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-100 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-white">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">CMS &amp; Website Builders</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Add ads to WordPress, Wix, Weebly, Squarespace, or Webflow — no coding or build tools required.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedPlatformModal('wordpress');
              setIsPlatformModalOpen(true);
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm whitespace-nowrap"
          >
            <Globe className="w-4 h-4" />
            Interactive Guide
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'wordpress' as Platform, name: 'WordPress', cls: 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20' },
            { id: 'wix' as Platform, name: 'Wix', cls: 'bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/10' },
            { id: 'weebly' as Platform, name: 'Weebly', cls: 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20' },
            { id: 'squarespace' as Platform, name: 'Squarespace', cls: 'bg-zinc-800 text-white border border-zinc-700' },
            { id: 'webflow' as Platform, name: 'Webflow', cls: 'bg-sky-100 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => {
                setSelectedPlatformModal(p.id);
                setIsPlatformModalOpen(true);
              }}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-70 ${p.cls}`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {showDocs && (
        <div className="mb-12 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-8 shadow-sm space-y-10">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Integration Instructions</h2>
            <p className="text-zinc-500 dark:text-zinc-400">Choose your platform or CMS to integrate AdTogether and start earning credits instantly.</p>
          </div>

          {/* Dedicated CMS & Website Builders Instruction Section */}
          <div className="bg-gradient-to-br from-amber-500/5 via-zinc-50 to-zinc-100/50 dark:from-amber-500/10 dark:via-zinc-900/40 dark:to-black border border-amber-500/20 dark:border-amber-500/30 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    CMS &amp; Website Builders
                    <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-semibold px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-500/30">
                      No Code Required
                    </span>
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Embed ads into your site builder using simple copy-and-paste HTML blocks.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedPlatformModal(selectedCmsTab);
                  setIsPlatformModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold rounded-xl transition-colors shadow-sm self-start sm:self-auto"
              >
                <Globe className="w-4 h-4" />
                Open Interactive Wizard
              </button>
            </div>

            {/* CMS Platform Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 border-b border-zinc-200 dark:border-white/10 pb-4">
              {[
                { id: 'wordpress' as Platform, name: 'WordPress' },
                { id: 'wix' as Platform, name: 'Wix' },
                { id: 'weebly' as Platform, name: 'Weebly' },
                { id: 'squarespace' as Platform, name: 'Squarespace' },
                { id: 'webflow' as Platform, name: 'Webflow' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCmsTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    selectedCmsTab === tab.id
                      ? 'bg-zinc-900 text-white dark:bg-amber-500 dark:text-black shadow-sm'
                      : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>

            {/* Active CMS Instructions Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Instructions & Steps */}
              <div className="lg:col-span-6 space-y-4">
                {selectedCmsTab === 'wordpress' && (
                  <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
                    <h4 className="font-semibold text-base text-zinc-900 dark:text-white">WordPress Integration</h4>
                    <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                      <li>Open any page or post in the <strong>Gutenberg Block Editor</strong>.</li>
                      <li>Click <strong>+ (Add Block)</strong> and select the <strong>Custom HTML</strong> block.</li>
                      <li>Paste the snippet from the right panel into the block.</li>
                      <li>Click <strong>Preview in New Tab</strong> to verify the ad loads.</li>
                    </ol>
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs text-blue-900 dark:text-blue-300">
                      <strong>Site-Wide Header:</strong> Install the free <strong>WPCode</strong> plugin to insert the script tag once into Header &amp; Footer settings.
                    </div>
                  </div>
                )}

                {selectedCmsTab === 'wix' && (
                  <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
                    <h4 className="font-semibold text-base text-zinc-900 dark:text-white">Wix Integration</h4>
                    <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                      <li>In the Wix Editor, click <strong>+ (Add Elements)</strong> → <strong>Embed Code</strong> → <strong>Embed HTML</strong>.</li>
                      <li>In the settings panel, select <strong>Code</strong> mode.</li>
                      <li>Paste the snippet and click <strong>Update</strong>.</li>
                      <li>Resize the container box to fit your desired banner dimensions (e.g. 320×50 or 728×90).</li>
                    </ol>
                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-900 dark:text-amber-300">
                      <strong>Wix Sandbox Note:</strong> On-page embeds render in a sandboxed iframe. For full-screen interstitials, inject script via <em>Settings → Custom Code</em> (Wix Premium).
                    </div>
                  </div>
                )}

                {selectedCmsTab === 'weebly' && (
                  <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
                    <h4 className="font-semibold text-base text-zinc-900 dark:text-white">Weebly Integration</h4>
                    <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                      <li>In your Weebly page editor, locate the <strong>Embed Code (&lt;/&gt;)</strong> element from the left toolbar.</li>
                      <li>Drag and drop the element onto your page.</li>
                      <li>Click inside the box and select <strong>Edit Custom HTML</strong>.</li>
                      <li>Paste the snippet and click outside the box to save.</li>
                      <li>Click <strong>Publish</strong> — Weebly executes ads on live published sites.</li>
                    </ol>
                    <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 rounded-xl text-xs text-indigo-900 dark:text-indigo-300">
                      <strong>Site-Wide SDK:</strong> Paste the &lt;script&gt; tag under <em>Settings → SEO → Header Code</em> to load the SDK across all pages.
                    </div>
                  </div>
                )}

                {selectedCmsTab === 'squarespace' && (
                  <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
                    <h4 className="font-semibold text-base text-zinc-900 dark:text-white">Squarespace Integration</h4>
                    <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                      <li>Edit your Squarespace page and click <strong>+ Add Block</strong> → choose <strong>Code</strong>.</li>
                      <li>Set the mode dropdown to <strong>HTML</strong>.</li>
                      <li>Ensure <strong>Display Source</strong> is <strong>unchecked / disabled</strong>.</li>
                      <li>Paste the snippet and click <strong>Save</strong>.</li>
                    </ol>
                    <div className="mt-3 p-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-800 dark:text-zinc-300">
                      <strong>Editor Preview Disabled:</strong> Squarespace suppresses custom scripts while logged in as admin. Preview in an <em>Incognito Window</em> or on your live site.
                    </div>
                  </div>
                )}

                {selectedCmsTab === 'webflow' && (
                  <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
                    <h4 className="font-semibold text-base text-zinc-900 dark:text-white">Webflow Integration</h4>
                    <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                      <li>Open the Add panel (<strong>+</strong>) and drag an <strong>Embed</strong> component onto your canvas.</li>
                      <li>In the HTML Embed Code Editor, paste the snippet from the right panel.</li>
                      <li>Click <strong>Save &amp; Close</strong>.</li>
                      <li>Publish your project to your <code>*.webflow.io</code> staging domain to test.</li>
                    </ol>
                    <div className="mt-3 p-3 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/50 rounded-xl text-xs text-sky-900 dark:text-sky-300">
                      <strong>Site-Wide Head Code:</strong> Paste the &lt;script&gt; tag once in <em>Project Settings → Custom Code → Head Code</em>.
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Code Snippet */}
              <div className="lg:col-span-6 flex flex-col justify-center">
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Copy Snippet for {selectedCmsTab.toUpperCase()}
                </div>
                <CodeBlock
                  language="html"
                  title={`${selectedCmsTab.charAt(0).toUpperCase() + selectedCmsTab.slice(1)} Embed`}
                  code={`<!-- Load AdTogether SDK (add once in <head> or on page) -->
<script src="https://www.ad-together.org/sdk.js" data-app-id="${userData?.appIds?.[0] || userData?.appId || 'YOUR_APP_ID'}" defer></script>

<!-- Ad Banner Container -->
<div 
  data-ad-unit="home_banner" 
  style="width: 100%; min-height: 50px;"
></div>`}
                />
              </div>
            </div>
          </div>

          {/* Native SDKs & Frameworks */}
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Native SDKs &amp; Mobile Frameworks</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-zinc-50 dark:bg-black/50 p-6 rounded-xl border border-zinc-200 dark:border-white/5 flex flex-col">
                <h4 className="text-base font-semibold text-amber-600 dark:text-amber-400 mb-3 flex-none">React / Next.js</h4>
                <CodeBlock 
                  language="tsx"
                  title="React / Next.js"
                  code={`"use client";
import { useState } from 'react';
import { AdTogether } from '@adtogether/web-sdk';
import { AdTogetherBanner, AdTogetherInterstitial } from '@adtogether/web-sdk/react';

// Initialize
AdTogether.initialize({ appId: '${userData?.appIds?.[0] || userData?.appId || 'YOUR_APP_ID'}' });

// Banner Ad
<AdTogetherBanner 
  adUnitId="home_banner" 
  theme="dark"
  showCloseButton={true}
  onAdLoaded={() => console.log('Ad loaded!')}
  onAdFailedToLoad={(e) => console.error(e)}
  onAdClosed={() => console.log('User closed the ad')}
/>

// Interstitial Ad
const [showAd, setShowAd] = useState(false);
<AdTogetherInterstitial
  adUnitId="level_complete"
  isOpen={showAd}
  onClose={() => setShowAd(false)}
  closeDelay={3}
  onAdLoaded={() => console.log('Ad loaded!')}
  onAdFailedToLoad={(e) => console.error(e)}
/>`} 
                />
              </div>
              <div className="bg-zinc-50 dark:bg-black/50 p-6 rounded-xl border border-zinc-200 dark:border-white/5 flex flex-col">
                <h4 className="text-base font-semibold text-amber-600 dark:text-amber-400 mb-3 flex-none">Flutter</h4>
                <CodeBlock
                  language="dart"
                  title="Flutter"
                  code={`import 'package:adtogether_sdk/adtogether_sdk.dart';

// Initialize
await AdTogether.initialize(appId: '${userData?.appIds?.[0] || userData?.appId || 'YOUR_APP_ID'}');

// Banner Ad
AdTogetherBanner(
  adUnitId: 'home_banner',
  size: AdSize.banner,
  showCloseButton: true,
  onAdLoaded: () => print('Ad loaded!'),
  onAdFailedToLoad: (error) => print('Error: \$error'),
  onAdClosed: () => print('User closed the ad'),
)

// Interstitial Ad
AdTogetherInterstitial.show(
  context: context,
  adUnitId: 'level_complete',
  closeDelay: const Duration(seconds: 3),
  onAdLoaded: () => print('Ad loaded!'),
  onAdFailedToLoad: (error) => print('Error: \$error'),
  onAdClosed: () => print('User closed'),
);`}
                />
              </div>
              <div className="bg-zinc-50 dark:bg-black/50 p-6 rounded-xl border border-zinc-200 dark:border-white/5 flex flex-col">
                <h4 className="text-base font-semibold text-amber-600 dark:text-amber-400 mb-3 flex-none">React Native</h4>
                <CodeBlock
                  language="tsx"
                  title="React Native"
                  code={`import { AdTogether, AdTogetherBanner, AdTogetherInterstitial } from '@adtogether/react-native-sdk';

// Initialize
AdTogether.initialize({ appId: '${userData?.appIds?.[0] || userData?.appId || 'YOUR_APP_ID'}' });

// Banner Ad
<AdTogetherBanner 
  adUnitId="home_banner"
  showCloseButton={true}
  onAdLoaded={() => console.log('Ad loaded!')}
  onAdFailedToLoad={(e) => console.error(e)}
  onAdClosed={() => console.log('User closed the ad')}
/>

// Interstitial Ad
const [showAd, setShowAd] = useState(false);
<AdTogetherInterstitial
  adUnitId="level_complete"
  isOpen={showAd}
  onClose={() => setShowAd(false)}
  closeDelay={3}
  onAdLoaded={() => console.log('Ad loaded!')}
  onAdFailedToLoad={(e) => console.error(e)}
/>`}
                />
              </div>
              <div className="bg-zinc-50 dark:bg-black/50 p-6 rounded-xl border border-zinc-200 dark:border-white/5 flex flex-col">
                <h4 className="text-base font-semibold text-amber-600 dark:text-amber-400 mb-3 flex-none">iOS (SwiftUI)</h4>
                <CodeBlock
                  language="swift"
                  title="iOS (SwiftUI)"
                  code={`import AdTogether

// Initialize
AdTogether.initialize(appId: "${userData?.appIds?.[0] || userData?.appId || 'YOUR_APP_ID'}")

// Banner Ad
AdTogetherView(
    adUnitId: "home_banner",
    showCloseButton: true,
    onAdLoaded: { print("Ad loaded!") },
    onAdFailedToLoad: { error in print("Error: \(error)") },
    onAdClosed: { print("User closed the ad") }
)
.frame(height: 50)

// Interstitial Ad
Button("Show Interstitial") {
    showAd = true
}
.fullScreenCover(isPresented: $showAd) {
    AdTogetherInterstitialView(
        adUnitId: "level_complete",
        closeDelay: 3,
        onAdLoaded: { print("Ad loaded!") },
        onAdFailedToLoad: { error in print("Error: \(error)") }
    ) { showAd = false }
}`}
                />
              </div>
              <div className="bg-zinc-50 dark:bg-black/50 p-6 rounded-xl border border-zinc-200 dark:border-white/5 flex flex-col md:col-span-2">
                <h4 className="text-base font-semibold text-amber-600 dark:text-amber-400 mb-3 flex-none">Android (Compose)</h4>
                <CodeBlock
                  language="kotlin"
                  title="Android (Compose)"
                  code={`import com.adtogether.sdk.AdTogether
import com.adtogether.sdk.views.AdTogetherView
import com.adtogether.sdk.views.AdTogetherInterstitial

// Initialize
AdTogether.initialize(context, "${userData?.appIds?.[0] || userData?.appId || 'YOUR_APP_ID'}")

// Banner Ad
AdTogetherView(
    adUnitId = "home_banner",
    showCloseButton = true,
    onAdLoaded = { println("Ad loaded!") },
    onAdFailedToLoad = { println("Error: \$it") },
    onAdClosed = { println("User closed the ad") }
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
            </div>
          </div>

          {/* HTML CDN & REST API Section */}
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Vanilla HTML &amp; REST API</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-zinc-50 dark:bg-black/50 p-6 rounded-xl border border-zinc-200 dark:border-white/5 flex flex-col">
                <div className="flex justify-between items-start mb-3 flex-none">
                  <h4 className="text-base font-semibold text-amber-600 dark:text-amber-400">CDN / Script Tag</h4>
                  <button
                    onClick={() => {
                      setSelectedPlatformModal('wordpress');
                      setIsPlatformModalOpen(true);
                    }}
                    className="text-xs font-semibold px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                  >
                    Website Builder Guides
                  </button>
                </div>
                <CodeBlock
                  language="html"
                  title="CDN / Script Tag"
                  code={`<!-- Add to <head> -->
<script src="https://www.ad-together.org/sdk.js" data-app-id="${userData?.appIds?.[0] || userData?.appId || 'YOUR_APP_ID'}" defer></script>

<!-- Place where you want the ad -->
<div 
  data-ad-unit="home_banner" 
  style="width: 100%; max-width: 320px; min-height: 50px;"
></div>`}
                />
              </div>
              <div className="bg-zinc-50 dark:bg-black/50 p-6 rounded-xl border border-zinc-200 dark:border-white/5 flex flex-col">
                <h4 className="text-base font-semibold text-amber-600 dark:text-amber-400 mb-3 flex-none">REST API (Custom Integration)</h4>
                <div className="space-y-4">
                  <CodeBlock
                    language="bash"
                    title="1. Fetch Ad (GET)"
                    code={`curl -X GET "https://www.ad-together.org/api/ads/serve?adUnitId=YOUR_AD_UNIT_ID&adType=banner&appId=${userData?.appIds?.[0] || userData?.appId || 'YOUR_APP_ID'}&bundleId=com.example.myapp"`}
                  />
                  <CodeBlock
                    language="bash"
                    title="2. Track Qualified View (POST)"
                    code={`# Send only after an observer measures at least 50% visibility continuously for 1 second.
# Replace both placeholders with the numeric values measured for this view; do not hard-code them.
curl -X POST "https://www.ad-together.org/api/ads/impression" \\
  -H "Content-Type: application/json" \\
  -d '{"adId": "AD_ID", "token": "TOKEN_FROM_SERVE_RESPONSE", "appId": "${userData?.appIds?.[0] || userData?.appId || 'YOUR_APP_ID'}", "bundleId": "com.example.myapp", "platform": "web", "visiblePercent": MEASURED_VISIBLE_PERCENT, "visibleDurationMs": MEASURED_CONTINUOUS_VISIBLE_MS}'`}
                  />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Save the signed token from the matching serve response. Custom web and non-attested native integrations must send measured viewability only after the ad has been at least 50% visible continuously for one second. Use an SDK for native App Attest or Play Integrity enforcement.
                  </p>
                </div>
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
                    {(() => {
                      const now = new Date();
                      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                      
                      const allRecentViews = Object.values(ad.recentViewsByOrigin || {}).flat();
                      const allRecentClicks = Object.values(ad.recentClicksByOrigin || {}).flat();

                      const views24h = allRecentViews.filter((v: any) => {
                        const d = parseDateObj(v);
                        return d && d > last24h;
                      }).length;

                      const clicks24h = allRecentClicks.filter((v: any) => {
                        const d = parseDateObj(v);
                        return d && d > last24h;
                      }).length;

                      const creditCost = ad.adType === 'interstitial' ? 5 : 1;
                      const creditsSpent24h = views24h * creditCost;

                      return (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-zinc-900 dark:text-white flex items-center gap-3">
                              <span title="Lifetime Impressions">👁 {ad.impressions || 0}</span>
                              <span title="Lifetime Clicks">👆 {ad.clicks || 0}</span>
                            </span>
                            <a href={ad.clickUrl} target="_blank" rel="noreferrer" className="text-sm text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300">
                              Preview Link →
                            </a>
                          </div>
                          <div className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold flex items-center gap-2">
                            <span>Last 24h:</span>
                            <span className="text-zinc-600 dark:text-zinc-300">{views24h} views</span>
                            <span>•</span>
                            <span className="text-zinc-600 dark:text-zinc-300">{clicks24h} clicks</span>
                            <span>•</span>
                            <span className="text-amber-600/80 dark:text-amber-400/80">{creditsSpent24h} credits</span>
                          </div>
                        </div>
                      );
                    })()}

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
                onClick={() => {
                  setOriginsModalAdId(null);
                  setExpandedOrigin(null);
                }}
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
                        const isExpanded = expandedOrigin === source;
                        const parseDateString = (val: any) => {
                          if (!val) return null;
                          let dateToParse = val;
                          let region = null;
                          let pagePath = null;
                          let visiblePercent = null;
                          let visibleDurationMs = null;
                          
                          // Handle new object format
                          if (val && typeof val === 'object' && val.time) {
                            dateToParse = val.time;
                            region = val.region;
                            pagePath = typeof val.pagePath === 'string' ? val.pagePath : null;
                            visiblePercent = typeof val.visiblePercent === 'number' ? val.visiblePercent : null;
                            visibleDurationMs = typeof val.visibleDurationMs === 'number' ? val.visibleDurationMs : null;
                          }
                          
                          let timeStr = null;
                          if (dateToParse.toDate) timeStr = dateToParse.toDate().toLocaleString();
                          else if (dateToParse.seconds) timeStr = new Date(dateToParse.seconds * 1000).toLocaleString();
                          else {
                            const d = new Date(dateToParse);
                            timeStr = isNaN(d.getTime()) ? null : d.toLocaleString();
                          }
                          
                          return timeStr ? { timeStr, region, pagePath, visiblePercent, visibleDurationMs } : null;
                        };
                        
                        const sourceVal = source.replace(/\./g, '_');
                        
                        const rawViewsArray = modalAd.recentViewsByOrigin?.[source] || modalAd.recentViewsByOrigin?.[sourceVal] || [];
                        const recentViews = Array.isArray(rawViewsArray) ? rawViewsArray.map(parseDateString).filter(Boolean) : [];
                        // Fallback if empty and we have a lastSeen value
                        if (recentViews.length === 0) {
                          const fallbackView = parseDateString(modalAd.lastSeenByOrigin?.[source]) || parseDateString(modalAd.lastSeenByOrigin?.[sourceVal]) || parseDateString(modalAd.createdAt);
                          if (fallbackView) recentViews.push(fallbackView);
                        }

                        const rawClicksArray = modalAd.recentClicksByOrigin?.[source] || modalAd.recentClicksByOrigin?.[sourceVal] || [];
                        const recentClicks = Array.isArray(rawClicksArray) ? rawClicksArray.map(parseDateString).filter(Boolean) : [];
                        if (recentClicks.length === 0) {
                          const fallbackClick = parseDateString(modalAd.lastClickedByOrigin?.[source]) || parseDateString(modalAd.lastClickedByOrigin?.[sourceVal]);
                          if (fallbackClick) recentClicks.push(fallbackClick);
                        }
                        
                        recentViews.reverse();
                        recentClicks.reverse();

                        const sourceCtr = impressions > 0 ? ((clickCount / impressions) * 100).toFixed(2) : "0.00";

                        return (
                          <div key={source} className={`flex flex-col border rounded-xl transition-colors overflow-hidden ${
                            isBlocked 
                              ? 'bg-red-50/50 dark:bg-red-500/5 border-red-100 dark:border-red-500/10' 
                              : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20'
                          }`}>
                            <div 
                              className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
                              onClick={() => setExpandedOrigin(isExpanded ? null : source)}
                            >
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
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="flex flex-col items-end">
                                  <span className={`font-medium ${isBlocked ? 'text-red-500/60 dark:text-red-400/60' : 'text-zinc-900 dark:text-white'}`}>
                                    {impressions.toLocaleString()} views
                                  </span>
                                  <span className={`text-xs mt-0.5 ${isBlocked ? 'text-red-500/60 dark:text-red-400/60' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                    {clickCount.toLocaleString()} clicks
                                  </span>
                                </div>
                                <div className="text-zinc-400">
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                              </div>
                            </div>
                            
                            {isExpanded && (
                              <div className="px-4 pb-4 pt-1 bg-white/50 dark:bg-black/20 border-t border-zinc-100 dark:border-white/5 grid grid-cols-2 gap-4">
                                <div>
                                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">CTR (Click-Through Rate)</div>
                                  <div className="text-sm font-medium text-zinc-900 dark:text-white">{sourceCtr}%</div>
                                </div>
                                <div>
                                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Source ID</div>
                                  <div className="text-sm font-mono text-zinc-600 dark:text-zinc-400 truncate" title={source}>{source}</div>
                                </div>
                                <div className="col-span-2 grid grid-cols-2 gap-4 mt-1 border-t border-zinc-100 dark:border-white/5 pt-3">
                                  <div>
                                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 font-semibold">Recent Views</div>
                                    <div className="text-[9px] text-zinc-500 dark:text-zinc-500 mb-1">New web views include page and viewability details; older views do not.</div>
                                    <div className="max-h-32 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                                      {recentViews.length > 0 ? recentViews.map((v, i) => (
                                        <div key={i} className="text-[11px] text-zinc-700 dark:text-zinc-300 bg-black/5 dark:bg-white/5 px-2 py-1 rounded">
                                          <div className="flex justify-between items-center gap-2">
                                            <span>{v?.timeStr}</span>
                                            {v?.region && v?.region !== 'Unknown' && (
                                              <span className="shrink-0 bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded font-bold tracking-wider">{v?.region}</span>
                                            )}
                                          </div>
                                          {v?.pagePath && (
                                            <div className="mt-1 font-mono text-[10px] text-zinc-500 dark:text-zinc-400 break-all" title={v.pagePath}>
                                              {v.pagePath}
                                            </div>
                                          )}
                                          {v?.visiblePercent != null && v?.visibleDurationMs != null && (
                                            <div className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                                              Visible {v.visiblePercent}% for {(v.visibleDurationMs / 1000).toFixed(1)}s
                                            </div>
                                          )}
                                        </div>
                                      )) : (
                                        <div className="text-[11px] text-zinc-500 italic">No views stored yet.</div>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 font-semibold">Recent Clicks</div>
                                    <div className="max-h-32 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                                      {recentClicks.length > 0 ? recentClicks.map((v, i) => (
                                        <div key={i} className="flex justify-between items-center text-[11px] text-zinc-700 dark:text-zinc-300 bg-black/5 dark:bg-white/5 px-2 py-1 rounded truncate">
                                          <span>{v?.timeStr}</span>
                                          {v?.region && v?.region !== 'Unknown' && (
                                            <span className="ml-2 bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded font-bold tracking-wider">{v?.region}</span>
                                          )}
                                        </div>
                                      )) : (
                                        <div className="text-[11px] text-zinc-500 italic">No clicks stored yet.</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
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

      {/* Ad Preview Modal */}
      {previewAd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setPreviewAd(null)}>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Ad Preview</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">How this ad appears in your app</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewAd(null)}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ad Image */}
            <div className="bg-zinc-100 dark:bg-zinc-950 relative">
              {previewAd.adImageUrl ? (
                <img
                  src={previewAd.adImageUrl}
                  alt={previewAd.adTitle}
                  className="w-full max-h-[300px] object-contain bg-black/5 dark:bg-white/5"
                />
              ) : (
                <div className="w-full h-40 flex items-center justify-center text-zinc-400 dark:text-zinc-600">
                  <ImageIcon className="w-10 h-10" />
                </div>
              )}
              <div className="absolute top-3 right-3">
                <div className={`backdrop-blur px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                  previewAd.adType === 'interstitial'
                    ? 'bg-purple-100/90 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30'
                    : 'bg-amber-100/90 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
                }`}>
                  {previewAd.adType === 'interstitial' ? 'INTERSTITIAL' : 'BANNER'}
                </div>
              </div>
            </div>

            {/* Ad Details */}
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <h4 className="text-lg font-bold text-zinc-900 dark:text-white">{previewAd.adTitle || 'Unknown Campaign'}</h4>
                {previewAd.adDescription && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 mb-2 leading-relaxed">
                    {previewAd.adDescription}
                  </p>
                )}
                {previewAd.platform && (
                  <span className="inline-block mt-1 text-[10px] font-mono border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500">
                    {previewAd.platform}
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl p-3 text-center">
                  <span className="text-lg font-bold text-zinc-900 dark:text-white">{(previewAd.impressions || 0).toLocaleString()}</span>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1">Views</div>
                </div>
                <div className="bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl p-3 text-center">
                  <span className="text-lg font-bold text-zinc-900 dark:text-white">{(previewAd.clicks || 0).toLocaleString()}</span>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1">Clicks</div>
                </div>
                <div className="bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl p-3 text-center">
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">+{(previewAd.creditsEarned || 0).toLocaleString()}</span>
                  <div className="text-[10px] uppercase tracking-wider text-green-500/80 dark:text-green-500/60 mt-1">Credits</div>
                </div>
              </div>

              {previewAd.lastUpdated && (
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                  Last shown: {new Date(previewAd.lastUpdated).toLocaleDateString()} at {new Date(previewAd.lastUpdated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              )}

              {/* Recent Activity Log */}
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-zinc-400" />
                  Recent Activity Log
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 font-semibold">Recent Views</div>
                    <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                      {previewAd.recentViews && previewAd.recentViews.length > 0 ? (
                        previewAd.recentViews.slice().reverse().map((v: any, i: number) => {
                          const timeStr = v.time ? new Date(v.time).toLocaleString() : 'Unknown Time';
                          return (
                            <div key={i} className="flex justify-between items-center text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 px-3 py-2.5 rounded-lg truncate transition-colors hover:bg-zinc-100 dark:hover:bg-white/10">
                              <span className="font-mono text-xs">{timeStr}</span>
                              {v.region && v.region !== 'Unknown' && (
                                <span className="ml-2 bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded font-bold tracking-wider text-[10px] uppercase">{v.region}</span>
                              )}
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-sm text-zinc-500 italic p-6 text-center border border-dashed border-zinc-200 dark:border-white/10 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50">
                          No recent views.
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 font-semibold">Recent Clicks</div>
                    <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                      {previewAd.recentClicks && previewAd.recentClicks.length > 0 ? (
                        previewAd.recentClicks.slice().reverse().map((v: any, i: number) => {
                          const timeStr = v.time ? new Date(v.time).toLocaleString() : 'Unknown Time';
                          return (
                            <div key={i} className="flex justify-between items-center text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 px-3 py-2.5 rounded-lg truncate transition-colors hover:bg-zinc-100 dark:hover:bg-white/10">
                              <span className="font-mono text-xs">{timeStr}</span>
                              {v.region && v.region !== 'Unknown' && (
                                <span className="ml-2 bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded font-bold tracking-wider text-[10px] uppercase">{v.region}</span>
                              )}
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-sm text-zinc-500 italic p-6 text-center border border-dashed border-zinc-200 dark:border-white/10 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50">
                          No recent clicks.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Block/Unblock Button */}
              {previewAd.fromAppKey && (() => {
                const realAdId = previewAd.adId;
                const isBlocked = (userData?.blockedAdsByAppId?.[previewAd.fromAppKey] || []).includes(realAdId);
                const appLabel = userData?.appIdLabels?.[previewAd.fromAppKey] || 'this app';
                return (
                  <button
                    onClick={() => handleToggleBlockAdForApp(previewAd.fromAppKey, realAdId, isBlocked)}
                    disabled={blockingAd === realAdId}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                      isBlocked
                        ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/10'
                        : 'bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 border border-red-200 dark:border-red-500/20'
                    } ${blockingAd === realAdId ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isBlocked ? (
                      <><Shield className="w-4 h-4" /> Unblock from {appLabel}</>
                    ) : (
                      <><ShieldAlert className="w-4 h-4" /> Block from {appLabel}</>
                    )}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      {/* Detailed Metrics Modal */}
      {metricsModalAd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setMetricsModalAd(null)}>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Performance Metrics</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{metricsModalAd.adTitle || 'Unknown Campaign'}</p>
                </div>
              </div>
              <button
                onClick={() => setMetricsModalAd(null)}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 mb-2">
                <div className="bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-zinc-900 dark:text-white">{(metricsModalAd.impressions || 0).toLocaleString()}</div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1">Total Views</div>
                </div>
                <div className="bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-zinc-900 dark:text-white">{(metricsModalAd.clicks || 0).toLocaleString()}</div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1">Total Clicks</div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-zinc-400" />
                  Recent Activity Log
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 font-semibold">Recent Views</div>
                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                      {metricsModalAd.recentViews && metricsModalAd.recentViews.length > 0 ? (
                        metricsModalAd.recentViews.slice().reverse().map((v: any, i: number) => {
                          const timeStr = v.time ? new Date(v.time).toLocaleString() : 'Unknown Time';
                          return (
                            <div key={i} className="flex justify-between items-center text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 px-3 py-2.5 rounded-lg truncate transition-colors hover:bg-zinc-100 dark:hover:bg-white/10">
                              <span className="font-mono text-xs">{timeStr}</span>
                              {v.region && v.region !== 'Unknown' && (
                                <span className="ml-2 bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded font-bold tracking-wider text-[10px] uppercase">{v.region}</span>
                              )}
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-sm text-zinc-500 italic p-6 text-center border border-dashed border-zinc-200 dark:border-white/10 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50">
                          No recent views.
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 font-semibold">Recent Clicks</div>
                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                      {metricsModalAd.recentClicks && metricsModalAd.recentClicks.length > 0 ? (
                        metricsModalAd.recentClicks.slice().reverse().map((v: any, i: number) => {
                          const timeStr = v.time ? new Date(v.time).toLocaleString() : 'Unknown Time';
                          return (
                            <div key={i} className="flex justify-between items-center text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 px-3 py-2.5 rounded-lg truncate transition-colors hover:bg-zinc-100 dark:hover:bg-white/10">
                              <span className="font-mono text-xs">{timeStr}</span>
                              {v.region && v.region !== 'Unknown' && (
                                <span className="ml-2 bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded font-bold tracking-wider text-[10px] uppercase">{v.region}</span>
                              )}
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-sm text-zinc-500 italic p-6 text-center border border-dashed border-zinc-200 dark:border-white/10 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50">
                          No recent clicks.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <PlatformGuideModal
        isOpen={isPlatformModalOpen}
        onClose={() => setIsPlatformModalOpen(false)}
        appId={userData?.appIds?.[0] || userData?.appId}
        initialPlatform={selectedPlatformModal}
        adUnits={[
          { id: 'home_banner', name: 'Homepage Banner' },
          { id: 'sidebar', name: 'Sidebar Ad' },
          { id: 'interstitial', name: 'Interstitial Popup' }
        ]}
      />

    </div>
  );
}
