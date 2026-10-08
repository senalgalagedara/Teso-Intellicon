"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { Mail, Lock, ArrowRight, ArrowLeft, User, Calendar, BookOpen, GraduationCap, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LottiePlayer } from '@/components/ui/lottie-player';
import { registerDbUser, linkGuestAccount } from '@/app/actions/candidate';

type ExamType = 'A/L' | '';
type Stream = 'Physical Science' | 'Commerce' | 'Arts' | 'Technology' | '';

const AL_STREAMS: Record<string, string[]> = {
  'Physical Science': ['Combined Mathematics', 'Biology', 'Physics', 'Chemistry', 'ICT'],
  'Commerce': ['Economics', 'Business Studies', 'Accounting', 'Business Statistics', 'ICT'],
  'Arts': ['Sinhala', 'Political Science', 'Logic', 'History', 'Geography', 'English Literature', 'Media Studies', 'Buddhist Civilization', 'Economics', 'ICT'],
  'Technology': ['Science for Technology (SFT)', 'Engineering Technology (ET)', 'Biosystems Technology (BST)', 'ICT'],
};

const ALL_TEACHER_SUBJECTS = Array.from(
  new Set(Object.values(AL_STREAMS).flat())
).sort();

const LeftPanel = () => (
  <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] p-12 flex-col justify-center items-center relative overflow-hidden">
    <div className="absolute top-20 left-20 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl" />
    <div className="absolute bottom-20 right-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
    <div className="relative z-10 text-center w-full flex justify-center items-center">
      {/* Lottie Animation */}
      <div className="flex items-center justify-center w-full max-w-sm aspect-square">
        <LottiePlayer animationPath="/STUDENT.json" className="w-full h-full" />
      </div>
    </div>
  </div>
);

