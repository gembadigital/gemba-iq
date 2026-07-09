import React from "react";
import { Loader2 } from "lucide-react";

export default function AuthLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-[#09090b]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E3A5F] dark:text-indigo-400" />
        <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">Loading session...</p>
      </div>
    </div>
  );
}
