import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import {
  Skull,
  Shield,
  Users,
  Clock,
  MapPin,
  Map,
  Download,
  ExternalLink,
  BookOpen,
  Sun,
  Moon,
  Activity,
  Compass,
  Radio,
  Calendar,
  AlertTriangle,
  Flame,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  Tv,
  Eye,
  FileCode,
  ThumbsUp,
  Lock,
  Unlock,
  Trash2,
  Plus,
  Search,
  Settings,
  AlertCircle,
  Terminal,
  Gamepad2,
  Wifi,
  Send,
  RefreshCw,
  Globe,
  Server,
  Upload,
  Image,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize2
} from 'lucide-react';
import { ServerInstance } from '../types';

interface SevenDaysDashboardProps {
  server: ServerInstance;
  lang: 'fr' | 'en';
  onClose: () => void;
  onUpdateSlots?: (playerCount: number) => void;
}

// 7 Days to Die mod definitions
interface SevenDaysMod {
  id: string;
  name: string;
  version: string;
  author: string;
  status: 'active' | 'updating';
  desc_fr: string;
  desc_en: string;
  downloadUrl: string;
  configs: Array<{ key: string; val: string; desc_fr: string; desc_en: string }>;
}

// 7D2D Rule definition
interface ServerRule {
  key_fr: string;
  key_en: string;
  val: string;
  desc_fr: string;
  desc_en: string;
}

// Player state
interface SurvivalPlayer {
  id: string;
  name: string;
  steamId?: string;
  role: string;
  sessionTime: string; // e.g. "1h 45m"
  sessionMinutes: number;
  totalTimeHours: number;
  zombieKills: number;
  deaths: number;
  health: number;
  status: 'scavenging' | 'defending' | 'crafting' | 'afk' | 'dead';
  x: number; // 0-100 on D3 Map
  y: number; // 0-100 on D3 Map
  claimX?: number; // Shelter land claim block
  claimY?: number;
  claimName?: string;
}

const MOCK_SURVIVORS: SurvivalPlayer[] = [
  {
    id: "mock-1",
    name: "Hunter_QBC",
    steamId: "76561198012345678",
    role: "Chasseur d'Élite / Hunter",
    sessionTime: "45m",
    sessionMinutes: 45,
    totalTimeHours: 120,
    zombieKills: 582,
    deaths: 4,
    health: 95,
    status: "scavenging",
    x: 35,
    y: 42,
    claimX: 33,
    claimY: 44,
    claimName: "Hunter's Outpost"
  },
  {
    id: "mock-2",
    name: "Architect_Alex",
    steamId: "76561198987654321",
    role: "Constructeur / Architect",
    sessionTime: "1h 15m",
    sessionMinutes: 75,
    totalTimeHours: 245,
    zombieKills: 142,
    deaths: 1,
    health: 100,
    status: "crafting",
    x: 60,
    y: 55,
    claimX: 58,
    claimY: 57,
    claimName: "Alex's Sanctuary"
  }
];

// Landmark / Trader Outpost definition
interface Landmark {
  id: string;
  name: string;
  type: 'trader' | 'city' | 'military' | 'shelter' | 'hazard';
  x: number;
  y: number;
  desc_fr: string;
  desc_en: string;
}

