"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { login } from '@teso/auth/actions';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { LottiePlayer } from '@/components/ui/lottie-player';

function SignInContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gsiLoaded, setGsiLoaded] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || searchParams.get("returnUrl") || "/plan";

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });

    if (!validate()) {
      toast.error("Please fill in valid credentials");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("email", email.trim());
      formData.append("password", password);

      const res = await login(formData);

      if (res?.error) {
        toast.error(res.error || "Invalid credentials");
        setLoading(false);
        return;
      }

      toast.success("Welcome back!");
      if (callbackUrl.startsWith("http://") || callbackUrl.startsWith("https://")) {
        window.location.href = callbackUrl;
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (error) {
      toast.error("Something went wrong");
      setLoading(false);
    }
  };

  const handleGoogleCallback = async (response: any) => {
    setLoading(true);
    try {
      const idToken = response.credential;
      const { createBrowserClient } = await import("@teso/auth/client");
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });
      if (error) throw error;

      toast.success("Welcome back!");
      if (callbackUrl.startsWith("http://") || callbackUrl.startsWith("https://")) {
        window.location.href = callbackUrl;
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to sign in with Google");
      setLoading(false);
    }
  };

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.warn("NEXT_PUBLIC_GOOGLE_CLIENT_ID not found in env variables.");
      return;
    }

    const initGoogle = () => {
      const google = (window as any).google;
      if (google) {
        try {
          google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleCallback,
          });
          google.accounts.id.renderButton(
            document.getElementById("google-signin-btn"),
            { theme: "outline", size: "large", width: 384, logo_alignment: "center" }
          );
        } catch (err) {
          console.error("Failed to initialize Google Sign-In:", err);
        }
      }
    };

    if ((window as any).google) {
      initGoogle();
    } else if (gsiLoaded) {
      initGoogle();
    }
  }, [gsiLoaded]);

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]">
      <Script 
        src="https://accounts.google.com/gsi/client" 
        strategy="afterInteractive"
        onLoad={() => setGsiLoaded(true)}
      />
      {/* Left Side - Branding */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] p-12 flex-col justify-center items-center relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 text-center w-full flex justify-center items-center">
          {/* Lottie Animation */}
          <div className="flex items-center justify-center w-full max-w-sm aspect-square">
            <LottiePlayer animationPath="/TemanASN Home Mobile.json" className="w-full h-full" />
          </div>
        </div>
      </div>

      {/* Right Side - Login Form Card */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-white md:bg-slate-50 md:rounded-l-[25px]">
        <div className="w-full max-w-md bg-white md:rounded-[2rem] p-6 sm:p-8 space-y-6">
          
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <img src="/icon.png" alt="Logo" className="w-12 h-12 object-contain" />
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Login to your account</h2>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-5">
            {/* Google Button */}
            <div className="w-full flex justify-center mb-4">
              <div id="google-signin-btn" className="w-full min-h-[44px]"></div>
            </div>

            <div className="relative flex items-center justify-center my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-slate-400 font-medium">Or</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-medium text-slate-500">Email Address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: undefined });
                  }}
                  onBlur={() => {
                    setTouched(prev => ({ ...prev, email: true }));
                    const trimmed = email.trim();
                    if (!trimmed) {
                      setErrors(prev => ({ ...prev, email: "Email address is required" }));
                    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                      setErrors(prev => ({ ...prev, email: "Please enter a valid email address" }));
                    } else {
                      setErrors(prev => ({ ...prev, email: undefined }));
                    }
                  }}
                  className={`w-full h-12 px-4 rounded-lg border bg-[#F8FAFC] text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none transition-all ${
                    touched.email && errors.email
                      ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-50/10"
                      : "border-slate-200/60 focus:border-[#132342] focus:ring-1 focus:ring-[#132342]"
                  }`}
                  placeholder="Enter your email address"
                />
                {touched.email && errors.email && (
                  <p className="text-xs text-red-500 font-medium">{errors.email}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-xs font-medium text-slate-500">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors({ ...errors, password: undefined });
                    }}
                    onBlur={() => {
                      setTouched(prev => ({ ...prev, password: true }));
                      if (!password) {
                        setErrors(prev => ({ ...prev, password: "Password is required" }));
                      } else if (password.length < 6) {
                        setErrors(prev => ({ ...prev, password: "Password must be at least 6 characters" }));
                      } else {
                        setErrors(prev => ({ ...prev, password: undefined }));
                      }
                    }}
                    className={`w-full h-12 pl-4 pr-12 rounded-lg border bg-[#F8FAFC] text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none transition-all ${
                      touched.password && errors.password
                        ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-50/10"
                        : "border-slate-200/60 focus:border-[#132342] focus:ring-1 focus:ring-[#132342]"
                    }`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {touched.password && errors.password && (
                  <p className="text-xs text-red-500 font-medium">{errors.password}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-2 bg-[#132342] hover:bg-[#1c305a] text-white font-medium rounded-[2rem] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Logging in...
                </>
              ) : "Login"}
            </button>
          </form>

          <div className="text-center pt-4">
            <p className="text-sm text-slate-500 font-medium">
              Not Registered Yet?{" "}
              <Link href="/auth/sign-up" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
