// @ts-nocheck
"use client";

import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, X, Check } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  status?: "idle" | "loading" | "success" | "error";
}

export const StatefulButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, status = "idle", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={status === "loading"}
        className={cn(
          // BASE STYLES: Pill shape (rounded-full), Border, Font
          "relative flex items-center justify-center rounded-full px-6 py-2 font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed border border-zinc-700",
          
          // IDLE: Dark Zinc background with hover effect to Green
          "bg-zinc-900 text-white hover:bg-[#1db954] hover:border-[#1db954] hover:text-black focus:ring-[#1db954]",
          
          // LOADING: Lighter Zinc
          status === "loading" && "bg-zinc-800 text-zinc-400 border-zinc-700 cursor-wait",
          
          // ERROR: Red
          status === "error" && "bg-red-600 border-red-600 text-white",
          
          // SUCCESS: Bright Green (Like the demo)
          status === "success" && "bg-[#1db954] border-[#1db954] text-black hover:bg-[#1db954]",
          
          className
        )}
        {...props}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {status === "idle" && (
            <motion.span
              key="idle"
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            >
              {children}
            </motion.span>
          )}
          {status === "loading" && (
            <motion.span
              key="loading"
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.3, bounce: 0 }}
              className="flex items-center gap-2"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </motion.span>
          )}
          {status === "success" && (
            <motion.span
              key="success"
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.3, bounce: 0 }}
              className="flex items-center gap-2 font-bold"
            >
              <Check className="h-4 w-4" />
              Success
            </motion.span>
          )}
          {status === "error" && (
            <motion.span
              key="error"
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.3, bounce: 0 }}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Error
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    );
  }
);

StatefulButton.displayName = "StatefulButton";