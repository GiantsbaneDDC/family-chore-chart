import { useRef, useEffect, useState, ReactNode, CSSProperties } from 'react';

interface FitToScreenProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Minimum screen width to apply scaling (below this = mobile scroll) */
  minScreenWidth?: number;
  /** Padding from viewport edges */
  padding?: number;
  /** Background color for the outer container */
  background?: string;
}

/**
 * Scales content to fit the viewport without scrolling.
 * Measures actual content size and scales it down to fit.
 * Mobile devices (below minScreenWidth) render normally with scroll.
 */
export function FitToScreen({
  children,
  className = '',
  style = {},
  minScreenWidth = 768,
  padding = 24,
  background = 'inherit',
}: FitToScreenProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const calculateScale = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Mobile: don't scale, just scroll
      if (vw < minScreenWidth) {
        setIsMobile(true);
        setScale(1);
        return;
      }

      setIsMobile(false);

      if (!innerRef.current) return;

      // Reset scale to measure natural size
      innerRef.current.style.transform = 'scale(1)';
      
      // Force reflow
      void innerRef.current.offsetHeight;

      // Measure the content's natural size
      const contentWidth = innerRef.current.scrollWidth;
      const contentHeight = innerRef.current.scrollHeight;
      
      setContentSize({ width: contentWidth, height: contentHeight });

      // Available viewport space
      const availableWidth = vw - padding * 2;
      const availableHeight = vh - padding * 2;

      // Calculate scale to fit
      const scaleX = availableWidth / contentWidth;
      const scaleY = availableHeight / contentHeight;
      
      // Use the smaller scale to ensure it fits both dimensions
      let newScale = Math.min(scaleX, scaleY, 1); // Cap at 1 - never scale up
      
      // Don't go too small
      newScale = Math.max(0.5, newScale);

      setScale(newScale);
    };

    // Calculate on mount and resize
    calculateScale();
    
    // Recalculate after fonts/images load
    const timers = [
      setTimeout(calculateScale, 100),
      setTimeout(calculateScale, 500),
      setTimeout(calculateScale, 1000),
    ];

    window.addEventListener('resize', calculateScale);
    window.addEventListener('orientationchange', calculateScale);

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', calculateScale);
      window.removeEventListener('orientationchange', calculateScale);
    };
  }, [minScreenWidth, padding]);

  // Mobile: render normally with scroll
  if (isMobile) {
    return (
      <div className={className} style={{ ...style, background }}>
        {children}
      </div>
    );
  }

  // Desktop/Tablet: scale to fit viewport
  return (
    <div
      ref={outerRef}
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
        ref={innerRef}
        className={className}
        style={{
          ...style,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {children}
      </div>
    </div>
  );
}
