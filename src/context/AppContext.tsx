import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, Team, AiTool, Subscription, ActivityLog, 
  NotificationItem, NavTab, Language, ToastMessage, Role, SubscriptionStatus,
  UsageRecord, LicenseOptimization, BudgetEntry, ApprovalRequest, ApprovalStatus,
  DocumentItem, AuditLogItem, SecuritySession, AutomationRule, ChatMessage,
  WalletEntry, ExchangeRates, GoogleCodeBatch, GoogleCode
} from '../types';
import { DEFAULT_RATES, fetchLiveRates, formatEgp, rateFor, toEgp } from '../utils/money';
import { 
  initialUsers, initialTeams, initialAiTools, 
  initialSubscriptions, initialActivities, initialNotifications,
  initialUsageRecords, initialOptimizations, initialBudgets,
  initialApprovals, initialDocuments, initialAuditLogs,
  initialSecuritySessions, initialAutomations
} from '../data/mockData';
import { translations } from '../locales/translations';
import { avatarFor } from '../utils/avatar';
import { db, handleFirestoreError, OperationType, testFirestoreConnection } from '../services/firebase';
import { 
  collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDocs 
} from 'firebase/firestore';

interface AppContextType {
  currentUser: User | null;
  currentLanguage: Language;
  setLanguage: (lang: Language) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  
  // Base Data
  users: User[];
  teams: Team[];
  aiTools: AiTool[];
  subscriptions: Subscription[];
  activities: ActivityLog[];
  notifications: NotificationItem[];
  toasts: ToastMessage[];

  // 7 Integrated Modules State
  usageRecords: UsageRecord[];
  optimizations: LicenseOptimization[];
  budgets: BudgetEntry[];
  approvals: ApprovalRequest[];
  documents: DocumentItem[];
  auditLogs: AuditLogItem[];
  securitySessions: SecuritySession[];
  automations: AutomationRule[];
  chatMessages: ChatMessage[];
  isAiChatLoading: boolean;

  // Modals & Selection
  isAddWizardOpen: boolean;
  setIsAddWizardOpen: (open: boolean) => void;
  selectedSubscriptionForDetails: Subscription | null;
  setSelectedSubscriptionForDetails: (sub: Subscription | null) => void;
  selectedSubscriptionForAssign: Subscription | null;
  setSelectedSubscriptionForAssign: (sub: Subscription | null) => void;
  selectedSubscriptionForEdit: Subscription | null;
  setSelectedSubscriptionForEdit: (sub: Subscription | null) => void;
  selectedUserForProfile: User | null;
  setSelectedUserForProfile: (usr: User | null) => void;
  selectedTeamForDetails: Team | null;
  setSelectedTeamForDetails: (tm: Team | null) => void;
  isGlobalSearchOpen: boolean;
  setIsGlobalSearchOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Actions & Operations
  login: (email: string) => boolean;
  signup: (name: string, email: string, teamName?: string) => boolean;
  logout: () => void;
  addToast: (title: string, message: string, type?: ToastMessage['type']) => void;
  removeToast: (id: string) => void;
  
  addSubscription: (newSub: Omit<Subscription, 'id'>) => void;
  updateSubscription: (id: string, updated: Partial<Subscription>) => void;
  archiveSubscription: (id: string) => void;
  deleteSubscriptions: (ids: string[], label: string) => void;
  renameAccount: (ids: string[], oldEmail: string, newEmail: string) => void;
  assignUsersToSubscription: (subscriptionId: string, userIds: string[]) => void;
  
  addUser: (newUser: Omit<User, 'id'>) => void;
  updateUser: (id: string, updated: Partial<User>) => void;
  deleteUser: (id: string) => void;

  addTeam: (newTeam: Omit<Team, 'id'>) => string;
  updateTeam: (id: string, updated: Partial<Team>) => void;
  deleteTeam: (id: string) => void;
  saveTeam: (id: string, updated: Partial<Team>, memberIds: string[]) => void;

  addAiTool: (newTool: Omit<AiTool, 'id'>) => string;
  deleteAiTool: (id: string) => void;

  walletEntries: WalletEntry[];
  walletBalanceEgp: number;
  exchangeRates: ExchangeRates;
  addDeposit: (amount: number, currency: string, note: string, date: string) => void;
  deleteWalletEntry: (id: string) => void;
  saveExchangeRates: (rates: Omit<ExchangeRates, 'updatedAt'>) => void;
  refreshExchangeRates: () => Promise<boolean>;

  googleCodeBatches: GoogleCodeBatch[];
  addGoogleCodes: (batch: Omit<GoogleCodeBatch, 'id' | 'createdAt' | 'createdBy'>) => void;
  updateGoogleCodes: (id: string, codes: GoogleCode[]) => void;
  deleteGoogleCodes: (id: string, refund?: boolean) => void;
  updateGoogleCodeBatch: (id: string, changes: Partial<Omit<GoogleCodeBatch, 'id' | 'createdAt' | 'createdBy' | 'walletEntryId'>>) => void;
  editingGoogleCodes: GoogleCodeBatch | null;
  setEditingGoogleCodes: (batch: GoogleCodeBatch | null) => void;
  walletBalanceUsd: number;
  setWalletBalance: (target: number, currency: string, note: string) => void;
  updateWalletEntry: (id: string, changes: Partial<Pick<WalletEntry, 'amount' | 'currency' | 'note' | 'date'>>) => void;
  isGoogleCodesModalOpen: boolean;
  setIsGoogleCodesModalOpen: (open: boolean) => void;
  
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // New Module Operations
  addApprovalRequest: (req: Omit<ApprovalRequest, 'id' | 'createdAt' | 'status' | 'currentStepRole' | 'chain'>) => void;
  updateApprovalStatus: (id: string, status: ApprovalStatus, comment?: string) => void;
  addDocument: (doc: Omit<DocumentItem, 'id' | 'uploadDate' | 'status'>) => void;
  deleteDocument: (id: string) => void;
  toggleAutomationRule: (id: string) => void;
  applyOptimization: (id: string) => void;
  sendChatMessage: (userText: string) => Promise<void>;
  
  clearAllData: () => void;
  loadDemoData: () => void;

  t: (key: keyof typeof translations['ar']) => string;
  dir: 'rtl' | 'ltr';
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Completely clear all stored data on mount for clean slate
  useEffect(() => {
    localStorage.clear();
  }, []);