export default function SevenDaysDashboard({ server, lang, onClose, onUpdateSlots }: SevenDaysDashboardProps) {
  // Determine if we're on the Modded (7dtd2) or Vanilla (7dtd1) server to default configuration
  const isModded = server.id === '7dtd2' || server.name.toLowerCase().includes('moddé') || server.name.toLowerCase().includes('modded');

  // --- Core Server States ---
  const [worldDay, setWorldDay] = useState<number>(() => {
    if (server.worldDay) return server.worldDay;
    return isModded ? 142 : 76;
  });
  const [copied, setCopied] = useState<boolean>(false);
  const [voted, setVoted] = useState<boolean>(false);
  const [votesCount, setVotesCount] = useState<number>(parseInt(server.votes) || 12);
  const [activeTab, setActiveTab] = useState<'status' | 'map' | 'mods' | 'rules' | 'admin'>('status');

  // --- Admin Console & Advanced States ---
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');
  const [adminPasswordError, setAdminPasswordError] = useState<boolean>(false);
  const [bloodMoonActive, setBloodMoonActive] = useState<boolean>(false);
  const [globalBroadcast, setGlobalBroadcast] = useState<string | null>(null);
  const [broadcastDraft, setBroadcastDraft] = useState<string>('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedMapElement, setSelectedMapElement] = useState<{
    type: 'player' | 'landmark' | 'claim';
    data: any;
  } | null>(null);
  const [hoveredCoords, setHoveredCoords] = useState<{ x: number; y: number } | null>(null);

  // --- Map Zoom & Pan States ---
  const [isFullscreenMap, setIsFullscreenMap] = useState<boolean>(false);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleZoomIn = () => {
    setZoomScale(z => Math.min(8, z + 0.5));
  };

  const handleZoomOut = () => {
    setZoomScale(z => {
      const nextZoom = Math.max(1, z - 0.5);
      if (nextZoom === 1) {
        setPanX(0);
        setPanY(0);
      }
      return nextZoom;
    });
  };

  const handleResetZoom = () => {
    setZoomScale(1);
    setPanX(0);
    setPanY(0);
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return; // Left-click only
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const realX = Math.max(0, Math.min(100, (x - panX) / zoomScale));
    const realY = Math.max(0, Math.min(100, (y - panY) / zoomScale));
    setHoveredCoords({ x: realX, y: realY });

    if (!isDragging) return;
    
    const dx = ((e.clientX - dragStart.x) / rect.width) * 100;
    const dy = ((e.clientY - dragStart.y) / rect.height) * 100;
    
    setPanX(prev => {
      const newPanX = prev + dx;
      return Math.max(-100 * (zoomScale - 1), Math.min(100 * (zoomScale - 1), newPanX));
    });
    setPanY(prev => {
      const newPanY = prev + dy;
      return Math.max(-100 * (zoomScale - 1), Math.min(100 * (zoomScale - 1), newPanY));
    });
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setHoveredCoords(null);
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const zoomFactor = 1.15;
    const nextZoom = e.deltaY < 0 
      ? Math.min(12, zoomScale * zoomFactor) 
      : Math.max(1, zoomScale / zoomFactor);
    
    if (nextZoom <= 1.01) {
      setZoomScale(1);
      setPanX(0);
      setPanY(0);
    } else {
      const ratio = nextZoom / zoomScale;
      setPanX(x - (x - panX) * ratio);
      setPanY(y - (y - panY) * ratio);
      setZoomScale(nextZoom);
    }
  };

  // Custom player addition inputs
  const [customPlayerName, setCustomPlayerName] = useState<string>('');
  const [customPlayerSteamId, setCustomPlayerSteamId] = useState<string>('');
  const [customPlayerRole, setCustomPlayerRole] = useState<string>('Scavenger');

  // --- Custom Map & Coordinate Scaling States ---
  const [customMapImage, setCustomMapImage] = useState<string>(() => {
    return localStorage.getItem(`custom_7dtd_map_image_${server.id}`) || '';
  });
  const [customMapSize, setCustomMapSize] = useState<number>(() => {
    const saved = localStorage.getItem(`custom_7dtd_map_size_${server.id}`);
    return saved ? parseInt(saved, 10) : 8000;
  });
  const [customMapName, setCustomMapName] = useState<string>(() => {
    return localStorage.getItem(`custom_7dtd_map_name_${server.id}`) || 'Navezgane County';
  });
  const [showMapConfig, setShowMapConfig] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem(`custom_7dtd_map_image_${server.id}`, customMapImage);
  }, [customMapImage, server.id]);

  useEffect(() => {
    localStorage.setItem(`custom_7dtd_map_size_${server.id}`, String(customMapSize));
  }, [customMapSize, server.id]);

  useEffect(() => {
    localStorage.setItem(`custom_7dtd_map_name_${server.id}`, customMapName);
  }, [customMapName, server.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreenMap(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // SFTP Connection States for Custom Map
  const [sftpHost, setSftpHost] = useState<string>(() => {
    return localStorage.getItem(`custom_7dtd_sftp_host_${server.id}`) || '';
  });
  const [sftpPort, setSftpPort] = useState<string>(() => {
    return localStorage.getItem(`custom_7dtd_sftp_port_${server.id}`) || '22';
  });
  const [sftpUser, setSftpUser] = useState<string>(() => {
    return localStorage.getItem(`custom_7dtd_sftp_user_${server.id}`) || '';
  });
  const [sftpPass, setSftpPass] = useState<string>(() => {
    return localStorage.getItem(`custom_7dtd_sftp_pass_${server.id}`) || '';
  });
  const [sftpFolder, setSftpFolder] = useState<string>(() => {
    return localStorage.getItem(`custom_7dtd_sftp_folder_${server.id}`) || '';
  });
  const [sftpFileName, setSftpFileName] = useState<string>(() => {
    return localStorage.getItem(`custom_7dtd_sftp_filename_${server.id}`) || 'biomes.png';
  });
  const [isSftpLoading, setIsSftpLoading] = useState<boolean>(false);
  const [sftpError, setSftpError] = useState<string>('');
  const [sftpSuccessMsg, setSftpSuccessMsg] = useState<string>('');

  useEffect(() => {
    localStorage.setItem(`custom_7dtd_sftp_host_${server.id}`, sftpHost);
  }, [sftpHost, server.id]);

  useEffect(() => {
    localStorage.setItem(`custom_7dtd_sftp_port_${server.id}`, sftpPort);
  }, [sftpPort, server.id]);

  useEffect(() => {
    localStorage.setItem(`custom_7dtd_sftp_user_${server.id}`, sftpUser);
  }, [sftpUser, server.id]);

  useEffect(() => {
    localStorage.setItem(`custom_7dtd_sftp_pass_${server.id}`, sftpPass);
  }, [sftpPass, server.id]);

  useEffect(() => {
    localStorage.setItem(`custom_7dtd_sftp_folder_${server.id}`, sftpFolder);
  }, [sftpFolder, server.id]);

  useEffect(() => {
    localStorage.setItem(`custom_7dtd_sftp_filename_${server.id}`, sftpFileName);
  }, [sftpFileName, server.id]);

  const handleSftpMapDownload = async () => {
    if (!sftpHost || !sftpUser || !sftpPass || !sftpFolder || !sftpFileName) {
      setSftpError(lang === 'fr' 
        ? 'Tous les champs SFTP sont obligatoires (Hôte, Utilisateur, Mot de passe, Dossier, Fichier).' 
        : 'All SFTP fields are required (Host, User, Password, Folder, Filename).'
      );
      return;
    }

    setIsSftpLoading(true);
    setSftpError('');
    setSftpSuccessMsg('');

    try {
      const response = await fetch('/api/7dtd/sftp-map', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: sftpHost,
          port: parseInt(sftpPort, 10) || 22,
          username: sftpUser,
          password: sftpPass,
          remotePath: sftpFolder,
          fileName: sftpFileName,
          serverId: server.id
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || (lang === 'fr' ? 'Erreur de connexion' : 'Connection error'));
      }

      setCustomMapImage(data.imageUrl);
      setSftpSuccessMsg(lang === 'fr' 
        ? 'Carte téléchargée avec succès et reliée !' 
        : 'Map successfully downloaded and linked!'
      );
    } catch (err: any) {
      console.error('SFTP download error:', err);
      setSftpError(err.message || (lang === 'fr' 
        ? 'Échec du téléchargement SFTP de la carte.' 
        : 'Failed to download map via SFTP.'
      ));
    } finally {
      setIsSftpLoading(false);
    }
  };

  const handleMapImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setCustomMapImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Telnet Connection & Day Synchronization States ---
  const [telnetIP, setTelnetIP] = useState<string>(() => {
    if (server.telnetHost) return server.telnetHost;
    const saved = localStorage.getItem(`7dtd_telnet_ip_${server.id}`);
    if (saved) return saved;
    return server.ip ? server.ip.split(':')[0] : '127.0.0.1';
  });
  const [telnetPort, setTelnetPort] = useState<string>(() => {
    if (server.telnetPort) return server.telnetPort;
    const saved = localStorage.getItem(`7dtd_telnet_port_${server.id}`);
    return saved || '8081';
  });
  const [telnetPassword, setTelnetPassword] = useState<string>(() => {
    if (server.telnetPassword) return server.telnetPassword;
    const saved = localStorage.getItem(`7dtd_telnet_password_${server.id}`);
    return saved || 'QBCadmin2026';
  });

  useEffect(() => {
    localStorage.setItem(`7dtd_telnet_ip_${server.id}`, telnetIP);
  }, [telnetIP, server.id]);

  useEffect(() => {
    localStorage.setItem(`7dtd_telnet_port_${server.id}`, telnetPort);
  }, [telnetPort, server.id]);

  useEffect(() => {
    localStorage.setItem(`7dtd_telnet_password_${server.id}`, telnetPassword);
  }, [telnetPassword, server.id]);
  const [isTelnetConnected, setIsTelnetConnected] = useState<boolean>(false);
  const [isTelnetConnecting, setIsTelnetConnecting] = useState<boolean>(false);
  const [telnetTerminalLog, setTelnetTerminalLog] = useState<string[]>(
    lang === 'fr' 
      ? ['[SYSTEM] Console Telnet prête pour la connexion.', 'Saisissez l\'IP, le Port Telnet, et le mot de passe pour synchroniser le Jour du Jeu avec le site web.']
      : ['[SYSTEM] Telnet terminal ready for connection.', 'Please verify the IP, Port, and Telnet Password to synchronize game server Day with the website.']
  );
  const [telnetInput, setTelnetInput] = useState<string>('');
  const [telnetSyncedDay, setTelnetSyncedDay] = useState<number>(isModded ? 142 : 76);
  const hasAutoConnectedRef = useRef<boolean>(false);

  // --- Dynamic Simulation / Interaction States ---
  const [hordeTriggered, setHordeTriggered] = useState<boolean>(false);
  const [supplyDropCoords, setSupplyDropCoords] = useState<{ x: number; y: number } | null>(null);
  const [alertText, setAlertText] = useState<string | null>(null);

  // --- Active Map Filters ---
  const [mapFilter, setMapFilter] = useState({
    biomes: true,
    claims: true,
    traders: true,
    players: true,
    hazards: true,
    radiation: true
  });

  // Calculate Blood Moon forecast
  // In 7 Days to Die, Blood Moon happens every 7 days (7, 14, 21 ... 70, 77 ... 140, 147)
  const nextBloodMoonDay = useMemo(() => {
    return Math.ceil(worldDay / 7) * 7;
  }, [worldDay]);

  const daysUntilBloodMoon = useMemo(() => {
    const diff = nextBloodMoonDay - worldDay;
    return diff === 0 ? 7 : diff; // If it's blood moon day, the next cycle is in 7 days after tonight
  }, [worldDay, nextBloodMoonDay]);

  // Handle address copy
  const handleCopyIp = () => {
    navigator.clipboard.writeText(server.ip);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle server vote
  const handleVote = () => {
    if (!voted) {
      setVoted(true);
      setVotesCount(prev => prev + 1);
    }
  };

  // --- MOTD List ---
  const motd = useMemo(() => {
    if (isModded) {
      return {
        title_fr: "⚠️ RECRUTEMENT DE SURVIVANTS - SERVEUR MODDÉ V2.5 ⚠️",
        title_en: "⚠️ SURVIVOR RECRUITMENT - MODDED SERVER V2.5 ⚠️",
        desc_fr: "Bienvenue sur le serveur QBC Apocalypse moddé ! Nous utilisons un ensemble de mods axés sur l'immersion extrême, des sacs à dos agrandis, de nouvelles armes à feu artisanales et une difficulté progressive. Prochaine lune de sang imminente, fortifiez vos bases et partagez vos ressources !",
        desc_en: "Welcome to the QBC Modded Apocalypse server! We run a custom pack centered on extreme survival immersion, extended backpacks, craftable tier-3 firearms, and scaling difficulty. Red sky is coming, reinforce your shelter and pool resources!"
      };
    } else {
      return {
        title_fr: "🍖 BIENVENUE SUR L'INSTANCE VANILLA SURVIVAL 🍖",
        title_en: "🍖 WELCOME TO VANILLA SURVIVAL INSTANCE 🍖",
        desc_fr: "Une expérience de survie 100% fidèle au jeu d'origine, en difficulté Guerrier. Idéal pour les puristes, les constructeurs et la survie tranquille en groupe. Les claim blocks sont gratuits au spawn !",
        desc_en: "A 100% vanilla survival experience running on Warrior difficulty. Perfect for purists, custom builders, and cooperative base progression. Grab your free claim block at the spawn hub!"
      };
    }
  }, [isModded]);

  // --- Server Rules Config ---
  const rules = useMemo<ServerRule[]>(() => {
    return [
      {
        key_fr: "Difficulté globale", key_en: "Game Difficulty",
        val: isModded ? "5 / 6 (Inhumain)" : "3 / 6 (Guerrier)",
        desc_fr: "Multiplicateur de dégâts infligés par la faune et les zombies.",
        desc_en: "Damage and health scaling multiplier of aggressive fauna and undead."
      },
      {
        key_fr: "Taille du Land Claim Block", key_en: "Land Claim Size",
        val: "41 x 41 blocs",
        desc_fr: "Zone sécurisée contre le spawn et les dégradations des autres joueurs.",
        desc_en: "Protected area secure against monster spawning and structure griefing."
      },
      {
        key_fr: "Perte à la mort", key_en: "Drop On Death",
        val: isModded ? "Sac à dos uniquement" : "Tout l'inventaire",
        desc_fr: "Ce que le joueur laisse tomber au sol lors d'un décès prématuré.",
        desc_en: "Items dropped to the ground upon premature death."
      },
      {
        key_fr: "Durée du jour réel", key_en: "Daylight Duration",
        val: "60 minutes",
        desc_fr: "Équivalent en temps réel d'un cycle complet de 24 heures en jeu.",
        desc_en: "Real-world duration of a complete 24-hour in-game cycle."
      },
      {
        key_fr: "Dégâts sur les blocs de claim", key_en: "Claim Block Protection",
        val: "32x (Infini hors-ligne)",
        desc_fr: "Facteur multiplicateur de résistance des blocs sous protection de claim.",
        desc_en: "Block durability multiplier within land claim protected grids."
      },
      {
        key_fr: "Fréquence des largages", key_en: "Airdrop Frequency",
        val: "Toutes les 72 heures",
        desc_fr: "Largage d'urgence d'une caisse de ravitaillement militaire par avion.",
        desc_en: "Emergency supply crate dropped by aircraft on specific intervals."
      }
    ];
  }, [isModded]);

  // --- Server Installed Mods ---
  const modsList = useMemo<SevenDaysMod[]>(() => {
    if (isModded) {
      return [
        {
          id: "m1",
          name: "QBC Extended Backpacks",
          version: "2.4.1",
          author: "QBC Dev Team",
          status: "active",
          desc_fr: "Augmente l'inventaire personnel des joueurs à 120 slots avec des catégories de tri rapide.",
          desc_en: "Expands personal survival inventory grids up to 120 slots with automated sorting categories.",
          downloadUrl: "https://github.com/qbc-gaming/7dtd-extended-backpack/releases",
          configs: [
            { key: "gridSize", val: "120", desc_fr: "Nombre de cases d'inventaire", desc_en: "Inventory grid slot count" },
            { key: "encumbranceThreshold", val: "80", desc_fr: "Seuil d'encombrement", desc_en: "Encumbrance trigger index" }
          ]
        },
        {
          id: "m2",
          name: "Apocalypse Weapons & Arsenal",
          version: "1.9.0",
          author: "UndeadCrafter",
          status: "active",
          desc_fr: "Ajoute 22 nouvelles armes à feu artisanales de tiers intermédiaire, dont des fusils à verrou et carabines.",
          desc_en: "Adds 22 custom makeshift craftable firearms, bolt-action rifles, and heavy pipe shotguns.",
          downloadUrl: "https://forum.7daystodie.com/topic/24551-apocalypse-weapons-pack/",
          configs: [
            { key: "spawnChance", val: "1.5x", desc_fr: "Chances d'apparition dans le loot", desc_en: "Loot table spawn probability" },
            { key: "allowCrafting", val: "true", desc_fr: "Fabrication débloquée par schémas", desc_en: "Crafting unlocked via schematics" }
          ]
        },
        {
          id: "m3",
          name: "Darkness Core Mechanics",
          version: "5.1.0",
          author: "KhaineGB",
          status: "active",
          desc_fr: "Refonte de la faune sauvage avec l'ajout de bêtes mutantes et de zombies irradiés plus intelligents.",
          desc_en: "Complete overhaul featuring dynamic mutant fauna and smarter pathfinding irradiated bosses.",
          downloadUrl: "https://github.com/KhaineGB/DarknessFalls/releases",
          configs: [
            { key: "hordePathfindingThreads", val: "4", desc_fr: "Fils CPU dédiés à l'IA de horde", desc_en: "Dedicated pathfinding AI processing threads" },
            { key: "zombieHearingRange", val: "35m", desc_fr: "Portée auditive des morts-vivants", desc_en: "Auditory detection distance of zombies" }
          ]
        },
        {
          id: "m4",
          name: "Survival Vehicles & Cruisers",
          version: "1.1.2",
          author: "DustRider",
          status: "active",
          desc_fr: "Permet de concevoir des motos tout-terrain blindées et des buggies légers à l'établi lourd.",
          desc_en: "Introduces heavy duty custom dirt bikes, armored quadricycles, and light transport buggies.",
          downloadUrl: "https://github.com/DustRider/7dtd-vehicles",
          configs: [
            { key: "fuelConsumptionRate", val: "0.8x", desc_fr: "Taux de consommation d'essence", desc_en: "Vehicle gasoline consumption factor" },
            { key: "maxSpeed", val: "22 m/s", desc_fr: "Vitesse maximale autorisée", desc_en: "Maximum server-side velocity cap" }
          ]
        }
      ];
    } else {
      return [
        {
          id: "v1",
          name: "Stamina Rebalance Core",
          version: "1.0.5",
          author: "VanillaSaviour",
          status: "active",
          desc_fr: "Ajuste légèrement la régénération d'endurance lors de la course et du minage pour fluidifier le gameplay.",
          desc_en: "Slightly tunes base stamina regeneration during running and ore mining for smoother gameplay.",
          downloadUrl: "https://forum.7daystodie.com/topic/12345-stamina-rebalance/",
          configs: [
            { key: "staminaRegenFactor", val: "1.15x", desc_fr: "Facteur de régénération d'endurance", desc_en: "Stamina regeneration multiplier" }
          ]
        },
        {
          id: "v2",
          name: "Clean HUD Indicators",
          version: "3.2.0",
          author: "Sirillion",
          status: "active",
          desc_fr: "Améliore l'interface en affichant l'élévation exacte, la température corporelle et le niveau d'infection.",
          desc_en: "Enhances native UI dashboard with live elevation metrics, core temperature, and infection stages.",
          downloadUrl: "https://github.com/Sirillion/CleanHUD-7D2D",
          configs: [
            { key: "showElevation", val: "true", desc_fr: "Afficher l'altitude du joueur", desc_en: "Render vertical elevation coordinates" },
            { key: "temperatureUnit", val: "Celsius", desc_fr: "Unité de mesure thermique", desc_en: "Thermodynamic unit selection" }
          ]
        }
      ];
    }
  }, [isModded]);

  // --- Active Players Survival Database ---
  const [isRealPlayersLive, setIsRealPlayersLive] = useState<boolean>(false);
  const [isRefreshingPlayers, setIsRefreshingPlayers] = useState<boolean>(false);
  const [players, setPlayers] = useState<SurvivalPlayer[]>(MOCK_SURVIVORS);

  const lastUpdatedSlotsRef = useRef<number | null>(null);

  useEffect(() => {
    if (onUpdateSlots && lastUpdatedSlotsRef.current !== players.length) {
      lastUpdatedSlotsRef.current = players.length;
      onUpdateSlots(players.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players.length]);

  const fetchTelnetPlayers = useCallback(async () => {
    if (!telnetIP.trim() || !telnetPort.trim()) return;
    try {
      const response = await fetch('/api/telnet/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: telnetIP,
          port: telnetPort,
          password: telnetPassword
        })
      });
      if (!response.ok) throw new Error('Telnet error');
      const data = await response.json();
      if (data.status === 'success' && Array.isArray(data.players)) {
        const mappedPlayers = data.players.map((p: any) => {
          const rawX = p.coordinates ? p.coordinates.x : 0;
          const rawZ = p.coordinates ? p.coordinates.z : 0; // Z is North/South in 7dtd, which maps to Y coordinate in 2D
          
          // Convert from 7dtd map coord system to 0-100% of dashboard
          const scale = customMapSize / 100 || 80;
          const xPercent = Math.min(100, Math.max(0, (rawX / scale) + 50));
          const yPercent = Math.min(100, Math.max(0, 50 - (rawZ / scale)));
          
          const hash = p.name.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
          const roles = ["Chasseur d'Élite / Hunter", "Constructeur / Architect", "Éclaireur / Scavenger", "Gardien Militaire / Defender"];
          const role = roles[hash % roles.length];
          const statuses = ["scavenging", "crafting", "defending"];
          const status = statuses[hash % statuses.length];

          const sessionMinutes = Math.max(1, Math.round(p.score / 10 + 5)); // dummy estimate
          
          return {
            id: `real-${p.id}-${hash}`,
            name: p.name,
            steamId: p.steamId,
            role: role,
            sessionTime: `${sessionMinutes}m`,
            sessionMinutes: sessionMinutes,
            totalTimeHours: Math.round(sessionMinutes / 60 + (hash % 150)),
            zombieKills: p.score,
            deaths: p.deaths,
            health: p.health,
            status: status,
            x: xPercent,
            y: yPercent,
            claimX: xPercent - 2,
            claimY: yPercent + 2,
            claimName: `Camp ${p.name}`
          };
        });
        setPlayers(prev => {
          const customPlayers = prev.filter(p => p.id.startsWith('custom-'));
          const filteredCustom = customPlayers.filter(cp => !mappedPlayers.some(mp => mp.name === cp.name));
          return [...mappedPlayers, ...filteredCustom];
        });
        setIsRealPlayersLive(true);
      }
    } catch (err) {
      console.warn("Could not load real telnet players:", err);
    }
  }, [telnetIP, telnetPort, telnetPassword]);

  const fetchRealPlayers = useCallback(async () => {
    setIsRefreshingPlayers(true);
    if (isTelnetConnected) {
      await fetchTelnetPlayers();
      setIsRefreshingPlayers(false);
      return;
    }
    
    try {
      const response = await fetch(`/api/server-players/${server.id}`);
      if (!response.ok) throw new Error('Failed to fetch real players');
      const data = await response.json();
      
      // Update world day if backend synchronized it via Telnet
      if (data && data.worldDay) {
        setWorldDay(data.worldDay);
        setTelnetSyncedDay(data.worldDay);
      }

      if (data && data.status === 'success' && Array.isArray(data.players)) {
        const mappedPlayers = data.players.map((p: any, idx: number) => {
          const hash = p.name.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
          
          if (data.source === 'telnet') {
            // Real Telnet player format from server-side query
            const rawX = p.coordinates ? p.coordinates.x : 0;
            const rawZ = p.coordinates ? p.coordinates.z : 0;
            
            const scale = customMapSize / 100 || 80;
            const xPercent = Math.min(100, Math.max(0, (rawX / scale) + 50));
            const yPercent = Math.min(100, Math.max(0, 50 - (rawZ / scale)));
            
            const roles = ["Chasseur d'Élite / Hunter", "Constructeur / Architect", "Éclaireur / Scavenger", "Gardien Militaire / Defender"];
            const role = roles[hash % roles.length];
            const statuses = ["scavenging", "crafting", "defending"];
            const status = statuses[hash % statuses.length];
            const sessionMinutes = Math.max(1, Math.round(p.score / 10 + 5));

            return {
              id: `real-${p.id || idx}-${hash}`,
              name: p.name,
              steamId: p.steamId,
              role: role,
              sessionTime: `${sessionMinutes}m`,
              sessionMinutes: sessionMinutes,
              totalTimeHours: Math.round(sessionMinutes / 60 + (hash % 150)),
              zombieKills: p.score,
              deaths: p.deaths,
              health: p.health,
              status: status,
              x: xPercent,
              y: yPercent,
              claimX: xPercent - 2,
              claimY: yPercent + 2,
              claimName: `Camp ${p.name}`
            };
          } else {
            // Steam Query fallback or simulation mapping
            const zombieKills = (hash * 3) % 2500;
            const deaths = hash % 20;
            const sessionMinutes = Math.max(5, Math.round(p.timePlayed / 60));
            const totalHours = Math.round(sessionMinutes / 60 + (hash % 100));
            const rx = 15 + (hash % 70);
            const ry = 15 + (hash % 70);
            
            const roles = ["Chasseur d'Élite / Hunter", "Constructeur / Architect", "Éclaireur / Scavenger", "Gardien Militaire / Defender"];
            const role = roles[hash % roles.length];
            const statuses = ["scavenging", "crafting", "defending"];
            const status = statuses[hash % statuses.length];

            return {
              id: `real-${idx}-${hash}`,
              name: p.name,
              steamId: `7656119${700000000 + (hash % 99999999)}`,
              role: role,
              sessionTime: `${sessionMinutes}m`,
              sessionMinutes: sessionMinutes,
              totalTimeHours: totalHours,
              zombieKills: zombieKills,
              deaths: deaths,
              health: 100 - (deaths % 4) * 10,
              status: status,
              x: rx,
              y: ry,
              claimX: rx - 2,
              claimY: ry + 2,
              claimName: `Camp ${p.name}`
            };
          }
        });
        setPlayers(prev => {
          const customPlayers = prev.filter(p => p.id.startsWith('custom-'));
          const filteredCustom = customPlayers.filter(cp => !mappedPlayers.some(mp => mp.name === cp.name));
          return [...mappedPlayers, ...filteredCustom];
        });
        setIsRealPlayersLive(true);
      } else {
        setIsRealPlayersLive(false);
        setPlayers(prev => {
          const customPlayers = prev.filter(p => p.id.startsWith('custom-'));
          const filteredMock = MOCK_SURVIVORS.filter(m => !customPlayers.some(cp => cp.name === m.name));
          return [...filteredMock, ...customPlayers];
        });
      }
    } catch (err) {
      console.warn("Could not load real live players, staying with high-fidelity survivors:", err);
      setIsRealPlayersLive(false);
      setPlayers(prev => {
        const customPlayers = prev.filter(p => p.id.startsWith('custom-'));
        const filteredMock = MOCK_SURVIVORS.filter(m => !customPlayers.some(cp => cp.name === m.name));
        return [...filteredMock, ...customPlayers];
      });
    } finally {
      setIsRefreshingPlayers(false);
    }
  }, [server.id, isTelnetConnected, fetchTelnetPlayers]);

  useEffect(() => {
    fetchRealPlayers();
    const interval = setInterval(fetchRealPlayers, isTelnetConnected ? 12000 : 20000);
    return () => {
      clearInterval(interval);
    };
  }, [fetchRealPlayers, isTelnetConnected]);

  // --- Geographical Landmarks for the D3 Map ---
  const landmarks = useMemo<Landmark[]>(() => {
    return [
      { id: "l1", name: "Trader Joel", type: "trader", x: 15, y: 22, desc_fr: "Marchand sécurisé proposant des armes et des véhicules légers.", desc_en: "Secured trader specializing in firearms blueprints and transport vehicles." },
      { id: "l2", name: "Trader Rekt", type: "trader", x: 80, y: 15, desc_fr: "Marchand hostile mais riche en graines agricoles et nourritures.", desc_en: "Grumpy merchant with rich stocks of farming seeds and advanced medical recipes." },
      { id: "l3", name: "Diersville Ruins", type: "city", x: 45, y: 40, desc_fr: "Grande ville abandonnée regorgeant de loot de haute technologie médicale.", desc_en: "Massive ruined city overflowing with high-tier pharmaceutical loot." },
      { id: "l4", name: "Military Base Alpha", type: "military", x: 75, y: 70, desc_fr: "Bunker militaire sous haute sécurité avec du loot de grade militaire.", desc_en: "Highly fortified subterranean military installation with tier-3 tactical crates." },
      { id: "l5", name: "Zombie Hotspot: Burned Forest", type: "hazard", x: 50, y: 82, desc_fr: "Zone radioactive dangereuse peuplée de chiens enragés et de démons.", desc_en: "Radiated hazardous zone crowded with aggressive feral dogs and burnt ghouls." }
    ];
  }, []);

  // --- Dynamic Map Simulation tick ---
  useEffect(() => {
    const interval = setInterval(() => {
      // Wander players around slightly on the map to simulate active movement
      setPlayers(prevPlayers => {
        return prevPlayers.map(p => {
          if (p.status === 'afk' || p.status === 'dead') return p;
          
          // Apply minor vector shifts
          const dx = (Math.random() - 0.5) * 3;
          const dy = (Math.random() - 0.5) * 3;
          let nx = Math.max(8, Math.min(92, p.x + dx));
          let ny = Math.max(8, Math.min(92, p.y + dy));
          
          // Randomly trigger minor zombie kills as players scavenge
          let kills = p.zombieKills;
          if (Math.random() > 0.85) {
            kills += Math.floor(Math.random() * 3) + 1;
          }

          return {
            ...p,
            x: nx,
            y: ny,
            zombieKills: kills
          };
        });
      });
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  // --- Interactive triggers ---
  const triggerHorde = () => {
    if (hordeTriggered) return;
    setHordeTriggered(true);
    setAlertText(lang === 'fr' ? '🚨 TRANSMISSION RADIO : Vague de zombies détectée en approche rapide vers les Land Claim blocks !' : '🚨 RADIO ALERT: Screamer horde detected marching fast towards survivors claims!');
    
    // Spawn aggressive waves visually
    setTimeout(() => {
      setPlayers(prev => prev.map(p => {
        if (p.status === 'defending' || p.status === 'scavenging') {
          return {
            ...p,
            zombieKills: p.zombieKills + Math.floor(Math.random() * 25) + 10,
            health: Math.max(45, p.health - Math.floor(Math.random() * 15))
          };
        }
        return p;
      }));
    }, 3000);

    setTimeout(() => {
      setHordeTriggered(false);
      setAlertText(null);
    }, 8000);
  };

  const triggerSupplyDrop = () => {
    const rx = 15 + Math.random() * 70;
    const ry = 15 + Math.random() * 70;
    setSupplyDropCoords({ x: rx, y: ry });
    setAlertText(lang === 'fr' ? `✈️ LARGAGE EN COURS ! Une caisse de ravitaillement a été parachutée en secteur [X: ${Math.round(rx * 8)}, Y: ${Math.round(ry * 8)}]` : `✈️ SUPPLY DROP INCOMING! Cargo dropped emergency rations at sector [X: ${Math.round(rx * 8)}, Y: ${Math.round(ry * 8)}]`);

    setTimeout(() => {
      setAlertText(null);
    }, 7000);
  };

  // --- Telnet Actions & Day Synchronization ---
  const handleConnectTelnet = async (explicitIP?: unknown, explicitPort?: unknown, explicitPassword?: unknown) => {
    const ipVal = typeof explicitIP === 'string' ? explicitIP : '';
    const portVal = typeof explicitPort === 'string' ? explicitPort : '';
    const pwdVal = typeof explicitPassword === 'string' ? explicitPassword : undefined;

    const activeIP = (ipVal || telnetIP || '').trim();
    const activePort = (portVal || telnetPort || '').trim();
    const activePassword = pwdVal !== undefined ? pwdVal : telnetPassword;

    if (!activeIP || !activePort) return;
    setIsTelnetConnecting(true);
    setTelnetTerminalLog(prev => [
      ...prev,
      lang === 'fr' 
        ? `[CONNECT] Connexion à ${activeIP}:${activePort}...` 
        : `[CONNECT] Connecting to ${activeIP}:${activePort}...`,
    ]);

    try {
      const response = await fetch('/api/telnet/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: activeIP,
          port: activePort,
          password: activePassword,
          command: 'gettime'
        })
      });

      if (!response.ok) {
        throw new Error(lang === 'fr' ? 'Le serveur a refusé la connexion ou mot de passe invalide.' : 'Server refused connection or invalid password.');
      }

      const data = await response.json();
      if (data.status === 'success') {
        setIsTelnetConnecting(false);
        setIsTelnetConnected(true);
        
        // Save these Telnet connection details to the server-side database
        try {
          await fetch(`/api/server-players/${server.id}/telnet-config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telnetHost: activeIP,
              telnetPort: activePort,
              telnetPassword: activePassword
            })
          });
          console.log("Telnet credentials successfully saved on server.");
        } catch (saveErr) {
          console.warn("Could not save Telnet credentials on server:", saveErr);
        }

        setTelnetTerminalLog(prev => [
          ...prev,
          lang === 'fr' 
            ? `[SUCCESS] Connecté avec succès au serveur Telnet !` 
            : `[SUCCESS] Authentication successful! Connected to console.`,
          `--------------------------------------------------`,
          `7 Days to Die Telnet Service (Alpha 21.2-b30)`,
          `IP Address : ${activeIP}:${activePort}`,
          `Status     : Logged as Administrator`,
          `Response   : ${data.output.trim()}`,
          `--------------------------------------------------`
        ]);

        // Try parsing day from response output
        const dayMatch = data.output.match(/Day\s+(\d+)/i);
        if (dayMatch) {
          const matchedDay = parseInt(dayMatch[1], 10);
          if (!isNaN(matchedDay)) {
            setWorldDay(matchedDay);
            setTelnetSyncedDay(matchedDay);
          }
        }

        // Fetch players initially
        fetchTelnetPlayers();
      } else {
        setIsTelnetConnecting(false);
        setTelnetTerminalLog(prev => [
          ...prev,
          `[ERROR] ${data.error || 'Authentication failed'}`
        ]);
      }
    } catch (err: any) {
      setIsTelnetConnecting(false);
      setTelnetTerminalLog(prev => [
        ...prev,
        `[CONNECTION ERROR] ${err.message}`
      ]);
    }
  };

  // Sync state values if the parent server prop changes (due to background syncs)
  useEffect(() => {
    if (server.worldDay) {
      setWorldDay(server.worldDay);
      setTelnetSyncedDay(server.worldDay);
    }
  }, [server.worldDay]);

  useEffect(() => {
    if (server.telnetHost) setTelnetIP(server.telnetHost);
    if (server.telnetPort) setTelnetPort(server.telnetPort);
    if (server.telnetPassword) setTelnetPassword(server.telnetPassword);
  }, [server.telnetHost, server.telnetPort, server.telnetPassword]);

  // Auto-connect to Telnet on mount/initial open if credentials exist
  useEffect(() => {
    if (server.telnetHost && server.telnetPort && server.telnetPassword && !hasAutoConnectedRef.current) {
      hasAutoConnectedRef.current = true;
      const timer = setTimeout(() => {
        handleConnectTelnet(server.telnetHost, server.telnetPort, server.telnetPassword);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [server.telnetHost, server.telnetPort, server.telnetPassword]);

  const handleSendTelnetCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telnetInput.trim()) return;

    const cmd = telnetInput.trim();
    const parts = cmd.split(' ');
    const primary = parts[0].toLowerCase();
    const args = parts.slice(1);

    setTelnetTerminalLog(prev => [...prev, `admin@7dtd-server:~$ ${cmd}`]);
    setTelnetInput('');

    if (primary === 'clear') {
      setTelnetTerminalLog([]);
      return;
    }

    try {
      const response = await fetch('/api/telnet/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: telnetIP,
          port: telnetPort,
          password: telnetPassword,
          command: cmd
        })
      });

      if (!response.ok) {
        throw new Error(lang === 'fr' ? 'Échec de l\'exécution de la commande.' : 'Command execution failed.');
      }

      const data = await response.json();
      if (data.status === 'success') {
        const lines = data.output.split(/\r?\n/).filter((l: string) => l.trim().length > 0);
        setTelnetTerminalLog(prev => [...prev, ...lines]);

        // Update day if gettime/gt or settime command output contains Day X
        const dayMatch = data.output.match(/Day\s+(\d+)/i);
        if (dayMatch) {
          const matchedDay = parseInt(dayMatch[1], 10);
          if (!isNaN(matchedDay)) {
            setWorldDay(matchedDay);
            setTelnetSyncedDay(matchedDay);
          }
        }

        // Handle client state for simulated commands too
        if (primary === 'say') {
          const msg = args.join(' ');
          if (msg) setGlobalBroadcast(msg);
        }

        // If listplayers or lp was executed, trigger a refresh of players
        if (primary === 'listplayers' || primary === 'lp') {
          fetchTelnetPlayers();
        }
      } else {
        setTelnetTerminalLog(prev => [...prev, `[ERROR] ${data.error || 'Unknown error'}`]);
      }
    } catch (err: any) {
      setTelnetTerminalLog(prev => [...prev, `[CONNECTION ERROR] ${err.message}`]);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastDraft.trim()) return;
    const msg = broadcastDraft.trim();
    setGlobalBroadcast(msg);
    setBroadcastDraft(''); // Clear input

    // If Telnet is connected, send the command to the actual 7 Days to Die server
    if (isTelnetConnected) {
      try {
        setTelnetTerminalLog(prev => [...prev, `[SYSTEM] Sending broadcast: say "${msg}"`]);
        const response = await fetch('/api/telnet/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: telnetIP,
            port: telnetPort,
            password: telnetPassword,
            command: `say "${msg}"`
          })
        });
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'success') {
            setTelnetTerminalLog(prev => [
              ...prev, 
              `[SUCCESS] Broadcast successfully displayed in-game!`,
              `Response: ${data.output.trim()}`
            ]);
          } else {
            setTelnetTerminalLog(prev => [...prev, `[ERROR] Failed to execute broadcast on server: ${data.error}`]);
          }
        }
      } catch (err: any) {
        console.warn("Failed to transmit broadcast to Telnet:", err);
        setTelnetTerminalLog(prev => [...prev, `[CONNECTION ERROR] Broadcast transmission failed: ${err.message}`]);
      }
    }
  };

  const handleManualSyncDay = (syncDay: number) => {
    setWorldDay(syncDay);
    setTelnetSyncedDay(syncDay);
    setAlertText(
      lang === 'fr'
        ? `🔄 SYNCHRONISATION TELNET RÉUSSIE ! Le jour du dashboard web a été accordé sur le Jour ${syncDay} du jeu.`
        : `🔄 TELNET SYNCHRONIZATION SUCCESSFUL! Web dashboard day has been synced to game Day ${syncDay}.`
    );
    if (isTelnetConnected) {
      setTelnetTerminalLog(prev => [
        ...prev,
        lang === 'fr'
          ? `[SYNC] Le jour du dashboard web a été mis à jour sur Jour ${syncDay} pour correspondre au jeu.`
          : `[SYNC] Web dashboard day has been synchronized to game Day ${syncDay} to resolve desync gap.`
      ]);
    }
  };

  // --- D3 Geographic Engine ---
  const d3MapData = useMemo(() => {
    // We create a topographical mesh representation of the 7 Days map
    const width = 50;
    const height = 50;
    const grid = new Float32Array(width * height);

    // Compute topographical value simulating post-apocalyptic ridges and radioactive river valleys
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const px = x / (width - 1);
        const py = y / (height - 1);
        
        // Organic sin-waves
        let v = Math.sin(px * 8) * Math.cos(py * 6) * 10 + 
                Math.sin(px * 16) * Math.sin(py * 16) * 3;

        // Radiated River Canyon crossing diagonally
        const riverDistance = Math.abs(px - py);
        if (riverDistance < 0.12) {
          v -= 15 * (1 - (riverDistance / 0.12));
        }

        // Add mountains in upper right sector
        if (px > 0.6 && py < 0.4) {
          const mountainFactor = (px - 0.6) * (0.4 - py);
          v += mountainFactor * 120;
        }

        grid[idx] = v;
      }
    }

    // Build contour layers for the biomes
    const contourGenerator = d3.contours()
      .size([width, height])
      .thresholds([-12, -4, 4, 12, 22, 38]);

    const contours = contourGenerator(Array.from(grid));

    const scaleX = 100 / (width - 1);
    const scaleY = 100 / (height - 1);
    const geoPath = d3.geoPath(d3.geoTransform({
      point(x, y) {
        this.stream.point(x * scaleX, y * scaleY);
      }
    }));

    return contours.map((c, i) => ({
      path: geoPath(c) || '',
      elevation: c.value
    }));

  }, []);

  // Total Server Stats counters
  const totalKillsCount = useMemo(() => {
    return players.reduce((sum, p) => sum + p.zombieKills, 0);
  }, [players]);

  return (
    <div className="bg-[#0c0806] border border-red-500/10 min-h-screen text-zinc-100 flex flex-col font-sans overflow-x-hidden selection:bg-red-500/30">
      
      {/* 1. Header with Status & Fast Info */}
      <div className="border-b border-zinc-900 bg-black/65 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Left branding */}
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-2 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all cursor-pointer"
            title={lang === 'fr' ? "Retour au portail" : "Back to portal"}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl md:text-2xl">{server.game_icon}</span>
              <h2 className="text-lg md:text-xl font-mono font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                <span>{lang === 'fr' ? server.name_fr || server.name : server.name_en || server.name}</span>
                <span className="text-xs text-red-500 font-extrabold px-2 py-0.5 bg-red-500/10 border border-red-500/25 rounded tracking-widest uppercase">
                  {isModded ? 'MODDED' : 'VANILLA'}
                </span>
              </h2>
            </div>
            <p className="text-xs font-mono text-zinc-500 mt-0.5 flex items-center gap-2">
              <span>IP: {server.ip}</span>
              <button 
                onClick={handleCopyIp}
                className="text-amber-500 hover:text-white transition-all ml-1 flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[10px] uppercase font-black">{copied ? 'Copié' : 'Copier'}</span>
              </button>
            </p>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Day Tracker */}
          <div className="bg-gradient-to-r from-red-950/40 to-black border border-red-900/40 rounded-lg px-3.5 py-1.5 flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-red-500 animate-pulse" />
            <div className="text-left font-mono">
              <div className="text-[10px] text-zinc-500 leading-none uppercase">{lang === 'fr' ? 'Âge du monde' : 'World Age'}</div>
              <div className="text-sm font-black text-red-400 uppercase tracking-widest">
                {lang === 'fr' ? `JOUR ${worldDay}` : `DAY ${worldDay}`}
              </div>
            </div>
          </div>

          {/* Blood Moon Timer */}
          <div className="bg-gradient-to-r from-amber-950/20 to-black border border-amber-900/30 rounded-lg px-3.5 py-1.5 flex items-center gap-2.5">
            {daysUntilBloodMoon <= 1 ? (
              <Flame className="w-4 h-4 text-red-500 animate-bounce" />
            ) : (
              <Moon className="w-4 h-4 text-amber-500 animate-pulse" />
            )}
            <div className="text-left font-mono">
              <div className="text-[10px] text-zinc-500 leading-none uppercase">{lang === 'fr' ? 'Lune de sang' : 'Blood moon'}</div>
              <div className="text-sm font-black text-amber-400 uppercase tracking-wider">
                {lang === 'fr' ? `Dans ${daysUntilBloodMoon}j (J${nextBloodMoonDay})` : `${daysUntilBloodMoon} Days Left (D${nextBloodMoonDay})`}
              </div>
            </div>
          </div>

          {/* Slots & Votes */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-1 text-center font-mono">
            <span className="text-[10px] block text-zinc-500 leading-none uppercase">{lang === 'fr' ? 'SURVIVANTS' : 'PLAYERS'}</span>
            <span className="text-xs font-bold text-emerald-400">
              {players.length}/{server.slots ? server.slots.split('/')[1] || '20' : '20'}
            </span>
          </div>

          <button 
            onClick={handleVote}
            className={`px-3 py-2 rounded-lg font-mono text-xs font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 cursor-pointer ${
              voted 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-black border-amber-500/20 hover:border-amber-500'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>VOTE : {votesCount}</span>
          </button>
        </div>
      </div>

      {/* Broadcasting Alert Bar */}
      <AnimatePresence>
        {globalBroadcast && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-cyan-950 border-b border-cyan-700 text-cyan-200 px-4 py-3 text-center text-xs font-mono font-black flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(6,182,212,0.15)] uppercase tracking-wider relative overflow-hidden"
          >
            <span className="absolute top-0 left-0 w-full h-full bg-cyan-500/5 animate-pulse" />
            <Terminal className="w-4 h-4 text-cyan-400 animate-pulse flex-shrink-0" />
            <span className="relative z-10">{lang === 'fr' ? '📢 ANNONCE ADMIN : ' : '📢 ADMIN BROADCAST: '}{globalBroadcast}</span>
          </motion.div>
        )}
        {alertText && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-950/80 border-b border-red-800 text-red-200 px-4 py-2.5 text-center text-xs font-mono font-bold flex items-center justify-center gap-2 shadow-inner"
          >
            <AlertTriangle className="w-4 h-4 text-red-500 animate-bounce flex-shrink-0" />
            <span>{alertText}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Top-level Blood Moon warning if Day 7 approaching or Blood Moon activated by Admin */}
      {(bloodMoonActive || daysUntilBloodMoon <= 1) && (
        <div className="bg-gradient-to-r from-red-950 via-red-900/60 to-red-950 border-y border-red-700/50 py-3 px-4 text-center shadow-[0_0_30px_rgba(239,68,68,0.25)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(45deg,rgba(239,68,68,0.15)_25%,transparent_25%,transparent_50%,rgba(239,68,68,0.15)_50%,rgba(239,68,68,0.15)_75%,transparent_75%,transparent)] bg-[length:40px_40px] opacity-40 animate-[scrolling-stripes_2s_linear_infinite]" />
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 relative z-10">
            <div className="w-3 h-3 rounded-full bg-red-600 animate-ping" />
            <p className="font-mono text-xs text-red-200 uppercase tracking-widest font-black">
              {lang === 'fr' 
                ? `🔴 ALERTE LUNE DE SANG TOUTE PROCHE ! Ce soir le ciel devient rouge. Fortifiez les abris avant 22h00 !` 
                : `🔴 BLOOD MOON IS NEARLY ACTIVE! Tonight the sky turns blood-red. Fortify shelters before 22h00!`}
            </p>
          </div>
        </div>
      )}

      {/* 3. Main Dashboard Grid Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* LEFT COMPONENT - TAB CONTENT */}
        <div className="flex-1 flex flex-col gap-6">
          
          {/* Tabs Menu Selection */}
          <div className="flex flex-wrap gap-1.5 border-b border-zinc-900 pb-3">
            <button
              onClick={() => setActiveTab('status')}
              className={`px-4 py-2.5 rounded-lg font-mono text-xs font-extrabold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'status'
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : 'text-zinc-400 hover:text-white bg-zinc-950/40 hover:bg-zinc-900 border border-transparent'
              }`}
            >
              <Activity className="w-4 h-4 text-red-500" />
              <span>{lang === 'fr' ? 'Cockpit & Stats' : 'Console & Stats'}</span>
            </button>

            <button
              onClick={() => setActiveTab('map')}
              className={`px-4 py-2.5 rounded-lg font-mono text-xs font-extrabold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'map'
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : 'text-zinc-400 hover:text-white bg-zinc-950/40 hover:bg-zinc-900 border border-transparent'
              }`}
            >
              <Map className="w-4 h-4 text-emerald-400" />
              <span>{lang === 'fr' ? 'Carte D3 Post-Apo' : 'D3 Post-Apo Map'}</span>
            </button>

            <button
              onClick={() => setActiveTab('mods')}
              className={`px-4 py-2.5 rounded-lg font-mono text-xs font-extrabold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'mods'
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : 'text-zinc-400 hover:text-white bg-zinc-950/40 hover:bg-zinc-900 border border-transparent'
              }`}
            >
              <FileCode className="w-4 h-4 text-amber-500" />
              <span>{lang === 'fr' ? `Mods installés (${modsList.length})` : `Installed Mods (${modsList.length})`}</span>
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`px-4 py-2.5 rounded-lg font-mono text-xs font-extrabold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'rules'
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : 'text-zinc-400 hover:text-white bg-zinc-950/40 hover:bg-zinc-900 border border-transparent'
              }`}
            >
              <BookOpen className="w-4 h-4 text-sky-400" />
              <span>{lang === 'fr' ? 'Règles du Monde' : 'World Rules'}</span>
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2.5 rounded-lg font-mono text-xs font-extrabold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                  : 'text-zinc-400 hover:text-red-400 bg-zinc-950/40 hover:bg-red-950/10 border border-transparent'
              }`}
            >
              {isAdminLoggedIn ? (
                <Unlock className="w-4 h-4 text-emerald-400 animate-pulse" />
              ) : (
                <Lock className="w-4 h-4 text-red-500" />
              )}
              <span>{lang === 'fr' ? 'Console Admin' : 'Admin Console'}</span>
            </button>
          </div>

          {/* TAB 1: COCKPIT & STATS */}
          {activeTab === 'status' && (
            <div className="flex flex-col gap-6">
              
              {/* Message of the day MOTD */}
              <div className="bg-black/60 border border-orange-500/15 rounded-xl p-5 relative overflow-hidden backdrop-blur-sm">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
                <h4 className="text-xs font-mono text-orange-400 font-extrabold flex items-center gap-2 uppercase tracking-widest mb-2">
                  <Radio className="w-4 h-4 text-orange-500 animate-pulse" />
                  <span>{lang === 'fr' ? motd.title_fr : motd.title_en}</span>
                </h4>
                <p className="text-zinc-300 font-sans text-xs md:text-sm leading-relaxed font-medium">
                  {lang === 'fr' ? motd.desc_fr : motd.desc_en}
                </p>
              </div>

              {/* Survival Stats Cards (Bento) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Total Zombies Killed */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 flex items-center gap-4">
                  <div className="p-3.5 bg-red-500/5 border border-red-500/10 rounded-lg text-red-500">
                    <Skull className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase block tracking-wider">
                      {lang === 'fr' ? 'Zombies éliminés' : 'Zombies exterminated'}
                    </span>
                    <span className="text-xl font-mono font-black text-red-400 tracking-wider">
                      {totalKillsCount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* World Survival Level */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 flex items-center gap-4">
                  <div className="p-3.5 bg-amber-500/5 border border-amber-500/10 rounded-lg text-amber-500">
                    <Flame className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase block tracking-wider">
                      {lang === 'fr' ? 'Niveau d\'Infection' : 'Global Infection Meter'}
                    </span>
                    <span className="text-xl font-mono font-black text-amber-400 tracking-wider">
                      {isModded ? 'STAGE 4 (Hardcore)' : 'STAGE 2 (Normal)'}
                    </span>
                  </div>
                </div>

                {/* Online Time */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 flex items-center gap-4">
                  <div className="p-3.5 bg-cyan-500/5 border border-cyan-500/10 rounded-lg text-cyan-400">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase block tracking-wider">
                      {lang === 'fr' ? 'Redémarrage' : 'Reboot cycle'}
                    </span>
                    <span className="text-xl font-mono font-black text-cyan-400 tracking-wider uppercase text-ellipsis overflow-hidden block whitespace-nowrap">
                      {server.rb}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Simulation Buttons */}
              <div className="bg-gradient-to-r from-red-950/20 via-zinc-950 to-black border border-red-950/40 rounded-xl p-5">
                <h4 className="font-mono text-xs font-black text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-red-500" />
                  <span>{lang === 'fr' ? 'Centre de Commande Tactique' : 'Tactical Command Operations'}</span>
                </h4>
                <p className="text-zinc-400 font-mono text-[10px] mb-4">
                  {lang === 'fr' 
                    ? 'Simulez des événements du serveur ou envoyez du ravitaillement pour aider les survivants actuellement en ligne.'
                    : 'Simulate server environmental hazards or trigger custom supply cargo plane drops to assist online players.'}
                </p>
                
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={triggerHorde}
                    disabled={hordeTriggered}
                    className="flex-1 min-w-[180px] bg-red-600 hover:bg-red-700 disabled:bg-red-900/20 text-white border border-red-500/25 px-4 py-2.5 rounded font-mono text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Skull className="w-4 h-4 animate-bounce" />
                    <span>{lang === 'fr' ? 'Déclencher Vague Horde' : 'Simulate Horde Wave'}</span>
                  </button>

                  <button
                    onClick={triggerSupplyDrop}
                    className="flex-1 min-w-[180px] bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500/25 px-4 py-2.5 rounded font-mono text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-300 animate-spin" />
                    <span>{lang === 'fr' ? 'Lancer Largage Aérien' : 'Deploy Supply Drop'}</span>
                  </button>
                </div>
              </div>

              {/* Detailed Active Survivants Grid & session metrics */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5">
                <h4 className="font-mono text-xs font-black text-white uppercase tracking-wider mb-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-red-500" />
                    <span>{lang === 'fr' ? 'Survivants en ligne et statistiques par session' : 'Online Survivors & Session Metrics'}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={fetchRealPlayers}
                      disabled={isRefreshingPlayers}
                      className="text-[10px] bg-zinc-900 hover:bg-zinc-850 disabled:opacity-50 text-zinc-300 border border-zinc-800 px-2.5 py-1 rounded flex items-center gap-1.5 font-bold uppercase transition-all cursor-pointer active:scale-95"
                      title={lang === 'fr' ? 'Actualiser la liste' : 'Refresh Player List'}
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshingPlayers ? 'animate-spin text-red-500' : 'text-zinc-400'}`} />
                      <span>{isRefreshingPlayers ? (lang === 'fr' ? 'ACTUALISATION...' : 'REFRESHING...') : (lang === 'fr' ? 'ACTUALISER' : 'REFRESH')}</span>
                    </button>
                    {isRealPlayersLive ? (
                      isTelnetConnected ? (
                        <span className="text-[9px] sm:text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded flex items-center gap-1 font-black">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          {lang === 'fr' ? 'CONNECTÉ VIA TELNET (EN DIRECT)' : 'CONNECTED VIA TELNET (LIVE)'}
                        </span>
                      ) : (
                        <span className="text-[9px] sm:text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded flex items-center gap-1 font-black">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          {lang === 'fr' ? 'CONNECTÉ VIA STEAM QUERY (EN DIRECT)' : 'CONNECTED VIA STEAM QUERY (LIVE)'}
                        </span>
                      )
                    ) : (
                      <span className="text-[9px] sm:text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded flex items-center gap-1 font-black">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        {lang === 'fr' ? 'SIMULATION (PORT QUERY UNREACHABLE)' : 'SIMULATION (PORT QUERY UNREACHABLE)'}
                      </span>
                    )}
                  </div>
                </h4>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-[11px] border-collapse min-w-[550px]">
                    <thead>
                      <tr className="border-b border-zinc-900 text-zinc-500 uppercase text-[9px] tracking-wider">
                        <th className="pb-3 pl-2">{lang === 'fr' ? 'Survivant' : 'Survivor'}</th>
                        <th className="pb-3 text-center">{lang === 'fr' ? 'Session' : 'Session Duration'}</th>
                        <th className="pb-3 text-center">{lang === 'fr' ? 'Cumul Global' : 'Total Time'}</th>
                        <th className="pb-3 text-right">{lang === 'fr' ? 'Zombies Tués' : 'Zombies Killed'}</th>
                        <th className="pb-3 text-right pr-2">{lang === 'fr' ? 'Décès' : 'Deaths'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-zinc-600 font-bold uppercase tracking-wider">
                            {lang === 'fr' 
                              ? 'Aucun survivant actuellement connecté sur le serveur de jeu.' 
                              : 'No survivors currently connected to the game server.'}
                          </td>
                        </tr>
                      ) : (
                        players.map((p) => (
                          <tr 
                            key={p.id} 
                            onClick={() => {
                              setSelectedPlayerId(p.id);
                              setSelectedMapElement({ type: 'player', data: p });
                              setActiveTab('map');
                            }}
                            className="border-b border-zinc-900/30 hover:bg-red-500/5 hover:border-red-500/20 transition-all cursor-pointer group"
                          >
                            <td className="py-3 pl-2 font-black text-white group-hover:text-red-400 transition-colors">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span>{p.name}</span>
                                <span className="text-[9px] font-mono font-normal opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 ml-1">
                                  {lang === 'fr' ? '(cliquer pour localiser)' : '(click to locate)'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 text-center text-amber-400 font-bold">
                              {p.sessionMinutes} min
                            </td>
                            <td className="py-3 text-center text-cyan-400 font-bold">
                              {p.totalTimeHours} h
                            </td>
                            <td className="py-3 text-right font-bold text-red-400">
                              {p.zombieKills.toLocaleString()} 🧟
                            </td>
                            <td className="py-3 text-right text-zinc-500 font-bold pr-2">
                              {p.deaths}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: D3 GEOGRAPHIC POST-APOCALYPTIC MAP */}
          {activeTab === 'map' && (
            <div className="flex flex-col gap-4">
              
               {/* Map controls panel */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <Compass className="w-4 h-4 text-emerald-400 animate-spin" />
                  <span className="font-bold text-white uppercase mr-1">{lang === 'fr' ? 'Radar Géographique Interactif D3.js' : 'Geographical Interactive D3.js Radar'}</span>
                  
                  <button
                    onClick={() => setShowMapConfig(!showMapConfig)}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-all cursor-pointer flex items-center gap-1 uppercase ${
                      showMapConfig 
                        ? 'bg-red-500/25 text-red-400 border-red-500/40' 
                        : 'bg-zinc-900 text-zinc-400 border-zinc-850 hover:border-zinc-700 hover:text-white'
                    }`}
                  >
                    <Settings className="w-3 h-3" />
                    <span>{lang === 'fr' ? 'Relier ma Carte' : 'Link my Map'}</span>
                  </button>
                </div>
                
                {/* Visual filter checks */}
                <div className="flex flex-wrap gap-2">
                  {Object.entries(mapFilter).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => setMapFilter(prev => ({ ...prev, [key]: !value }))}
                      className={`px-2.5 py-1 rounded text-[9px] font-mono font-black uppercase border transition-all cursor-pointer ${
                        value 
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/45 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                          : 'bg-zinc-900/40 text-zinc-600 border-zinc-950 hover:border-zinc-800'
                      }`}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>

              {/* Collapsible Custom Map Upload / Configuration Form */}
              {showMapConfig && (
                <div className="bg-zinc-950 border border-red-500/20 rounded-xl p-5 space-y-4 font-sans text-xs animate-fadeIn shadow-[0_4px_30px_rgba(0,0,0,0.6)]">
                  <div className="border-b border-zinc-900 pb-2 flex justify-between items-center">
                    <h4 className="text-sm font-bold text-red-500 font-mono uppercase flex items-center gap-1.5">
                      <Settings className="w-4 h-4 text-red-500" />
                      <span>{lang === 'fr' ? 'Relier votre propre carte de jeu' : 'Connect Your Custom Map'}</span>
                    </h4>
                    <span className="text-[10px] text-zinc-500 font-mono bg-zinc-900 px-2 py-0.5 rounded border border-zinc-850 uppercase">
                      7 Days to Die
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Column 1: Map Name & Scale size */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                          {lang === 'fr' ? 'Nom du serveur / Carte (Secteur)' : 'Map Name / Sector'}
                        </label>
                        <input
                          type="text"
                          value={customMapName}
                          onChange={(e) => setCustomMapName(e.target.value)}
                          placeholder="e.g. Navezgane, Custom World, GenWorld..."
                          className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-white focus:outline-none focus:border-red-500/50 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                          {lang === 'fr' ? 'Taille de la carte (Largeur en blocs)' : 'Map Size (Width in blocks)'}
                        </label>
                        <input
                          type="number"
                          value={customMapSize}
                          onChange={(e) => setCustomMapSize(Math.max(100, parseInt(e.target.value) || 8000))}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-white focus:outline-none focus:border-red-500/50 font-mono"
                        />
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {[4096, 6144, 8192, 10240, 16384].map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => setCustomMapSize(size)}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono border transition-all cursor-pointer ${
                                customMapSize === size
                                  ? 'bg-red-500/20 text-red-400 border-red-500/40 font-bold'
                                  : 'bg-zinc-900 text-zinc-500 border-zinc-900 hover:border-zinc-800'
                              }`}
                            >
                              {size} ({size / 1024}k)
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Map Image File Upload */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        {lang === 'fr' ? 'Uploader l\'image de la carte (PNG/JPG)' : 'Upload Map Image (PNG/JPG)'}
                      </label>
                      <div className="border border-dashed border-zinc-800 hover:border-red-500/40 rounded-lg p-4 flex flex-col items-center justify-center text-center bg-zinc-900/25 hover:bg-zinc-900/45 transition-all relative min-h-[110px]">
                        <Upload className="w-5 h-5 text-zinc-500 mb-1" />
                        <span className="text-[10px] text-zinc-400 font-mono mb-0.5">
                          {lang === 'fr' ? 'Parcourir ou déposer' : 'Click to upload map file'}
                        </span>
                        <span className="text-[9px] text-zinc-600 block">
                          {lang === 'fr' ? 'biomes.png ou Map.png' : 'e.g. biomes.png / Map.png'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleMapImageUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </div>
                    </div>

                    {/* Column 3: Map Image URL and actions */}
                    <div className="space-y-3 flex flex-col justify-between">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                          {lang === 'fr' ? 'OU URL directe de l\'image' : 'OR Direct Image URL'}
                        </label>
                        <input
                          type="text"
                          value={customMapImage && !customMapImage.startsWith('data:') ? customMapImage : ''}
                          onChange={(e) => setCustomMapImage(e.target.value)}
                          placeholder="https://mon-site.com/map.png"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-white focus:outline-none focus:border-red-500/50 font-mono"
                        />
                      </div>

                      <div className="flex gap-2">
                        {customMapImage && (
                          <button
                            type="button"
                            onClick={() => setCustomMapImage('')}
                            className="flex-1 bg-red-950/40 hover:bg-red-900/30 text-red-400 border border-red-500/25 py-2 px-3 rounded font-mono text-[9px] font-bold uppercase transition-all cursor-pointer"
                          >
                            {lang === 'fr' ? 'Réinitialiser' : 'Reset Map'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowMapConfig(false)}
                          className="flex-1 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 py-2 px-3 rounded font-mono text-[9px] font-bold uppercase transition-all cursor-pointer"
                        >
                          {lang === 'fr' ? 'Fermer' : 'Close'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {customMapImage && (
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded p-2.5 flex items-center gap-2 text-[10px] text-emerald-400/90 leading-tight">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>
                        {lang === 'fr' 
                          ? `Votre carte personnalisée est ACTIVE ! Les coordonnées GPS et positions des joueurs se calibrent désormais sur votre grille de ${customMapSize}x${customMapSize} blocs.`
                          : `Custom map is ACTIVE! GPS coords and player positions are now calibrated on your ${customMapSize}x${customMapSize} blocks grid.`}
                      </span>
                    </div>
                  )}

                  {/* SFTP Connection option */}
                  <div className="border-t border-zinc-900 pt-4 mt-4">
                    <h5 className="text-[11px] font-bold text-red-500 font-mono uppercase flex items-center gap-1.5 mb-3">
                      <Server className="w-3.5 h-3.5 text-red-500" />
                      <span>{lang === 'fr' ? 'Option : Se connecter au serveur SFTP de la carte' : 'Option: Connect to Map SFTP Server'}</span>
                    </h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* IP, Port & Username */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                              {lang === 'fr' ? 'HÔTE SFTP (IP/NOM)' : 'SFTP HOST (IP/NAME)'}
                            </label>
                            <input
                              type="text"
                              value={sftpHost}
                              onChange={(e) => setSftpHost(e.target.value)}
                              placeholder="12.34.56.78"
                              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-white focus:outline-none focus:border-red-500/50 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                              PORT
                            </label>
                            <input
                              type="text"
                              value={sftpPort}
                              onChange={(e) => setSftpPort(e.target.value)}
                              placeholder="22"
                              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-white focus:outline-none focus:border-red-500/50 font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                            {lang === 'fr' ? 'UTILISATEUR SFTP' : 'SFTP USERNAME'}
                          </label>
                          <input
                            type="text"
                            value={sftpUser}
                            onChange={(e) => setSftpUser(e.target.value)}
                            placeholder="root"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-white focus:outline-none focus:border-red-500/50 font-mono"
                          />
                        </div>
                      </div>

                      {/* Password & Folder directory */}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                            <span>{lang === 'fr' ? 'MOT DE PASSE SFTP' : 'SFTP PASSWORD'}</span>
                            <span className="text-[8px] text-zinc-600 font-normal">({lang === 'fr' ? 'Stocké localement' : 'Stored locally'})</span>
                          </label>
                          <input
                            type="password"
                            value={sftpPass}
                            onChange={(e) => setSftpPass(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-white focus:outline-none focus:border-red-500/50 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                            {lang === 'fr' ? 'DOSSIER DE LA CARTE (SUR LE SERVEUR)' : 'MAP REMOTE FOLDER DIRECTORY'}
                          </label>
                          <input
                            type="text"
                            value={sftpFolder}
                            onChange={(e) => setSftpFolder(e.target.value)}
                            placeholder="/home/sdtd/Saves/Navezgane/MyServer/"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-white focus:outline-none focus:border-red-500/50 font-mono"
                          />
                        </div>
                      </div>

                      {/* File Name & Download Trigger */}
                      <div className="space-y-3 flex flex-col justify-between">
                        <div>
                          <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                            {lang === 'fr' ? 'NOM DU FICHIER CARTE' : 'MAP IMAGE FILENAME'}
                          </label>
                          <input
                            type="text"
                            value={sftpFileName}
                            onChange={(e) => setSftpFileName(e.target.value)}
                            placeholder="biomes.png"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-white focus:outline-none focus:border-red-500/50 font-mono"
                          />
                          <span className="text-[9px] text-zinc-600 block mt-1">
                            {lang === 'fr' ? 'Généralement "biomes.png" ou "Map.png"' : 'Usually "biomes.png" or "Map.png"'}
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={isSftpLoading}
                          onClick={handleSftpMapDownload}
                          className="w-full bg-red-600 hover:bg-red-500 text-white font-mono text-[10px] font-bold uppercase py-2 px-3 rounded shadow-[0_0_15px_rgba(239,68,68,0.2)] disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all flex items-center justify-center gap-1.5 cursor-pointer h-[34px]"
                        >
                          {isSftpLoading ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>{lang === 'fr' ? 'TÉLÉCHARGEMENT...' : 'DOWNLOADING...'}</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-3.5 h-3.5" />
                              <span>{lang === 'fr' ? 'TÉLÉCHARGER VIA SFTP' : 'DOWNLOAD VIA SFTP'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* SFTP Status messages */}
                    {sftpError && (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded p-2.5 mt-3 text-[10px] flex items-start gap-2 leading-relaxed font-mono">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                        <span>{sftpError}</span>
                      </div>
                    )}

                    {sftpSuccessMsg && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded p-2.5 mt-3 text-[10px] flex items-center gap-2 leading-relaxed font-mono">
                        <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span>{sftpSuccessMsg}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Dynamic Coordinate HUD & Interactive Legend */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Simulated GPS Coordinate HUD */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-3 flex items-center justify-between font-mono text-xs">
                  <div className="text-zinc-500 uppercase text-[9px] block tracking-wider leading-none">
                    {lang === 'fr' ? 'GPS Actuel' : 'Target Coordinates'}
                  </div>
                  <div className="text-right">
                    {hoveredCoords ? (
                      <span className="text-emerald-400 font-bold">
                        {Math.round((hoveredCoords.x - 50) * (customMapSize / 100 || 80))} E, {Math.round((50 - hoveredCoords.y) * (customMapSize / 100 || 80))} N
                      </span>
                    ) : (
                      <span className="text-zinc-600">-- E, -- N</span>
                    )}
                  </div>
                </div>

                {/* Selected Player Focus indicator */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-3 flex items-center justify-between font-mono text-xs">
                  <span className="text-zinc-500 uppercase text-[9px] block tracking-wider leading-none">
                    {lang === 'fr' ? 'Focus Actif' : 'GPS Focus'}
                  </span>
                  <div className="text-right">
                    {selectedPlayerId ? (
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        <span className="text-white font-black">
                          {players.find(p => p.id === selectedPlayerId)?.name || 'Unknown'}
                        </span>
                        <button 
                          onClick={() => { setSelectedPlayerId(null); setSelectedMapElement(null); }}
                          className="text-red-500 hover:text-white text-[10px] uppercase font-bold ml-1"
                        >
                          [X]
                        </button>
                      </div>
                    ) : (
                      <span className="text-zinc-600">{lang === 'fr' ? 'Aucun' : 'None'}</span>
                    )}
                  </div>
                </div>

                {/* Quick Interactive Map Actions */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-3 flex items-center justify-between font-mono text-xs">
                  <span className="text-zinc-500 uppercase text-[9px] block tracking-wider leading-none">
                    {lang === 'fr' ? 'Simulation' : 'Quick Actions'}
                  </span>
                  <button
                    onClick={() => {
                      // Trigger a supply drop at a completely random location
                      const rx = 15 + Math.random() * 70;
                      const ry = 15 + Math.random() * 70;
                      setSupplyDropCoords({ x: rx, y: ry });
                      setSelectedMapElement({
                        type: 'claim',
                        data: { name: 'Emergency Supply Drop Cargo', owner: 'Airdrop Plane', health: 100, x: rx, y: ry }
                      });
                      const scale = customMapSize / 100 || 80;
                      setAlertText(lang === 'fr' ? `✈️ LARGAGE EN COURS ! Ravitaillement parachuté en [X: ${Math.round((rx - 50) * scale)}, Y: ${Math.round((50 - ry) * scale)}]` : `✈️ SUPPLY DROP INCOMING! Cargo plane parachuted medical supplies at [X: ${Math.round((rx - 50) * scale)}, Y: ${Math.round((50 - ry) * scale)}]`);
                    }}
                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded text-[10px] font-black uppercase transition-all"
                  >
                    {lang === 'fr' ? 'Parachuter Ravitaillement' : 'Trigger Airdrop'}
                  </button>
                </div>
              </div>

              {/* Layout for Map + Details Side Panel */}
              <div className="flex flex-col lg:flex-row gap-6">
                
                {/* Map View Canvas */}
                <div className={isFullscreenMap 
                  ? "fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 md:p-8" 
                  : "flex-1 bg-[#0b0c10] border border-zinc-900 rounded-2xl overflow-hidden aspect-square max-w-[550px] mx-auto w-full relative group shadow-[0_0_50px_rgba(0,0,0,0.8)]"
                }>
                  <div className={isFullscreenMap ? "w-full h-full max-w-[90vh] max-h-[90vh] aspect-square relative bg-[#0b0c10] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-center" : "w-full h-full relative"}>
                    
                    {/* Subtle Grid Overlay and coordinates marks on map edges */}
                    <div className="absolute inset-0 pointer-events-none border border-zinc-800/40 z-10" />
                    
                    {/* SVG D3 Stage Render */}
                    <svg 
                      className={`w-full h-full relative select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`} 
                    viewBox="0 0 100 100" 
                    preserveAspectRatio="none"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    onWheel={handleWheel}
                  >
                    <g transform={`translate(${panX}, ${panY}) scale(${zoomScale})`}>
                      
                      {/* Map Grid Lines */}
                      {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(gridLine => (
                        <g key={`grid-${gridLine}`}>
                          {/* Vertical line */}
                          <line 
                            x1={gridLine} 
                            y1="0" 
                            x2={gridLine} 
                            y2="100" 
                            stroke="rgba(255, 255, 255, 0.04)" 
                            strokeWidth="0.15" 
                          />
                          {/* Horizontal line */}
                          <line 
                            x1="0" 
                            y1={gridLine} 
                            x2="100" 
                            y2={gridLine} 
                            stroke="rgba(255, 255, 255, 0.04)" 
                            strokeWidth="0.15" 
                          />
                        </g>
                      ))}

                      {/* Custom Map Image background or Biome contours */}
                      {customMapImage ? (
                        <image
                          href={customMapImage}
                          x="0"
                          y="0"
                          width="100"
                          height="100"
                          preserveAspectRatio="none"
                          opacity="0.9"
                        />
                      ) : (
                        <>
                          {/* Dynamic Biome contours */}
                          {mapFilter.biomes && d3MapData.map((layer, idx) => {
                            // Highly visible, themed colors for 7 Days to Die biomes
                            let fill = 'rgba(20, 110, 75, 0.45)'; // Pine Forest (vibrant green)
                            let stroke = 'rgba(34, 197, 94, 0.5)';
                            
                            if (layer.elevation <= -12) {
                              // River / Lake Waterways
                              fill = 'rgba(6, 182, 212, 0.55)';
                              stroke = 'rgba(34, 211, 238, 0.7)';
                            } else if (layer.elevation < -4) {
                              // Wasteland: Dark polluted terrain
                              fill = 'rgba(63, 63, 70, 0.75)';
                              stroke = 'rgba(113, 113, 122, 0.45)';
                            } else if (layer.elevation > -4 && layer.elevation <= 4) {
                              // Burnt Forest: Ash red
                              fill = 'rgba(127, 29, 29, 0.55)';
                              stroke = 'rgba(239, 68, 68, 0.4)';
                            } else if (layer.elevation > 12 && layer.elevation <= 22) {
                              // Desert biome: Sandy gold
                              fill = 'rgba(161, 98, 7, 0.5)';
                              stroke = 'rgba(234, 179, 8, 0.4)';
                            } else if (layer.elevation > 22) {
                              // Snow biome: Icy alpine white
                              fill = 'rgba(241, 245, 249, 0.75)';
                              stroke = 'rgba(203, 213, 225, 0.55)';
                            }

                            return (
                              <path
                                key={`map-contour-${idx}`}
                                d={layer.path}
                                fill={fill}
                                stroke={stroke}
                                strokeWidth="0.35"
                                className="transition-all duration-700"
                              />
                            );
                          })}

                          {/* Procedural Roads & Sector Lines (highly aesthetic) */}
                          {mapFilter.biomes && (
                            <>
                              {/* Highway 73 (Horizontal West-to-East) */}
                              <path 
                                d="M 0,48 Q 25,43 50,52 T 100,48" 
                                fill="none" 
                                stroke="rgba(250, 204, 21, 0.35)" 
                                strokeWidth="0.5" 
                                strokeDasharray="1.5,1.5" 
                              />
                              {/* Route 9 (Vertical North-to-South) */}
                              <path 
                                d="M 55,0 Q 45,30 52,65 T 48,100" 
                                fill="none" 
                                stroke="rgba(250, 204, 21, 0.35)" 
                                strokeWidth="0.5" 
                                strokeDasharray="1.5,1.5" 
                              />

                              {/* Sector Labels overlay */}
                              <text x="18" y="16" fill="rgba(255,255,255,0.4)" fontSize="2px" fontWeight="bold" className="pointer-events-none select-none font-mono tracking-widest uppercase">
                                {lang === 'fr' ? 'ZONE DE RUST / WASTELAND' : 'WASTELAND SECTOR'}
                              </text>
                              <text x="76" y="20" fill="rgba(255,255,255,0.5)" fontSize="2px" fontWeight="bold" className="pointer-events-none select-none font-mono tracking-widest uppercase">
                                {lang === 'fr' ? 'ALPES ENNEIGÉES / SNOW' : 'SNOW SECTOR'}
                              </text>
                              <text x="24" y="38" fill="rgba(255,255,255,0.4)" fontSize="2px" fontWeight="bold" className="pointer-events-none select-none font-mono tracking-widest uppercase">
                                {lang === 'fr' ? 'FORÊT DE PINS' : 'PINE FOREST'}
                              </text>
                              <text x="75" y="82" fill="rgba(255,255,255,0.45)" fontSize="2px" fontWeight="bold" className="pointer-events-none select-none font-mono tracking-widest uppercase">
                                {lang === 'fr' ? 'DÉSERT ARIDE' : 'DESERT SECTOR'}
                              </text>
                              <text x="18" y="78" fill="rgba(255,255,255,0.4)" fontSize="2px" fontWeight="bold" className="pointer-events-none select-none font-mono tracking-widest uppercase">
                                {lang === 'fr' ? 'FORÊT BRÛLÉE' : 'BURNED FOREST'}
                              </text>
                              <text x="45" y="55" fill="rgba(6, 182, 212, 0.6)" fontSize="1.6px" fontWeight="bold" className="pointer-events-none select-none font-mono tracking-widest uppercase" transform="rotate(-5, 45, 55)">
                                {lang === 'fr' ? 'RIVIÈRE DE RECONSTRUCT' : 'Navezgane River'}
                              </text>
                            </>
                          )}
                        </>
                      )}

                      {/* Radiated Outer Boundary Border (D3) */}
                      {mapFilter.radiation && (
                        <rect 
                          x="1.5" 
                          y="1.5" 
                          width="97" 
                          height="97" 
                          fill="none" 
                          stroke="rgba(34, 197, 94, 0.25)" 
                          strokeWidth="1.2" 
                          strokeDasharray="1.5,1.5" 
                          className="animate-pulse"
                        />
                      )}

                      {/* Survival Land Claim Protection Blocks */}
                      {mapFilter.claims && players.map(p => {
                        if (!p.claimX || !p.claimY) return null;
                        const isTargeted = selectedMapElement?.type === 'claim' && selectedMapElement.data.id === p.id;
                        return (
                          <g 
                            key={`claim-group-${p.id}`} 
                            className="cursor-pointer"
                            onClick={() => setSelectedMapElement({
                              type: 'claim',
                              data: { name: p.claimName || 'Land Claim Block', owner: p.name, health: 100, x: p.claimX, y: p.claimY }
                            })}
                          >
                            {/* Claim box bounds */}
                            <rect
                              x={(p.claimX || 0) - 6}
                              y={(p.claimY || 0) - 6}
                              width="12"
                              height="12"
                              fill={isTargeted ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.02)"}
                              stroke={isTargeted ? "#ef4444" : "rgba(239, 68, 68, 0.25)"}
                              strokeWidth={isTargeted ? "0.4" : "0.2"}
                              className="transition-all duration-300"
                            />
                            {/* Claim center node */}
                            <rect
                              x={(p.claimX || 0) - 0.8}
                              y={(p.claimY || 0) - 0.8}
                              width="1.6"
                              height="1.6"
                              fill="#ef4444"
                              className="animate-pulse"
                            />
                          </g>
                        );
                      })}

                      {/* Landmarks / Trader Outposts */}
                      {mapFilter.traders && landmarks.map(m => {
                        let color = '#a3e635'; // Trader - Lime
                        if (m.type === 'city') color = '#cbd5e1'; // City - Gray
                        if (m.type === 'military') color = '#f97316'; // Military - Orange
                        if (m.type === 'hazard') color = '#ef4444'; // Danger - Red
                        const isTargeted = selectedMapElement?.type === 'landmark' && selectedMapElement.data.id === m.id;

                        return (
                          <g 
                            key={`landmark-${m.id}`} 
                            className="cursor-pointer"
                            onClick={() => setSelectedMapElement({ type: 'landmark', data: m })}
                          >
                            <circle
                              cx={m.x}
                              cy={m.y}
                              r={isTargeted ? "2.2" : "1.5"}
                              fill={color}
                              stroke="#000"
                              strokeWidth="0.3"
                              className="transition-all"
                            />
                            <circle
                              cx={m.x}
                              cy={m.y}
                              r="3"
                              fill="none"
                              stroke={color}
                              strokeWidth="0.15"
                              className="animate-ping"
                            />
                          </g>
                        );
                      })}

                      {/* Live Survivors positions */}
                      {mapFilter.players && players.map(p => {
                        if (p.status === 'dead') return null;
                        const isTargeted = selectedPlayerId === p.id;
                        const displayName = p.name ? p.name.trim() : (lang === 'fr' ? 'Survivant' : 'Survivor');
                        return (
                          <g 
                            key={`player-node-${p.id}`} 
                            className="cursor-pointer transition-all duration-1000"
                            onClick={() => {
                              setSelectedPlayerId(p.id);
                              setSelectedMapElement({ type: 'player', data: p });
                            }}
                          >
                            {/* Pulsing ring if focused */}
                            {isTargeted && (
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r="5"
                                fill="none"
                                stroke="#00ffcc"
                                strokeWidth="0.3"
                                className="animate-ping"
                              />
                            )}
                            {/* Player base circle */}
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={isTargeted ? "1.8" : "1.2"}
                              fill="#00ffcc"
                              stroke="#000"
                              strokeWidth="0.3"
                              className="transition-all"
                            />
                            {/* Player name label on map */}
                            <text
                              x={p.x + 2}
                              y={p.y + 0.6}
                              fill="#00ffcc"
                              fontSize="1.6px"
                              fontWeight="bold"
                              className="pointer-events-none select-none font-mono filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]"
                            >
                              {displayName}
                            </text>
                          </g>
                        );
                      })}

                      {/* Live simulated Supply Drop crate */}
                      {supplyDropCoords && (
                        <g 
                          className="animate-bounce cursor-pointer"
                          onClick={() => setSelectedMapElement({
                            type: 'claim',
                            data: { name: 'Emergency Supply Drop Cargo', owner: 'Airdrop Plane', health: 100, x: supplyDropCoords.x, y: supplyDropCoords.y }
                          })}
                        >
                          <circle
                            cx={supplyDropCoords.x}
                            cy={supplyDropCoords.y}
                            r="3"
                            fill="rgba(16, 185, 129, 0.3)"
                            className="animate-ping"
                          />
                          <path 
                            d={`M ${supplyDropCoords.x - 1.8},${supplyDropCoords.y - 1.8} L ${supplyDropCoords.x + 1.8},${supplyDropCoords.y - 1.8} L ${supplyDropCoords.x},${supplyDropCoords.y + 1.8} Z`}
                            fill="#10b981"
                            stroke="#fff"
                            strokeWidth="0.35"
                          />
                        </g>
                      )}

                    </g>
                  </svg>

                  {/* Dynamic map title label in top-left */}
                  <div className="absolute top-3 left-3 bg-black/85 border border-zinc-900/50 px-2 py-1 rounded font-mono text-[9px] text-zinc-400 select-none z-10">
                    <span className="text-zinc-600">MAP SECTOR:</span> <span className="text-emerald-400 font-bold uppercase">{customMapName}</span>
                  </div>

                  {/* Floating Interactive Zoom Controls */}
                  <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-20">
                    <button
                      type="button"
                      onClick={() => setIsFullscreenMap(!isFullscreenMap)}
                      className="w-8 h-8 rounded-lg bg-black/85 border border-zinc-800 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/50 flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95"
                      title={isFullscreenMap ? (lang === 'fr' ? 'Quitter Plein Écran' : 'Exit Fullscreen') : (lang === 'fr' ? 'Plein Écran' : 'Fullscreen')}
                    >
                      {isFullscreenMap ? <Minimize2 className="w-4.5 h-4.5 text-red-500" /> : <Maximize className="w-4.5 h-4.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleZoomIn}
                      className="w-8 h-8 rounded-lg bg-black/85 border border-zinc-800 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/50 flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95"
                      title={lang === 'fr' ? 'Zoomer' : 'Zoom In'}
                    >
                      <ZoomIn className="w-4.5 h-4.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleZoomOut}
                      className="w-8 h-8 rounded-lg bg-black/85 border border-zinc-800 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/50 flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95"
                      title={lang === 'fr' ? 'Dézoomer' : 'Zoom Out'}
                    >
                      <ZoomOut className="w-4.5 h-4.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleResetZoom}
                      className="px-2 h-8 rounded-lg bg-black/85 border border-zinc-800 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/50 flex items-center justify-center text-[8px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer shadow-lg active:scale-95"
                      title={lang === 'fr' ? 'Réinitialiser' : 'Reset View'}
                    >
                      RESET
                    </button>
                  </div>

                </div>
              </div>

                {/* Details Side Panel */}
                <div className="w-full lg:w-[280px] flex flex-col gap-4">
                  
                  {/* Selected Element Details */}
                  <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h5 className="font-mono text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-1">
                        <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{lang === 'fr' ? 'Inspecteur de Secteur' : 'Sector Inspector'}</span>
                      </h5>

                      <AnimatePresence mode="wait">
                        {selectedMapElement ? (
                          <motion.div
                            key={selectedMapElement.data.name || selectedMapElement.data.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="space-y-3 font-mono text-xs"
                          >
                            <div className="bg-zinc-900/60 border border-zinc-800 p-2.5 rounded">
                              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
                                {selectedMapElement.type === 'player' ? (lang === 'fr' ? 'Survivant détecté' : 'Online survivor') : (lang === 'fr' ? 'Repère Géographique' : 'Landmark')}
                              </div>
                              <div className="text-white font-black text-sm mt-0.5">
                                {selectedMapElement.type === 'player' ? selectedMapElement.data.name : selectedMapElement.data.name}
                              </div>
                            </div>

                            {selectedMapElement.type === 'player' && (
                              <div className="space-y-1.5 text-[11px]">
                                <div className="flex justify-between border-b border-zinc-900 pb-1">
                                  <span className="text-zinc-500">{lang === 'fr' ? 'Zombies éliminés' : 'Undead kills'}</span>
                                  <span className="text-red-400 font-bold">{selectedMapElement.data.zombieKills} 🧟</span>
                                </div>
                                <div className="flex justify-between border-b border-zinc-900 pb-1">
                                  <span className="text-zinc-500">{lang === 'fr' ? 'Santé' : 'Health status'}</span>
                                  <span className="text-emerald-400 font-bold">{selectedMapElement.data.health}% HP</span>
                                </div>
                                <div className="flex justify-between border-b border-zinc-900 pb-1">
                                  <span className="text-zinc-500">{lang === 'fr' ? 'État' : 'Activity'}</span>
                                  <span className="text-amber-400 font-bold uppercase">{selectedMapElement.data.status}</span>
                                </div>
                                <div className="flex justify-between pb-1">
                                  <span className="text-zinc-500">{lang === 'fr' ? 'Position GPS' : 'GPS Coordinates'}</span>
                                  <span className="text-cyan-400 font-bold">
                                    {Math.round((selectedMapElement.data.x - 50) * (customMapSize / 100 || 80))} E, {Math.round((50 - selectedMapElement.data.y) * (customMapSize / 100 || 80))} N
                                  </span>
                                </div>
                              </div>
                            )}

                            {selectedMapElement.type === 'landmark' && (
                              <div className="space-y-2">
                                <p className="text-[10px] text-zinc-400 leading-relaxed font-sans bg-zinc-900/40 p-2 rounded border border-zinc-900">
                                  {lang === 'fr' ? selectedMapElement.data.desc_fr : selectedMapElement.data.desc_en}
                                </p>
                                <div className="space-y-1 text-[11px]">
                                  <div className="flex justify-between border-b border-zinc-900 pb-1">
                                    <span className="text-zinc-500">Type</span>
                                    <span className="text-amber-400 font-bold uppercase">{selectedMapElement.data.type}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-zinc-500">{lang === 'fr' ? 'Coordonnées' : 'Coordinates'}</span>
                                    <span className="text-cyan-400 font-bold">
                                      {Math.round((selectedMapElement.data.x - 50) * (customMapSize / 100 || 80))} E, {Math.round((50 - selectedMapElement.data.y) * (customMapSize / 100 || 80))} N
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {selectedMapElement.type === 'claim' && (
                              <div className="space-y-1.5 text-[11px]">
                                <div className="flex justify-between border-b border-zinc-900 pb-1">
                                  <span className="text-zinc-500">{lang === 'fr' ? 'Propriétaire' : 'Owner'}</span>
                                  <span className="text-white font-bold">{selectedMapElement.data.owner}</span>
                                </div>
                                <div className="flex justify-between border-b border-zinc-900 pb-1">
                                  <span className="text-zinc-500">{lang === 'fr' ? 'Résistance' : 'Resistance factor'}</span>
                                  <span className="text-emerald-400 font-bold">32x (Offline protected)</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-zinc-500">{lang === 'fr' ? 'Secteur' : 'Claim Coordinates'}</span>
                                  <span className="text-cyan-400 font-bold">
                                    {Math.round((selectedMapElement.data.x - 50) * (customMapSize / 100 || 80))} E, {Math.round((50 - selectedMapElement.data.y) * (customMapSize / 100 || 80))} N
                                  </span>
                                </div>
                              </div>
                            )}

                          </motion.div>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-6 text-zinc-500 font-mono text-[10px] space-y-2"
                          >
                            <Compass className="w-6 h-6 text-zinc-700 mx-auto animate-pulse" />
                            <p className="leading-normal">
                              {lang === 'fr' 
                                ? 'Survolez la carte pour lire les coordonnées GPS.\nCliquez sur un marqueur pour inspecter.' 
                                : 'Hover map to read coordinates in real-time.\nClick any marker to inspect.'}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Join/Simulate Player Widget */}
                    <div className="mt-4 pt-4 border-t border-zinc-900 space-y-2 font-mono">
                      <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest block">
                        {lang === 'fr' ? 'Rejoindre le radar live' : 'Join live radar'}
                      </span>
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          placeholder={lang === 'fr' ? 'Nom du survivant...' : 'Survivor name...'}
                          value={customPlayerName}
                          onChange={(e) => setCustomPlayerName(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-red-500/50"
                        />
                        <input
                          type="text"
                          placeholder={lang === 'fr' ? 'Steam ID (Optionnel)...' : 'Steam ID (Optional)...'}
                          value={customPlayerSteamId}
                          onChange={(e) => setCustomPlayerSteamId(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-red-500/50"
                        />
                        <button
                          onClick={() => {
                            if (!customPlayerName.trim()) return;
                            const newId = `custom-p-${Date.now()}`;
                            const rx = 20 + Math.random() * 60;
                            const ry = 20 + Math.random() * 60;
                            const newPlayer: SurvivalPlayer = {
                              id: newId,
                              name: customPlayerName.trim(),
                              steamId: customPlayerSteamId.trim() || undefined,
                              role: "",
                              sessionTime: "1m",
                              sessionMinutes: 1,
                              totalTimeHours: 1,
                              zombieKills: 0,
                              deaths: 0,
                              health: 100,
                              status: 'scavenging',
                              x: rx,
                              y: ry,
                              claimX: rx - 3,
                              claimY: ry + 3,
                              claimName: `Camp ${customPlayerName.trim()}`
                            };
                            setPlayers(prev => [...prev, newPlayer]);
                            setSelectedPlayerId(newId);
                            setSelectedMapElement({ type: 'player', data: newPlayer });
                            setCustomPlayerName('');
                            setCustomPlayerSteamId('');
                            setAlertText(lang === 'fr' ? `👋 BIENVENUE ! Le survivant ${newPlayer.name} vient de se connecter au serveur.` : `👋 WELCOME! Survivor ${newPlayer.name} has just connected to the server.`);
                          }}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2.5 rounded text-[10px] uppercase transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{lang === 'fr' ? 'Se connecter au Radar' : 'Connect to Radar'}</span>
                        </button>
                      </div>
                    </div>

                  </div>

                </div>

              </div>

            </div>
          )}

          {/* TAB 3: INSTALLED SERVER MODS LIST */}
          {activeTab === 'mods' && (
            <div className="flex flex-col gap-4">
              
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 overflow-hidden">
                <h5 className="font-mono text-xs font-black text-white uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-zinc-900 pb-3">
                  <FileCode className="w-4 h-4 text-emerald-400" />
                  <span>{lang === 'fr' ? 'Registre des Modificateurs de Survie' : 'Survival Modifiers Registry'}</span>
                </h5>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-[11px] border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-zinc-900 text-zinc-500 uppercase text-[9px] tracking-wider">
                        <th className="pb-3 pl-2">{lang === 'fr' ? 'Nom du Mod' : 'Mod Name'}</th>
                        <th className="pb-3">{lang === 'fr' ? 'Version' : 'Version'}</th>
                        <th className="pb-3">{lang === 'fr' ? 'Auteur' : 'Author'}</th>
                        <th className="pb-3 text-right pr-2">{lang === 'fr' ? 'Fichiers' : 'Files Download'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modsList.map((mod) => (
                        <tr key={mod.id} className="border-b border-zinc-900/30 hover:bg-zinc-900/10 transition-all">
                          <td className="py-2.5 pl-2 font-semibold text-white">
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-500">✔</span>
                              <span>{mod.name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 text-zinc-400 font-mono">
                            <span className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-300">
                              v{mod.version}
                            </span>
                          </td>
                          <td className="py-2.5 text-zinc-300">{mod.author}</td>
                          <td className="py-2.5 text-right pr-2">
                            <a
                              href={mod.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/25 px-2.5 py-0.5 rounded text-[10px] font-black uppercase transition-all"
                            >
                              <span>{lang === 'fr' ? 'Télécharger' : 'Download'}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Detailed Mods configs grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {modsList.map(mod => (
                  <div key={mod.id} className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-black text-white">{mod.name}</span>
                        <span className="text-[9px] font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                          {lang === 'fr' ? 'ACTIF' : 'ACTIVE'}
                        </span>
                      </div>
                      
                      <p className="text-xs text-zinc-400 leading-relaxed font-sans mb-4">
                        {lang === 'fr' ? mod.desc_fr : mod.desc_en}
                      </p>
                    </div>

                    <div className="border-t border-zinc-900 pt-3 space-y-2">
                      <span className="text-[9px] font-mono text-zinc-500 block uppercase tracking-widest">{lang === 'fr' ? 'Paramètres injectés' : 'Injected parameters'}</span>
                      {mod.configs.map((cfg, index) => (
                        <div key={index} className="flex justify-between items-center font-mono text-[10px]">
                          <span className="text-zinc-500">{cfg.key}</span>
                          <span className="text-red-400 font-bold">{cfg.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* TAB 4: DETAILED SERVER RULES CONFIG */}
          {activeTab === 'rules' && (
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5">
              <h4 className="font-mono text-xs font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'fr' ? 'Configuration globale des règles de survie' : 'Global Survival Rules Configuration'}</span>
              </h4>
              <p className="text-zinc-400 font-mono text-[10px] mb-5 leading-relaxed">
                {lang === 'fr' 
                  ? "Ces variables déterminent l'intensité de la survie, la résistance des structures et les pénalités appliquées aux rescapés de l'apocalypse."
                  : "These core game parameters configure the difficulty multipliers, structure decay, blocks protection, and airdrop cycles."}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rules.map((rule, idx) => (
                  <div key={idx} className="bg-black/50 border border-zinc-900 rounded-lg p-3 flex justify-between items-start gap-4">
                    <div>
                      <span className="font-mono text-xs text-white font-bold block">
                        {lang === 'fr' ? rule.key_fr : rule.key_en}
                      </span>
                      <span className="font-mono text-[9px] text-zinc-500 block leading-tight mt-1">
                        {lang === 'fr' ? rule.desc_fr : rule.desc_en}
                      </span>
                    </div>
                    <span className="bg-zinc-900 border border-zinc-800 text-red-400 px-3 py-1 rounded font-mono text-xs font-black whitespace-nowrap">
                      {rule.val}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: ADMIN CONSOLE */}
          {activeTab === 'admin' && (
            <div className="space-y-6">
              {!isAdminLoggedIn ? (
                /* Admin Login Box */
                <div className="bg-zinc-950 border-2 border-red-950 rounded-2xl p-6 md:p-8 max-w-md mx-auto text-center space-y-6 shadow-[0_0_50px_rgba(239,68,68,0.07)] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-red-900 to-red-600" />
                  
                  <div className="space-y-2">
                    <div className="w-12 h-12 bg-red-950/40 border border-red-500/30 rounded-full flex items-center justify-center mx-auto text-red-500 shadow-inner">
                      <Lock className="w-6 h-6 animate-pulse" />
                    </div>
                    <h4 className="font-mono text-sm font-black text-white uppercase tracking-wider">
                      {lang === 'fr' ? 'Accès Console Sécurisé' : 'Secure Admin Access'}
                    </h4>
                    <p className="text-zinc-500 font-mono text-[10px] leading-relaxed max-w-xs mx-auto">
                      {lang === 'fr' 
                        ? 'Veuillez saisir la clé d\'accès administrateur pour configurer les paramètres de simulation du serveur.' 
                        : 'Please enter the administrative key to configure real-time world simulation metrics.'}
                    </p>
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (adminPasswordInput === 'QBC2026') {
                        setIsAdminLoggedIn(true);
                        setAdminPasswordError('');
                        setAlertText(lang === 'fr' ? '🔓 SESSION ADMIN ACTIVÉE. Prêt pour les commandes directes.' : '🔓 ADMIN SESSION ACTIVATED. Ready for direct command overrides.');
                      } else {
                        setAdminPasswordError(lang === 'fr' ? 'Clé d\'accès refusée (Indice: QBC2026)' : 'Access key rejected (Hint: QBC2026)');
                      }
                    }}
                    className="space-y-4"
                  >
                    <div className="space-y-1">
                      <input
                        type="password"
                        placeholder={lang === 'fr' ? 'Clé d\'accès administrateur...' : 'Admin secret key...'}
                        value={adminPasswordInput}
                        onChange={(e) => setAdminPasswordInput(e.target.value)}
                        className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2 text-center text-xs text-white focus:outline-none focus:border-red-500/60 font-mono placeholder:text-zinc-600"
                        autoFocus
                      />
                      {adminPasswordError && (
                        <p className="text-red-500 font-mono text-[10px] font-bold text-center mt-1">
                          {adminPasswordError}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-red-950/60 hover:bg-red-900/40 text-red-400 hover:text-white border border-red-500/30 font-mono font-black text-xs uppercase py-2 rounded-lg cursor-pointer transition-all"
                    >
                      {lang === 'fr' ? 'Valider la clé d\'accès' : 'Validate security credentials'}
                    </button>
                  </form>
                </div>
              ) : (
                /* Admin Dashboard Control Panel */
                <div className="space-y-6">
                  
                  {/* Session Status Banner */}
                  <div className="bg-zinc-950 border border-emerald-900/50 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                      <div className="font-mono">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold">{lang === 'fr' ? 'Session active' : 'Security Session'}</div>
                        <div className="text-emerald-400 font-black text-xs uppercase">{lang === 'fr' ? 'Root Administrateur' : 'Super Admin Override'}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setIsAdminLoggedIn(false);
                        setAdminPasswordInput('');
                        setAlertText(lang === 'fr' ? '🔒 Session administrateur fermée.' : '🔒 Administrative session closed.');
                      }}
                      className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 font-mono text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg transition-all"
                    >
                      {lang === 'fr' ? 'Déconnexion de la Console' : 'Terminate Override'}
                    </button>
                  </div>

                  {/* Grid for World Parameters & Message Broadcast */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Module 1: World parameters (Day & Blood Moon overrides) */}
                    <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-4">
                      <h5 className="font-mono text-xs font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-zinc-900 pb-3">
                        <Calendar className="w-4 h-4 text-emerald-400" />
                        <span>{lang === 'fr' ? 'Variables du Cosmos & Calendrier' : 'Cosmos & Time Overrides'}</span>
                      </h5>

                      <div className="space-y-4 font-mono text-xs">
                        {/* Day count modifier */}
                        <div className="space-y-2">
                          <label className="text-zinc-500 uppercase text-[9px] block tracking-widest">{lang === 'fr' ? 'Jour Actuel dans le Monde' : 'Current World Day'}</label>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                if (worldDay > 1) {
                                  const d = worldDay - 1;
                                  setWorldDay(d);
                                  setAlertText(lang === 'fr' ? `⏳ Jour du monde mis à jour : Jour ${d}` : `⏳ World day set backward to Day ${d}`);
                                }
                              }}
                              className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold px-3 py-1 rounded border border-zinc-800"
                            >
                              -1
                            </button>
                            <span className="flex-1 text-center font-black text-base text-amber-400 bg-black/60 border border-zinc-900 py-1 rounded">
                              Day {worldDay}
                            </span>
                            <button
                              onClick={() => {
                                const d = worldDay + 1;
                                setWorldDay(d);
                                setAlertText(lang === 'fr' ? `⏳ Jour du monde mis à jour : Jour ${d}` : `⏳ World day set forward to Day ${d}`);
                              }}
                              className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold px-3 py-1 rounded border border-zinc-800"
                            >
                              +1
                            </button>
                          </div>
                        </div>

                        {/* Blood moon forced override */}
                        <div className="space-y-2 pt-2 border-t border-zinc-900">
                          <label className="text-zinc-500 uppercase text-[9px] block tracking-widest">{lang === 'fr' ? 'Déclencheur de lune de sang' : 'Blood Moon Emergency override'}</label>
                          <div className="flex items-center justify-between bg-zinc-900/40 border border-zinc-800 p-2.5 rounded-lg">
                            <div>
                              <span className="text-white font-bold block">{lang === 'fr' ? 'Lune Rouge Immédiate' : 'Instant Blood Red Sky'}</span>
                              <span className="text-[10px] text-zinc-500 block leading-tight mt-0.5">
                                {lang === 'fr' ? 'Forcer les rituels cosmiques immédiatement' : 'Instantly fire hordes and ambient sky overlays'}
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                const nextState = !bloodMoonActive;
                                setBloodMoonActive(nextState);
                                if (nextState) {
                                  setAlertText(lang === 'fr' ? '🚨 LE CIEL DEVIENT ROUGE. UNE LUNE DE SANG EXCEPTIONNELLE COMMENCE MAINTENANT.' : '🚨 THE SKY TURNS RED. AN UNPREDICTED BLOOD MOON STARTS IMMEDIATELY.');
                                } else {
                                  setAlertText(lang === 'fr' ? '🌤️ Le rituel de la lune de sang a été calmé par un administrateur.' : '🌤️ Blood Moon sky has been restored to normal by administrative authorities.');
                                }
                              }}
                              className={`px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-wider border transition-all ${
                                bloodMoonActive
                                  ? 'bg-red-500 text-black border-red-500 hover:bg-red-400'
                                  : 'bg-zinc-900 text-red-500 border-zinc-800 hover:bg-zinc-800 hover:text-red-400'
                              }`}
                            >
                              {bloodMoonActive ? (lang === 'fr' ? 'Éteindre' : 'Stop') : (lang === 'fr' ? 'Allumer' : 'Force Now')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Module 2: Global message broadcasts */}
                    <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-4">
                      <h5 className="font-mono text-xs font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-zinc-900 pb-3">
                        <Terminal className="w-4 h-4 text-emerald-400" />
                        <span>{lang === 'fr' ? 'Système de Diffusion (Broadcast)' : 'Live Global Broadcast Engine'}</span>
                      </h5>

                      <div className="space-y-3 font-mono text-xs">
                        <div className="space-y-1">
                          <label className="text-zinc-500 uppercase text-[9px] block tracking-widest">{lang === 'fr' ? 'Message personnalisé' : 'Custom Announcement text'}</label>
                          <div className="flex gap-2">
                            <textarea
                              placeholder={lang === 'fr' ? 'Saisir l\'annonce globale de la colonie...' : 'Enter the global alert broadcast...'}
                              value={broadcastDraft}
                              onChange={(e) => setBroadcastDraft(e.target.value)}
                              rows={2}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                            />
                            <button
                              onClick={handleBroadcast}
                              disabled={!broadcastDraft.trim()}
                              className="px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-900 disabled:text-zinc-600 disabled:border-zinc-800 disabled:cursor-not-allowed border border-emerald-500 disabled:border-transparent text-white rounded-lg flex flex-col items-center justify-center gap-1 transition-all min-w-[70px]"
                              title={lang === 'fr' ? 'Diffuser le message' : 'Send message'}
                            >
                              <Send className="w-4 h-4" />
                              <span className="text-[10px] font-black uppercase tracking-wider">{lang === 'fr' ? 'Diffuser' : 'Send'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Presets buttons */}
                        <div className="space-y-1.5">
                          <label className="text-zinc-500 uppercase text-[9px] block tracking-widest">{lang === 'fr' ? 'Modèles d\'alerte rapides' : 'Quick Presets'}</label>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => {
                                setBroadcastDraft(lang === 'fr' ? '⚠️ MAINTENANCE SÉCURITÉ : Redémarrage imminent du serveur dans 5 minutes.' : '⚠️ SERVER MAINTENANCE: Scheduled reboot starting in 5 minutes.');
                              }}
                              className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800/80 text-zinc-300 px-2 py-1 rounded text-[9px] uppercase hover:text-white transition-all"
                            >
                              {lang === 'fr' ? 'Redémarrage' : 'Reboot'}
                            </button>
                            <button
                              onClick={() => {
                                setBroadcastDraft(lang === 'fr' ? '🧟 ATTENTION ! Activité sismique détectée, hordes de zombies accrues.' : '🧟 BEWARE! Seismic activity detected, zombie horde density amplified by 150%.');
                              }}
                              className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800/80 text-zinc-300 px-2 py-1 rounded text-[9px] uppercase hover:text-white transition-all"
                            >
                              {lang === 'fr' ? 'Horde accrue' : 'Amplified Horde'}
                            </button>
                            <button
                              onClick={() => {
                                setBroadcastDraft(lang === 'fr' ? '✈️ ALERT LARGAGE : Un convoi spécial survole le quadrant ouest.' : '✈️ SUPPLY DROP ALERT: Special cargo drops detected in western quadrant.');
                              }}
                              className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800/80 text-zinc-300 px-2 py-1 rounded text-[9px] uppercase hover:text-white transition-all"
                            >
                              {lang === 'fr' ? 'Largage spécial' : 'Airdrop'}
                            </button>
                            {globalBroadcast && (
                              <button
                                onClick={() => {
                                  setGlobalBroadcast(null);
                                  setBroadcastDraft('');
                                }}
                                className="bg-red-950/40 border border-red-900 text-red-400 px-2 py-1 rounded text-[9px] uppercase hover:bg-red-900/30 transition-all ml-auto"
                              >
                                {lang === 'fr' ? 'Effacer la diffusion' : 'Clear banner'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Module 3: Telnet Server Connection Details */}
                    <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-4">
                      <h5 className="font-mono text-xs font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-zinc-900 pb-3">
                        <Server className="w-4 h-4 text-emerald-400" />
                        <span>{lang === 'fr' ? 'Configuration Serveur Telnet' : 'Telnet Server Connection'}</span>
                      </h5>

                      <div className="space-y-3 font-mono text-xs">
                        {/* Explanatory text about the Day desync issue */}
                        <div className="bg-amber-500/5 border border-amber-500/20 text-amber-200/80 p-2.5 rounded-lg text-[10px] leading-relaxed">
                          {lang === 'fr' 
                            ? '⚠️ Le jour en jeu est différent du dashboard web ? Renseignez l\'adresse IP du serveur de jeu, le port Telnet ainsi que le mot de passe pour synchroniser le temps de jeu exact.'
                            : '⚠️ Day in game does not match the web dashboard? Input your game server IP, Telnet port, and credentials to synchronize current time & day.'}
                        </div>

                        {/* Connection fields */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-zinc-500 text-[8px] uppercase tracking-wider block">{lang === 'fr' ? 'IP du Serveur' : 'Server IP'}</label>
                            <input
                              type="text"
                              value={telnetIP}
                              onChange={(e) => setTelnetIP(e.target.value)}
                              disabled={isTelnetConnected || isTelnetConnecting}
                              placeholder="e.g. 88.198.65.120"
                              className="w-full bg-zinc-900/80 border border-zinc-800 disabled:opacity-50 rounded px-2 py-1 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-zinc-500 text-[8px] uppercase tracking-wider block">{lang === 'fr' ? 'Port Telnet' : 'Telnet Port'}</label>
                            <input
                              type="text"
                              value={telnetPort}
                              onChange={(e) => setTelnetPort(e.target.value)}
                              disabled={isTelnetConnected || isTelnetConnecting}
                              placeholder="e.g. 8081"
                              className="w-full bg-zinc-900/80 border border-zinc-800 disabled:opacity-50 rounded px-2 py-1 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 font-mono"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-zinc-500 text-[8px] uppercase tracking-wider block">{lang === 'fr' ? 'Mot de passe Telnet' : 'Telnet Password'}</label>
                          <div className="relative">
                            <input
                              type="password"
                              value={telnetPassword}
                              onChange={(e) => setTelnetPassword(e.target.value)}
                              disabled={isTelnetConnected || isTelnetConnecting}
                              placeholder={lang === 'fr' ? 'Saisir le mot de passe...' : 'Enter Telnet password...'}
                              className="w-full bg-zinc-900/80 border border-zinc-800 disabled:opacity-50 rounded px-2 py-1 pr-8 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 font-mono"
                            />
                            <div className="absolute inset-y-0 right-2 flex items-center text-zinc-500">
                              <Lock className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        </div>

                        {/* Connection buttons and active state */}
                        <div className="pt-2">
                          {!isTelnetConnected ? (
                            <button
                              onClick={() => handleConnectTelnet()}
                              disabled={isTelnetConnecting || !telnetIP.trim() || !telnetPort.trim()}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-black uppercase text-[10px] py-2 rounded-lg tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer animate-pulse"
                            >
                              {isTelnetConnecting ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>{lang === 'fr' ? 'Connexion en cours...' : 'Connecting...'}</span>
                                </>
                              ) : (
                                <>
                                  <Wifi className="w-3.5 h-3.5" />
                                  <span>{lang === 'fr' ? 'Se connecter via Telnet' : 'Connect via Telnet'}</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <div className="space-y-3">
                              {/* Connection health banner */}
                              <div className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 p-2 rounded-lg flex items-center justify-between text-[10px]">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                  <span className="font-bold uppercase">{lang === 'fr' ? 'Statut : Connecté' : 'Status: Connected'}</span>
                                </div>
                                <button
                                  onClick={() => {
                                    setIsTelnetConnected(false);
                                    setTelnetTerminalLog(prev => [
                                      ...prev,
                                      lang === 'fr' ? '[SYSTEM] Déconnecté de la console Telnet.' : '[SYSTEM] Disconnected from Telnet session.'
                                    ]);
                                  }}
                                  className="text-red-400 hover:text-red-300 uppercase font-black text-[9px] hover:underline"
                                >
                                  {lang === 'fr' ? 'Déconnecter' : 'Disconnect'}
                                </button>
                              </div>

                              {/* Manual sync slider/input inside connected status to solve: "le jour est pas pareil dashboard web" */}
                              <div className="bg-zinc-900 border border-zinc-800/80 p-3 rounded-lg space-y-2.5">
                                <div className="flex justify-between items-center border-b border-zinc-800 pb-1.5">
                                  <span className="text-[10px] font-bold text-white uppercase">{lang === 'fr' ? 'Ajustement & Synchro du Jour' : 'Day Drift Correction'}</span>
                                  <span className="text-[10px] text-amber-400 font-bold">In-game Day {telnetSyncedDay}</span>
                                </div>
                                
                                <div className="space-y-1">
                                  <label className="text-[9px] text-zinc-400 uppercase leading-relaxed block">
                                    {lang === 'fr' ? 'Régler le jour actuel du jeu :' : 'Specify real game server day:'}
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="range"
                                      min="1"
                                      max="500"
                                      value={telnetSyncedDay}
                                      onChange={(e) => setTelnetSyncedDay(parseInt(e.target.value))}
                                      className="flex-1 accent-emerald-500 bg-zinc-950 h-1.5 rounded"
                                    />
                                    <input
                                      type="number"
                                      min="1"
                                      max="999"
                                      value={telnetSyncedDay}
                                      onChange={(e) => setTelnetSyncedDay(parseInt(e.target.value) || 1)}
                                      className="w-12 bg-black text-center text-white border border-zinc-800 rounded font-mono text-[10px] py-0.5"
                                    />
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleManualSyncDay(telnetSyncedDay)}
                                  className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] uppercase font-bold py-1.5 rounded transition-all flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <span>{lang === 'fr' ? 'Appliquer & Forcer la Synchro' : 'Sync & Apply Dashboard Day'}</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Module 4: Live interactive terminal window */}
                    <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <h5 className="font-mono text-xs font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-zinc-900 pb-3">
                          <Terminal className="w-4 h-4 text-emerald-400" />
                          <span>{lang === 'fr' ? 'Terminal Interactif Telnet' : 'Live Telnet Terminal'}</span>
                        </h5>

                        {/* Green terminal log wrapper */}
                        <div className="bg-black/90 border border-zinc-900 p-3 rounded-lg h-44 overflow-y-auto font-mono text-[10px] text-emerald-500 space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                          {telnetTerminalLog.map((line, idx) => (
                            <div key={`telnet-log-${idx}`} className="leading-relaxed whitespace-pre-wrap">
                              {line}
                            </div>
                          ))}
                          {isTelnetConnecting && (
                            <div className="flex items-center gap-1.5 text-emerald-500/70">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                              <span>{lang === 'fr' ? 'Négociation de la session en cours...' : 'Negotiating shell session...'}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Command input prompt */}
                      <form onSubmit={handleSendTelnetCommand} className="mt-3">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-[11px] text-emerald-500/60 font-mono select-none">$</span>
                          <input
                            type="text"
                            value={telnetInput}
                            onChange={(e) => setTelnetInput(e.target.value)}
                            disabled={!isTelnetConnected}
                            placeholder={
                              !isTelnetConnected 
                                ? (lang === 'fr' ? 'Veuillez d\'abord connecter le Telnet...' : 'Please connect to Telnet first...')
                                : (lang === 'fr' ? 'Tapez une commande (ex: help, settime, say)...' : 'Type command (e.g., help, settime, say)...')
                            }
                            className="w-full bg-black/50 border border-zinc-900 rounded px-2.5 py-1.5 pl-6 text-xs text-emerald-400 placeholder:text-zinc-800 focus:outline-none focus:border-emerald-500/40 disabled:opacity-40 disabled:bg-zinc-950 font-mono"
                          />
                          <button
                            type="submit"
                            disabled={!isTelnetConnected || !telnetInput.trim()}
                            className="absolute right-1 top-1 bg-zinc-900/80 hover:bg-zinc-800 disabled:opacity-20 text-emerald-400 p-1 rounded transition-all cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </form>
                    </div>

                  </div>

                  {/* Module 3: Active Survivors override table */}
                  <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-4">
                    <h5 className="font-mono text-xs font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-zinc-900 pb-3">
                      <Users className="w-4 h-4 text-emerald-400" />
                      <span>{lang === 'fr' ? 'Gestion Directe des Survivants' : 'Survivor In-game Roster Directives'}</span>
                    </h5>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-mono text-[11px] border-collapse min-w-[550px]">
                        <thead>
                          <tr className="border-b border-zinc-900 text-zinc-500 uppercase text-[9px] tracking-wider">
                            <th className="pb-3 pl-2">{lang === 'fr' ? 'Nom' : 'Survivor'}</th>
                            <th className="pb-3 text-center">{lang === 'fr' ? 'Santé' : 'Health Status'}</th>
                            <th className="pb-3 text-center">{lang === 'fr' ? 'Zombies éliminés' : 'Z-kills'}</th>
                            <th className="pb-3 text-right pr-2">{lang === 'fr' ? 'Directives Administrateur' : 'Directives'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {players.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-8 text-center text-zinc-600 font-bold uppercase tracking-wider">
                                {lang === 'fr' 
                                  ? 'Aucun survivant actuellement connecté sur le serveur.' 
                                  : 'No survivors currently connected to the server.'}
                              </td>
                            </tr>
                          ) : (
                            players.map((p) => (
                            <tr key={p.id} className="border-b border-zinc-900/30 hover:bg-zinc-900/20 transition-all">
                              <td className="py-3 pl-2 font-black text-white">
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${p.status === 'dead' ? 'bg-red-600' : 'bg-emerald-500 animate-pulse'}`} />
                                    <span>{p.name}</span>
                                  </div>
                                  {p.steamId ? (
                                    <div className="flex items-center gap-1.5 mt-0.5 pl-4 text-[9px] font-normal text-zinc-500">
                                      <span>Steam ID: <span className="font-mono text-zinc-400 select-all">{p.steamId}</span></span>
                                      <button 
                                        onClick={() => {
                                          const val = prompt(lang === 'fr' ? 'Modifier le Steam ID :' : 'Edit Steam ID:', p.steamId);
                                          if (val !== null) {
                                            setPlayers(prev => prev.map(item => item.id === p.id ? { ...item, steamId: val.trim() } : item));
                                          }
                                        }}
                                        className="text-[8px] text-emerald-500/70 hover:text-emerald-400 hover:underline cursor-pointer"
                                      >
                                        ({lang === 'fr' ? 'Modifier' : 'Edit'})
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5 mt-0.5 pl-4 text-[9px] font-normal text-zinc-600 italic">
                                      <span>{lang === 'fr' ? 'Aucun Steam ID' : 'No Steam ID'}</span>
                                      <button 
                                        onClick={() => {
                                          const val = prompt(lang === 'fr' ? 'Entrez le Steam ID :' : 'Enter Steam ID:');
                                          if (val) {
                                            setPlayers(prev => prev.map(item => item.id === p.id ? { ...item, steamId: val.trim() } : item));
                                          }
                                        }}
                                        className="text-[8px] text-emerald-500/70 hover:text-emerald-400 hover:underline cursor-pointer font-sans not-italic"
                                      >
                                        [{lang === 'fr' ? 'Ajouter' : 'Add'}]
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 text-center">
                                <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                                  p.health > 80 ? 'text-emerald-400 bg-emerald-500/5 border border-emerald-500/20' :
                                  p.health > 30 ? 'text-amber-400 bg-amber-500/5 border border-amber-500/20' :
                                  'text-red-500 bg-red-500/5 border border-red-500/20'
                                }`}>
                                  {p.health}% HP
                                </span>
                              </td>
                              <td className="py-3 text-center font-bold text-red-400">
                                {p.zombieKills} 🧟
                              </td>
                              <td className="py-3 text-right pr-2 space-x-1 whitespace-nowrap">
                                {/* Direct actions */}
                                <button
                                  onClick={() => {
                                    setPlayers(prev => prev.map(item => item.id === p.id ? { ...item, health: 100 } : item));
                                    setAlertText(lang === 'fr' ? `💖 ADMIN COMMAND: Le survivant ${p.name} a été soigné à 100% par l'administrateur.` : `💖 ADMIN COMMAND: Survivor ${p.name} has been fully healed to 100% HP.`);
                                  }}
                                  className="bg-zinc-900 hover:bg-emerald-950/40 text-zinc-400 hover:text-emerald-400 border border-zinc-800 hover:border-emerald-500/20 px-2 py-1 rounded text-[9px] font-black uppercase transition-all"
                                >
                                  {lang === 'fr' ? 'Soigner' : 'Heal'}
                                </button>

                                <button
                                  onClick={() => {
                                    setPlayers(prev => prev.map(item => item.id === p.id ? { ...item, zombieKills: item.zombieKills + 100 } : item));
                                    setAlertText(lang === 'fr' ? `⚡ ADMIN COMMAND: +100 éliminations de zombies attribuées à ${p.name}.` : `⚡ ADMIN COMMAND: +100 zombie kills credited to ${p.name}.`);
                                  }}
                                  className="bg-zinc-900 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 border border-zinc-800 hover:border-red-500/20 px-2 py-1 rounded text-[9px] font-black uppercase transition-all"
                                >
                                  +100 ZK
                                </button>

                                <button
                                  onClick={() => {
                                    const rx = 15 + Math.random() * 70;
                                    const ry = 15 + Math.random() * 70;
                                    setPlayers(prev => prev.map(item => item.id === p.id ? { ...item, x: rx, y: ry, status: 'scavenging' } : item));
                                    setSelectedPlayerId(p.id);
                                    setSelectedMapElement({ type: 'player', data: { ...p, x: rx, y: ry } });
                                    setActiveTab('map');
                                    const scale = customMapSize / 100 || 80;
                                    setAlertText(lang === 'fr' ? `🌀 ADMIN COMMAND: ${p.name} a été téléporté vers les coordonnées [X: ${Math.round((rx - 50) * scale)}, Y: ${Math.round((50 - ry) * scale)}]` : `🌀 ADMIN COMMAND: Teleported ${p.name} to [X: ${Math.round((rx - 50) * scale)}, Y: ${Math.round((50 - ry) * scale)}]`);
                                  }}
                                  className="bg-zinc-900 hover:bg-cyan-950/40 text-zinc-400 hover:text-cyan-400 border border-zinc-800 hover:border-cyan-500/20 px-2 py-1 rounded text-[9px] font-black uppercase transition-all"
                                >
                                  {lang === 'fr' ? 'Téléporter' : 'Teleport'}
                                </button>

                                <button
                                  onClick={() => {
                                    setPlayers(prev => prev.filter(item => item.id !== p.id));
                                    if (selectedPlayerId === p.id) {
                                      setSelectedPlayerId(null);
                                      setSelectedMapElement(null);
                                    }
                                    setAlertText(lang === 'fr' ? `❌ ADMIN OVERRIDE: Le joueur ${p.name} a été expulsé/banni du serveur.` : `❌ ADMIN OVERRIDE: Survivor ${p.name} has been kicked and banned from the server.`);
                                  }}
                                  className="bg-red-950/40 hover:bg-red-900/20 text-red-400 hover:text-white border border-red-500/30 px-2 py-1 rounded text-[9px] font-black uppercase transition-all"
                                >
                                  {lang === 'fr' ? 'Bannir' : 'Ban'}
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

        </div>

        {/* RIGHT SIDEBAR - GLOBAL INTEGRATION & HOW TO JOIN */}
        <div className="w-full lg:w-[350px] flex flex-col gap-6">
          
          {/* Color Legend Box */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 font-mono text-xs text-zinc-400 space-y-3 shadow-lg">
            <h4 className="font-mono text-xs font-black text-white uppercase tracking-wider mb-1.5 flex items-center gap-2 border-b border-zinc-900 pb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{lang === 'fr' ? 'Légende de la Carte' : 'Map Legend'}</span>
            </h4>
            <div className="space-y-2.5 text-[11px] pt-1">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[#00ffcc] border border-black/60 shadow-sm animate-pulse" />
                <span className="text-zinc-300 font-medium">{lang === 'fr' ? 'Survivant Actif' : 'Active Survivor'}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 bg-[#ef4444] border border-black/60 shadow-sm rounded-sm" />
                <span className="text-zinc-300 font-medium">{lang === 'fr' ? 'Zone de Revendication (Claim)' : 'Land Claim Zone'}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[#a3e635] border border-black/60 shadow-sm" />
                <span className="text-zinc-300 font-medium">{lang === 'fr' ? 'Marchand Sécurisé (Trader)' : 'Secured Trader'}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[#f97316] border border-black/60 shadow-sm" />
                <span className="text-zinc-300 font-medium">{lang === 'fr' ? 'Base Militaire' : 'Military Base'}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[#cbd5e1] border border-black/60 shadow-sm" />
                <span className="text-zinc-300 font-medium">{lang === 'fr' ? 'Ruines Urbaines' : 'Urban Ruins'}</span>
              </div>
            </div>
          </div>
          
          {/* Section: Dynamic World calendar */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5">
            <h4 className="font-mono text-xs font-black text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Tv className="w-4 h-4 text-red-500 animate-pulse" />
              <span>{lang === 'fr' ? 'Intégration Site Web' : 'Website Integration Widget'}</span>
            </h4>
            <p className="text-zinc-400 font-mono text-[10px] leading-relaxed mb-4">
              {lang === 'fr'
                ? "Incorporez facilement cet état de serveur et d'activité des joueurs sur votre site web communautaire avec notre widget d'intégration réactif."
                : "Embed this fully live game server monitor and survivors roster widget directly onto your guild website using our pre-built responsive widget code."}
            </p>

            <div className="bg-black border border-zinc-900 rounded p-2.5 font-mono text-[9px] text-emerald-400 overflow-x-auto whitespace-nowrap">
              <code>{`<iframe src="https://qbc-gaming.net/widget/7dtd/${server.id}" width="100%" height="250" frameborder="0"></iframe>`}</code>
            </div>

            <div className="mt-4 border-t border-zinc-900 pt-3 flex items-center justify-between">
              <span className="font-mono text-[10px] text-zinc-500">{lang === 'fr' ? 'Mises à jour' : 'Update rate'}</span>
              <span className="font-mono text-[10px] text-emerald-400 font-bold uppercase">{lang === 'fr' ? 'Temps Réel' : 'Real-time'}</span>
            </div>
          </div>

          {/* How to join / server connections details */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5">
            <h4 className="font-mono text-xs font-black text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Compass className="w-4 h-4 text-amber-500" />
              <span>{lang === 'fr' ? 'Comment rejoindre ?' : 'How to join?'}</span>
            </h4>
            <ol className="font-mono text-[10px] text-zinc-400 space-y-3 pl-2.5 list-decimal">
              <li>
                {lang === 'fr' 
                  ? "Lancez 7 Days to Die sur votre PC." 
                  : "Launch 7 Days to Die on your PC."}
              </li>
              <li>
                {lang === 'fr' 
                  ? "Sélectionnez 'Rejoindre un jeu' puis 'Se connecter à l'IP'." 
                  : "Go to 'Join a game' and click on 'Direct Connect to IP'."}
              </li>
              <li>
                {lang === 'fr' 
                  ? "Entrez l'adresse réseau copiée :" 
                  : "Enter the copied network address:"}
                <div className="mt-1 bg-black text-zinc-200 p-1.5 rounded border border-zinc-900 text-[10px] text-center font-bold relative">
                  {server.ip}
                </div>
              </li>
              <li>
                {lang === 'fr' 
                  ? "Cliquez sur 'Se connecter' pour commencer votre aventure !" 
                  : "Click on 'Connect' to initialize your survival journey!"}
              </li>
            </ol>
          </div>

          {/* Server Admins online roster */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5">
            <h4 className="font-mono text-xs font-black text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>{lang === 'fr' ? 'Administration Réseau' : 'Network Administrators'}</span>
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-mono text-xs font-bold text-white">Rick_Grimes</span>
                </div>
                <span className="font-mono text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded uppercase font-black">
                  ADMIN
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-zinc-600" />
                  <span className="font-mono text-xs font-bold text-zinc-400">Daryl_Dixon</span>
                </div>
                <span className="font-mono text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase font-black">
                  MODERATEUR
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
