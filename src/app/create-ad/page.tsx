"use client";

import { useState, useEffect } from "react";
import { auth, db, storage } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { ArrowLeft, UploadCloud, Link as LinkIcon, Type, MapPin } from "lucide-react";
import Link from "next/link";

export default function CreateAdPage() {
  const [user, setUser] = useState<User | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [clickUrl, setClickUrl] = useState("");
  const [targetCountry, setTargetCountry] = useState("US");
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!imageFile) {
      setError("Please upload an image for the ad.");
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

      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create ad.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null; // Wait for redirect

  return (
    <div className="flex-grow w-full max-w-4xl mx-auto py-8 animate-in fade-in zoom-in-95 duration-500">
      
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
        
        <h1 className="text-3xl font-bold text-white mb-2 relative z-10">Create New Ad Campaign</h1>
        <p className="text-zinc-400 mb-10 relative z-10">Design your creative and select the target audience to spend your credits.</p>

        <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left Column - Details */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
                  <Type className="w-4 h-4 text-blue-400" /> Ad Title
                </label>
                <input
                  type="text"
                  required
                  maxLength={30}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Play My Awesome Game"
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Description</label>
                <textarea
                  required
                  maxLength={90}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Catchy tagline or description..."
                  rows={3}
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-blue-400" /> Destination URL (Click)
                </label>
                <input
                  type="url"
                  required
                  value={clickUrl}
                  onChange={(e) => setClickUrl(e.target.value)}
                  placeholder="https://yourappstore.link"
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-400" /> Target Country
                </label>
                <select
                  value={targetCountry}
                  onChange={(e) => setTargetCountry(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  <option value="US">United States (Tier 1)</option>
                  <option value="GB">United Kingdom (Tier 1)</option>
                  <option value="CA">Canada (Tier 1)</option>
                  <option value="DE">Germany (Tier 2)</option>
                  <option value="IN">India (Tier 3)</option>
                  <option value="BR">Brazil (Tier 3)</option>
                  <option value="ALL">Global (Worldwide)</option>
                </select>
              </div>
            </div>

            {/* Right Column - Image Upload & Preview */}
            <div className="space-y-6">
              <label className="block text-sm font-medium text-zinc-300 mb-2">Ad Creative (Image)</label>
              
              <div className="relative group rounded-xl border-2 border-dashed border-white/20 bg-black/30 hover:bg-black/50 hover:border-blue-500/50 transition-all flex flex-col items-center justify-center p-6 text-center cursor-pointer overflow-hidden" 
                   style={{ minHeight: "240px" }}>
                
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                />

                {preview ? (
                  <div className="absolute inset-0 z-10 w-full h-full">
                    <img src={preview} alt="Preview" className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white font-medium flex items-center gap-2 bg-black/50 px-4 py-2 rounded-lg backdrop-blur">
                        <UploadCloud className="w-4 h-4" /> Change Image
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="z-10 flex flex-col items-center text-zinc-400">
                    <UploadCloud className="w-10 h-10 mb-4 text-zinc-500 group-hover:text-blue-400 transition-colors" />
                    <p className="font-medium text-white mb-1">Upload a creative</p>
                    <p className="text-xs">PNG, JPG or WebP up to 5MB</p>
                    <p className="text-xs mt-2 text-zinc-500">1200 x 628 is optimal</p>
                  </div>
                )}
              </div>

              {/* Live Preview Box */}
              {preview && (
                <div className="mt-6 border border-white/10 rounded-xl overflow-hidden bg-black shadow-lg">
                  <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest px-4 py-2 bg-white/5 border-b border-white/10">
                    Live Preview (Native Ad format)
                  </div>
                  <div className="p-4 flex gap-4">
                    <img src={preview} alt="Thumb" className="w-20 h-20 rounded-lg object-cover" />
                    <div className="flex-grow">
                      <h4 className="text-white font-semibold line-clamp-1">{title || "Ad Title"}</h4>
                      <p className="text-zinc-400 text-sm line-clamp-2 mt-1">{description || "App description goes here..."}</p>
                      <span className="inline-block mt-2 text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">
                        Sponsored
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-xl border border-red-400/20">{error}</div>}

          <div className="pt-6 border-t border-white/10 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-8 py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[200px]"
            >
              {loading ? <span className="animate-pulse">Uploading...</span> : "Launch Campaign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
