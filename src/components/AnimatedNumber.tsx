import { useEffect, useState, useRef } from 'react';
import { Text, TextProps } from '@mantine/core';

interface AnimatedNumberProps extends Omit<TextProps, 'children'> {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}

export function AnimatedNumber({ 
  value, 
  duration = 500, 
  prefix = '', 
  suffix = '',
  ...textProps 
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value;
    const startTime = Date.now();
    
    if (startValue === endValue) return;

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (endValue - startValue) * eased);
      
      setDisplayValue(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        previousValue.current = endValue;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  return (
    <Text {...textProps}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </Text>
  );
}

// Animated star counter with icon
import { IconStar } from '@tabler/icons-react';
import { Group } from '@mantine/core';

interface StarCounterProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function StarCounter({ value, size = 'md', showIcon = true }: StarCounterProps) {
  const sizes = {
    sm: { text: 'sm', icon: 14 },
    md: { text: 'lg', icon: 18 },
    lg: { text: 'xl', icon: 24 },
  };

  const s = sizes[size];

  return (
    <Group gap={4} align="center">
      <AnimatedNumber 
        value={value} 
        size={s.text as any}
        fw={700}
        style={{ 
          color: '#fbbf24',
          textShadow: '0 0 10px rgba(251, 191, 36, 0.3)',
        }}
      />
      {showIcon && (
        <IconStar 
          size={s.icon} 
          fill="#fbbf24" 
          color="#fbbf24"
          style={{ filter: 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.5))' }}
        />
      )}
    </Group>
  );
}
