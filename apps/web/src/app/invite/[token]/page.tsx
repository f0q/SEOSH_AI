"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sparkles, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { trpc } from "@/trpc/client";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [projectName, setProjectName] = useState("");

  const acceptMut = trpc.team.acceptInvite.useMutation({
    onSuccess: (data) => {
      setStatus("success");
      setProjectName(data.projectName || "the project");
      setTimeout(() => router.push("/login"), 4000);
    },
    onError: (err) => {
      setStatus("error");
      setMessage(err.message || "Invalid or expired invitation link.");
    },
  });

  useEffect(() => {
    if (token) {
      acceptMut.mutate({ token });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface-950 bg-grid">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md animate-slide-up relative">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg shadow-brand-500/25">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="text-surface-100">SEO</span>
              <span className="gradient-text">SH</span>
              <span className="text-surface-400 text-lg">.AI</span>
            </h1>
          </div>
        </div>

        <div className="glass-card p-8 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="w-12 h-12 text-brand-400 mx-auto mb-4 animate-spin" />
              <h2 className="text-xl font-semibold text-surface-100 mb-2">Accepting Invitation...</h2>
              <p className="text-sm text-surface-400">Please wait while we set up your access.</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-semibold text-surface-100 mb-2">Invitation Accepted!</h2>
              <p className="text-sm text-surface-400 mb-4">
                You now have access to <strong className="text-surface-200">{projectName}</strong>.
              </p>
              <p className="text-sm text-surface-400">
                Use your email and the temporary password from your invitation to sign in.
              </p>
              <p className="text-xs text-surface-500 mt-4">Redirecting to login...</p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-xl font-semibold text-surface-100 mb-2">Invitation Error</h2>
              <p className="text-sm text-surface-400 mb-4">{message}</p>
              <button
                onClick={() => router.push("/login")}
                className="btn-primary mx-auto"
              >
                Go to Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
