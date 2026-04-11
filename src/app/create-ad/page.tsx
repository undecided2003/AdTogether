"use client";

import { useState, useEffect } from "react";
import { auth, db, storage } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { ArrowLeft, UploadCloud, Link as LinkIcon, Type, MapPin, X, Wand2, Loader2 } from "lucide-react";
import Link from "next/link";
import { COUNTRIES } from "@/lib/countries";
import { generateAdContent } from "./actions";
export default function CreateAdPage() {
  const [user, setUser] = useState<User | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [clickUrl, setClickUrl] = useState("https://");
  const [targetCountry, setTargetCountry] = useState("US");
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) router.push("/login");
      else setUser(currentUser);
    });
    return () => unsubscribe();
  }, [router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleGenerate = async () => {
    if (!clickUrl) {
      setError("Please enter a Destination URL first so we know what to scrape.");
      return;
    }
    if (!clickUrl.startsWith('http://') && !clickUrl.startsWith('https://')) {
      setError("Destination URL must start with http:// or https://");
      return;
    }
    
    setIsGenerating(true);
    setError("");
    
    try {
      const res = await generateAdContent(clickUrl);
      if (res.success) {
        setTitle(res.title?.substring(0, 30) || "");
        setDescription(res.description?.substring(0, 90) || "");
        
        if (res.imageBase64 && res.imageMimeType) {
          try {
            const byteCharacters = atob(res.imageBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: res.imageMimeType });
            
            const extension = res.imageMimeType.split('/')[1] || 'jpg';
            const file = new File([blob], `scraped-image.${extension}`, { type: res.imageMimeType });
            
            setImageFile(file);
            setPreview(URL.createObjectURL(file));
          } catch (e) {
            console.error("Failed to parse scraped image", e);
          }
        }
      } else {
        setError(res.error || "Failed to auto-generate content");
      }
    } catch (err: any) {
      setError("An error occurred during generation");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!imageFile) {
      setError("Please upload an image for the campaign.");
      return;
    }
    
    // Validate URL
    if (!clickUrl.startsWith('http://') && !clickUrl.startsWith('https://')) {
      setError("Destination URL must start with http:// or https://");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Upload Image to Firebase Storage
      const storageRef = ref(storage, `ads/${user.uid}/${Date.now()}_${imageFile.name}`);
      const uploadTask = await uploadBytesResumable(storageRef, imageFile);
      const imageUrl = await getDownloadURL(uploadTask.ref);

      // 2. Save Data to Firestore
      await addDoc(collection(db, "ads"), {
        ownerUid: user.uid,
        title,
        description,
        imageUrl,
        clickUrl,
        targetCountry,
        active: true,
        createdAt: new Date().toISOString(),
      });

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create campaign.");
    } finally {
      if (!success) {
        setLoading(false);
      }
    }
  };

  if (!user) return null; // Wait for redirect

  return (
    <div className="flex-grow w-full max-w-4xl mx-auto py-8 animate-in fade-in zoom-in-95 duration-500">
      
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-2xl">
        <button 
          onClick={() => router.push("/dashboard")}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all z-20"
          title="Cancel"
          type="button"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />
        
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2 relative z-10">Create New Campaign</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-10 relative z-10">Design your creative and select the target audience to spend your credits.</p>

        <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left Column - Details */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-amber-500 dark:text-amber-400" /> Destination URL (Click)
                  </span>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                  >
                    {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                    Auto-write Ad
                  </button>
                </label>
                <input
                  type="url"
                  required
                  value={clickUrl}
                  onChange={(e) => setClickUrl(e.target.value)}
                  placeholder="https://yourappstore.link"
                  className="w-full bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-white/10 rounded-xl py-3 px-4 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
                  <Type className="w-4 h-4 text-amber-500 dark:text-amber-400" /> Campaign Title
                </label>
                <input
                  type="text"
                  required
                  maxLength={30}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Play My Awesome Game"
                  className="w-full bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-white/10 rounded-xl py-3 px-4 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Description</label>
                <textarea
                  required
                  maxLength={90}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Catchy tagline or description..."
                  rows={3}
                  className="w-full bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-white/10 rounded-xl py-3 px-4 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-500 dark:text-amber-400" /> Target Country
                </label>
                <select
                  value={targetCountry}
                  onChange={(e) => setTargetCountry(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-white/10 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none"
                >
                  <option value="global">Global (Worldwide)</option>
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right Column - Image Upload & Preview */}
            <div className="space-y-6">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Campaign Creative (Image)</label>
              
              <div className="relative group rounded-xl border-2 border-dashed border-zinc-300 dark:border-white/20 bg-zinc-50 dark:bg-black/30 hover:bg-zinc-100 dark:hover:bg-black/50 hover:border-amber-400 dark:hover:border-amber-500/50 transition-all flex flex-col items-center justify-center p-6 text-center cursor-pointer overflow-hidden"
                   style={{ minHeight: "240px" }}>
                
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                />

                {preview ? (
                  <div className="absolute inset-0 z-10 w-full h-full">
                    <img src={preview} alt="Preview" className="w-full h-full object-contain opacity-80 dark:opacity-60" />
                    <div className="absolute inset-0 bg-white/40 dark:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-zinc-900 dark:text-white font-medium flex items-center gap-2 bg-white/80 dark:bg-black/50 px-4 py-2 rounded-lg backdrop-blur">
                        <UploadCloud className="w-4 h-4" /> Change Image
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="z-10 flex flex-col items-center text-zinc-500 dark:text-zinc-400">
                    <UploadCloud className="w-10 h-10 mb-4 text-zinc-400 dark:text-zinc-500 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors" />
                    <p className="font-medium text-zinc-700 dark:text-white mb-1">Upload a creative</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">PNG, JPG or WebP up to 5MB</p>
                    <p className="text-xs mt-2 text-zinc-600 dark:text-zinc-500">1200 x 628 is optimal</p>
                  </div>
                )}
              </div>

              {/* Live Preview Box */}
              {preview && (
                <div className="mt-6 border border-zinc-200 dark:border-white/10 rounded-xl overflow-hidden bg-white dark:bg-black shadow-lg">
                  <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest px-4 py-2 bg-zinc-50 dark:bg-white/5 border-b border-zinc-200 dark:border-white/10">
                    Live Preview (Native Ad format)
                  </div>
                  <div className="p-4 flex gap-4">
                    <img src={preview} alt="Thumb" className="w-20 h-20 rounded-lg object-contain bg-zinc-100 dark:bg-white/5" />
                    <div className="flex-grow">
                      <h4 className="text-zinc-900 dark:text-white font-semibold line-clamp-1">{title || "Campaign Title"}</h4>
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm line-clamp-2 mt-1">{description || "App description goes here..."}</p>
                      <span className="inline-block mt-2 text-xs bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-500/30">
                        Sponsored
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && <div className="text-red-600 dark:text-red-400 text-sm bg-red-100 dark:bg-red-400/10 p-3 rounded-xl border border-red-200 dark:border-red-400/20">{error}</div>}

          <div className="pt-6 border-t border-zinc-200 dark:border-white/10 flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="px-8 py-3 rounded-xl border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 transition-all font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className={`font-medium px-8 py-3 rounded-xl transition-all shadow-sm dark:shadow-[0_0_15px_rgba(245,158,11,0.3)] disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[200px] ${
                success 
                  ? "bg-green-500 text-white hover:bg-green-600 dark:hover:bg-green-500" 
                  : "bg-amber-500 hover:bg-amber-400 text-black disabled:opacity-50"
              }`}
            >
              {success ? (
                <>
                  <span className="animate-in zoom-in duration-300">✓</span>
                  Campaign Launched!
                </>
              ) : loading ? (
                <span className="animate-pulse">Uploading...</span>
              ) : (
                "Launch Campaign"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
