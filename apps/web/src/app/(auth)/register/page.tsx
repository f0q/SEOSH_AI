"use client";

import Link from "next/link";
import { Sparkles, ShieldAlert } from "lucide-react";

export default function RegisterPage() {
  return (
    <div className="w-full max-w-md animate-fade-in-up">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-surface-800/50 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-brand-500/10 border border-surface-700/50">
          <Sparkles className="w-8 h-8 text-brand-400" />
        </div>
        <h1 className="text-3xl font-bold text-surface-50 mb-3 tracking-tight">
          Registration Closed
        </h1>
        <p className="text-surface-400">
          SEOSH.AI is currently in private beta.
        </p>
      </div>

      <div className="glass-card p-8 text-center space-y-6">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto opacity-80" />
        <p className="text-surface-300">
          Public registration is temporarily disabled. Access is available by invitation only from an administrator.
        </p>
        
        <div className="pt-4 border-t border-surface-800/50">
          <Link
            href="/login"
            className="text-brand-400 hover:text-brand-300 transition-colors font-medium"
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
