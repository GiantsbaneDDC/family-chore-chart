import { useRef, useEffect, useState, ReactNode, CSSProperties } from 'react';

interface FitToScreenProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Base width the content is designed for */
  baseWidth?: number;
  /** Base height the content is designed for */
  baseHeight?: number;
  /** Minimum scale factor */
  minScale?: number;
  /** Maximum scale factor */
  maxScale?: number;
  /** Padding from edges */
  padding?: number;
  /** Only apply on screens wider than this (mobile stays normal) */
  minScreenWidth?: number;
  /** Background color for the outer container */
  background?: string;
}

/**
 * Scales content proportionally to fit the viewport.
 * Based on CSS-Tricks best practice: https://css-tricks.com/scaled-proportional-blocks-with-css-and-javascript/
 */
export function FitToScreen({
  children,
  className = '',
  style = {},
  baseWidth = 1920,
  baseHeight = 1080,
  minScale = 0.3,
  maxScale = 1.5,
  padding = 16,
  minScreenWidth = 768,
  background = 'inherit',
}: FitToScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const calculateScale = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // On mobile, don't scale - just scroll normally
      if (vw < minScreenWidth) {
        setIsMobile(true);
        setScale(1);
        return;
      }

      setIsMobile(false);

      // Available space
      const availableWidth = vw - padding * 2;
      const availableHeight = vh - padding * 2;

      // Calculate scale to fit both dimensions
      const scaleX = availableWidth / baseWidth;
      const scaleY = availableHeight / baseHeight;
      
      // Use the smaller to ensure it fits
      let newScale = Math.min(scaleX, scaleY);
      
      // Clamp to bounds
      newScale = Math.max(minScale, Math.min(maxScale, newScale));

      setScale(newScale);
    };

    calculateScale();

    window.addEventListener('resize', calculateScale);
    window.addEventListener('orientationchange', calculateScale);

    return () => {
      window.removeEventListener('resize', calculateScale);
      window.removeEventListener('orientationchange', calculateScale);
    };
  }, [baseWidth, baseHeight, minScale, maxScale, padding, minScreenWidth]);

  // Mobile: render normally with scroll
  if (isMobile) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  // Desktop: scale to fit
  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background,
      }}
    >
      <div
        className={className}
        style={{
          ...style,
          width: baseWidth,
          height: baseHeight,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
}
