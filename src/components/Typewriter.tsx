"use client";

import { useEffect, useState } from "react";

interface Props {
  texts: string[];
  /**
   * Interval between characters (ms) */
  speed?: number;
  /** Pause between messages (ms) */
  pause?: number;
  className?: string;
}

export default function Typewriter({
  texts,
  speed = 40,
  pause = 2000,
  className = "",
}: Props) {
  const [displayed, setDisplayed] = useState<string[]>([]);
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    if (textIndex >= texts.length) return;

    if (charIndex < texts[textIndex].length) {
      const timer = setTimeout(() => {
        setCharIndex((c) => c + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setDisplayed((prev) => [...prev, texts[textIndex]]);
        setTextIndex((i) => i + 1);
        setCharIndex(0);
      }, pause);
      return () => clearTimeout(timer);
    }
  }, [charIndex, textIndex, texts, speed, pause]);

  const currentText = texts[textIndex]
    ? texts[textIndex].slice(0, charIndex)
    : "";
  const allComplete = textIndex >= texts.length;

  return (
    <div className={className}>
      {displayed.map((t, i) => (
        <div key={i} className="mb-1 opacity-80">
          {t}
        </div>
      ))}
      {!allComplete && (
        <div className="mb-1">
          {currentText}
          <span className="inline-block w-1.5 h-4 bg-[#1B4F8A] ml-0.5 animate-pulse" />
        </div>
      )}
    </div>
  );
}
