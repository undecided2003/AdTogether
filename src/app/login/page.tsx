"use client";

import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, sendPasswordResetEmail, sendEmailVerification, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Mail, Lock, LogIn, ArrowLeft } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  // Check if user is already logged in or returning from Google redirect
  useEffect(() => {
    let isMounted = true;

    // 1. Check if they just returned from Google Redirect
    console.log("[Auth Debug] authDomain:", auth.config.authDomain, "origin:", window.location.hostname);
    getRedirectResult(auth).then(async (result) => {
      console.log("[Auth Debug] getRedirectResult resolved:", result ? "has user" : "null (no pending redirect)");
      if (result?.user) {
        await createOrUpdateUserDoc(result.user);
        if (isMounted) router.replace("/dashboard");
      }
    }).catch((err) => {
      console.error("[Auth Debug] getRedirectResult error:", err.code, err.message);
      if (isMounted) setError(`Redirect login failed: ${err.code} - ${err.message}`);
    });

    // 2. Normal auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("User already logged in, syncing Firestore user doc before redirect...");
        await createOrUpdateUserDoc(user);
        if (isMounted) router.replace("/dashboard");
      } else {
        if (isMounted) setCheckingAuth(false);
      }
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [router]);

  const createOrUpdateUserDoc = async (user: any) => {
    try {
      console.log("Syncing user to Firestore:", user.uid);
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        console.log("Creating new user document...");
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          credits: 75,
          country: "Unknown",
          appIds: [],
          appIdLabels: {},
          creditNotificationStage: 'none',
          createdAt: new Date().toISOString(),
        });
        console.log("User document created successfully.");
      } else {
        console.log("User document already exists.");
      }
    } catch (err: any) {
      console.error("Firestore sync failed:", err);
      // We don't throw here so the user can still access the dashboard 
      // even if Firestore sync has a minor hiccup
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");
    try {
      if (isLogin) {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        await createOrUpdateUserDoc(cred.user);
        router.replace("/dashboard");
      } else {
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          setLoading(false);
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await createOrUpdateUserDoc(cred.user);
        // Send verification email on signup
        await sendEmailVerification(cred.user);
        router.replace("/dashboard");
      }
    } catch (err: any) {
      const code = err.code || "";
      if (code === "auth/user-not-found") setError("No account found with this email.");
      else if (code === "auth/wrong-password") setError("Incorrect password.");
      else if (code === "auth/email-already-in-use") setError("An account with this email already exists.");
      else if (code === "auth/weak-password") setError("Password must be at least 6 characters.");
      else if (code === "auth/invalid-email") setError("Please enter a valid email address.");
      else setError(err.message || "Failed to authenticate");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError("");
    setSuccessMessage("");
    
    try {
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider);
      // Page redirects to Google — execution stops here
    } catch (err: any) {
      setError(err.message || "Failed to initiate Google sign in");
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccessMessage("");
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage("Password reset email sent! Check your inbox.");
    } catch (err: any) {
      const code = err.code || "";
      if (code === "auth/user-not-found") setError("No account found with this email.");
      else if (code === "auth/invalid-email") setError("Please enter a valid email address.");
      else setError(err.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth || (loading && !error && !successMessage)) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-zinc-500 animate-pulse">Authenticating...</p>
      </div>
    );
  }

  // Forgot Password View
  if (showForgotPassword) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center py-12 animate-in fade-in zoom-in duration-500 rounded-2xl">
        <div className="w-full max-w-md p-8 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-3xl backdrop-blur-xl shadow-2xl relative overflow-hidden text-zinc-900 dark:text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 dark:bg-amber-500/5 blur-[80px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/10 dark:bg-orange-500/5 blur-[80px] rounded-full pointer-events-none" />

          <div className="relative z-10">
            <button
              onClick={() => { setShowForgotPassword(false); setError(""); setSuccessMessage(""); }}
              className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white mb-6 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </button>

            <h2 className="text-3xl font-extrabold text-zinc-900 dark:text-white text-center mb-2">
              Reset Password
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 text-center mb-8 text-sm">
              Enter your email and we&apos;ll send you a reset link
            </p>

            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                <input
                  type="email"
                  placeholder="Email address"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full bg-zinc-100 dark:bg-black/50 border border-zinc-200 dark:border-white/10 rounded-xl py-3 pl-10 pr-4 text-zinc-900 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                />
              </div>

              {error && <p className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg border border-red-400/20">{error}</p>}
              {successMessage && <p className="text-green-400 text-sm text-center bg-green-400/10 py-2 rounded-lg border border-green-400/20">{successMessage}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl py-3 transition-all duration-300 flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <span className="animate-pulse">Sending...</span> : "Send Reset Link"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col items-center justify-center py-12 animate-in fade-in zoom-in duration-500 rounded-2xl">
      <div className="w-full max-w-md p-8 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-3xl backdrop-blur-xl shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 dark:bg-blue-500/5 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 dark:bg-purple-500/5 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10">
          <h2 className="text-3xl font-extrabold text-zinc-900 dark:text-white text-center mb-2">
            {isLogin ? "Welcome Back" : "Join AdTogether"}
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-center mb-8 text-sm">
            {isLogin ? "Log in to show an ad and get an ad shown" : "Join the reciprocal ad exchange to increase conversions"}
          </p>

          <form onSubmit={handleAuth} className="space-y-5">
            <div className="relative text-zinc-900 dark:text-white">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 dark:text-zinc-500" />
              <input
                type="email"
                placeholder="Email address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                className="w-full bg-zinc-100 dark:bg-black/50 border border-zinc-200 dark:border-white/10 rounded-xl py-3 pl-10 pr-4 text-zinc-900 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="relative text-zinc-900 dark:text-white">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 dark:text-zinc-500" />
              <input
                type="password"
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isLogin ? "current-password" : "new-password"}
                className="w-full bg-zinc-100 dark:bg-black/50 border border-zinc-200 dark:border-white/10 rounded-xl py-3 pl-10 pr-4 text-zinc-900 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              />
            </div>

            {!isLogin && (
              <div className="relative text-zinc-900 dark:text-white animate-in slide-in-from-top-2 duration-300">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                <input
                  type="password"
                  placeholder="Confirm Password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full bg-zinc-100 dark:bg-black/50 border border-zinc-200 dark:border-white/10 rounded-xl py-3 pl-10 pr-4 text-zinc-900 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                />
              </div>
            )}

            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(true); setError(""); }}
                  className="text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors font-medium"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {error && <p className="text-red-600 dark:text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg border border-red-400/20">{error}</p>}
            {successMessage && <p className="text-green-600 dark:text-green-400 text-sm text-center bg-green-400/10 py-2 rounded-lg border border-green-400/20">{successMessage}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl py-3 transition-all duration-300 flex justify-center items-center gap-2 shadow-[0_4px_15px_rgba(245,158,11,0.2)] dark:shadow-[0_0_15px_rgba(245,158,11,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <span className="animate-pulse">Processing...</span> : (
                <>
                  <LogIn className="w-5 h-5" />
                  {isLogin ? "Sign In" : "Sign Up"}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm text-zinc-400 dark:text-zinc-500">
            <div className="w-full h-px bg-zinc-200 dark:bg-white/10" />
            <span className="px-4">or</span>
            <div className="w-full h-px bg-zinc-200 dark:bg-white/10" />
          </div>

          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            className="mt-6 w-full bg-white border border-zinc-200 dark:border-transparent text-zinc-900 font-semibold rounded-xl py-3 transition-all duration-300 flex justify-center items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-100 shadow-md dark:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="relative w-5 h-5 group-hover:scale-110 transition-transform">
              <Image
                src="/google.png"
                alt="Google"
                fill
                className="object-contain"
              />
            </div>
            Continue with Google
          </button>

          <p className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(""); setSuccessMessage(""); setPassword(""); setConfirmPassword(""); }}
              className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-semibold transition-colors"
            >
              {isLogin ? "Sign up" : "Log in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
