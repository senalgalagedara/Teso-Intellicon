"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, UserPlus, Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { logout } from "@teso/auth/actions";

export function Navbar() {
    const { user, loading, role } = useAuth();
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        window.location.href = "/";
        setIsMenuOpen(false);
    };

    return (
        <nav className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95vw] md:w-fit max-w-5xl rounded-3xl border border-slate-800/50 backdrop-blur-xl shadow-lg transition-all duration-300 ${isMenuOpen ? "bg-[#071027]/95" : "bg-[#071027]/60 rounded-full"}`}>
            <div className="px-6 h-14 flex items-center justify-between md:justify-center md:gap-12">

                {/* Brand */}
                <Link href="/" className="flex items-center gap-2 shrink-0" onClick={() => setIsMenuOpen(false)}>
                    <div className="relative w-8 h-8 rounded-full overflow-hidden border border-blue-500/30">
                        {/* Using favicon or small logo logic - using teso-logo.png for now as 'favicon' mock */}
                        <Image src="/teso-logo.png" alt="TESO" fill className="object-cover" />
                    </div>
                    <span className="font-bold text-white tracking-wide">TESO</span>
                </Link>

                {/* Desktop Links */}
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
                    <Link href="/" className="hover:text-blue-400 transition-colors">Home</Link>
                    <Link href="/blog" className="hover:text-blue-400 transition-colors">Blog</Link>
                    <Link href="/pricing" className="hover:text-blue-400 transition-colors">Pricing</Link>
                    <Link href="/about" className="hover:text-blue-400 transition-colors">About</Link>
                </div>

                {/* Desktop Auth */}
                <div className="hidden md:flex items-center gap-4">
                    {loading ? (
                        <div className="w-8 h-8 rounded-full bg-slate-800 animate-pulse" />
                    ) : user ? (
                        <div className="flex items-center gap-4">
                            <Link href="/plan" className="text-sm font-medium text-blue-400 hover:text-blue-300">
                                Dashboard
                            </Link>
                            <button 
                                onClick={handleLogout}
                                className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                            >
                                Logout
                            </button>
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                                {user.email?.[0].toUpperCase()}
                            </div>
                        </div>
                    ) : (
                        <>
                            <Link href="/auth/sign-in">
                                <button className="text-sm font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-2 px-4 py-2 rounded-full hover:bg-slate-800/50">
                                    <span className="hidden sm:inline">Login</span>
                                </button>
                            </Link>
                            <Link href="/auth/sign-up">
                                <button className="bg-[#38bdf8] text-slate-950 hover:bg-[#2ea8ff] transition-all rounded-full font-semibold text-sm px-6 py-2.5 shadow-[0_0_20px_rgba(56,189,248,0.2)] hover:shadow-[0_0_25px_rgba(56,189,248,0.4)]">
                                    Register
                                </button>
                            </Link>
                        </>
                    )}
                </div>

                {/* Mobile Toggle */}
                <button 
                    className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Menu Content */}
            <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${isMenuOpen ? "max-h-96 opacity-100 pb-6" : "max-h-0 opacity-0"}`}>
                <div className="flex flex-col items-center gap-4 pt-2 px-6">
                    <Link href="/" onClick={() => setIsMenuOpen(false)} className="text-slate-400 hover:text-blue-400 transition-colors py-2 text-lg">Home</Link>
                    <Link href="/blog" onClick={() => setIsMenuOpen(false)} className="text-slate-400 hover:text-blue-400 transition-colors py-2 text-lg">Blog</Link>
                    <Link href="/pricing" onClick={() => setIsMenuOpen(false)} className="text-slate-400 hover:text-blue-400 transition-colors py-2 text-lg">Pricing</Link>
                    <Link href="/about" onClick={() => setIsMenuOpen(false)} className="text-slate-400 hover:text-blue-400 transition-colors py-2 text-lg">About</Link>
                    
                    <div className="w-full h-px bg-slate-800/50 my-2" />
                    
                    {/* Mobile Auth */}
                    <div className="flex flex-col items-center gap-4 w-full">
                        {loading ? (
                            <div className="w-8 h-8 rounded-full bg-slate-800 animate-pulse" />
                        ) : user ? (
                            <div className="flex flex-col items-center gap-4 w-full">
                                <Link href="/plan" onClick={() => setIsMenuOpen(false)} className="text-sm font-medium text-blue-400 hover:text-blue-300 flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                                        {user.email?.[0].toUpperCase()}
                                    </div>
                                    <span>Dashboard</span>
                                </Link>
                                <button 
                                    onClick={handleLogout}
                                    className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                                >
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3 w-full">
                                <Link href="/auth/sign-in" onClick={() => setIsMenuOpen(false)} className="w-full">
                                    <button className="w-full py-2.5 text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-2 rounded-xl hover:bg-slate-800/50 border border-slate-800/50">
                                        <span>Login</span>
                                    </button>
                                </Link>
                                <Link href="/auth/sign-up" onClick={() => setIsMenuOpen(false)} className="w-full">
                                    <button className="w-full bg-[#38bdf8] text-slate-950 font-semibold rounded-xl h-11 shadow-[0_0_20px_rgba(56,189,248,0.2)]">
                                        Register
                                    </button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