function SignUpContent() {
  const [step, setStep] = useState(1);
  const [registrationMethod, setRegistrationMethod] = useState<'email' | 'google' | null>(null);
  const [loading, setLoading] = useState(false);
  const [gsiLoaded, setGsiLoaded] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || searchParams.get("returnUrl") || "/host/create";
  const guestUserId = searchParams.get("guestUserId") || "";

  const [role, setRole] = useState<'student' | 'host'>('student');
  const [selectedTeacherSubject, setSelectedTeacherSubject] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [grade, setGrade] = useState('');
  const [targetedExam, setTargetedExam] = useState<ExamType>('');
  const [monthsToExam, setMonthsToExam] = useState('');
  const [stream, setStream] = useState<Stream>('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  const validateStep1 = () => {
    const newErrors: { [key: string]: string } = {};
    if (!firstName.trim() || firstName.trim().length < 2) {
      newErrors.firstName = "First name must be at least 2 characters";
    }
    if (!lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }
    if (role === 'student') {
      const parsedAge = parseInt(age);
      if (!age || isNaN(parsedAge) || parsedAge < 10 || parsedAge > 100) {
        newErrors.age = "Please enter a valid age (10-100)";
      }
    }
    if (!email.trim()) {
      newErrors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    if (!agreedToTerms) {
      newErrors.agreedToTerms = "You must agree to the Terms & Privacy Policy";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const cleanCode = verificationCode.trim();
    if (!cleanCode) {
      setErrors(prev => ({ ...prev, verificationCode: "Verification code is required" }));
      return false;
    }
    if (!/^\d{6}$/.test(cleanCode)) {
      setErrors(prev => ({ ...prev, verificationCode: "Verification code must be 6 digits" }));
      return false;
    }
    setErrors(prev => {
      const copy = { ...prev };
      delete copy.verificationCode;
      return copy;
    });
    return true;
  };

  const validateStep3 = () => {
    const newErrors: { [key: string]: string } = {};
    if (role === 'host') {
      if (!selectedTeacherSubject) {
        newErrors.selectedTeacherSubject = "Please select the subject you teach";
      }
    } else {
      if (!grade) newErrors.grade = "Please select a grade";
      if (!targetedExam) newErrors.targetedExam = "Please select target exam";
      const parsedMonths = parseInt(monthsToExam);
      if (!monthsToExam || isNaN(parsedMonths) || parsedMonths < 1 || parsedMonths > 60) {
        newErrors.monthsToExam = "Months must be between 1 and 60";
      }
      if (targetedExam === 'A/L') {
        if (!stream) newErrors.stream = "Please select a stream";
        if (selectedSubjects.length !== 3) newErrors.subjects = "Please select exactly 3 subjects";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

      toast.success("Account created successfully!");
      if (callbackUrl.startsWith("http://") || callbackUrl.startsWith("https://")) {
        window.location.href = callbackUrl;
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    }
    catch (e: any) {
      console.error(e);
      toast.error(e.message || "Authentication failed");
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
            document.getElementById("google-signup-btn"),
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

  const handleSendCode = async () => {
    setTouched({
      firstName: true,
      lastName: true,
      age: true,
      email: true,
      password: true,
      confirmPassword: true,
      agreedToTerms: true,
    });

    if (!validateStep1()) {
      toast.error("Please resolve the errors highlighted below");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim().toLowerCase() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed to send code");
      toast.success("Verification code sent!");
      setRegistrationMethod('email');
      setStep(2);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const handleVerifyCode = async () => {
    setTouched(prev => ({ ...prev, verificationCode: true }));
    if (!validateStep2()) {
      toast.error("Please enter a valid 6-digit verification code");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim().toLowerCase(), code: verificationCode.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (!data.valid) throw new Error(data.message);
      setIsVerified(true);
      toast.success("Email verified!");
      setStep(3);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const handleSubjectToggle = (subject: string) => {
    if (selectedSubjects.includes(subject)) {
      setSelectedSubjects(selectedSubjects.filter(s => s !== subject));
    } else if (selectedSubjects.length < 3) {
      setSelectedSubjects([...selectedSubjects, subject]);
    }
  };

  const handleFinalSubmit = async () => {
    setTouched(prev => ({
      ...prev,
      grade: true,
      targetedExam: true,
      monthsToExam: true,
      stream: true,
      subjects: true,
      selectedTeacherSubject: true,
    }));

    if (!validateStep3()) {
      toast.error(role === 'host' ? "Please select the subject you teach" : "Please complete all academic details");
      return;
    }

    setLoading(true);
    try {
      const { createBrowserClient } = await import("@teso/auth/client");
      const supabase = createBrowserClient();
 
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: role,
            ...(role === 'host'
              ? {
                  subjects: [selectedTeacherSubject],
                }
              : {
                  age: parseInt(age) || undefined,
                  grade,
                  exam_type: targetedExam,
                  months_to_exam: parseInt(monthsToExam) || undefined,
                  stream: targetedExam === 'A/L' ? stream : undefined,
                  subjects: selectedSubjects,
                }
            )
          }
        }
      });
 
      if (error) {
        toast.error(error.message || "Registration failed");
        setLoading(false);
        return;
      }
 
      toast.success("Account created!");
 
      if (data.user) {
        if (guestUserId) {
          try {
            const linkRes = await linkGuestAccount(
              guestUserId,
              data.user.id,
              email,
              role,
              parseInt(age) || undefined,
              grade,
              targetedExam || undefined,
              parseInt(monthsToExam) || undefined,
              targetedExam === 'A/L' ? stream : undefined,
              role === 'host' ? [selectedTeacherSubject] : selectedSubjects
            );
            if (linkRes.success) {
              toast.success("Exam details saved to your new account!");
            } else {
              console.error("Failed to link guest account:", linkRes.error);
            }
          } catch (linkErr) {
            console.error("Link guest account action error:", linkErr);
          }
        } else {
          try {
            const registerRes = await registerDbUser(
              data.user.id,
              email,
              `${firstName} ${lastName}`.trim(),
              role,
              parseInt(age) || undefined,
              grade,
              targetedExam || undefined,
              parseInt(monthsToExam) || undefined,
              targetedExam === 'A/L' ? stream : undefined,
              role === 'host' ? [selectedTeacherSubject] : selectedSubjects
            );
            if (!registerRes.success) {
              console.error("Failed to register database profile:", registerRes.error);
            }
          } catch (regErr) {
            console.error("Database registration action error:", regErr);
          }
        }
      }
 
      const destUrl = guestUserId ? "/host/candidates" : callbackUrl;

      if (data.session) {
        await supabase.auth.signOut();
      }

      const signInUrl = `/auth/sign-in?callbackUrl=${encodeURIComponent(destUrl)}`;
      router.push(signInUrl);
    } catch (e: any) { toast.error(e.message || "Registration failed"); setLoading(false); }
  };
 
  const canStep1 = firstName && lastName && (role === 'host' ? true : age) && email && password && confirmPassword && password === confirmPassword && agreedToTerms;
  const canStep2 = verificationCode.length >= 6;
  const canStep3 = role === 'host'
    ? selectedTeacherSubject
    : (grade && targetedExam && monthsToExam && (targetedExam === 'A/L' && stream && selectedSubjects.length === 3));
  const getSubjects = () => (targetedExam === 'A/L' && stream && AL_STREAMS[stream]) ? AL_STREAMS[stream] : [];

  const inputCls = "w-full h-12 rounded-lg border border-slate-200/60 bg-[#F8FAFC] text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-[#132342] focus:ring-1 focus:ring-[#132342] transition-all";
  const btnBlack = "flex-1 bg-[#132342] hover:bg-[#1c305a] text-white font-medium rounded-[2rem] py-3 h-12 transition-all border-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center";
  const btnOutline = "flex-1 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-[2rem] py-3 h-12 transition-all border border-slate-200 disabled:opacity-50 cursor-pointer flex items-center justify-center";

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGsiLoaded(true)}
      />
      <LeftPanel />
      <div className="flex-1 flex items-center md:rounded-l-[25px] justify-center p-4 sm:p-6 md:p-8 bg-white md:bg-slate-50 overflow-y-auto">
        <div className="w-full max-w-lg bg-white md:rounded-[2rem] p-4 sm:p-8 space-y-6">
          {/* Main Form Content */}
          <div className="w-full">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <img src="/icon.png" alt="Logo" className="w-20 h-20 object-contain" />
            </div>

            {/* Header */}
            <div className="flex flex-col items-center text-center gap-4 mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Create an account</h2>
                <p className="text-sm text-slate-500 font-medium mt-1">Join and start your learning journey</p>
              </div>
              <div className="flex items-center gap-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-all ${step >= i ? 'bg-[#132342] text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`}>{i}</div>
                ))}
              </div>
            </div>

            {/* Step 1 */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Google Button */}
                <div className="w-full flex justify-center mb-4">
                  <div id="google-signup-btn" className="w-full min-h-[44px]"></div>
                </div>

                <div className="relative flex items-center justify-center my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-slate-400 font-medium">Or</span>
                  </div>
                </div>

                {/* Role Selector */}
                <div className="space-y-1.5 mb-4">
                  <label className="block text-xs font-medium text-slate-500">I am registering as</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('student')}
                      className={`h-11 rounded-xl border text-sm font-semibold transition-all cursor-pointer flex items-center justify-center ${role === 'student' ? 'border-[#132342] bg-[#132342] text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50/50'}`}
                    >
                      Student
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('host')}
                      className={`h-11 rounded-xl border text-sm font-semibold transition-all cursor-pointer flex items-center justify-center ${role === 'host' ? 'border-[#132342] bg-[#132342] text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50/50'}`}
                    >
                      Teacher
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-500">First Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input
                        type="text"
                        value={firstName}
                        onChange={e => {
                          setFirstName(e.target.value);
                          if (errors.firstName) setErrors(prev => ({ ...prev, firstName: '' }));
                        }}
                        onBlur={() => {
                          setTouched(prev => ({ ...prev, firstName: true }));
                          if (!firstName.trim() || firstName.trim().length < 2) {
                            setErrors(prev => ({ ...prev, firstName: "First name must be at least 2 characters" }));
                          }
                        }}
                        className={`${inputCls} pl-10 ${touched.firstName && errors.firstName ? "border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50/10" : ""}`}
                        placeholder="John"
                      />
                    </div>
                    {touched.firstName && errors.firstName && (
                      <p className="text-xs text-red-500 font-medium">{errors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-500">Last Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input
                        type="text"
                        value={lastName}
                        onChange={e => {
                          setLastName(e.target.value);
                          if (errors.lastName) setErrors(prev => ({ ...prev, lastName: '' }));
                        }}
                        onBlur={() => {
                          setTouched(prev => ({ ...prev, lastName: true }));
                          if (!lastName.trim()) {
                            setErrors(prev => ({ ...prev, lastName: "Last name is required" }));
                          }
                        }}
                        className={`${inputCls} pl-10 ${touched.lastName && errors.lastName ? "border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50/10" : ""}`}
                        placeholder="Doe"
                      />
                    </div>
                    {touched.lastName && errors.lastName && (
                      <p className="text-xs text-red-500 font-medium">{errors.lastName}</p>
                    )}
                  </div>
                </div>
                {role === 'student' && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-500">Age</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input
                        type="number"
                        value={age}
                        onChange={e => {
                          setAge(e.target.value);
                          if (errors.age) setErrors(prev => ({ ...prev, age: '' }));
                        }}
                        onBlur={() => {
                          setTouched(prev => ({ ...prev, age: true }));
                          const pAge = parseInt(age);
                          if (!age || isNaN(pAge) || pAge < 10 || pAge > 100) {
                            setErrors(prev => ({ ...prev, age: "Please enter a valid age (10-100)" }));
                          }
                        }}
                        className={`${inputCls} pl-10 ${touched.age && errors.age ? "border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50/10" : ""}`}
                        placeholder="19"
                      />
                    </div>
                    {touched.age && errors.age && (
                      <p className="text-xs text-red-500 font-medium">{errors.age}</p>
                    )}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-500">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                      }}
                      onBlur={() => {
                        setTouched(prev => ({ ...prev, email: true }));
                        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                          setErrors(prev => ({ ...prev, email: "Please enter a valid email address" }));
                        }
                      }}
                      className={`${inputCls} pl-10 ${touched.email && errors.email ? "border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50/10" : ""}`}
                      placeholder="Enter your email address"
                    />
                  </div>
                  {touched.email && errors.email && (
                    <p className="text-xs text-red-500 font-medium">{errors.email}</p>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-500">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={e => {
                          setPassword(e.target.value);
                          if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                        }}
                        onBlur={() => {
                          setTouched(prev => ({ ...prev, password: true }));
                          if (!password || password.length < 6) {
                            setErrors(prev => ({ ...prev, password: "Password must be at least 6 characters" }));
                          }
                        }}
                        className={`${inputCls} pl-10 pr-10 ${touched.password && errors.password ? "border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50/10" : ""}`}
                        placeholder="Create your password"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {touched.password && errors.password && (
                      <p className="text-xs text-red-500 font-medium">{errors.password}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-500">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={e => {
                          setConfirmPassword(e.target.value);
                          if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: '' }));
                        }}
                        onBlur={() => {
                          setTouched(prev => ({ ...prev, confirmPassword: true }));
                          if (!confirmPassword || password !== confirmPassword) {
                            setErrors(prev => ({ ...prev, confirmPassword: "Passwords do not match" }));
                          }
                        }}
                        className={`${inputCls} pl-10 pr-10 ${touched.confirmPassword && errors.confirmPassword ? "border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50/10" : ""}`}
                        placeholder="Confirm password"
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {touched.confirmPassword && errors.confirmPassword && (
                      <p className="text-xs text-red-500 font-medium">{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1 mt-4">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="agree-checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => {
                        setAgreedToTerms(e.target.checked);
                        if (errors.agreedToTerms) setErrors(prev => ({ ...prev, agreedToTerms: '' }));
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="agree-checkbox" className="text-xs text-slate-500 font-medium leading-normal cursor-pointer select-none">
                      I agree to the{" "}
                      <Link href="/terms" target="_blank" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
                        Terms & Conditions
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" target="_blank" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
                        Privacy Policy
                      </Link>.
                    </label>
                  </div>
                  {touched.agreedToTerms && errors.agreedToTerms && (
                    <p className="text-xs text-red-500 font-medium pl-6">{errors.agreedToTerms}</p>
                  )}
                </div>
                <div className="flex flex-col gap-3 pt-4">
                  <button onClick={handleSendCode} disabled={loading} className={btnBlack}>
                    {loading ? "Sending Code..." : "Create an account"}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="space-y-8">
                <div className="text-center space-y-3">
                  <div className="w-20 h-20 bg-gradient-to-br from-cyan-50 to-purple-50 border border-slate-200/80 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                    <Mail className="w-10 h-10 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">Verify your Email</h3>
                    <p className="text-slate-500 font-caveat">We've sent a code to <span className="text-slate-800 font-semibold">{email}</span></p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Verification Code</label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      setVerificationCode(val);
                      if (errors.verificationCode) setErrors(prev => ({ ...prev, verificationCode: '' }));
                    }}
                    onBlur={() => {
                      setTouched(prev => ({ ...prev, verificationCode: true }));
                      if (!/^\d{6}$/.test(verificationCode.trim())) {
                        setErrors(prev => ({ ...prev, verificationCode: "Verification code must be 6 digits" }));
                      }
                    }}
                    className={`w-full rounded-xl px-4 py-3.5 text-center text-3xl font-bold tracking-[0.5em] border bg-slate-50/50 text-slate-900 focus:outline-none focus:bg-white transition-all ${
                      touched.verificationCode && errors.verificationCode
                        ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                        : "border-slate-200 focus:border-purple-600 focus:ring-4 focus:ring-purple-600/10"
                    }`}
                    placeholder="000000"
                    maxLength={6}
                  />
                  {touched.verificationCode && errors.verificationCode && (
                    <p className="text-xs text-red-500 text-center font-medium">{errors.verificationCode}</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className={btnOutline}>Back</button>
                  <button onClick={handleVerifyCode} disabled={loading} className={btnBlack}>{loading ? "Verifying..." : "Verify"}</button>
                </div>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="space-y-5">
                {role === 'student' ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Grade</label>
                        <div className="relative">
                          <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 z-10" />
                          <Select value={grade} onValueChange={v => { setGrade(v); if (errors.grade) setErrors(prev => ({ ...prev, grade: '' })); }}>
                            <SelectTrigger className={`w-full bg-slate-50/50 hover:bg-slate-50 text-slate-900 rounded-xl pl-10 border focus:bg-white h-12 font-medium transition-all [&>span]:line-clamp-1 ${errors.grade ? "border-red-500" : "border-slate-200"}`}>
                              <SelectValue placeholder="Select Grade" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border border-slate-200/80 rounded-xl shadow-lg">
                              {[12, 13].map(g => <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        {errors.grade && <p className="text-xs text-red-500 font-medium">{errors.grade}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Target Exam</label>
                        <div className="relative">
                          <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 z-10" />
                          <Select value={targetedExam} onValueChange={v => { setTargetedExam(v as ExamType); setStream(''); setSelectedSubjects([]); if (errors.targetedExam) setErrors(prev => ({ ...prev, targetedExam: '' })); }}>
                            <SelectTrigger className={`w-full bg-slate-50/50 hover:bg-slate-50 text-slate-900 rounded-xl pl-10 border focus:bg-white h-12 font-medium transition-all [&>span]:line-clamp-1 ${errors.targetedExam ? "border-red-500" : "border-slate-200"}`}>
                              <SelectValue placeholder="Select Exam" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border border-slate-200/80 rounded-xl shadow-lg">
                              <SelectItem value="A/L">A/L</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {errors.targetedExam && <p className="text-xs text-red-500 font-medium">{errors.targetedExam}</p>}
                      </div>
                    </div>

                    {targetedExam && (
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Months until Exam</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                          <input
                            type="number"
                            value={monthsToExam}
                            onChange={e => {
                              setMonthsToExam(e.target.value);
                              if (errors.monthsToExam) setErrors(prev => ({ ...prev, monthsToExam: '' }));
                            }}
                            className={`${inputCls} pl-10 ${errors.monthsToExam ? "border-red-500" : ""}`}
                            placeholder="e.g. 12"
                            min="1"
                            max="60"
                          />
                        </div>
                        {errors.monthsToExam && <p className="text-xs text-red-500 font-medium">{errors.monthsToExam}</p>}
                      </div>
                    )}

                    {targetedExam === 'A/L' && (
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Stream</label>
                        <Select value={stream} onValueChange={v => { setStream(v as Stream); setSelectedSubjects([]); if (errors.stream) setErrors(prev => ({ ...prev, stream: '' })); }}>
                          <SelectTrigger className={`w-full bg-slate-50/50 hover:bg-slate-50 text-slate-900 rounded-xl border focus:bg-white h-12 font-medium transition-all [&>span]:line-clamp-1 ${errors.stream ? "border-red-500" : "border-slate-200"}`}>
                            <SelectValue placeholder="Select Stream" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-slate-200/80 rounded-xl shadow-lg">
                            {Object.keys(AL_STREAMS).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {errors.stream && <p className="text-xs text-red-500 font-medium">{errors.stream}</p>}
                      </div>
                    )}

                    {targetedExam === 'A/L' && stream && (
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Select 3 Subjects ({selectedSubjects.length}/3)</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                          {getSubjects().map(sub => (
                            <button key={sub} onClick={() => { handleSubjectToggle(sub); if (errors.subjects) setErrors(prev => ({ ...prev, subjects: '' })); }} className={`p-3 rounded-xl text-sm font-medium text-left border transition-all ${selectedSubjects.includes(sub) ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white border-purple-700 shadow-md cursor-pointer' : 'bg-slate-50/50 text-slate-700 border-slate-200 hover:border-purple-300 hover:bg-purple-50/80 cursor-pointer'}`}>
                              {sub}
                            </button>
                          ))}
                        </div>
                        {errors.subjects && <p className="text-xs text-red-500 font-medium">{errors.subjects}</p>}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">Which subject do you teach?</label>
                      <Select value={selectedTeacherSubject} onValueChange={v => { setSelectedTeacherSubject(v); if (errors.selectedTeacherSubject) setErrors(prev => ({ ...prev, selectedTeacherSubject: '' })); }}>
                        <SelectTrigger className={`w-full bg-slate-50/50 hover:bg-slate-50 text-slate-900 rounded-xl border focus:bg-white focus:border-[#132342] focus:ring-4 focus:ring-[#132342]/10 h-12 font-medium transition-all [&>span]:line-clamp-1 ${errors.selectedTeacherSubject ? "border-red-500" : "border-slate-200"}`}>
                          <SelectValue placeholder="Select Subject" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-slate-200/80 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                          {ALL_TEACHER_SUBJECTS.map(sub => (
                            <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.selectedTeacherSubject && <p className="text-xs text-red-500 font-medium">{errors.selectedTeacherSubject}</p>}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(registrationMethod === 'google' ? 1 : 2)} className={btnOutline}>Back</button>
                  <button onClick={handleFinalSubmit} disabled={loading} className={btnBlack}>{loading ? "Creating Account..." : "Complete Registration"}</button>
                </div>
              </div>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500 font-medium">Already have an account?{" "}
                <Link href="/auth/sign-in" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">Login</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
      </div>
    }>
      <SignUpContent />
    </Suspense>
  );
}