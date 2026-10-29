import React from 'react';

// Saber mark: a golden "S" on black, shared by the sidebar and the login page
export const BrandMark: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => (
  <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="brandG" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fde68a" />
        <stop offset=".5" stopColor="#fbbf24" />
        <stop offset="1" stopColor="#d97706" />
      </linearGradient>
      <radialGradient id="brandB" cx=".3" cy=".2" r="1">
        <stop offset="0" stopColor="#1c1c1c" />
        <stop offset="1" stopColor="#000" />
      </radialGradient>
    </defs>
    <rect width="512" height="512" rx="112" fill="url(#brandB)" />
    <rect x="6" y="6" width="500" height="500" rx="106" fill="none" stroke="#fbbf24" strokeOpacity=".35" strokeWidth="4" />
    <path d="M338 172C338 112 182 108 182 194C182 264 338 248 338 330C338 414 174 408 174 340" fill="none" stroke="url(#brandG)" strokeWidth="46" strokeLinecap="round" />
    <circle cx="360" cy="150" r="22" fill="#fde68a" />
  </svg>
);
