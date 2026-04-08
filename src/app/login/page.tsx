"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail, sendEmailVerification } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Mail, Lock, LogIn, Globe, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const router = useRouter();

  const createOrUpdateUserDoc = async (user: any) => {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        credits: 5, // Starter credits!
        country: "Unknown", // Can be updated later
        createdAt: new Date().toISOString(),
      });
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
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await createOrUpdateUserDoc(cred.user);
        // Send verification email on signup
        await sendEmailVerification(cred.user);
      }
      router.push("/dashboard");
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
      const cred = await signInWithPopup(auth, provider);
      await createOrUpdateUserDoc(cred.user);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to authenticate with Google");
    } finally {
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

  // Forgot Password View
  if (showForgotPassword) {
    return (
      <div className="flex-grow flex items-center justify-center animate-in fade-in zoom-in duration-500 rounded-2xl">
        <div className="w-full max-w-md p-8 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none" />

          <div className="relative z-10">
            <button
              onClick={() => { setShowForgotPassword(false); setError(""); setSuccessMessage(""); }}
              className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </button>

            <h2 className="text-3xl font-extrabold text-white text-center mb-2">
              Reset Password
            </h2>
            <p className="text-zinc-400 text-center mb-8 text-sm">
              Enter your email and we&apos;ll send you a reset link
            </p>

            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                <input
                  type="email"
                  placeholder="Email address"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {error && <p className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg border border-red-400/20">{error}</p>}
              {successMessage && <p className="text-green-400 text-sm text-center bg-green-400/10 py-2 rounded-lg border border-green-400/20">{successMessage}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl py-3 transition-all duration-300 flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
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
    <div className="flex-grow flex items-center justify-center animate-in fade-in zoom-in duration-500 rounded-2xl">
      <div className="w-full max-w-md p-8 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10">
          <h2 className="text-3xl font-extrabold text-white text-center mb-2">
            {isLogin ? "Welcome Back" : "Join AdTogether"}
          </h2>
          <p className="text-zinc-400 text-center mb-8 text-sm">
            {isLogin ? "Log in to manage your ad sharing credits" : "Create an account to start earning global traffic"}
          </p>

          <form onSubmit={handleAuth} className="space-y-5">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
              <input
                type="email"
                placeholder="Email address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
              <input
                type="password"
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(true); setError(""); }}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {error && <p className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg border border-red-400/20">{error}</p>}
            {successMessage && <p className="text-green-400 text-sm text-center bg-green-400/10 py-2 rounded-lg border border-green-400/20">{successMessage}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl py-3 transition-all duration-300 flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <span className="animate-pulse">Processing...</span> : (
                <>
                  <LogIn className="w-5 h-5" />
                  {isLogin ? "Sign In" : "Sign Up"}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm text-zinc-500">
            <div className="w-full h-px bg-white/10" />
            <span className="px-4">or</span>
            <div className="w-full h-px bg-white/10" />
          </div>

          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            className="mt-6 w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl py-3 transition-all duration-300 flex justify-center items-center gap-2"
          >
            <Globe className="w-5 h-5 text-blue-400" />
            Continue with Google
          </button>

          <p className="mt-8 text-center text-sm text-zinc-400">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(""); setSuccessMessage(""); }}
              className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
            >
              {isLogin ? "Sign up" : "Log in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
