import React, { useState } from 'react';
import { findCatalogTool, toolIconUrl } from '../../data/aiCatalog';

// Real brand icon for known AI programs, falling back to the stored emoji / first letter
export const ToolIcon: React.FC<{ name: string; fallback?: string; size?: number; className?: string }> = ({
  name,
  fallback,
  size = 28,
  className = '',
}) => {
  const catalog = findCatalogTool(name);
  const [failed, setFailed] = useState(false);

  if (catalog && !failed) {
    return (
      <img
        src={toolIconUrl(catalog.domain)}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`rounded-md object-contain ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center leading-none ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.8 }}
    >
      {fallback || catalog?.emoji || name.trim()[0]?.toUpperCase() || '✨'}
    </span>
  );
};
