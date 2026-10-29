import React from 'react';
import { useApp } from '../../context/AppContext';
import { currencyCode, formatEgp, toEgp } from '../../utils/money';

// "≈ 1,125 ج.م" under/next to an amount that isn't already in Egyptian pounds
export const EgpHint: React.FC<{ amount: number; currency?: string; className?: string }> = ({ amount, currency = '$', className = '' }) => {
  const { exchangeRates } = useApp();
  if (currencyCode(currency) === 'EGP' || !amount) return null;
  return (
    <span className={`text-[10px] font-semibold text-slate-400 dark:text-slate-500 font-mono whitespace-nowrap ${className}`}>
      ≈ {formatEgp(toEgp(amount, currency, exchangeRates))}
    </span>
  );
};
