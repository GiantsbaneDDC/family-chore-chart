import { Box } from '@mantine/core';
import { CSSProperties } from 'react';

interface AvatarProps {
  avatar: string;
  size?: number | string;
  style?: CSSProperties;
  className?: string;
}

/**
 * Renders an avatar - either an emoji character or a Fluent emoji image URL
 */
export function Avatar({ avatar, size = 32, style, className }: AvatarProps) {
  const isUrl = avatar.startsWith('http');
  const sizeValue = typeof size === 'number' ? size : undefined;
  const fontSize = typeof size === 'number' ? `${size * 0.8}px` : size;

  if (isUrl) {
    return (
      <Box
        component="img"
        src={avatar}
        alt="Avatar"
        className={className}
        style={{
          width: sizeValue,
          height: sizeValue,
          objectFit: 'contain',
          ...style,
        }}
      />
    );
  }

  return (
    <Box
      component="span"
      className={className}
      style={{
        fontSize,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: sizeValue,
        height: sizeValue,
        ...style,
      }}
    >
      {avatar}
    </Box>
  );
}
