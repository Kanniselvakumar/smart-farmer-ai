import React from "react";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[1.5rem] border border-black/5 bg-white/90 p-6 shadow-[0_24px_60px_rgba(33,52,42,0.08)] backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}
