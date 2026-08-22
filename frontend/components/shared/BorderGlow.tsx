"use client";

import React, { useRef, useState, useEffect } from "react";
import "./BorderGlow.css";

interface BorderGlowProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string; // HSL values formatted as e.g. "220 90 70"
  colors?: string[]; // Hex color array
  animated?: boolean;
  glowIntensity?: number;
  edgeSensitivity?: number;
  borderRadius?: number;
  glowRadius?: number;
  coneSpread?: number;
  fillOpacity?: number;
  innerBg?: string; // custom inner bg color
}

const BorderGlow = ({
  children,
  className = "",
  glowColor,
  colors = ["#E0A33C", "#EBBE72"],
  animated = false,
  glowIntensity = 1,
  edgeSensitivity = 25,
  borderRadius = 32,
  glowRadius = 45,
  coneSpread = 24,
  fillOpacity = 0.18,
  innerBg = "rgba(30, 26, 23, 0.95)"
}: BorderGlowProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Helper to parse HSL space format (e.g. "220 90 70" -> "hsl(220, 90%, 70%)")
  const formatHsl = (hslStr: string) => {
    const parts = hslStr.trim().split(/\s+/);
    if (parts.length >= 3) {
      return `hsl(${parts[0]}, ${parts[1]}%, ${parts[2]}%)`;
    }
    return hslStr;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    container.style.setProperty("--mouse-x", `${x}px`);
    container.style.setProperty("--mouse-y", `${y}px`);

    // Calculate distance to closest edge
    const distLeft = x;
    const distRight = rect.width - x;
    const distTop = y;
    const distBottom = rect.height - y;
    const minDist = Math.min(distLeft, distRight, distTop, distBottom);

    if (minDist <= edgeSensitivity) {
      // Glow intensity maps to edge proximity
      const proximityFactor = 1 - minDist / edgeSensitivity;
      container.style.setProperty("--glow-opacity", `${proximityFactor * glowIntensity}`);
    } else {
      container.style.setProperty("--glow-opacity", "0");
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    const container = containerRef.current;
    if (container) {
      container.style.setProperty("--glow-opacity", "0");
    }
  };

  // Build gradient strings based on props
  const primaryGlowColor = glowColor ? formatHsl(glowColor) : colors[0];
  const secondaryGlowColor = colors[1] || primaryGlowColor;

  const styleVariables = {
    "--border-radius": `${borderRadius}px`,
    "--glow-radius": `${glowRadius}px`,
    "--glow-color-primary": primaryGlowColor,
    "--glow-color-secondary": secondaryGlowColor,
    "--glow-conic-colors": colors.join(", ") + `, ${colors[0]}`,
    "--fill-opacity": fillOpacity,
    "--inner-bg": innerBg
  } as React.CSSProperties;

  return (
    <div
      ref={containerRef}
      className={`border-glow-container ${animated ? "animated" : ""} ${isHovered ? "hovered" : ""} ${className}`}
      style={styleVariables}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="border-glow-inner">
        {children}
      </div>
    </div>
  );
};

export default BorderGlow;
