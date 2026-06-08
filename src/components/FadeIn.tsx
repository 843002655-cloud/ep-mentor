"use client";

import { useEffect, useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  delay?: number; // ms
  direction?: "up" | "down" | "none";
}

export default function FadeIn({ children, className = "", delay = 0, direction = "up" }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const transforms: Record<string, string> = {
    up: "translateY(12px)",
    down: "translateY(-12px)",
    none: "none",
  };

  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : transforms[direction],
        transition: `opacity 0.4s ease-out, transform 0.4s ease-out`,
      }}
    >
      {children}
    </div>
  );
}
