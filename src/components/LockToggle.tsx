"use client";

import { motion } from "framer-motion";

interface LockToggleProps {
  isLocked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

export default function LockToggle({ isLocked, disabled, onToggle }: LockToggleProps) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`relative w-[52px] h-[28px] rounded-full transition-colors duration-200 shrink-0 ${
        disabled
          ? "opacity-30 cursor-not-allowed"
          : "cursor-pointer"
      } ${
        isLocked
          ? "bg-success"
          : "bg-[#3a3f4e] border border-border"
      }`}
      style={{ minWidth: 52 }}
      title={disabled ? "Enter amount first" : isLocked ? "Tap to unlock" : "Tap to lock"}
    >
      <motion.div
        className={`absolute top-[3px] w-[22px] h-[22px] rounded-[6px] shadow-sm ${
          isLocked
            ? "bg-white"
            : "bg-[#5a6070]"
        }`}
        animate={{ left: isLocked ? 26 : 3 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        {/* Dot grid texture */}
        <svg width="22" height="22" viewBox="0 0 22 22" className="opacity-30">
          {[6, 9, 12, 15].map((y) =>
            [7, 10, 13].map((x) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="0.8" fill="currentColor" />
            ))
          )}
        </svg>
      </motion.div>
    </button>
  );
}
