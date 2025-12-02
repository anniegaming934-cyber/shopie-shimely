import React from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Home, ShoppingBag } from "lucide-react";

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  const goHome = () => {
    navigate("/");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white flex items-center justify-center px-4">
      {/* Soft glowing blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-16 h-72 w-72 rounded-full bg-emerald-500 opacity-20 blur-3xl animate-pulse" />
        <div className="absolute top-40 -right-10 h-72 w-72 rounded-full bg-blue-500 opacity-20 blur-3xl animate-ping" />
        <div className="absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-indigo-500 opacity-20 blur-3xl animate-pulse" />
      </div>

      {/* Floating sparkles */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-10 top-10 animate-bounce">
          <Sparkles className="h-6 w-6 text-emerald-300" />
        </div>
        <div className="absolute right-16 top-24 animate-pulse">
          <Sparkles className="h-5 w-5 text-blue-300" />
        </div>
        <div className="absolute left-1/3 bottom-10 animate-bounce delay-150">
          <Sparkles className="h-5 w-5 text-indigo-300" />
        </div>
      </div>

      {/* Main card */}
      <div className="relative z-10 max-w-xl w-full">
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl px-6 py-8 sm:px-10 sm:py-10">
          {/* 404 badge */}
          <div className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full bg-black/40 px-4 py-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-300 border border-white/10">
            <span className="inline-flex h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
            <span>ERROR 404 · PAGE NOT FOUND</span>
          </div>

          {/* Animated 404 text */}
          <div className="flex flex-col items-center gap-3 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-5xl sm:text-6xl font-black tracking-tight bg-gradient-to-r from-emerald-300 via-sky-300 to-indigo-300 bg-clip-text text-transparent drop-shadow-lg">
                4
              </span>
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-amber-300/30" />
                <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-gradient-to-tr from-amber-300 via-yellow-300 to-orange-300 text-3xl sm:text-4xl shadow-xl relative">
                  <span className="animate-bounce">😊</span>
                </div>
              </div>
              <span className="text-5xl sm:text-6xl font-black tracking-tight bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent drop-shadow-lg">
                4
              </span>
            </div>

            <p className="text-xs font-medium tracking-[0.18em] uppercase text-slate-300 mt-1 text-center">
              Oops… this aisle is empty
            </p>
          </div>

          {/* Title & subtitle */}
          <div className="space-y-2 text-center mb-6">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-50">
              Welcome to{" "}
              <span className="bg-gradient-to-r from-emerald-300 to-sky-300 bg-clip-text text-transparent">
                Shopie-Smiely System
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
              The page you’re looking for has moved, been renamed, or never
              existed. But don’t worry—your shopping smile is still safe with us.
            </p>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <button
              onClick={goHome}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 active:scale-95 transition-transform"
            >
              <Home className="h-4 w-4" />
              Go back to dashboard
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs sm:text-sm font-medium text-slate-100 hover:bg-white/10 active:scale-95 transition-transform"
            >
              <ShoppingBag className="h-4 w-4" />
              Explore Shopie-Smiely
            </button>
          </div>

          {/* Tiny helper text */}
          <p className="text-[11px] text-slate-400 text-center">
            If you believe this is a mistake, try refreshing the page or contact
            your administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
