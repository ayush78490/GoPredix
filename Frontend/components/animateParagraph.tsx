"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface AnimatedParagraphsProps {
  paragraphs: string[];
  duration?: number;      // time each paragraph stays (default 5000ms)
  typingSpeed?: number;   // speed of typing (default 30ms)
  className?: string;     // custom classes if needed
}

export default function AnimatedParagraphs({
  paragraphs,
  duration = 5000,
  typingSpeed = 30,
  className = "text-base md:text-lg text-white/80 max-w-2xl mb-10 font-mono",
}: AnimatedParagraphsProps) {
  const [index, setIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");

  // Typing animation
  useEffect(() => {
    const current = paragraphs[index];
    setDisplayText("");

    let i = 0;
    const typing = setInterval(() => {
      setDisplayText(current.slice(0, i + 1));
      i++;
      if (i === current.length) clearInterval(typing);
    }, typingSpeed);

    return () => clearInterval(typing);
  }, [index, paragraphs, typingSpeed]);

  // Switch paragraphs every X seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % paragraphs.length);
    }, duration);

    return () => clearInterval(timer);
  }, [paragraphs.length, duration]);

  return (
    <motion.p
      key={index}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={className}
    >
      {displayText}
    </motion.p>
  );
}
