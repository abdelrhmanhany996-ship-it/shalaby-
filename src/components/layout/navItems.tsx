import React from 'react';
import { useApp } from '../../context/AppContext';
import { NavTab } from '../../types';
import {
  LayoutDashboard, CreditCard, Users, UsersRound,
  Sparkles, TrendingUp, CalendarClock, Bell, Settings,
  Activity, Zap, Shield, Archive, AtSign, Wallet, Ticket,
} from 'lucide-react';

export interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

// One list for the desktop sidebar and the mobile menu, so they never drift apart
export const useNavItems = (): NavItem[] => {
  const { notifications, t } = useApp();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return [
    { id: 'dashboard', label: t('dashboard'), icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'subscriptions', label: t('subscriptions'), icon: <CreditCard className="w-5 h-5" /> },
    { id: 'accounts', label: 'حسابات الاشتراكات', icon: <AtSign className="w-5 h-5" /> },
    { id: 'users', label: t('users'), icon: <Users className="w-5 h-5" /> },
    { id: 'teams', label: t('teams'), icon: <UsersRound className="w-5 h-5" /> },
    { id: 'ai-tools', label: t('aiTools'), icon: <Sparkles className="w-5 h-5" /> },
    { id: 'archive', label: 'الأرشيف والمحفوظات', icon: <Archive className="w-5 h-5" /> },
    { id: 'usage-tracking', label: 'تتبع الاستهلاك', icon: <Activity className="w-5 h-5" /> },
    { id: 'expenses', label: t('expenses'), icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'wallet', label: 'محفظة الاشتراكات', icon: <Wallet className="w-5 h-5" /> },
    { id: 'google-codes', label: 'أكواد Google', icon: <Ticket className="w-5 h-5" /> },
    { id: 'renewals', label: t('renewals'), icon: <CalendarClock className="w-5 h-5" /> },
    { id: 'audit-security', label: 'السجل والأمان', icon: <Shield className="w-5 h-5" /> },
    { id: 'automation', label: 'الأتمتة التلقائية', icon: <Zap className="w-5 h-5" /> },
    { id: 'notifications', label: t('notifications'), icon: <Bell className="w-5 h-5" />, badge: unreadCount },
    { id: 'settings', label: t('settings'), icon: <Settings className="w-5 h-5" /> },
  ];
};
