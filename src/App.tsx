/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import WurmExplorer from './components/WurmExplorer';
import SevenDaysDashboard from './components/SevenDaysDashboard';
import {
  Globe,
  Settings,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  Wifi,
  WifiOff,
  Clock,
  Users,
  LayoutGrid,
  AlertTriangle,
  Flame,
  Star,
  Skull,
  Gamepad2,
  Activity
} from 'lucide-react';
import { ClusterData, ServerInstance, GlobalConfig } from './types';

// Supported themes and their detailed styling configurations
const THEMES = {
  standard: {
    bg: "radial-gradient(circle at center, #1c130c 0%, #050302 100%)",
    cardBg: "bg-[#0f0a07]/90 border-[#ff9900]/25 hover:border-[#ff9900]/60",
    textAccent: "text-[#ff9900]",
    bgAccent: "bg-[#ff9900]",
    bgAccentHover: "hover:bg-[#ffb84d]",
    textAccentDark: "text-[#050302]",
    glow: "shadow-[0_0_15px_rgba(255,153,0,0.15)]",
    inputBg: "bg-[#0f0a07]",
    borderColor: "border-[#ff9900]/20",
    activePill: "bg-[#ff9900] text-[#050302] border-[#ff9900]",
    ledColor: "text-[#00ffcc]",
    badgeColor: "#ff9900"
  },
  noel: {
    bg: "linear-gradient(135deg, #021a11 0%, #000a06 100%)",
    cardBg: "bg-[#042418]/90 border-red-600/30 hover:border-red-500",
    textAccent: "text-red-500",
    bgAccent: "bg-red-600",
    bgAccentHover: "hover:bg-red-500",
    textAccentDark: "text-[#ffffff]",
    glow: "shadow-[0_0_15px_rgba(220,38,38,0.2)]",
    inputBg: "bg-[#042418]",
    borderColor: "border-red-600/20",
    activePill: "bg-red-600 text-[#ffffff] border-red-600",
    ledColor: "text-emerald-400",
    badgeColor: "#dc2626"
  },
  halloween: {
    bg: "linear-gradient(135deg, #180825 0%, #08020d 100%)",
    cardBg: "bg-[#1f0b30]/90 border-orange-500/30 hover:border-orange-400",
    textAccent: "text-orange-500",
    bgAccent: "bg-orange-500",
    bgAccentHover: "hover:bg-orange-400",
    textAccentDark: "text-[#08020d]",
    glow: "shadow-[0_0_15px_rgba(249,115,22,0.25)]",
    inputBg: "bg-[#1f0b30]",
    borderColor: "border-orange-500/20",
    activePill: "bg-orange-500 text-[#08020d] border-orange-500",
    ledColor: "text-[#00ffcc]",
    badgeColor: "#f97316"
  },
  paques: {
    bg: "linear-gradient(135deg, #0b2210 0%, #030a04 100%)",
    cardBg: "bg-[#0e2c15]/90 border-lime-500/30 hover:border-lime-400",
    textAccent: "text-lime-400",
    bgAccent: "bg-lime-500",
    bgAccentHover: "hover:bg-lime-400",
    textAccentDark: "text-[#030a04]",
    glow: "shadow-[0_0_15px_rgba(132,204,22,0.2)]",
    inputBg: "bg-[#0e2c15]",
    borderColor: "border-lime-500/20",
    activePill: "bg-lime-500 text-[#030a04] border-lime-500",
    ledColor: "text-yellow-400",
    badgeColor: "#84cc16"
  },
  cyberpunk: {
    bg: "linear-gradient(135deg, #0f0111 0%, #020003 100%)",
    cardBg: "bg-[#18021a]/90 border-[#00ffcc]/30 hover:border-[#00ffcc]",
    textAccent: "text-[#00ffcc]",
    bgAccent: "bg-[#00ffcc]",
    bgAccentHover: "hover:bg-cyan-300",
    textAccentDark: "text-[#020003]",
    glow: "shadow-[0_0_15px_rgba(0,255,204,0.3)]",
    inputBg: "bg-[#18021a]",
    borderColor: "border-[#00ffcc]/20",
    activePill: "bg-[#00ffcc] text-[#020003] border-[#00ffcc]",
    ledColor: "text-[#ff00ff]",
    badgeColor: "#00ffcc"
  },
  apocalypse: {
    bg: "linear-gradient(135deg, #220303 0%, #080000 100%)",
    cardBg: "bg-[#2b0505]/90 border-red-600/30 hover:border-red-500",
    textAccent: "text-red-600",
    bgAccent: "bg-red-600",
    bgAccentHover: "hover:bg-red-500",
    textAccentDark: "text-white",
    glow: "shadow-[0_0_15px_rgba(220,38,38,0.3)]",
    inputBg: "bg-[#2b0505]",
    borderColor: "border-red-600/20",
    activePill: "bg-red-600 text-white border-red-600",
    ledColor: "text-yellow-500",
    badgeColor: "#dc2626"
  },
  space: {
    bg: "linear-gradient(135deg, #000c24 0%, #00020d 100%)",
    cardBg: "bg-[#00133a]/90 border-violet-500/35 hover:border-violet-400",
    textAccent: "text-violet-400",
    bgAccent: "bg-violet-500",
    bgAccentHover: "hover:bg-violet-400",
    textAccentDark: "text-[#00020d]",
    glow: "shadow-[0_0_15px_rgba(139,92,246,0.25)]",
    inputBg: "bg-[#00133a]",
    borderColor: "border-violet-500/20",
    activePill: "bg-violet-500 text-[#00020d] border-violet-500",
    ledColor: "text-[#00ffcc]",
    badgeColor: "#8b5cf6"
  }
};

const SECRET_KEY_MASTER = "QBC2026";