  // Auth state
  // Restore the signed-in user after a refresh
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('ai_res_current_user');
      return saved ? (JSON.parse(saved) as User) : null;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    try {
      if (currentUser) localStorage.setItem('ai_res_current_user', JSON.stringify(currentUser));
      else localStorage.removeItem('ai_res_current_user');
    } catch {
      // Storage unavailable (private mode): the session just won't survive a refresh
    }
  }, [currentUser]);

  // Language state
  const [currentLanguage, setCurrentLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('ai_res_lang') as Language;
    return saved === 'en' ? 'en' : 'ar';
  });

  // Dark Mode state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  const dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = dir;
    localStorage.setItem('ai_res_lang', currentLanguage);
  }, [currentLanguage, dir]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Browser chrome / status bar follows the page colour
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDarkMode ? '#000000' : '#fffbeb');
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);
  const setLanguage = (lang: Language) => setCurrentLanguageState(lang);

  // Active Navigation
  // Keep the open page across refreshes too
  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    try {
      return (localStorage.getItem('ai_res_active_tab') as NavTab) || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('ai_res_active_tab', activeTab);
    } catch {
      // ignore
    }
  }, [activeTab]);

  // Persistent Entities State (ALL COMPLETELY EMPTY)
  const [users, setUsers] = useState<User[]>([]);
  const [walletEntries, setWalletEntries] = useState<WalletEntry[]>([]);
  const [googleCodeBatches, setGoogleCodeBatches] = useState<GoogleCodeBatch[]>([]);
  const [isGoogleCodesModalOpen, setIsGoogleCodesModalOpen] = useState(false);
  const [editingGoogleCodes, setEditingGoogleCodes] = useState<GoogleCodeBatch | null>(null);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(DEFAULT_RATES);
  const [teams, setTeams] = useState<Team[]>([]);
  const [aiTools, setAiTools] = useState<AiTool[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // 7 Modules Persistent State (ALL COMPLETELY EMPTY)
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);
  const [optimizations, setOptimizations] = useState<LicenseOptimization[]>([]);
  const [budgets, setBudgets] = useState<BudgetEntry[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [securitySessions, setSecuritySessions] = useState<SecuritySession[]>([]);
  const [automations, setAutomations] = useState<AutomationRule[]>([]);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: 'مرحباً بك في المساعد الذكي لمؤسسة Saber Group! يمكنني إجابتك عن المصروفات، المقاعد المتاحة، تجديدات هذا الأسبوع، أو أفكار توفير الميزانية.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isAiChatLoading, setIsAiChatLoading] = useState(false);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modals state
  const [isAddWizardOpen, setIsAddWizardOpen] = useState(false);
  const [selectedSubscriptionForDetails, setSelectedSubscriptionForDetails] = useState<Subscription | null>(null);
  const [selectedSubscriptionForAssign, setSelectedSubscriptionForAssign] = useState<Subscription | null>(null);
  const [selectedSubscriptionForEdit, setSelectedSubscriptionForEdit] = useState<Subscription | null>(null);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<User | null>(null);
  const [selectedTeamForDetails, setSelectedTeamForDetails] = useState<Team | null>(null);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync with Firestore in real-time
  useEffect(() => {
    testFirestoreConnection();

    // 1. Subscriptions sync
    const unsubSubs = onSnapshot(collection(db, 'subscriptions'), (snapshot) => {
      if (!snapshot.empty) {
        const loaded: Subscription[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push({ id: docSnap.id, ...docSnap.data() } as Subscription);
        });
        setSubscriptions(loaded);
        localStorage.setItem('ai_res_subs_seeded', '1');
      } else if (localStorage.getItem('ai_res_subs_seeded')) {
        // All subscriptions were deleted on purpose: don't re-seed the demo data
        setSubscriptions([]);
      } else {
        localStorage.setItem('ai_res_subs_seeded', '1');
        initialSubscriptions.forEach((sub) => {
          setDoc(doc(db, 'subscriptions', sub.id), sub).catch((e) => handleFirestoreError(e, OperationType.WRITE, 'subscriptions'));
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'subscriptions');
    });

    // 2. Users sync
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      if (!snapshot.empty) {
        const loaded: User[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push({ id: docSnap.id, ...docSnap.data() } as User);
        });
        setUsers(loaded);
        localStorage.setItem('ai_res_users_seeded', '1');
      } else if (localStorage.getItem('ai_res_users_seeded')) {
        // All users were deleted on purpose: don't re-seed the demo users
        setUsers([]);
      } else {
        localStorage.setItem('ai_res_users_seeded', '1');
        initialUsers.forEach((usr) => {
          setDoc(doc(db, 'users', usr.id), usr).catch((e) => handleFirestoreError(e, OperationType.WRITE, 'users'));
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });

    // 3. Teams sync
    const unsubTeams = onSnapshot(collection(db, 'teams'), (snapshot) => {
      if (!snapshot.empty) {
        const loaded: Team[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push({ id: docSnap.id, ...docSnap.data() } as Team);
        });
        setTeams(loaded);
        localStorage.setItem('ai_res_teams_seeded', '1');
      } else if (localStorage.getItem('ai_res_teams_seeded')) {
        // All teams were deleted on purpose: don't re-seed the demo teams
        setTeams([]);
      } else {
        localStorage.setItem('ai_res_teams_seeded', '1');
        initialTeams.forEach((tm) => {
          setDoc(doc(db, 'teams', tm.id), tm).catch((e) => handleFirestoreError(e, OperationType.WRITE, 'teams'));
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'teams');
    });

    // 4. AiTools sync
    const unsubTools = onSnapshot(collection(db, 'aiTools'), (snapshot) => {
      if (!snapshot.empty) {
        const loaded: AiTool[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push({ id: docSnap.id, ...docSnap.data() } as AiTool);
        });
        setAiTools(loaded);
        localStorage.setItem('ai_res_tools_seeded', '1');
      } else if (localStorage.getItem('ai_res_tools_seeded')) {
        // All tools were deleted on purpose: don't re-seed the demo tools
        setAiTools([]);
      } else {
        localStorage.setItem('ai_res_tools_seeded', '1');
        initialAiTools.forEach((tl) => {
          setDoc(doc(db, 'aiTools', tl.id), tl).catch((e) => handleFirestoreError(e, OperationType.WRITE, 'aiTools'));
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'aiTools');
    });

    // 5. Notifications sync
    const unsubNotifs = onSnapshot(collection(db, 'notifications'), (snapshot) => {
      if (!snapshot.empty) {
        const loaded: NotificationItem[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push({ id: docSnap.id, ...docSnap.data() } as NotificationItem);
        });
        setNotifications(loaded);
      } else {
        initialNotifications.forEach((n) => {
          setDoc(doc(db, 'notifications', n.id), n).catch((e) => handleFirestoreError(e, OperationType.WRITE, 'notifications'));
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications');
    });

    // 6. Subscription wallet (deposits & charges)
    const unsubWallet = onSnapshot(collection(db, 'wallet'), (snapshot) => {
      const loaded: WalletEntry[] = [];
      snapshot.forEach((docSnap) => {
        loaded.push({ id: docSnap.id, ...docSnap.data() } as WalletEntry);
      });
      loaded.sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
      setWalletEntries(loaded);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'wallet');
    });

    // 6b. Google AI code batches
    const unsubCodes = onSnapshot(collection(db, 'googleCodes'), (snapshot) => {
      const loaded: GoogleCodeBatch[] = [];
      snapshot.forEach((docSnap) => {
        loaded.push({ id: docSnap.id, ...docSnap.data() } as GoogleCodeBatch);
      });
      loaded.sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
      setGoogleCodeBatches(loaded);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'googleCodes');
    });

    // 7. Exchange rates (EGP per currency); fetched live the first time
    const unsubRates = onSnapshot(doc(db, 'settings', 'exchangeRates'), (snap) => {
      if (snap.exists()) {
        setExchangeRates({ ...DEFAULT_RATES, ...(snap.data() as ExchangeRates) });
      } else {
        fetchLiveRates().then((live) => {
          if (live) setDoc(doc(db, 'settings', 'exchangeRates'), live).catch(() => setExchangeRates(live));
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/exchangeRates');
    });

    return () => {
      unsubSubs();
      unsubUsers();
      unsubTeams();
      unsubTools();
      unsubNotifs();
      unsubWallet();
      unsubCodes();
      unsubRates();
    };
  }, []);

  // Sync to localStorage as local fallback
  useEffect(() => { localStorage.setItem('ai_res_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('ai_res_teams', JSON.stringify(teams)); }, [teams]);
  useEffect(() => { localStorage.setItem('ai_res_tools', JSON.stringify(aiTools)); }, [aiTools]);
  useEffect(() => { localStorage.setItem('ai_res_subscriptions', JSON.stringify(subscriptions)); }, [subscriptions]);
  useEffect(() => { localStorage.setItem('ai_res_activities', JSON.stringify(activities)); }, [activities]);
  useEffect(() => { localStorage.setItem('ai_res_notifications', JSON.stringify(notifications)); }, [notifications]);
  useEffect(() => { localStorage.setItem('ai_res_usage', JSON.stringify(usageRecords)); }, [usageRecords]);
  useEffect(() => { localStorage.setItem('ai_res_optimizations', JSON.stringify(optimizations)); }, [optimizations]);
  useEffect(() => { localStorage.setItem('ai_res_budgets', JSON.stringify(budgets)); }, [budgets]);
  useEffect(() => { localStorage.setItem('ai_res_approvals', JSON.stringify(approvals)); }, [approvals]);
  useEffect(() => { localStorage.setItem('ai_res_documents', JSON.stringify(documents)); }, [documents]);
  useEffect(() => { localStorage.setItem('ai_res_audit_logs', JSON.stringify(auditLogs)); }, [auditLogs]);
  useEffect(() => { localStorage.setItem('ai_res_security_sessions', JSON.stringify(securitySessions)); }, [securitySessions]);
  useEffect(() => { localStorage.setItem('ai_res_automations', JSON.stringify(automations)); }, [automations]);

  // Toast System
  const addToast = (title: string, message: string, type: ToastMessage['type'] = 'success') => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => { removeToast(id); }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const t = (key: keyof typeof translations['ar']): string => {
    return translations[currentLanguage][key] || translations['ar'][key] || key;
  };

  // Auth Operations
  const login = (email: string) => {
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (found) {
      setCurrentUser(found);
      addToast(
        currentLanguage === 'ar' ? 'تم تسجيل الدخول' : 'Logged In',
        currentLanguage === 'ar' ? `مرحباً بك ${found.name}` : `Welcome back ${found.name}`
      );
      return true;
    }
    const newUser: User = {
      id: 'usr-' + Date.now(),
      name: email.split('@')[0] || 'المستخدم الرئيسي',
      email: email,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      role: 'Super Admin',
      teamId: 'team-exec',
      teamName: 'المكتب التنفيذي',
      status: 'Active'
    };
    setCurrentUser(newUser);
    setUsers((prev) => [newUser, ...prev]);
    addToast(
      currentLanguage === 'ar' ? 'تم تسجيل الدخول' : 'Logged In',
      `مرحباً بك ${newUser.name}`
    );
    return true;
  };

  const signup = (name: string, email: string, teamName: string = 'الإدارة العليا') => {
    // Make workspace 100% clean with zero data
    setSubscriptions([]);
    setAiTools([]);
    setTeams([]);
    setActivities([]);
    setNotifications([]);
    setUsageRecords([]);
    setOptimizations([]);
    setBudgets([]);
    setApprovals([]);
    setDocuments([]);
    setAuditLogs([]);
    setSecuritySessions([]);
    setAutomations([]);

    const newUser: User = {
      id: 'usr-' + Date.now(),
      name: name.trim() || email.split('@')[0] || 'المسؤول',
      email: email.trim(),
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      role: 'Super Admin',
      teamId: 'team-exec',
      teamName: teamName.trim() || 'الإدارة العليا',
      status: 'Active',
      lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 16),
      activeStatus: 'online'
    };

    setCurrentUser(newUser);
    setUsers([newUser]);
    
    addToast(
      currentLanguage === 'ar' ? 'تم إنشاء الحساب بنجاح' : 'Account Created Successfully',
      currentLanguage === 'ar' ? `مرحباً بك ${newUser.name} - مساحة العمل خالية وجاهزة لاستقبال بياناتك` : `Welcome ${newUser.name}`
    );
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
    addToast(currentLanguage === 'ar' ? 'تم تسجيل الخروج' : 'Signed Out', '');
  };

  // Log Audit Helper
  const logAudit = (action: string, resource: string, prevVal = 'N/A', newVal = 'N/A') => {
    const newAudit: AuditLogItem = {
      id: 'adt-' + Date.now(),
      userId: currentUser?.id || 'usr-ahmed',
      userName: currentUser?.name || 'Ahmed Hassan',
      userAvatar: currentUser?.avatar || '',
      action,
      resource,
      previousValue: prevVal,
      newValue: newVal,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      ipAddress: '197.34.120.8',
      device: 'Browser Session',
      status: 'success'
    };
    setAuditLogs((prev) => [newAudit, ...prev]);
  };

  // Subscription Operations
  const addSubscription = (newSubData: Omit<Subscription, 'id'>) => {
    const id = 'sub-' + Date.now();
    const newSub: Subscription = { 
      ...newSubData, 
      id,
      licenseCode: newSubData.licenseCode || `LIC-${Math.floor(10000 + Math.random() * 90000)}`,
      purchasedSeats: newSubData.purchasedSeats || newSubData.assignedUserIds.length || 5,
      assignedSeats: newSubData.assignedUserIds.length || 1,
      activeSeats: newSubData.assignedUserIds.length || 1
    };

    setSubscriptions((prev) => [newSub, ...prev]);
    setDoc(doc(db, 'subscriptions', id), newSub).catch((e) => handleFirestoreError(e, OperationType.WRITE, `subscriptions/${id}`));

    // The subscription's price is taken out of the wallet
    if (Number(newSub.cost) > 0) {
      writeWalletEntry({
        type: 'charge',
        amount: Number(newSub.cost),
        currency: newSub.currency,
        note: `اشتراك ${newSub.toolName} (${newSub.planName})`,
        date: newSub.startDate || new Date().toISOString().substring(0, 10),
        subscriptionId: id,
      });
    }

    logAudit('إضافة اشتراك جديد', `${newSub.toolName} (${newSub.planName})`, 'None', `$${newSub.cost}`);

    addToast(
      currentLanguage === 'ar' ? 'تم إضافة الاشتراك بنجاح' : 'Subscription Added',
      `${newSub.toolName} (${newSub.licenseCode})`
    );
  };

  // ---- Subscription wallet ----
  // deposits add, charges subtract, adjustments carry their own sign
  const walletBalanceEgp = Math.round(
    walletEntries.reduce((sum, e) => sum + (e.type === 'charge' ? -e.amountEgp : e.amountEgp), 0) * 100
  ) / 100;
  const walletBalanceUsd = Math.round((walletBalanceEgp / (exchangeRates.USD || 1)) * 100) / 100;

  const writeWalletEntry = (entry: Pick<WalletEntry, 'type' | 'amount' | 'currency' | 'note' | 'date'> & { subscriptionId?: string }) => {
    const id = 'wal-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const full: WalletEntry = {
      ...entry,
      id,
      amount: Math.round(entry.amount * 100) / 100,
      rate: rateFor(entry.currency, exchangeRates),
      amountEgp: toEgp(entry.amount, entry.currency, exchangeRates),
      createdBy: currentUser?.name || '',
      createdAt: new Date().toISOString(),
    };
    if (!full.subscriptionId) delete full.subscriptionId;
    setWalletEntries((prev) => [full, ...prev]);
    setDoc(doc(db, 'wallet', id), full).catch((e) => handleFirestoreError(e, OperationType.WRITE, `wallet/${id}`));
    return full;
  };

  const addDeposit = (amount: number, currency: string, note: string, date: string) => {
    const entry = writeWalletEntry({ type: 'deposit', amount, currency, note: note.trim() || 'إيداع لرصيد الاشتراكات', date });
    logAudit('إيداع في محفظة الاشتراكات', entry.note, 'None', `${entry.amount} ${entry.currency}`);
    addToast(currentLanguage === 'ar' ? 'تم تسجيل المبلغ' : 'Deposit Added', `${entry.amount} ${entry.currency}`);
  };

  // Set the balance to an exact figure by recording the difference as an adjustment
  const setWalletBalance = (target: number, currency: string, note: string) => {
    const diffEgp = Math.round((toEgp(target, currency, exchangeRates) - walletBalanceEgp) * 100) / 100;
    if (diffEgp === 0) return;
    const rate = rateFor(currency, exchangeRates);
    const entry = writeWalletEntry({
      type: 'adjust',
      amount: Math.round((diffEgp / rate) * 100) / 100,
      currency,
      note: note.trim() || 'تعديل الرصيد يدوياً',
      date: new Date().toISOString().substring(0, 10),
    });
    logAudit('تعديل رصيد المحفظة', entry.note, formatEgp(walletBalanceEgp), `${target} ${currency}`);
    addToast(currentLanguage === 'ar' ? 'تم تعديل الرصيد' : 'Balance Updated', `${target} ${currency}`);
  };

  // Change the amount/currency/date/note of an existing entry (its EGP value follows)
  const updateWalletEntry = (id: string, changes: Partial<Pick<WalletEntry, 'amount' | 'currency' | 'note' | 'date'>>) => {
    const entry = walletEntries.find((e) => e.id === id);
    if (!entry) return;
    const merged = { ...entry, ...changes };
    // Keep the entry's original rate unless its currency changed
    const rate = changes.currency && changes.currency !== entry.currency ? rateFor(merged.currency, exchangeRates) : entry.rate;
    const amount = Math.round(Number(merged.amount) * 100) / 100;
    const updated: Partial<WalletEntry> = {
      amount,
      currency: merged.currency,
      note: merged.note,
      date: merged.date,
      rate,
      amountEgp: Math.round(amount * rate * 100) / 100,
    };
    setWalletEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...updated } : e)));
    updateDoc(doc(db, 'wallet', id), updated).catch((e) => handleFirestoreError(e, OperationType.UPDATE, `wallet/${id}`));
  };

  const deleteWalletEntry = (id: string) => {
    const entry = walletEntries.find((e) => e.id === id);
    setWalletEntries((prev) => prev.filter((e) => e.id !== id));
    deleteDoc(doc(db, 'wallet', id)).catch((e) => handleFirestoreError(e, OperationType.DELETE, `wallet/${id}`));
    logAudit('حذف حركة من المحفظة', entry?.note || id, `${entry?.amount ?? ''} ${entry?.currency ?? ''}`, 'Deleted');
    addToast(currentLanguage === 'ar' ? 'تم حذف الحركة' : 'Entry Deleted', entry?.note || '');
  };

  const saveExchangeRates = (rates: Omit<ExchangeRates, 'updatedAt'>) => {
    const full: ExchangeRates = { ...rates, updatedAt: new Date().toISOString() };
    setExchangeRates(full);
    setDoc(doc(db, 'settings', 'exchangeRates'), full).catch((e) => handleFirestoreError(e, OperationType.WRITE, 'settings/exchangeRates'));
    addToast(currentLanguage === 'ar' ? 'تم حفظ سعر الصرف' : 'Rates Saved', `1$ = ${full.USD} ج.م`);
  };

  // ---- Google AI codes ----
  const googlePlanName = (plan: GoogleCodeBatch['plan']) => (plan === 'plus' ? 'Google AI Plus' : 'Google AI Pro');

  const codesChargeNote = (b: Pick<GoogleCodeBatch, 'quantity' | 'plan' | 'unitPrice' | 'currency' | 'supplier'>) =>
    `${b.quantity} كود ${googlePlanName(b.plan)} × ${b.unitPrice} ${b.currency}${b.supplier ? ` — ${b.supplier}` : ''}`;

  const addGoogleCodes = (batch: Omit<GoogleCodeBatch, 'id' | 'createdAt' | 'createdBy'>) => {
    const id = 'gcodes-' + Date.now();

    // The whole purchase (price × count) comes out of the wallet
    const total = Math.round(batch.unitPrice * batch.quantity * 100) / 100;
    const charge = total > 0
      ? writeWalletEntry({ type: 'charge', amount: total, currency: batch.currency, note: codesChargeNote(batch), date: batch.date })
      : null;

    const full: GoogleCodeBatch = { ...batch, id, createdBy: currentUser?.name || '', createdAt: new Date().toISOString() };
    if (charge) full.walletEntryId = charge.id;
    setGoogleCodeBatches((prev) => [full, ...prev]);
    setDoc(doc(db, 'googleCodes', id), full).catch((e) => handleFirestoreError(e, OperationType.WRITE, `googleCodes/${id}`));

    logAudit('إضافة أكواد Google', googlePlanName(batch.plan), 'None', `${batch.quantity} كود`);
    addToast(currentLanguage === 'ar' ? 'تم تسجيل الأكواد' : 'Codes Added', `${batch.quantity} × ${googlePlanName(batch.plan)}`);
  };

  const updateGoogleCodes = (id: string, codes: GoogleCode[]) => {
    setGoogleCodeBatches((prev) => prev.map((b) => (b.id === id ? { ...b, codes } : b)));
    updateDoc(doc(db, 'googleCodes', id), { codes }).catch((e) => handleFirestoreError(e, OperationType.UPDATE, `googleCodes/${id}`));
  };

  // Edit a purchase; its wallet charge is updated to the new total
  const updateGoogleCodeBatch = (id: string, changes: Partial<Omit<GoogleCodeBatch, 'id' | 'createdAt' | 'createdBy' | 'walletEntryId'>>) => {
    const batch = googleCodeBatches.find((b) => b.id === id);
    if (!batch) return;
    const merged = { ...batch, ...changes };
    setGoogleCodeBatches((prev) => prev.map((b) => (b.id === id ? merged : b)));
    updateDoc(doc(db, 'googleCodes', id), changes).catch((e) => handleFirestoreError(e, OperationType.UPDATE, `googleCodes/${id}`));

    if (batch.walletEntryId && walletEntries.some((e) => e.id === batch.walletEntryId)) {
      updateWalletEntry(batch.walletEntryId, {
        amount: Math.round(merged.unitPrice * merged.quantity * 100) / 100,
        currency: merged.currency,
        date: merged.date,
        note: codesChargeNote(merged),
      });
    }
    logAudit('تعديل أكواد Google', googlePlanName(merged.plan), `${batch.quantity} × ${batch.unitPrice}`, `${merged.quantity} × ${merged.unitPrice}`);
    addToast(currentLanguage === 'ar' ? 'تم حفظ التعديل' : 'Codes Updated', googlePlanName(merged.plan));
  };

  // refund = also remove its wallet charge so the money goes back to the balance
  const deleteGoogleCodes = (id: string, refund = false) => {
    const batch = googleCodeBatches.find((b) => b.id === id);
    setGoogleCodeBatches((prev) => prev.filter((b) => b.id !== id));
    deleteDoc(doc(db, 'googleCodes', id)).catch((e) => handleFirestoreError(e, OperationType.DELETE, `googleCodes/${id}`));
    if (refund && batch?.walletEntryId) {
      setWalletEntries((prev) => prev.filter((e) => e.id !== batch.walletEntryId));
      deleteDoc(doc(db, 'wallet', batch.walletEntryId)).catch((e) => handleFirestoreError(e, OperationType.DELETE, `wallet/${batch.walletEntryId}`));
    }
    logAudit('حذف أكواد Google', batch ? googlePlanName(batch.plan) : id, `${batch?.quantity ?? ''} كود`, 'Deleted');
    addToast(currentLanguage === 'ar' ? 'تم حذف الأكواد' : 'Codes Deleted', '');
  };

  const refreshExchangeRates = async () => {
    const live = await fetchLiveRates();
    if (!live) {
      addToast(currentLanguage === 'ar' ? 'تعذر جلب السعر' : 'Could not fetch rates', currentLanguage === 'ar' ? 'اكتب السعر يدوياً' : '', 'error');
      return false;
    }
    saveExchangeRates({ USD: live.USD, EUR: live.EUR, SAR: live.SAR });
    return true;
  };

  const updateSubscription = (id: string, updated: Partial<Subscription>) => {
    setSubscriptions((prev) =>
      prev.map((sub) => (sub.id === id ? { ...sub, ...updated } : sub))
    );
    updateDoc(doc(db, 'subscriptions', id), updated).catch((e) => handleFirestoreError(e, OperationType.UPDATE, `subscriptions/${id}`));
    if (selectedSubscriptionForDetails?.id === id) {
      setSelectedSubscriptionForDetails({ ...selectedSubscriptionForDetails, ...updated });
    }

    logAudit('تحديث بيانات الاشتراك', `ID: ${id}`, 'Updated', 'Saved');
    addToast(currentLanguage === 'ar' ? 'تم التحديث' : 'Updated', 'Saved successfully');
  };

  // Move every subscription of an account to a new account email
  const renameAccount = (ids: string[], oldEmail: string, newEmail: string) => {
    const email = newEmail.trim().toLowerCase();
    if (!email || ids.length === 0) return;
    setSubscriptions((prev) => prev.map((s) => (ids.includes(s.id) ? { ...s, ownerEmail: email } : s)));
    ids.forEach((id) => {
      updateDoc(doc(db, 'subscriptions', id), { ownerEmail: email })
        .catch((e) => handleFirestoreError(e, OperationType.UPDATE, `subscriptions/${id}`));
    });

    logAudit('تعديل حساب الاشتراكات', `${ids.length} اشتراك`, oldEmail, email);
    addToast(currentLanguage === 'ar' ? 'تم تعديل الحساب' : 'Account Updated', email);
  };

  // Permanently delete one subscription, or every subscription of an account
  const deleteSubscriptions = (ids: string[], label: string) => {
    if (ids.length === 0) return;
    setSubscriptions((prev) => prev.filter((s) => !ids.includes(s.id)));
    ids.forEach((id) => {
      deleteDoc(doc(db, 'subscriptions', id)).catch((e) => handleFirestoreError(e, OperationType.DELETE, `subscriptions/${id}`));
    });
    if (selectedSubscriptionForDetails && ids.includes(selectedSubscriptionForDetails.id)) setSelectedSubscriptionForDetails(null);
    if (selectedSubscriptionForAssign && ids.includes(selectedSubscriptionForAssign.id)) setSelectedSubscriptionForAssign(null);
    if (selectedSubscriptionForEdit && ids.includes(selectedSubscriptionForEdit.id)) setSelectedSubscriptionForEdit(null);

    logAudit(ids.length > 1 ? 'حذف حساب اشتراكات' : 'حذف اشتراك', label, `${ids.length} اشتراك`, 'Deleted');
    addToast(currentLanguage === 'ar' ? (ids.length > 1 ? 'تم حذف الحساب واشتراكاته' : 'تم حذف الاشتراك') : 'Deleted', label);
  };

  const archiveSubscription = (id: string) => {
    setSubscriptions((prev) =>
      prev.map((sub) => (sub.id === id ? { ...sub, status: 'Archived' as SubscriptionStatus } : sub))
    );
    updateDoc(doc(db, 'subscriptions', id), { status: 'Archived' }).catch((e) => handleFirestoreError(e, OperationType.UPDATE, `subscriptions/${id}`));

    logAudit('أرشفة الاشتراك', `ID: ${id}`, 'Active', 'Archived');
    addToast(currentLanguage === 'ar' ? 'تمت أرشفة الاشتراك' : 'Archived', '');
  };

  const assignUsersToSubscription = (subscriptionId: string, userIds: string[]) => {
    setSubscriptions((prev) =>
      prev.map((sub) =>
        sub.id === subscriptionId ? { ...sub, assignedUserIds: userIds, assignedSeats: userIds.length } : sub
      )
    );
    updateDoc(doc(db, 'subscriptions', subscriptionId), {
      assignedUserIds: userIds,
      assignedSeats: userIds.length
    }).catch((e) => handleFirestoreError(e, OperationType.UPDATE, `subscriptions/${subscriptionId}`));

    logAudit('تحديث تعيينات المستخدمين', `Sub: ${subscriptionId}`, 'Previous Users', `${userIds.length} users`);
    addToast(currentLanguage === 'ar' ? 'تم تعيين المستخدمين' : 'Users Assigned', `${userIds.length} users assigned`);
  };

  // User Operations
  const addUser = (userData: Omit<User, 'id'>) => {
    const id = 'usr-' + Date.now();
    const newUser: User = { ...userData, id };
    setUsers((prev) => [...prev, newUser]);
    setDoc(doc(db, 'users', id), newUser).catch((e) => handleFirestoreError(e, OperationType.WRITE, `users/${id}`));

    logAudit('إضافة موظف جديد', `${newUser.name} (${newUser.role})`, 'None', newUser.teamName);
    addToast(currentLanguage === 'ar' ? 'تمت إضافة المستخدم' : 'User Added', newUser.name);
  };

  const updateUser = (id: string, updated: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updated } : u)));
    updateDoc(doc(db, 'users', id), updated).catch((e) => handleFirestoreError(e, OperationType.UPDATE, `users/${id}`));

    addToast(currentLanguage === 'ar' ? 'تم التعديل' : 'Updated', '');
  };

  const deleteUser = (id: string) => {
    const usr = users.find(u => u.id === id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    deleteDoc(doc(db, 'users', id)).catch((e) => handleFirestoreError(e, OperationType.DELETE, `users/${id}`));

    // Free the seats the deleted user held
    subscriptions
      .filter((s) => s.assignedUserIds?.includes(id))
      .forEach((s) => {
        const remaining = s.assignedUserIds.filter((uid) => uid !== id);
        setSubscriptions((prev) => prev.map((p) => (p.id === s.id ? { ...p, assignedUserIds: remaining, assignedSeats: remaining.length } : p)));
        updateDoc(doc(db, 'subscriptions', s.id), { assignedUserIds: remaining, assignedSeats: remaining.length })
          .catch((e) => handleFirestoreError(e, OperationType.UPDATE, `subscriptions/${s.id}`));
      });
    if (selectedUserForProfile?.id === id) setSelectedUserForProfile(null);

    logAudit('حذف/استبعاد موظف', `${usr?.name || id}`, 'Active User', 'Deleted/Archived');
    addToast(currentLanguage === 'ar' ? 'تم حذف/أرشفة حساب الموظف' : 'User Removed', '');
  };

  // Team Operations
  const addTeam = (teamData: Omit<Team, 'id'>) => {
    const id = 'team-' + Date.now();
    const newTeam: Team = { ...teamData, id };
    setTeams((prev) => [...prev, newTeam]);
    setDoc(doc(db, 'teams', id), newTeam).catch((e) => handleFirestoreError(e, OperationType.WRITE, `teams/${id}`));

    logAudit('إنشاء فريق جديد', newTeam.name, 'None', `$${newTeam.monthlyBudget} Budget`);
    addToast(currentLanguage === 'ar' ? 'تم إنشاء الفريق' : 'Team Created', newTeam.name);
    return id;
  };

  const updateTeam = (id: string, updated: Partial<Team>) => {
    setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
    updateDoc(doc(db, 'teams', id), updated).catch((e) => handleFirestoreError(e, OperationType.UPDATE, `teams/${id}`));

    addToast(currentLanguage === 'ar' ? 'تم التحديث' : 'Updated', '');
  };

  // Edit a team's details and membership in one go
  const saveTeam = (id: string, updated: Partial<Team>, memberIds: string[]) => {
    const tm = teams.find((t) => t.id === id);
    if (!tm) return;
    const newName = updated.name ?? tm.name;
    const teamUpdate: Partial<Team> = { ...updated, assignedUserIds: memberIds, memberCount: memberIds.length };

    setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, ...teamUpdate } : t)));
    updateDoc(doc(db, 'teams', id), teamUpdate).catch((e) => handleFirestoreError(e, OperationType.UPDATE, `teams/${id}`));

    const isCurrentMember = (u: User) => u.teamId === id || u.teamName === tm.name;
    const changes: { id: string; data: Partial<User> }[] = [];
    users.forEach((u) => {
      const shouldBeMember = memberIds.includes(u.id);
      if (shouldBeMember && (u.teamId !== id || u.teamName !== newName)) {
        changes.push({ id: u.id, data: { teamId: id, teamName: newName } });
      } else if (!shouldBeMember && isCurrentMember(u)) {
        changes.push({ id: u.id, data: { teamId: '', teamName: '' } });
      }
    });
    setUsers((prev) => prev.map((u) => {
      const c = changes.find((ch) => ch.id === u.id);
      return c ? { ...u, ...c.data } : u;
    }));
    changes.forEach((c) => {
      updateDoc(doc(db, 'users', c.id), c.data).catch((e) => handleFirestoreError(e, OperationType.UPDATE, `users/${c.id}`));
    });
    if (selectedTeamForDetails?.id === id) setSelectedTeamForDetails({ ...tm, ...teamUpdate });

    logAudit('تعديل فريق', newName, tm.name, `${memberIds.length} أعضاء`);
    addToast(currentLanguage === 'ar' ? 'تم حفظ تعديلات الفريق' : 'Team Updated', newName);
  };

  const deleteTeam = (id: string) => {
    const tm = teams.find((t) => t.id === id);
    if (!tm) return;

    // Unlink members so they don't point at a team that no longer exists
    const members = users.filter((u) => u.teamId === id || u.teamName === tm.name);
    const unlinked = { teamId: '', teamName: '' };
    setUsers((prev) => prev.map((u) => (members.some((m) => m.id === u.id) ? { ...u, ...unlinked } : u)));
    members.forEach((m) => {
      updateDoc(doc(db, 'users', m.id), unlinked).catch((e) => handleFirestoreError(e, OperationType.UPDATE, `users/${m.id}`));
    });

    setTeams((prev) => prev.filter((t) => t.id !== id));
    deleteDoc(doc(db, 'teams', id)).catch((e) => handleFirestoreError(e, OperationType.DELETE, `teams/${id}`));
    if (selectedTeamForDetails?.id === id) setSelectedTeamForDetails(null);

    logAudit('حذف فريق', tm.name, `${members.length} أعضاء`, 'Deleted');
    addToast(currentLanguage === 'ar' ? 'تم حذف الفريق' : 'Team Deleted', tm.name);
  };

  // AI Tool Operations
  const addAiTool = (toolData: Omit<AiTool, 'id'>) => {
    const id = 'tool-' + Date.now();
    const newTool: AiTool = { ...toolData, id };
    setAiTools((prev) => [...prev, newTool]);
    setDoc(doc(db, 'aiTools', id), newTool).catch((e) => handleFirestoreError(e, OperationType.WRITE, `aiTools/${id}`));

    logAudit('إضافة أداة ذكاء اصطناعي مخصصة', newTool.name, 'None', newTool.category);
    addToast(currentLanguage === 'ar' ? 'تمت إضافة الأداة' : 'AI Tool Added', newTool.name);
    return id;
  };

  // Removes the tool only; its subscriptions stay and are deleted separately
  const deleteAiTool = (id: string) => {
    const tool = aiTools.find((tl) => tl.id === id);
    if (!tool) return;
    setAiTools((prev) => prev.filter((tl) => tl.id !== id));
    deleteDoc(doc(db, 'aiTools', id)).catch((e) => handleFirestoreError(e, OperationType.DELETE, `aiTools/${id}`));

    logAudit('حذف أداة ذكاء اصطناعي', tool.name, tool.category, 'Deleted');
    addToast(currentLanguage === 'ar' ? 'تم حذف الأداة' : 'AI Tool Deleted', tool.name);
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    updateDoc(doc(db, 'notifications', id), { read: true }).catch((e) => handleFirestoreError(e, OperationType.UPDATE, `notifications/${id}`));
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    notifications.forEach((n) => {
      updateDoc(doc(db, 'notifications', n.id), { read: true }).catch((e) => handleFirestoreError(e, OperationType.UPDATE, `notifications/${n.id}`));
    });
    addToast(currentLanguage === 'ar' ? 'تم تحديد الكل كمنقروء' : 'Notifications Read', '');
  };

  // 7 Modules Operations
  const addApprovalRequest = (reqData: Omit<ApprovalRequest, 'id' | 'createdAt' | 'status' | 'currentStepRole' | 'chain'>) => {
    const id = 'appr-' + Date.now();
    const newApproval: ApprovalRequest = {
      ...reqData,
      id,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'pending',
      currentStepRole: 'Team Leader',
      chain: [
        { role: 'User', approverName: reqData.requesterName, status: 'approved', comment: 'تم رفع الطلب', date: new Date().toISOString().substring(0, 10) },
        { role: 'Team Leader', status: 'pending' },
        { role: 'Manager', status: 'pending' },
        { role: 'Finance', status: 'pending' },
        { role: 'Super Admin', status: 'pending' }
      ]
    };
    setApprovals((prev) => [newApproval, ...prev]);
    logAudit('رفع طلب شراء جديد (Approval Request)', `${reqData.toolName} (${reqData.planName})`, 'Pending', `$${reqData.cost}`);
    addToast(currentLanguage === 'ar' ? 'تم رفع طلب الشراء' : 'Approval Request Submitted', reqData.toolName);
  };

  const updateApprovalStatus = (id: string, status: ApprovalStatus, comment?: string) => {
    setApprovals((prev) =>
      prev.map((appr) => {
        if (appr.id === id) {
          const updatedChain = appr.chain.map((c) => 
            c.role === appr.currentStepRole ? { ...c, status, approverName: currentUser?.name || 'Admin', comment, date: new Date().toISOString().substring(0, 10) } : c
          );
          return {
            ...appr,
            status: status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending',
            chain: updatedChain
          };
        }
        return appr;
      })
    );
    logAudit('معالجة طلب موافقة', `Request ID: ${id}`, 'Pending', status);
    addToast(currentLanguage === 'ar' ? 'تمت معالجة الطلب' : 'Request Processed', status);
  };

  const addDocument = (docData: Omit<DocumentItem, 'id' | 'uploadDate' | 'status'>) => {
    const id = 'doc-' + Date.now();
    const newDoc: DocumentItem = {
      ...docData,
      id,
      uploadDate: new Date().toISOString().substring(0, 10),
      status: 'active'
    };
    setDocuments((prev) => [newDoc, ...prev]);
    logAudit('رفع مستند/فاتورة جديدة', newDoc.title, 'None', newDoc.fileName);
    addToast(currentLanguage === 'ar' ? 'تم رفع المستند بنجاح' : 'Document Uploaded', newDoc.title);
  };

  const deleteDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    logAudit('حذف مستند', `ID: ${id}`, 'Active', 'Deleted');
    addToast(currentLanguage === 'ar' ? 'تم حذف المستند' : 'Document Deleted', '');
  };

  const toggleAutomationRule = (id: string) => {
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
    addToast(currentLanguage === 'ar' ? 'تم تحديث حالة القاعدة' : 'Rule Toggled', '');
  };

  const applyOptimization = (id: string) => {
    setOptimizations((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: 'applied' } : o))
    );
    logAudit('تطبيق توصية تحسين التراخيص', `Optimization: ${id}`, 'Pending', 'Applied');
    addToast(currentLanguage === 'ar' ? 'تم تطبيق توصية التوفير بنجاح' : 'Optimization Applied', '');
  };

  const sendChatMessage = async (userText: string) => {
    if (!userText.trim()) return;

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsAiChatLoading(true);

    try {
      const platformContext = {
        totalMonthlyCost: subscriptions.reduce((acc, s) => acc + s.cost, 0),
        activeSubscriptionsCount: subscriptions.filter(s => s.status === 'Active').length,
        usersCount: users.length,
        teamsCount: teams.length,
        unusedLicensesCount: optimizations.filter(o => o.status === 'pending').length,
        pendingApprovalsCount: approvals.filter(a => a.status === 'pending').length,
        subscriptions: subscriptions.map(s => ({
          toolName: s.toolName,
          planName: s.planName,
          cost: s.cost,
          renewalDate: s.renewalDate,
          seats: `${s.assignedSeats || s.assignedUserIds.length}/${s.purchasedSeats || 5}`
        }))
      };

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userText, platformContext })
      });

      const data = await res.json();
      const botText = data.reply || 'تم تحليل الاستفسار بناءً على بيانات المنصة الفعلية.';

      const botMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'assistant',
        text: botText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatMessages((prev) => [...prev, botMsg]);
    } catch (e) {
      const fallbackMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'assistant',
        text: `إليك ملخص سريع بناءً على البيانات الحالية:\n- إجمالي المصروفات الشهري: $${subscriptions.reduce((a, s) => a + s.cost, 0)}\n- عدد الاشتراكات النشطة: ${subscriptions.length}\n- الفرص المتاحة للتوفير: ${optimizations.length} توصيات.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsAiChatLoading(false);
    }
  };

  const clearAllData = () => {
    setSubscriptions([]);
    setUsers([]);
    setTeams([]);
    setUsageRecords([]);
    setOptimizations([]);
    setBudgets([]);
    setApprovals([]);
    setDocuments([]);
    setAuditLogs([]);
    addToast(currentLanguage === 'ar' ? 'تم تصفيير البيانات للبدء من جديد' : 'Cleared All Data', 'جميع القوائم فارغة الآن لإضافة بياناتك الخاصة');
  };

  const loadDemoData = () => {
    const demoTeams: Team[] = [
      { id: 'team-dev', name: 'Development', description: 'Software engineering & AI dev', memberCount: 8, toolCount: 3, monthlyCost: 80, monthlyBudget: 100, color: '#3b82f6', leaderId: 'usr-admin', leaderName: 'Abdelrahman Hany' },
      { id: 'team-design', name: 'Design', description: 'Creative UI/UX production', memberCount: 4, toolCount: 2, monthlyCost: 40, monthlyBudget: 60, color: '#8b5cf6', leaderId: 'usr-ramy', leaderName: 'Ramy Mahmoud' }
    ];

    const demoUsers: User[] = [
      { id: 'usr-admin', name: 'Abdelrahman Hany', email: 'abdelrhmanhany996@gmail.com', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80', role: 'Super Admin', teamId: 'team-dev', teamName: 'Development', assignedToolIds: ['sub-1'], status: 'Active' },
      { id: 'usr-ramy', name: 'Ramy Mahmoud', email: 'ramy.m@company.ai', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', role: 'Manager', teamId: 'team-design', teamName: 'Design', assignedToolIds: ['sub-2'], status: 'Active' }
    ];

    const demoTools: AiTool[] = [
      { id: 'tool-chatgpt', name: 'ChatGPT Plus', provider: 'OpenAI', category: 'Chat & Writing', logo: '🤖', badgeColor: '#10a37f', description: 'General content & coding', subscriptionsCount: 1, usersCount: 4, monthlySpending: 20 },
      { id: 'tool-claude', name: 'Claude Pro', provider: 'Anthropic', category: 'Chat & Writing', logo: '🧠', badgeColor: '#d97706', description: 'Reasoning & long text', subscriptionsCount: 1, usersCount: 2, monthlySpending: 20 }
    ];

    const demoSubs: Subscription[] = [
      { id: 'sub-1', toolId: 'tool-chatgpt', toolName: 'ChatGPT', provider: 'OpenAI', planName: 'Plus', planType: 'Team', licenseCode: 'GPT-TEAM-9912', purchasedSeats: 5, assignedSeats: 4, activeSeats: 4, cost: 20, currency: 'USD', billingCycle: 'Monthly', ownerId: 'usr-admin', ownerName: 'Abdelrahman Hany', ownerEmail: 'abdelrhmanhany996@gmail.com', teamId: 'team-dev', teamName: 'Development', assignedUserIds: ['usr-admin'], startDate: '2026-09-01', renewalDate: '2026-10-01', paymentMethod: 'Corporate Card (•••• 4242)', paymentUrl: 'https://chatgpt.com', autoRenewal: true, status: 'Active', reminders: { d30: true, d14: true, d7: true, d2: true, d1: true }, notes: 'Primary AI assistant' },
      { id: 'sub-2', toolId: 'tool-claude', toolName: 'Claude', provider: 'Anthropic', planName: 'Pro', planType: 'Team', licenseCode: 'CLAUDE-PRO-8812', purchasedSeats: 3, assignedSeats: 2, activeSeats: 2, cost: 20, currency: 'USD', billingCycle: 'Monthly', ownerId: 'usr-ramy', ownerName: 'Ramy Mahmoud', ownerEmail: 'ramy.m@company.ai', teamId: 'team-design', teamName: 'Design', assignedUserIds: ['usr-ramy'], startDate: '2026-09-08', renewalDate: '2026-10-08', paymentMethod: 'Corporate Card (•••• 4242)', paymentUrl: 'https://claude.ai', autoRenewal: true, status: 'Active', reminders: { d30: true, d14: true, d7: true, d2: true, d1: true }, notes: 'Creative AI tool' }
    ];

    setTeams(demoTeams);
    setUsers(demoUsers);
    setAiTools(demoTools);
    setSubscriptions(demoSubs);
    addToast(currentLanguage === 'ar' ? 'تم تحميل البيانات النموذجية' : 'Demo Data Loaded', 'تمت إضافة عينة بيانات تجريبية بنجاح');
  };

  // Screens get the first-letter avatar; the stored data is left untouched
  const usersWithAvatars = users.map((u) => ({ ...u, avatar: avatarFor(u) }));
  const liveCurrentUser = currentUser ? users.find((u) => u.id === currentUser.id) || currentUser : null;
  const currentUserWithAvatar = liveCurrentUser ? { ...liveCurrentUser, avatar: avatarFor(liveCurrentUser) } : null;

  return (
    <AppContext.Provider
      value={{
        currentUser: currentUserWithAvatar,
        currentLanguage,
        setLanguage,
        isDarkMode,
        toggleDarkMode,
        activeTab,
        setActiveTab,
        users: usersWithAvatars,
        teams,
        aiTools,
        subscriptions,
        activities,
        notifications,
        toasts,
        usageRecords,
        optimizations,
        budgets,
        approvals,
        documents,
        auditLogs,
        securitySessions,
        automations,
        chatMessages,
        isAiChatLoading,
        isAddWizardOpen,
        setIsAddWizardOpen,
        selectedSubscriptionForDetails,
        setSelectedSubscriptionForDetails,
        selectedSubscriptionForAssign,
        setSelectedSubscriptionForAssign,
        selectedSubscriptionForEdit,
        setSelectedSubscriptionForEdit,
        selectedUserForProfile,
        setSelectedUserForProfile,
        selectedTeamForDetails,
        setSelectedTeamForDetails,
        isGlobalSearchOpen,
        setIsGlobalSearchOpen,
        searchQuery,
        setSearchQuery,
        login,
        signup,
        logout,
        addToast,
        removeToast,
        addSubscription,
        updateSubscription,
        archiveSubscription,
        deleteSubscriptions,
        renameAccount,
        assignUsersToSubscription,
        addUser,
        updateUser,
        deleteUser,
        addTeam,
        updateTeam,
        deleteTeam,
        saveTeam,
        addAiTool,
        deleteAiTool,
        walletEntries,
        walletBalanceEgp,
        exchangeRates,
        addDeposit,
        deleteWalletEntry,
        saveExchangeRates,
        refreshExchangeRates,
        // "ZU2" was a typo for the supplier Z2U; fix batches saved with the old spelling on the way out
        googleCodeBatches: googleCodeBatches.map((b) => (b.supplier === 'ZU2' ? { ...b, supplier: 'Z2U' } : b)),
        addGoogleCodes,
        updateGoogleCodes,
        deleteGoogleCodes,
        updateGoogleCodeBatch,
        editingGoogleCodes,
        setEditingGoogleCodes,
        walletBalanceUsd,
        setWalletBalance,
        updateWalletEntry,
        isGoogleCodesModalOpen,
        setIsGoogleCodesModalOpen,
        markNotificationRead,
        markAllNotificationsRead,
        addApprovalRequest,
        updateApprovalStatus,
        addDocument,
        deleteDocument,
        toggleAutomationRule,
        applyOptimization,
        sendChatMessage,
        clearAllData,
        loadDemoData,
        t,
        dir
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