export default function App() {
  // Views states: 'portal' | 'admin'
  const [view, setView] = useState<'portal' | 'admin'>('portal');
  const [selectedWurmServer, setSelectedWurmServer] = useState<ServerInstance | null>(null);

  // Multi-language states: 'fr' | 'en'
  const [lang, setLang] = useState<'fr' | 'en'>(() => {
    const saved = localStorage.getItem('qbc_global_language');
    if (saved === 'fr' || saved === 'en') return saved;
    return navigator.language.startsWith('fr') ? 'fr' : 'en';
  });

  // Database State
  const [db, setDb] = useState<ClusterData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filter Pill state: 'all' | 'wurm' | '7dtd' | 'avorion'
  const [filter, setFilter] = useState<string>('all');

  // Visitor Counter emulation
  const [visitorCount, setVisitorCount] = useState<number>(() => {
    const saved = localStorage.getItem('qbc_visit_total');
    return saved ? parseInt(saved, 10) : 3241;
  });

  // Radar Core Countdown timer
  const [countdown, setCountdown] = useState<number>(60);

  // Authentication Gate states
  const [passKey, setPassKey] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('qbc_admin_authenticated') === 'true';
  });
  const [authError, setAuthError] = useState<boolean>(false);

  // Admin Cockpit active editing states
  const [activeTabId, setActiveTabId] = useState<string>('global');
  const [adminSubTab, setAdminSubTab] = useState<'titres' | 'alertes' | 'styles'>('titres');
  const [editedDb, setEditedDb] = useState<ClusterData | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Notification for copy-to-clipboard feedback
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Initialize and fetch database config
  const fetchConfig = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data: ClusterData = await res.json();
        setDb(data);
        setEditedDb(JSON.parse(JSON.stringify(data))); // deep copy
      } else {
        throw new Error('Failed to load server config');
      }
    } catch (err) {
      console.warn('Backend offline or error, utilizing local backup:', err);
      // Fallback local DB backup
      const localBackup = localStorage.getItem('qbc_server_db');
      if (localBackup) {
        try {
          const parsed = JSON.parse(localBackup);
          setDb(parsed);
          setEditedDb(JSON.parse(JSON.stringify(parsed)));
        } catch (e) {
          useDefaultMockData();
        }
      } else {
        useDefaultMockData();
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const useDefaultMockData = () => {
    const defaultData: ClusterData = {
      global: {
        type: "portal",
        indexMainTitle_fr: "PORTAIL SERVEUR QBC",
        indexMainTitle_en: "QBC PORTAL",
        indexSubTitle_fr: "ACCÈS RÉSEAU UNIFIÉ",
        indexSubTitle_en: "UNIFIED NETWORK ACCESS",
        title: "Bienvenue sur le Réseau QBC",
        desc: "Bienvenue sur le Cockpit Officiel de QBC. Tout le réseau est opérationnel. Bon jeu à tous !",
        desc_en: "Welcome to the Official QBC Cockpit. The entire network is online. Have fun!",
        warn: "🚨 PORTAIL DE HAUTE DISPONIBILITÉ EN LIGNE v88.0",
        global_badge: "🚨 ",
        global_warn_text: "PORTAIL DE HAUTE DISPONIBILITÉ EN LIGNE v88.0",
        portalTheme: "standard",
        securityNoCopy: "false"
      },
      wurm1: {
        id: "wurm1",
        type: "wurm",
        game_icon: "👑 ",
        name: "Doriath (Monde Principal)",
        name_fr: "Doriath (Monde Principal)",
        name_en: "Doriath (Main World)",
        ip: "104.243.40.52:5134",
        rb: "Tous les lundis à 04:00 AM",
        badge_state: "stable",
        wn_text: "Live Map opérationnelle !",
        status: "online",
        slots: "12/40",
        votes: "45"
      },
      wurm2: {
        id: "wurm2",
        type: "wurm",
        game_icon: "👑 ",
        name: "Wurm Server 2",
        name_fr: "Wurm Server 2",
        name_en: "Wurm Server 2",
        ip: "74.50.94.238:5610",
        rb: "Chaque jour à 06:00 AM",
        badge_state: "stable",
        wn_text: "Update mineur installé",
        status: "online",
        slots: "3/250",
        votes: "10"
      },
      "7dtd1": {
        id: "7dtd1",
        type: "7dtd",
        game_icon: "🧟 ",
        name: "7 Days to Die Vanilla",
        name_fr: "7 Days to Die Vanilla",
        name_en: "7 Days to Die Vanilla",
        ip: "15.235.65.131:25593",
        rb: "Redémarrage quotidien",
        badge_state: "stable",
        wn_text: "Monde survivant",
        status: "online",
        slots: "2/16",
        votes: "5"
      },
      "7dtd2": {
        id: "7dtd2",
        type: "7dtd",
        game_icon: "💀 ",
        name: "7 Days to Die Moddé",
        name_fr: "7 Days to Die Moddé",
        name_en: "7 Days to Die Modded",
        ip: "51.222.244.134:25592",
        rb: "Mardi matin",
        badge_state: "stable",
        wn_text: "Zombies agressifs !",
        status: "online",
        slots: "2/20",
        votes: "12"
      },
      avo1: {
        id: "avo1",
        type: "avorion",
        game_icon: "🚀 ",
        name: "Avorion Space Core",
        name_fr: "Avorion Space Core",
        name_en: "Avorion Space Core",
        ip: "15.235.65.131:25598",
        rb: "Tous les matins",
        badge_state: "stable",
        wn_text: "Exploration galactique",
        status: "online",
        slots: "8/50",
        votes: "22"
      },
      avo2: {
        id: "avo2",
        type: "avorion",
        game_icon: "🌌 ",
        name: "Avorion Sector Beta",
        name_fr: "Avorion Sector Beta",
        name_en: "Avorion Sector Beta",
        ip: "51.222.244.134:25605",
        rb: "Manuel",
        badge_state: "maintenance",
        wn_text: "En cours de maintenance",
        status: "offline",
        slots: "0/50",
        votes: "3"
      }
    };
    setDb(defaultData);
    setEditedDb(JSON.parse(JSON.stringify(defaultData)));
    localStorage.setItem('qbc_server_db', JSON.stringify(defaultData));
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // Sync visitor counter emulation and core reload countdown
  useEffect(() => {
    const visitorTimer = setInterval(() => {
      setVisitorCount(prev => {
        const next = prev + Math.floor(Math.random() * 2) + 1;
        localStorage.setItem('qbc_visit_total', next.toString());
        return next;
      });
    }, 45000);

    const radarTimer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Trigger silent background config refresh when timer reaches 0
          fetchConfig(true);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(visitorTimer);
      clearInterval(radarTimer);
    };
  }, []);

  // Toggle Language Handler
  const handleToggleLanguage = (targetLang: 'fr' | 'en') => {
    setLang(targetLang);
    localStorage.setItem('qbc_global_language', targetLang);
  };

  // Authenticate user with master code
  const handleAdminAuth = () => {
    if (passKey === SECRET_KEY_MASTER) {
      sessionStorage.setItem('qbc_admin_authenticated', 'true');
      setIsAuthenticated(true);
      setAuthError(false);
      setPassKey('');
    } else {
      setAuthError(true);
    }
  };

  const handleAuthKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdminAuth();
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('qbc_admin_authenticated');
    setIsAuthenticated(false);
    setView('portal');
  };

  // Save admin cockpit modifications to database
  const handleSaveConfig = async () => {
    if (!editedDb) return;
    setSaveStatus('saving');

    // Automatically synchronize global warn field
    const globalObj = editedDb.global;
    if (globalObj) {
      const badge = globalObj.global_badge || '';
      const txt = globalObj.global_warn_text || '';
      globalObj.warn = txt.trim() !== '' ? badge + txt : '';
    }

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: SECRET_KEY_MASTER, config: editedDb })
      });

      if (res.ok) {
        setSaveStatus('success');
        setDb(JSON.parse(JSON.stringify(editedDb))); // Update frontend db state
        localStorage.setItem('qbc_server_db', JSON.stringify(editedDb)); // Backup
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        throw new Error('Save configuration failed');
      }
    } catch (err) {
      console.error(err);
      // Offline fallback: save to localStorage and update state locally
      setSaveStatus('success');
      setDb(JSON.parse(JSON.stringify(editedDb)));
      localStorage.setItem('qbc_server_db', JSON.stringify(editedDb));
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // Synchronize slot counts from active dashboards back to the cluster database
  const handleUpdateSlots = (serverId: string, playerCount: number) => {
    setDb(prev => {
      if (!prev || !prev[serverId]) return prev;
      const srv = prev[serverId];
      const maxSlots = srv.slots ? srv.slots.split('/')[1] || '20' : '20';
      const newSlots = `${playerCount}/${maxSlots}`;
      if (srv.slots === newSlots) {
        return prev;
      }
      const next = { ...prev };
      next[serverId] = { ...srv, slots: newSlots };
      localStorage.setItem('qbc_server_db', JSON.stringify(next));
      
      fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: SECRET_KEY_MASTER, config: next })
      }).catch(err => console.warn("Failed to sync slots count to server:", err));
      return next;
    });
    setEditedDb(prev => {
      if (!prev || !prev[serverId]) return prev;
      const srv = prev[serverId];
      const maxSlots = srv.slots ? srv.slots.split('/')[1] || '20' : '20';
      const newSlots = `${playerCount}/${maxSlots}`;
      if (srv.slots === newSlots) {
        return prev;
      }
      const next = { ...prev };
      next[serverId] = { ...srv, slots: newSlots };
      return next;
    });
  };

  // Add new server helper
  const handleCreateServer = () => {
    if (!editedDb) return;
    const newId = `srv_${Date.now()}`;
    const newSrv: ServerInstance = {
      id: newId,
      type: 'wurm',
      game_icon: '👑 ',
      name: 'Nouvelle Instance',
      name_fr: 'Nouvelle Instance',
      name_en: 'New Instance',
      ip: '0.0.0.0:27015',
      rb: 'Daily at 04:00',
      badge_state: 'stable',
      wn_text: '',
      status: 'online',
      slots: '0/40',
      votes: '0'
    };

    const newDb = { ...editedDb, [newId]: newSrv };
    setEditedDb(newDb);
    setActiveTabId(newId);
  };

  // Delete current server helper
  const handleDeleteServer = (id: string) => {
    if (!editedDb || id === 'global') return;
    const confirmText = lang === 'fr' ? 'Supprimer définitivement ?' : 'Delete permanently?';
    if (window.confirm(confirmText)) {
      const nextDb = { ...editedDb };
      delete nextDb[id];
      setEditedDb(nextDb);
      setActiveTabId('global');
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2500);
  };

  if (isLoading || !db) {
    return (
      <div className="min-height-screen w-full flex flex-col justify-center items-center bg-[#050302] text-white font-mono p-4">
        <div className="relative w-20 h-20 mb-6 flex justify-center items-center">
          <span className="absolute animate-ping inline-flex h-full w-full rounded-full bg-orange-500 opacity-20"></span>
          <div className="w-10 h-10 border-t-2 border-r-2 border-orange-500 rounded-full animate-spin"></div>
        </div>
        <div className="text-sm tracking-widest text-[#ff9900] uppercase font-bold animate-pulse">
          INITIALISING CLUSTER PORTAL...
        </div>
      </div>
    );
  }

  // Determine current active visual theme settings
  const portalThemeName = db.global.portalTheme || 'standard';
  const theme = THEMES[portalThemeName as keyof typeof THEMES] || THEMES.standard;

  // Render variables derived from database
  const mainTitle = lang === 'fr' 
    ? (db.global.indexMainTitle_fr || db.global.indexMainTitle || "PORTAIL QBC") 
    : (db.global.indexMainTitle_en || db.global.indexMainTitle || "QBC PORTAL");

  const subTitle = lang === 'fr' 
    ? (db.global.indexSubTitle_fr || db.global.indexSubTitle || "ACCÈS RÉSEAU") 
    : (db.global.indexSubTitle_en || db.global.indexSubTitle || "NETWORK ACCESS");

  const motdTitle = lang === 'fr' ? "📋 MESSAGE DU SYSTÈME" : "📋 SYSTEM ANNOUNCEMENT";
  const motdDesc = lang === 'fr' 
    ? (db.global.desc || "Aucun message système.") 
    : (db.global.desc_en || db.global.desc || "No system announcement.");

  const warningBannerText = db.global.warn || null;
  const isSecurityNoCopy = db.global.securityNoCopy === "true";

  // Filter server instances list
  const serverKeys = Object.keys(db).filter(key => key !== 'global');
  const serverInstances = serverKeys.map(key => {
    const srv = db[key] as ServerInstance;
    return { ...srv, id: key };
  });

  // Calculate cluster-wide totals for "total global corresponds pas dansbord web"
  const globalTotalPlayersOnline = serverInstances.reduce((sum, srv) => {
    if (srv.status === 'offline') return sum;
    const parts = srv.slots ? srv.slots.split('/') : [];
    const current = parts[0] ? parseInt(parts[0], 10) : 0;
    return sum + (isNaN(current) ? 0 : current);
  }, 0);

  const globalTotalSlotsCapacity = serverInstances.reduce((sum, srv) => {
    if (srv.status === 'offline') return sum;
    const parts = srv.slots ? srv.slots.split('/') : [];
    const max = parts[1] ? parseInt(parts[1], 10) : 40;
    return sum + (isNaN(max) ? 0 : max);
  }, 0);

  const globalActiveServersCount = serverInstances.filter(srv => srv.status === 'online').length;

  const filteredInstances = serverInstances.filter(srv => {
    if (filter === 'all') return true;
    return srv.type === filter;
  });

  return (
    <div
      style={{
        background: theme.bg,
        userSelect: isSecurityNoCopy ? 'none' : 'auto',
        WebkitUserSelect: isSecurityNoCopy ? 'none' : 'auto'
      }}
      className="min-h-screen text-[#f4eae1] font-sans transition-all duration-700 ease-in-out pb-12 overflow-x-hidden flex flex-col justify-between"
    >
      <div>
        {/* Warning Alert Banner */}
        {warningBannerText && (
          <div className="w-full bg-gradient-to-r from-red-950 via-red-600 to-red-950 border-b-2 border-red-500 py-3 px-4 text-center font-mono text-sm font-bold text-white uppercase tracking-wider shadow-lg flex items-center justify-center gap-2">
            <span className="animate-pulse">⚠️</span>
            <span>{warningBannerText}</span>
          </div>
        )}

        {/* Global Toolbar Header (Language Switching and Admin Access Button) */}
        <div className="max-w-7xl mx-auto w-full px-6 pt-4 flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => handleToggleLanguage('fr')}
              className={`font-mono text-xs font-bold px-3 py-1.5 rounded border transition-all duration-300 ${
                lang === 'fr'
                  ? 'bg-gradient-to-r from-[#ff9900] to-orange-600 text-black border-[#ff9900] font-black shadow-[0_0_10px_rgba(255,153,0,0.3)]'
                  : 'bg-black/60 text-zinc-400 border-[#ff9900]/25 hover:border-[#ff9900]/60'
              }`}
            >
              FR
            </button>
            <button
              onClick={() => handleToggleLanguage('en')}
              className={`font-mono text-xs font-bold px-3 py-1.5 rounded border transition-all duration-300 ${
                lang === 'en'
                  ? 'bg-gradient-to-r from-[#ff9900] to-orange-600 text-black border-[#ff9900] font-black shadow-[0_0_10px_rgba(255,153,0,0.3)]'
                  : 'bg-black/60 text-zinc-400 border-[#ff9900]/25 hover:border-[#ff9900]/60'
              }`}
            >
              EN
            </button>
          </div>

          <div>
            {view === 'portal' ? (
              selectedWurmServer ? (
                <button
                  onClick={() => setSelectedWurmServer(null)}
                  className="font-mono text-xs font-bold px-4 py-1.5 bg-gradient-to-r from-orange-500 to-red-600 text-black rounded transition-all duration-300 flex items-center gap-1.5"
                >
                  <span>{lang === 'fr' ? 'RETOUR ACCUEIL' : 'BACK TO PORTAL'}</span>
                </button>
              ) : (
                <button
                  onClick={() => setView('admin')}
                  className="font-mono text-xs font-bold px-4 py-1.5 bg-black/60 text-zinc-400 border border-orange-500/20 hover:border-orange-500 hover:text-orange-500 rounded transition-all duration-300 flex items-center gap-1.5"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>{lang === 'fr' ? 'COCKPIT ADMIN' : 'ADMIN COCKPIT'}</span>
                </button>
              )
            ) : (
              <button
                onClick={() => { setView('portal'); setSelectedWurmServer(null); }}
                className="font-mono text-xs font-bold px-4 py-1.5 bg-gradient-to-r from-orange-500 to-red-600 text-black rounded transition-all duration-300 flex items-center gap-1.5"
              >
                <span>{lang === 'fr' ? 'RETOUR ACCUEIL' : 'BACK TO PORTAL'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Clipboard notification toast */}
        <AnimatePresence>
          {copiedText && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-[#00ffcc] text-black font-mono text-xs font-bold px-5 py-2.5 rounded-full shadow-[0_0_20px_rgba(0,255,204,0.4)] flex items-center gap-2 border border-white/20"
            >
              <CheckCircle className="w-4 h-4 animate-bounce" />
              <span>{lang === 'fr' ? 'COPIÉ DANS LE PRESSE-PAPIER !' : 'COPIED TO CLIPBOARD!'}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Render Portal Visitor View */}
        {view === 'portal' && (
          selectedWurmServer ? (
            selectedWurmServer.type === '7dtd' ? (
              <SevenDaysDashboard
                server={db?.[selectedWurmServer.id] || selectedWurmServer}
                lang={lang}
                onClose={() => setSelectedWurmServer(null)}
                onUpdateSlots={(count) => handleUpdateSlots(selectedWurmServer.id, count)}
              />
            ) : (
              <WurmExplorer
                server={db?.[selectedWurmServer.id] || selectedWurmServer}
                lang={lang}
                onClose={() => setSelectedWurmServer(null)}
                onUpdateSlots={(count) => handleUpdateSlots(selectedWurmServer.id, count)}
              />
            )
          ) : (
            <div className="max-w-7xl mx-auto w-full px-6 mt-8 flex-1">
            {/* Header titles */}
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-mono font-black text-white tracking-widest uppercase filter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                {mainTitle}
              </h1>
              <p className="mt-2 text-xs md:text-sm font-mono text-[#ff9900] tracking-[0.25em] font-bold uppercase">
                {subTitle}
              </p>
            </div>

            {/* Résumé Global / Cluster Totals */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-4xl mx-auto font-mono text-xs">
              {/* Total players online */}
              <div className="bg-[#0f0a07]/85 border border-zinc-900 rounded-xl p-4 flex items-center gap-4 shadow-lg backdrop-blur-md">
                <div className="p-3 bg-[#ff9900]/10 border border-[#ff9900]/20 rounded-lg text-[#ff9900]">
                  <Users className="w-5 h-5 animate-pulse" />
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-zinc-500 uppercase block tracking-wider font-bold">
                    {lang === 'fr' ? 'Survivants en ligne (Global)' : 'Online Survivors (Global)'}
                  </span>
                  <span className="text-lg font-black text-white tracking-wider">
                    {globalTotalPlayersOnline} <span className="text-zinc-500 text-[10px] font-normal">/ {globalTotalSlotsCapacity} slots</span>
                  </span>
                </div>
              </div>

              {/* Active Server Instances */}
              <div className="bg-[#0f0a07]/85 border border-zinc-900 rounded-xl p-4 flex items-center gap-4 shadow-lg backdrop-blur-md">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
                  <Gamepad2 className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-zinc-500 uppercase block tracking-wider font-bold">
                    {lang === 'fr' ? 'Serveurs Actifs' : 'Active Servers'}
                  </span>
                  <span className="text-lg font-black text-emerald-400 tracking-wider">
                    {globalActiveServersCount} <span className="text-zinc-500 text-[10px] font-normal">/ {serverInstances.length} {lang === 'fr' ? 'en ligne' : 'online'}</span>
                  </span>
                </div>
              </div>

              {/* Network Security */}
              <div className="bg-[#0f0a07]/85 border border-zinc-900 rounded-xl p-4 flex items-center gap-4 shadow-lg backdrop-blur-md">
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-zinc-500 uppercase block tracking-wider font-bold">
                    {lang === 'fr' ? 'Statut Réseau' : 'Cluster Status'}
                  </span>
                  <span className="text-lg font-black text-cyan-400 tracking-wider uppercase">
                    STABLE
                  </span>
                </div>
              </div>
            </div>

            {/* Message of the day panel (MOTD) */}
            {motdDesc && (
              <div className="bg-black/45 border-l-4 border-[#ff9900] border border-orange-500/10 rounded-r-lg max-w-4xl mx-auto p-5 text-left backdrop-blur-md mb-8 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
                <h3 className="text-white font-mono text-sm font-bold tracking-wider mb-2 uppercase flex items-center gap-2">
                  <span className="text-[#ff9900] animate-pulse">📢</span>
                  {motdTitle}
                </h3>
                <p className="text-sm text-zinc-300 leading-relaxed font-sans font-medium">
                  {motdDesc}
                </p>
              </div>
            )}

            {/* Filter pills box */}
            <div className="flex flex-wrap justify-center gap-2 mb-10 max-w-2xl mx-auto bg-black/35 p-2 rounded-lg border border-orange-500/10 backdrop-blur">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded transition-all duration-300 ${
                  filter === 'all'
                    ? theme.activePill
                    : 'text-zinc-400 hover:text-white bg-black/20 hover:bg-black/50 border border-transparent'
                }`}
              >
                {lang === 'fr' ? 'TOUTES LES INSTANCES' : 'ALL INSTANCES'}
              </button>
              <button
                onClick={() => setFilter('wurm')}
                className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded transition-all duration-300 ${
                  filter === 'wurm'
                    ? theme.activePill
                    : 'text-zinc-400 hover:text-white bg-black/20 hover:bg-black/50 border border-transparent'
                }`}
              >
                Wurm Unlimited
              </button>
              <button
                onClick={() => setFilter('7dtd')}
                className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded transition-all duration-300 ${
                  filter === '7dtd'
                    ? theme.activePill
                    : 'text-zinc-400 hover:text-white bg-black/20 hover:bg-black/50 border border-transparent'
                }`}
              >
                7 Days to Die
              </button>
              <button
                onClick={() => setFilter('avorion')}
                className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded transition-all duration-300 ${
                  filter === 'avorion'
                    ? theme.activePill
                    : 'text-zinc-400 hover:text-white bg-black/20 hover:bg-black/50 border border-transparent'
                }`}
              >
                Avorion
              </button>
            </div>

            {/* Grid of server cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
              {filteredInstances.length > 0 ? (
                filteredInstances.map((srv) => {
                  const nameText = lang === 'fr' ? (srv.name_fr || srv.name) : (srv.name_en || srv.name);
                  const isWurm = srv.type === 'wurm';
                  const topSiteId = isWurm && srv.id === 'wurm1' ? '14502' : isWurm && srv.id === 'wurm2' ? '13208' : null;
                  const isMaintenance = srv.badge_state === 'maintenance';
                  const isOffline = srv.status === 'offline' || isMaintenance;

                  return (
                    <motion.div
                      key={srv.id}
                      layout
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-6 rounded-xl border flex flex-col justify-between transition-all duration-300 backdrop-blur-md shadow-xl ${theme.cardBg} ${theme.glow}`}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-left">
                        {/* Left split node */}
                        <div className="md:col-span-3 flex flex-col justify-between h-full">
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-xl filter drop-shadow">{srv.game_icon}</span>
                              <h3 className="text-lg font-mono font-extrabold text-white leading-tight">
                                {nameText || srv.id.toUpperCase()}
                              </h3>
                            </div>

                            {srv.type === '7dtd' && srv.worldDay && (
                              <div className="mb-3 inline-flex flex-wrap items-center gap-2">
                                <span className="bg-zinc-900 border border-zinc-800 text-[#00ffcc] font-mono text-[10px] font-bold px-2 py-0.5 rounded shadow">
                                  📆 {lang === 'fr' ? 'Jour' : 'Day'} {srv.worldDay}
                                </span>
                                {srv.worldDay % 7 === 0 ? (
                                  <span className="bg-red-950/50 border border-red-500/40 text-red-400 font-mono text-[10px] font-black px-2 py-0.5 rounded animate-pulse shadow">
                                    💀 BLOOD MOON TONIGHT
                                  </span>
                                ) : (
                                  <span className="bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-[10px] font-medium px-2 py-0.5 rounded shadow">
                                    🔴 Blood Moon: {lang === 'fr' ? 'Jour' : 'Day'} {Math.ceil(srv.worldDay / 7) * 7} ({Math.ceil(srv.worldDay / 7) * 7 - srv.worldDay}j {lang === 'fr' ? 'restants' : 'remaining'})
                                  </span>
                                )}
                              </div>
                            )}
                            <p className="text-sm text-zinc-400 font-sans font-medium line-clamp-2 min-h-10 mb-4 leading-relaxed">
                              {srv.wn_text || (lang === 'fr' ? 'Aucune note de mise à jour' : 'No update logs available')}
                            </p>

                            {/* Live status banner for Wurm servers */}
                            {topSiteId && !isOffline && (
                              <a
                                href={`https://wurm-unlimited.com/server/${topSiteId}/`}
                                target="_blank"
                                rel="noreferrer"
                                referrerPolicy="no-referrer"
                                className="block mb-4 group overflow-hidden rounded-md border border-orange-500/20 hover:border-orange-500/50 bg-black max-w-[280px] h-[45px] shadow-lg transition-colors"
                              >
                                <img
                                  src={`https://wurm-unlimited.com/server/${topSiteId}/banners/regular-banner-1.png?t=${Date.now()}`}
                                  alt="Live Wurm Server Banner"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </a>
                            )}
                          </div>

                          <button
                            onClick={() => copyToClipboard(`connect ${srv.ip}`)}
                            className="inline-flex items-center gap-1.5 bg-black/60 text-[#00ffcc] hover:text-cyan-300 hover:bg-black font-mono text-xs font-bold px-3 py-2 rounded-md border border-zinc-800 hover:border-[#00ffcc]/40 transition-all duration-200 cursor-pointer w-fit"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>🔗 connect {srv.ip}</span>
                          </button>
                        </div>

                        {/* Right split node */}
                        <div className="md:col-span-2 flex flex-col justify-between items-end border-t md:border-t-0 md:border-l border-dashed border-zinc-700/60 pt-4 md:pt-0 md:pl-4">
                          <div className="flex flex-col items-end gap-1.5 w-full">
                            {/* Led Indicator */}
                            <div className="flex items-center gap-2 font-mono text-xs font-bold">
                              <span
                                className={`w-2.5 h-2.5 rounded-full inline-block animate-pulse shadow-lg ${
                                  isOffline ? 'bg-red-500 shadow-red-500/50' : 'bg-emerald-400 shadow-emerald-400/50'
                                }`}
                              ></span>
                              <span style={{ color: isOffline ? '#ef4444' : '#00ffcc' }} className="uppercase">
                                {isMaintenance
                                  ? (lang === 'fr' ? 'MAINTENANCE' : 'MAINTENANCE')
                                  : isOffline
                                  ? (lang === 'fr' ? 'HORS LIGNE' : 'OFFLINE')
                                  : (lang === 'fr' ? 'EN LIGNE' : 'ONLINE')}
                              </span>
                            </div>

                            {/* Player Slots */}
                            <div className="font-mono text-xs text-[#ff9900] font-black">
                              SLOTS: {isOffline ? '0' : srv.slots.split('/')[0] || '0'} / {srv.slots.split('/')[1] || srv.slots || '40'}
                            </div>

                            {/* Badge state */}
                            <div
                              style={{
                                backgroundColor: isOffline ? 'rgba(239,68,68,0.1)' : 'rgba(0,255,204,0.1)',
                                color: isOffline ? '#ef4444' : '#00ffcc',
                                border: isOffline ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(0,255,204,0.2)'
                              }}
                              className="px-2.5 py-0.5 rounded text-[10px] font-mono font-black uppercase tracking-wider"
                            >
                              {(srv.badge_state || srv.type || 'stable').toUpperCase()}
                            </div>

                            {/* Reboot cycle */}
                            <div className="text-[10px] font-mono text-zinc-500 text-right mt-1">
                              🔄 {srv.rb}
                            </div>
                          </div>

                          <div className="w-full mt-4">
                            <button
                              onClick={() => setSelectedWurmServer(srv)}
                              className="flex items-center justify-center gap-1 bg-[#140e0a] hover:bg-white text-white hover:text-[#050302] border border-white/10 hover:border-white w-full py-2 rounded font-mono text-xs font-extrabold uppercase transition-all duration-300 tracking-wider shadow-md cursor-pointer"
                            >
                              <span>{lang === 'fr' ? 'EXPLORER INSTANCE' : 'EXPLORE INSTANCE'}</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="col-span-full bg-black/20 border border-dashed border-zinc-800 rounded-xl p-12 text-center text-zinc-500 font-mono text-sm">
                  {lang === 'fr' ? 'Aucune instance serveur active.' : 'No active server instances found.'}
                </div>
              )}
            </div>
          </div>
          )
        )}

        {/* Render Admin Gate & Workspace view */}
        {view === 'admin' && (
          <div className="max-w-7xl mx-auto w-full px-6 mt-8">
            {!isAuthenticated ? (
              /* Administrative Password Authenticator Gate */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md mx-auto bg-[#0f0a07] border border-[#ff9900] rounded-xl p-8 shadow-[0_0_40px_rgba(255,153,0,0.15)] text-center mt-12"
              >
                <div className="w-12 h-12 bg-orange-500/10 border border-orange-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-5 h-5 text-orange-500" />
                </div>
                <h2 className="text-xl font-mono font-black text-white uppercase tracking-wider mb-2">
                  🔓 {lang === 'fr' ? "ACCÈS INFRASTRUCTURE QBC" : "QBC INFRASTRUCTURE ACCESS"}
                </h2>
                <p className="text-xs text-zinc-400 font-mono uppercase tracking-wider mb-6">
                  {lang === 'fr' ? "Déverrouillage requis" : "Passcode Unlocking Required"}
                </p>

                <div className="mb-6 text-left">
                  <label className="block text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider mb-2">
                    {lang === 'fr' ? "Clé d'accès Administrateur :" : "Administrator Access Key :"}
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passKey}
                      onChange={(e) => setPassKey(e.target.value)}
                      onKeyDown={handleAuthKeyPress}
                      placeholder="••••••••••••"
                      className="w-full bg-[#050302] border border-zinc-800 focus:border-orange-500 rounded px-4 py-3 text-sm font-mono text-white placeholder-zinc-700 outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute right-4 text-zinc-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {authError && (
                    <p className="mt-2 text-xs font-mono font-bold text-red-500 uppercase flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{lang === 'fr' ? "⚠️ CLÉ ERRONÉE - ACCÈS REJETÉ" : "⚠️ WRONG KEY - ACCESS DENIED"}</span>
                    </p>
                  )}
                </div>

                <button
                  onClick={handleAdminAuth}
                  className="w-full bg-gradient-to-r from-[#ff9900] to-orange-600 hover:from-orange-500 hover:to-orange-700 text-black font-mono text-xs font-black py-3 px-6 rounded uppercase tracking-widest transition-all duration-300 shadow-lg hover:shadow-orange-500/20"
                >
                  {lang === 'fr' ? "Déverrouiller le Cockpit" : "Unlock Cockpit Workspace"}
                </button>
              </motion.div>
            ) : (
              /* Administrative Dynamic Workspace */
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-[#0f0a07] border border-[#ff9900] rounded-xl p-6 md:p-8 shadow-[0_0_40px_rgba(255,153,0,0.15)] text-left"
              >
                {/* Title and Top Panel */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-orange-500/20 pb-6 mb-6">
                  <div>
                    <h2 className="text-2xl font-mono font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <span>👑</span>
                      <span>QBC MATRIX</span>
                    </h2>
                    <p className="text-xs text-orange-500 font-mono font-bold uppercase tracking-widest mt-1">
                      {lang === 'fr' ? "Portail d'Administration Réseau" : "Network Management Portal"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2.5 mt-4 md:mt-0 items-center">
                    <button
                      onClick={handleSaveConfig}
                      disabled={saveStatus === 'saving'}
                      className="bg-[#00ffcc] hover:bg-cyan-400 text-black font-mono text-xs font-black px-4 py-2 rounded uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 shadow-md shadow-cyan-500/10"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{saveStatus === 'saving' ? (lang === 'fr' ? 'SAUVEGARDE...' : 'SAVING...') : (lang === 'fr' ? 'SAUVEGARDER' : 'SAVE CONFIG')}</span>
                    </button>
                    <button
                      onClick={handleAdminLogout}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs font-bold px-4 py-2 rounded border border-zinc-700 transition-all duration-300 uppercase tracking-wider"
                    >
                      {lang === 'fr' ? "Déconnexion" : "Logout"}
                    </button>
                    {saveStatus === 'success' && (
                      <span className="text-[#00ffcc] font-mono text-xs font-bold animate-pulse flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        <span>OK</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Sub-Header Banner */}
                <div className="bg-black/80 border border-orange-500/10 p-4 rounded-lg mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="font-mono text-sm font-black text-[#00ffcc] uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00ffcc] inline-block animate-ping"></span>
                    <span>
                      {activeTabId === 'global'
                        ? (lang === 'fr' ? '⚙️ Configuration Générale du Portail' : '⚙️ General Portal Settings')
                        : `⚙️ Configuration: ${
                            editedDb?.[activeTabId] && 'name' in editedDb[activeTabId]
                              ? (editedDb[activeTabId] as ServerInstance).name
                              : activeTabId
                          }`}
                    </span>
                  </div>
                </div>

                {/* Cockpit Workspace Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  {/* Sidebar select list */}
                  <div className="lg:col-span-1 flex flex-col gap-3.5">
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => setActiveTabId('global')}
                        className={`w-full text-left font-mono text-xs font-extrabold p-3 rounded border transition-all duration-300 ${
                          activeTabId === 'global'
                            ? 'bg-[#ff9900] text-black border-[#ff9900] shadow-[0_0_10px_rgba(255,153,0,0.25)]'
                            : 'bg-zinc-950 text-zinc-400 border-zinc-800/60 hover:border-[#ff9900]/40'
                        }`}
                      >
                        ⚙️ {lang === 'fr' ? 'CONFIGURATION PORTAIL' : 'PORTAL CONFIG'}
                      </button>

                      {editedDb &&
                        Object.keys(editedDb)
                          .filter(key => key !== 'global')
                          .map(key => {
                            const srv = editedDb[key] as ServerInstance;
                            const cleanName = srv.name.replace(/[☣️💀🌌🚀☄️🚨⚠️⚙️👑⚔️🧟]/g, '').trim();
                            return (
                              <button
                                key={key}
                                onClick={() => setActiveTabId(key)}
                                className={`w-full text-left font-mono text-xs font-extrabold p-3 rounded border transition-all duration-300 flex justify-between items-center ${
                                  activeTabId === key
                                    ? 'bg-[#ff9900] text-black border-[#ff9900] shadow-[0_0_10px_rgba(255,153,0,0.25)]'
                                    : 'bg-zinc-950 text-zinc-400 border-zinc-800/60 hover:border-[#ff9900]/40'
                                }`}
                              >
                                <span className="truncate">{cleanName || key.toUpperCase()}</span>
                                <span className="text-[10px] font-mono opacity-80 uppercase px-1.5 py-0.5 bg-black/40 rounded border border-white/5 ml-1 flex-shrink-0">
                                  {srv.type}
                                </span>
                              </button>
                            );
                          })}
                    </div>

                    <button
                      onClick={handleCreateServer}
                      className="w-full bg-[#00ffcc] hover:bg-cyan-400 text-black font-mono text-xs font-black py-3 rounded border border-transparent transition-all duration-300 uppercase tracking-widest flex items-center justify-center gap-1 shadow-md shadow-cyan-500/10"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{lang === 'fr' ? 'CRÉER UNE INSTANCE' : 'CREATE INSTANCE'}</span>
                    </button>
                  </div>

                  {/* Main editing pane */}
                  <div className="lg:col-span-3 bg-black/90 border border-zinc-800/60 rounded-xl p-6 md:p-8">
                    {editedDb && activeTabId === 'global' && (
                      /* Global Settings Panel */
                      <div className="flex flex-col gap-6">
                        {/* Subtabs titles / alertes / style */}
                        <div className="flex gap-2 border-b border-zinc-800/60 pb-4">
                          <button
                            onClick={() => setAdminSubTab('titres')}
                            className={`flex-1 font-mono text-xs font-black py-2.5 rounded border transition-all duration-300 uppercase tracking-wider ${
                              adminSubTab === 'titres'
                                ? 'bg-[#ff9900] text-black border-[#ff9900]'
                                : 'bg-zinc-950 text-zinc-400 border-zinc-800/50 hover:border-[#ff9900]/40'
                            }`}
                          >
                            📝 {lang === 'fr' ? 'Titres' : 'Titles'}
                          </button>
                          <button
                            onClick={() => setAdminSubTab('alertes')}
                            className={`flex-1 font-mono text-xs font-black py-2.5 rounded border transition-all duration-300 uppercase tracking-wider ${
                              adminSubTab === 'alertes'
                                ? 'bg-red-600 text-white border-red-600'
                                : 'bg-zinc-950 text-zinc-400 border-zinc-800/50 hover:border-red-600/40'
                            }`}
                          >
                            🚨 {lang === 'fr' ? 'Alertes' : 'Alerts'}
                          </button>
                          <button
                            onClick={() => setAdminSubTab('styles')}
                            className={`flex-1 font-mono text-xs font-black py-2.5 rounded border transition-all duration-300 uppercase tracking-wider ${
                              adminSubTab === 'styles'
                                ? 'bg-[#00ffcc] text-black border-[#00ffcc]'
                                : 'bg-zinc-950 text-zinc-400 border-zinc-800/50 hover:border-[#00ffcc]/40'
                            }`}
                          >
                            🎨 {lang === 'fr' ? 'Thèmes' : 'Themes'}
                          </button>
                        </div>

                        {/* Subtab contents zone */}
                        {adminSubTab === 'titres' && (
                          <div className="flex flex-col gap-5">
                            <div className="flex flex-col gap-2">
                              <label className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
                                {lang === 'fr' ? 'Grand Titre Français :' : 'Main Title (FR) :'}
                              </label>
                              <input
                                type="text"
                                value={editedDb.global.indexMainTitle_fr || ''}
                                onChange={(e) => {
                                  const next = { ...editedDb };
                                  next.global.indexMainTitle_fr = e.target.value;
                                  setEditedDb(next);
                                }}
                                className="w-full bg-[#0f0a07] border border-zinc-800 focus:border-[#ff9900] rounded p-3 text-sm font-mono text-white outline-none"
                              />
                            </div>

                            <div className="flex flex-col gap-2">
                              <label className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
                                {lang === 'fr' ? 'Grand Titre Anglais :' : 'Main Title (EN) :'}
                              </label>
                              <input
                                type="text"
                                value={editedDb.global.indexMainTitle_en || ''}
                                onChange={(e) => {
                                  const next = { ...editedDb };
                                  next.global.indexMainTitle_en = e.target.value;
                                  setEditedDb(next);
                                }}
                                className="w-full bg-[#0f0a07] border border-zinc-800 focus:border-[#ff9900] rounded p-3 text-sm font-mono text-white outline-none"
                              />
                            </div>

                            <div className="flex flex-col gap-2">
                              <label className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
                                {lang === 'fr' ? 'Sous-Titre Français :' : 'Sub-Title (FR) :'}
                              </label>
                              <input
                                type="text"
                                value={editedDb.global.indexSubTitle_fr || ''}
                                onChange={(e) => {
                                  const next = { ...editedDb };
                                  next.global.indexSubTitle_fr = e.target.value;
                                  setEditedDb(next);
                                }}
                                className="w-full bg-[#0f0a07] border border-zinc-800 focus:border-[#ff9900] rounded p-3 text-sm font-mono text-white outline-none"
                              />
                            </div>

                            <div className="flex flex-col gap-2">
                              <label className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
                                {lang === 'fr' ? 'Sous-Titre Anglais :' : 'Sub-Title (EN) :'}
                              </label>
                              <input
                                type="text"
                                value={editedDb.global.indexSubTitle_en || ''}
                                onChange={(e) => {
                                  const next = { ...editedDb };
                                  next.global.indexSubTitle_en = e.target.value;
                                  setEditedDb(next);
                                }}
                                className="w-full bg-[#0f0a07] border border-zinc-800 focus:border-[#ff9900] rounded p-3 text-sm font-mono text-white outline-none"
                              />
                            </div>

                            <div className="flex flex-col gap-2">
                              <label className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
                                {lang === 'fr' ? 'Titre Message Bienvenue (MOTD) :' : 'Welcome Box Title (MOTD) :'}
                              </label>
                              <input
                                type="text"
                                value={editedDb.global.title || ''}
                                onChange={(e) => {
                                  const next = { ...editedDb };
                                  next.global.title = e.target.value;
                                  setEditedDb(next);
                                }}
                                className="w-full bg-[#0f0a07] border border-zinc-800 focus:border-[#ff9900] rounded p-3 text-sm font-mono text-white outline-none"
                              />
                            </div>

                            <div className="flex flex-col gap-2">
                              <label className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
                                {lang === 'fr' ? 'Corps Texte Bienvenue Français :' : 'Welcome Box Body (FR) :'}
                              </label>
                              <textarea
                                rows={3}
                                value={editedDb.global.desc || ''}
                                onChange={(e) => {
                                  const next = { ...editedDb };
                                  next.global.desc = e.target.value;
                                  setEditedDb(next);
                                }}
                                className="w-full bg-[#0f0a07] border border-zinc-800 focus:border-[#ff9900] rounded p-3 text-sm font-mono text-white outline-none"
                              />
                            </div>

                            <div className="flex flex-col gap-2">
                              <label className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
                                {lang === 'fr' ? 'Corps Texte Bienvenue Anglais :' : 'Welcome Box Body (EN) :'}
                              </label>
                              <textarea
                                rows={3}
                                value={editedDb.global.desc_en || ''}
                                onChange={(e) => {
                                  const next = { ...editedDb };
                                  next.global.desc_en = e.target.value;
                                  setEditedDb(next);
                                }}
                                className="w-full bg-[#0f0a07] border border-zinc-800 focus:border-[#ff9900] rounded p-3 text-sm font-mono text-white outline-none"
                              />
                            </div>

                            <div className="flex flex-col gap-2">
                              <label className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
                                {lang === 'fr' ? '🔐 Sécurité Anti-Copie (true/false) :' : '🔐 Security Anti-Copy (true/false) :'}
                              </label>
                              <select
                                value={editedDb.global.securityNoCopy || 'false'}
                                onChange={(e) => {
                                  const next = { ...editedDb };
                                  next.global.securityNoCopy = e.target.value;
                                  setEditedDb(next);
                                }}
                                className="w-full bg-[#0f0a07] border border-zinc-800 focus:border-[#ff9900] rounded p-3 text-sm font-mono text-white outline-none"
                              >
                                <option value="false">FALSE - {lang === 'fr' ? 'Sélection libre' : 'Normal selection'}</option>
                                <option value="true">TRUE - {lang === 'fr' ? 'Anti-copie actif' : 'Lock browser copy'}</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {adminSubTab === 'alertes' && (
                          <div className="border border-dashed border-red-600/30 rounded-lg p-5 flex flex-col gap-5 bg-red-950/5">
                            <div className="flex flex-col gap-2">
                              <label className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
                                {lang === 'fr' ? '🚨 Icône Alerte :' : '🚨 Alert Icon :'}
                              </label>
                              <select
                                value={editedDb.global.global_badge || ''}
                                onChange={(e) => {
                                  const next = { ...editedDb };
                                  next.global.global_badge = e.target.value;
                                  setEditedDb(next);
                                }}
                                className="w-full bg-[#0f0a07] border border-zinc-800 focus:border-red-600 rounded p-3 text-sm font-mono text-white outline-none"
                              >
                                <option value="🚨 ">🚨 Flash Rouge</option>
                                <option value="⚠️ ">⚠️ Attention Orange</option>
                                <option value="">❌ Désactiver / Disable</option>
                              </select>
                            </div>

                            <div className="flex flex-col gap-2">
                              <label className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
                                {lang === 'fr' ? '📝 Texte du Bandeau d\'Urgence :' : '📝 Emergency Ribbon Text :'}
                              </label>
                              <input
                                type="text"
                                value={editedDb.global.global_warn_text || ''}
                                onChange={(e) => {
                                  const next = { ...editedDb };
                                  next.global.global_warn_text = e.target.value;
                                  setEditedDb(next);
                                }}
                                className="w-full bg-[#0f0a07] border border-zinc-800 focus:border-red-600 rounded p-3 text-sm font-mono text-white outline-none"
                              />
                            </div>
                          </div>
                        )}

                        {adminSubTab === 'styles' && (
                          <div className="flex flex-col gap-5">
                            <div className="flex flex-col gap-2">
                              <label className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
                                {lang === 'fr' ? '🎨 Ambiance Visuelle Portail :' : '🎨 Portal Visual Atmosphere :'}
                              </label>
                              <select
                                value={editedDb.global.portalTheme || 'standard'}
                                onChange={(e) => {
                                  const next = { ...editedDb };
                                  next.global.portalTheme = e.target.value as any;
                                  setEditedDb(next);
                                }}
                                className="w-full bg-[#0f0a07] border border-zinc-800 focus:border-[#00ffcc] rounded p-3 text-sm font-mono text-white outline-none"
                              >
                                <option value="standard">🌌 Standard d'Origine (Slate & Gold)</option>
                                <option value="noel">🎄 Noël Féerique (Deep Pine Green & Holly Red)</option>
                                <option value="halloween">🎃 Halloween Horreur (Misty Purple & Spooky Orange)</option>
                                <option value="paques">🥚 Pâques Printemps (Soft Grass Green & Buttercup)</option>
                                <option value="cyberpunk">🌆 Ambiance Cyberpunk (Neon Cyan & Electric Magenta)</option>
                                <option value="apocalypse">🔥 Fin des Temps (Ash & Burning Lava Crimson)</option>
                                <option value="space">🚀 Vide Spatial (Deep Cosmic Blue & Starry Purple)</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {editedDb && activeTabId !== 'global' && editedDb[activeTabId] && (
                      /* Server Instance Editing Form */
                      <div className="flex flex-col gap-5 text-left">
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
                            🎮 {lang === 'fr' ? 'Catégorie Multi-Filtre :' : 'Multi-Filter Category :'}
                          </label>
                          <select
                            value={(editedDb[activeTabId] as ServerInstance).type || 'wurm'}
                            onChange={(e) => {
                              const next = { ...editedDb };
                              (next[activeTabId] as ServerInstance).type = e.target.value as any;
                              setEditedDb(next);
                            }}
                            className="w-full bg-[#0f0a07] border border-zinc-800 focus:border-orange-500 rounded p-3 text-sm font-mono text-white outline-none"
                          >
                            <option value="wurm">WURM UNLIMITED</option>
                            <option value="7dtd">7 DAYS TO DIE</option>
                            <option value="avorion">AVORION</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-2 border border-dashed border-cyan-500/20 p-4 rounded-lg bg-cyan-950/5">
                          <label className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <Activity className="w-3.5 h-3.5 text-cyan-400" />
                            <span>🎭 {lang === 'fr' ? 'Icône Décorative du Titre :' : 'Decorative Title Icon :'}</span>
                          </label>
                          <select
                            value={(editedDb[activeTabId] as ServerInstance).game_icon || ''}
                            onChange={(e) => {
                              const next = { ...editedDb };
                              (next[activeTabId] as ServerInstance).game_icon = e.target.value;
                              setEditedDb(next);
                            }}
                            className="w-full bg-[#0f0a07] border border-zinc-800 focus:border-cyan-400 rounded p-3 text-sm font-mono text-white outline-none"
                          >
                            <option value="👑 ">👑 Couronne Royale</option>
                            <option value="⚔️ ">⚔️ Épées de Combat</option>
                            <option value="🧟 ">🧟 Zombie Infecté</option>
                            <option value="💀 ">💀 Crâne de Mort PvP</option>
                            <option value="🚀 ">🚀 Fusée Spatiale</option>
                            <option value="🌌 ">🌌 Galaxie / Cosmos</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-2 border border-dashed border-cyan-500/20 p-4 rounded-lg bg-cyan-950/5">
                          <label className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                            🏷️ {lang === 'fr' ? "Sélectionner le Badge d'État Visuel :" : "Visual State Indicator Badge :"}
                          </label>
                          <select
                            value={(editedDb[activeTabId] as ServerInstance).badge_state || 'stable'}
                            onChange={(e) => {
                              const next = { ...editedDb };
                              (next[activeTabId] as ServerInstance).badge_state = e.target.value as any;
                              setEditedDb(next);
                            }}
                            className="w-full bg-[#0f0a07] border border-zinc-800 focus:border-cyan-400 rounded p-3 text-sm font-mono text-white outline-none"
                          >
                            <option value="stable">🟢 NODE STABLE</option>
                            <option value="urgent">🚨 CRITICAL WARNING</option>
                            <option value="maintenance">🛠️ MAINTENANCE PLANIFIÉE</option>
                            <option value="pack">📦 PACK AJOURNÉ</option>
                            <option value="sync">📡 SYNC EN COURS</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
                            🟢 {lang === 'fr' ? "Statut Énergie :" : "Power Status :"}
                          </label>
                          <select
                            value={(editedDb[activeTabId] as ServerInstance).status || 'online'}
                            onChange={(e) => {
                              const next = { ...editedDb };
                              (next[activeTabId] as ServerInstance).status = e.target.value as any;
                              setEditedDb(next);
                            }}
                            className="w-full bg-[#0f0a07] border border-zinc-800 focus:border-orange-500 rounded p-3 text-sm font-mono text-white outline-none"
                          >
                            <option value="online">🟩 EN LIGNE / ONLINE</option>
                            <option value="offline">🟥 COUPÉ / OFFLINE</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
                            👥 {lang === 'fr' ? 'Capacité Joueurs :' : 'Player Capacity :'}
                          </label>
                          <input
                            type="text"
                            value={(editedDb[activeTabId] as ServerInstance).slots || '0/40'}
                            onChange={(e) => {
                              const next = { ...editedDb };
                              let raw = e.target.value.trim();
                              if (raw !== "" && !raw.includes('/')) {
                                (next[activeTabId] as ServerInstance).slots = "0/" + raw;
                              } else {
                                (next[activeTabId] as ServerInstance).slots = raw;
                              }
                              setEditedDb(next);
                            }}
                            className="w-full bg-[#0f0a07] border border-zinc-800 focus:border-orange-500 rounded p-3 text-sm font-mono text-white outline-none"
                            placeholder="e.g. 12/40"
                          />
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
                            🔥 {lang === 'fr' ? 'Compteur de Votes :' : 'Votes Counter :'}
                          </label>
                          <input
                            type="text"
                            value={(editedDb[activeTabId] as ServerInstance).votes || '0'}
                            onChange={(e) => {
                              const next = { ...editedDb };
                              (next[activeTabId] as ServerInstance).votes = e.target.value;
                              setEditedDb(next);
                            }}
                            className="w-full bg-[#0f0a07] border border-zinc-800 focus:border-orange-500 rounded p-3 text-sm font-mono text-white outline-none"
                          />
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
                            {lang === 'fr' ? "Nom de l'Instance Français :" : "Instance Name (FR) :"}
                          </label>
                          <input
                            type="text"
                            value={(editedDb[activeTabId] as ServerInstance).name_fr || (editedDb[activeTabId] as ServerInstance).name || ''}
                            onChange={(e) => {
                              const next = { ...editedDb };
                              (next[activeTabId] as ServerInstance).name_fr = e.target.value;
                              setEditedDb(next);
                            }}
                            className="w-full bg-[#0f0a07] border border-zinc-800 focus:border-orange-500 rounded p-3 text-sm font-mono text-white outline-none"
                          />
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
                            {lang === 'fr' ? "Nom de l'Instance Anglais :" : "Instance Name (EN) :"}
                          </label>
                          <input
                            type="text"
                            value={(editedDb[activeTabId] as ServerInstance).name_en || (editedDb[activeTabId] as ServerInstance).name || ''}
                            onChange={(e) => {
                              const next = { ...editedDb };
                              (next[activeTabId] as ServerInstance).name_en = e.target.value;
                              setEditedDb(next);
                            }}
                            className="w-full bg-[#0f0a07] border border-zinc-800 focus:border-orange-500 rounded p-3 text-sm font-mono text-white outline-none"
                          />
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
                            {lang === 'fr' ? 'Adresse Réseau (IP:Port) :' : 'Network Address (IP:Port) :'}
                          </label>
                          <input
                            type="text"
                            value={(editedDb[activeTabId] as ServerInstance).ip || ''}
                            onChange={(e) => {
                              const next = { ...editedDb };
                              (next[activeTabId] as ServerInstance).ip = e.target.value;
                              setEditedDb(next);
                            }}
                            className="w-full bg-[#0f0a07] border border-zinc-800 focus:border-orange-500 rounded p-3 text-sm font-mono text-white outline-none"
                          />
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
                            {lang === 'fr' ? 'Cycle de Reboot :' : 'Reboot Cycle :'}
                          </label>
                          <input
                            type="text"
                            value={(editedDb[activeTabId] as ServerInstance).rb || ''}
                            onChange={(e) => {
                              const next = { ...editedDb };
                              (next[activeTabId] as ServerInstance).rb = e.target.value;
                              setEditedDb(next);
                            }}
                            className="w-full bg-[#0f0a07] border border-zinc-800 focus:border-orange-500 rounded p-3 text-sm font-mono text-white outline-none"
                          />
                        </div>

                        <div className="flex flex-col gap-2 border border-dashed border-cyan-500/10 p-4 rounded bg-cyan-950/5">
                          <label className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                            📣 {lang === 'fr' ? "Note Spécifique / Message d'Update du Serveur :" : "Specific Update Log / Warning Notes :"}
                          </label>
                          <input
                            type="text"
                            value={(editedDb[activeTabId] as ServerInstance).wn_text || ''}
                            onChange={(e) => {
                              const next = { ...editedDb };
                              (next[activeTabId] as ServerInstance).wn_text = e.target.value;
                              setEditedDb(next);
                            }}
                            className="w-full bg-[#0f0a07] border border-zinc-800 focus:border-orange-500 rounded p-3 text-sm font-mono text-white outline-none"
                          />
                        </div>

                        {/* Node Footer Deletion Button */}
                        <div className="mt-8 border-t border-dashed border-zinc-800/80 pt-6 flex justify-between items-center">
                          <button
                            onClick={() => handleDeleteServer(activeTabId)}
                            className="bg-red-600/10 hover:bg-red-600 border border-red-500/20 hover:border-transparent text-red-500 hover:text-white font-mono text-xs font-black py-2.5 px-4 rounded uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{lang === 'fr' ? "Supprimer l'Instance" : "Delete Instance"}</span>
                          </button>

                          <button
                            onClick={handleSaveConfig}
                            className="bg-[#00ffcc] hover:bg-cyan-400 text-black font-mono text-xs font-black py-2.5 px-6 rounded uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 shadow-md shadow-cyan-500/10 cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>{lang === 'fr' ? 'Enregistrer les Modifications' : 'Enregister changes'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Footer statistics and system logs */}
      <div className="max-w-7xl mx-auto w-full px-6 mt-16 pt-6 border-t border-dashed border-zinc-800/80 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono text-zinc-500">
        <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider">
          <Users className="w-4 h-4 animate-pulse text-cyan-400" />
          <span>👥 {lang === 'fr' ? 'UTILISATEURS EN DIRECT' : 'LIVE VISITORS'}: {visitorCount}</span>
        </div>

        <div className="text-orange-500 font-bold tracking-widest uppercase">
          ✦ MATRIX SECURE CONDUIT ✦
        </div>

        <div className="flex items-center gap-2 text-[#ff9900] font-bold uppercase tracking-wider">
          <Clock className="w-4 h-4 text-[#ff9900] animate-spin" style={{ animationDuration: '4s' }} />
          <span>📡 {lang === 'fr' ? 'RADAR SYNC' : 'RADAR CORE'}: {countdown}S</span>
        </div>
      </div>
    </div>
  );
}
