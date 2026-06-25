import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import {
  Map,
  Users,
  Compass,
  Plus,
  Trash2,
  Search,
  MessageSquare,
  Activity,
  ChevronLeft,
  Settings,
  AlertCircle,
  TrendingUp,
  MapPin,
  Shield,
  Layers,
  Sparkles,
  Info,
  Maximize2,
  Volume2,
  CloudSun,
  Eye,
  EyeOff,
  Crosshair,
  Wind,
  CloudRain,
  CloudSnow,
  Sun,
  Flame,
  Clock,
  Send,
  Flag,
  Globe,
  Hammer,
  ShoppingCart,
  Cpu,
  Coins,
  Package,
  Tag,
  Filter,
  Wrench,
  Database,
  RefreshCw,
  Lock,
  Unlock,
  ExternalLink,
  FileCode
} from 'lucide-react';
import { ServerInstance } from '../types';

interface WurmExplorerProps {
  server: ServerInstance;
  lang: 'fr' | 'en';
  onClose: () => void;
  onUpdateSlots?: (playerCount: number) => void;
}

interface MapMarker {
  id: string;
  name: string;
  type: 'village' | 'mine' | 'danger' | 'portal' | 'safezone' | 'tower';
  x: number; // 0 to 100% of map width
  y: number; // 0 to 100% of map height
  creator: string;
  notes?: string;
}

interface OnlinePlayer {
  id: string;
  name: string;
  title: string;
  alignment: number; // -100 to 100
  village: string;
  specialty: string;
  level: number;
  x: number; // position on map
  y: number; // position on map
  status: 'active' | 'afk' | 'fighting' | 'crafting';
  avatar: string;
}

interface VillageDeed {
  id: string;
  name: string;
  mayor: string;
  citizens: number;
  sizeX: number; // dimensions in tiles
  sizeY: number;
  x: number; // position 0-100
  y: number;
  guards: number;
  hasSpiritTemplar: boolean;
  desc_fr: string;
  desc_en: string;
}

interface ResourceNode {
  id: string;
  name_fr: string;
  name_en: string;
  type: 'iron' | 'gold' | 'clay' | 'tar' | 'peat';
  x: number;
  y: number;
}

// Map Presets
const LARGE_MAPS_PRESETS = [
  { id: 'doriath_core', name_fr: 'Doriath (Monde Principal - 4096px)', name_en: 'Doriath (Main World - 4096px)', size: '4096 x 4096', theme: 'lush' },
  { id: 'desert_outpost', name_fr: 'Steppes d\'Or (2048px)', name_en: 'Golden Steppes (2048px)', size: '2048 x 2048', theme: 'desert' },
  { id: 'pvp_archipelago', name_fr: 'Archipel du Chaos (PvP - 1024px)', name_en: 'Chaos Archipelago (PvP - 1024px)', size: '1024 x 1024', theme: 'volcanic' }
];

// In-game Seasons
const WURM_SEASONS = [
  { id: 'spring', name_fr: 'Printemps des Éveils', name_en: 'Spring of Awakening', icon: '🌸', color: 'text-emerald-400', desc_fr: 'Les cultures poussent 2x plus vite. Les arbres fleurissent et les animaux sauvages sortent de leur hibernation.', desc_en: 'Crops grow 2x faster. Trees bloom and wild animals emerge from hibernation.' },
  { id: 'summer', name_fr: 'Été Triomphant', name_en: 'High Summer', icon: '☀️', color: 'text-amber-400', desc_fr: 'Saison idéale pour les expéditions de chasse et de navigation. Les orages d\'été sont fréquents.', desc_en: 'Ideal season for hunting and sailing expeditions. Summer thunderstorms are common.' },
  { id: 'autumn', name_fr: 'Automne des Moissons', name_en: 'Harvest Autumn', icon: '🍁', color: 'text-orange-400', desc_fr: 'Le temps des récoltes abondantes. Les feuilles tombent et le brouillard s\'installe sur les vallées.', desc_en: 'Time of abundant harvests. Leaves fall and dense fog settles over the valleys.' },
  { id: 'winter', name_fr: 'Hiver Éternel', name_en: 'Frost Winter', icon: '❄️', color: 'text-cyan-400', desc_fr: 'Le sol est gelé, rendant le terrassement difficile. Les lacs gèlent et la neige recouvre le continent.', desc_en: 'The ground is frozen, making terraforming difficult. Lakes freeze over and snow covers the land.' }
];

const WURM_STARFALLS = [
  { fr: 'Étoile de Diamant', en: 'Starfall of the Diamond' },
  { fr: 'Étoile d\'Opale', en: 'Starfall of the Opal' },
  { fr: 'Étoile d\'Obsidienne', en: 'Starfall of the Obsidian' },
  { fr: 'Étoile de Rubis', en: 'Starfall of the Ruby' },
  { fr: 'Étoile d\'Or', en: 'Starfall of the Golden' },
  { fr: 'Étoile d\'Émeraude', en: 'Starfall of the Emerald' },
  { fr: 'Étoile de Saphir', en: 'Starfall of the Sapphire' },
  { fr: 'Étoile de Perle', en: 'Starfall of the Pearl' },
  { fr: 'Étoile de Cuivre', en: 'Starfall of the Copper' },
  { fr: 'Étoile d\'Argent', en: 'Starfall of the Silver' }
];

export default function WurmExplorer({ server, lang, onClose, onUpdateSlots }: WurmExplorerProps) {
  // Wurm In-game Time System Simulation
  const [activeSeason, setActiveSeason] = useState<'spring' | 'summer' | 'autumn' | 'winter'>('spring');
  const [activeWeather, setActiveWeather] = useState<'clear' | 'rain' | 'snow' | 'fog' | 'storm'>('clear');
  const [wurmTime, setWurmTime] = useState({ hour: 10, minute: 34, day: 14, year: 1034, starfallIdx: 3 });

  // Tab control: 'market' | 'mods' | 'sqlite' | 'creatures'
  const [activeBottomTab, setActiveBottomTab] = useState<'market' | 'mods' | 'sqlite' | 'creatures'>('market');

  // Market Listings structure
  interface MarketListing {
    id: string;
    item: string;
    category: 'gear' | 'tools' | 'resources' | 'food' | 'animals';
    type: 'sell' | 'buy';
    priceCoins: { gold: number; silver: number; copper: number };
    quantity: number;
    quality: number; // Wurm items have Quality Level (QL) from 1 to 100
    seller: string;
    location: string;
    timestamp: string;
  }

  const [marketListings, setMarketListings] = useState<MarketListing[]>([
    { id: 'l1', item: 'Épée longue en acier bleu (Blue Steel Longsword)', category: 'gear', type: 'sell', priceCoins: { gold: 0, silver: 15, copper: 50 }, quantity: 1, quality: 78, seller: 'Ulfric Ironclad', location: 'Ironforge Stronghold', timestamp: '10 min' },
    { id: 'l2', item: 'Pioche en fer forgé (Forged Iron Pickaxe)', category: 'tools', type: 'sell', priceCoins: { gold: 0, silver: 2, copper: 20 }, quantity: 3, quality: 65, seller: 'Garrick Stone', location: 'Ironforge Stronghold', timestamp: '32 min' },
    { id: 'l3', item: 'Argile fine (Fine Clay)', category: 'resources', type: 'buy', priceCoins: { gold: 0, silver: 0, copper: 80 }, quantity: 100, quality: 40, seller: 'Eldrin Oakheart', location: 'Doriath Capital', timestamp: '2 min' },
    { id: 'l4', item: 'Jeune étalon noir dompté (Tamed Black Stallion)', category: 'animals', type: 'sell', priceCoins: { gold: 1, silver: 5, copper: 0 }, quantity: 1, quality: 85, seller: 'Rowan Green', location: 'Silverwood Hollow', timestamp: '1 h' },
    { id: 'l5', item: 'Onguent de soin concentré (Healing Salve)', category: 'food', type: 'sell', priceCoins: { gold: 0, silver: 1, copper: 10 }, quantity: 15, quality: 72, seller: 'Eldrin Oakheart', location: 'Doriath Capital', timestamp: '4 h' },
    { id: 'l6', item: 'Planches de cèdre de haute qualité (Cedar Wood Planks)', category: 'resources', type: 'buy', priceCoins: { gold: 0, silver: 3, copper: 0 }, quantity: 200, quality: 60, seller: 'Aethelgard', location: 'Doriath Capital', timestamp: '6 h' }
  ]);

  const [marketCategory, setMarketCategory] = useState<string>('all');
  const [marketTypeFilter, setMarketTypeFilter] = useState<'all' | 'sell' | 'buy'>('all');
  const [marketSearch, setMarketSearch] = useState<string>('');

  // Add listing state
  const [newListingItem, setNewListingItem] = useState<string>('');
  const [newListingCategory, setNewListingCategory] = useState<'gear' | 'tools' | 'resources' | 'food' | 'animals'>('resources');
  const [newListingType, setNewListingType] = useState<'sell' | 'buy'>('sell');
  const [newListingGold, setNewListingGold] = useState<number>(0);
  const [newListingSilver, setNewListingSilver] = useState<number>(0);
  const [newListingCopper, setNewListingCopper] = useState<number>(10);
  const [newListingQuantity, setNewListingQuantity] = useState<number>(1);
  const [newListingQuality, setNewListingQuality] = useState<number>(50);
  const [newListingSeller, setNewListingSeller] = useState<string>('Vous (Admin)');
  const [newListingLocation, setNewListingLocation] = useState<string>('Doriath Capital');
  const [showAddListingForm, setShowAddListingForm] = useState<boolean>(false);

  // Server Mods Directory structure
  interface ServerMod {
    id: string;
    name: string;
    version: string;
    author: string;
    category: 'core' | 'gameplay' | 'utils' | 'map' | 'admin';
    status: 'active' | 'disabled';
    desc_fr: string;
    desc_en: string;
    configs: Array<{ key: string; val: string; desc_fr: string; desc_en: string }>;
    downloadUrl?: string;
  }

  const [serverMods, setServerMods] = useState<ServerMod[]>([
    {
      id: 'mod1',
      name: 'Ago\'s Server Mod Launcher',
      version: '0.45.1',
      author: 'Ago',
      category: 'core',
      status: 'active',
      desc_fr: 'Chargeur de mods principal indispensable permettant l\'injection de code Java côté serveur et client.',
      desc_en: 'Core essential mod loader allowing Java code injection on both server and client sides.',
      downloadUrl: 'https://github.com/agoat/wurm-unlimited-modlauncher/releases',
      configs: [
        { key: 'launcherMode', val: 'injection', desc_fr: 'Méthode d\'interception binaire', desc_en: 'Binary interception method' },
        { key: 'debug', val: 'false', desc_fr: 'Journalisation détaillée des erreurs', desc_en: 'Verbose debug logging' }
      ]
    },
    {
      id: 'mod2',
      name: 'Wurm Unlimited Livemap & Database Sync',
      version: '2.3.0',
      author: 'Ago / Wyvern Team',
      category: 'map',
      status: 'active',
      desc_fr: 'Génère la carte en haute résolution et synchronise en direct les positions des joueurs, des villages et du cadastre.',
      desc_en: 'Generates high-resolution maps and synchronizes live player positions, deeds, and borders.',
      downloadUrl: 'https://forum.wurmonline.com/index.php?/topic/133000-released-livemap-sync-mod/',
      configs: [
        { key: 'refreshIntervalMs', val: '5000', desc_fr: 'Fréquence de rafraîchissement des positions (ms)', desc_en: 'Position refresh frequency in ms' },
        { key: 'showPlayerDeeds', val: 'true', desc_fr: 'Afficher les bordures cadastrales des villages', desc_en: 'Display village property borders' },
        { key: 'allowPlayerTrails', val: 'true', desc_fr: 'Permettre le tracé des déplacements récents', desc_en: 'Enable tracing of recent movements' }
      ]
    },
    {
      id: 'mod3',
      name: 'Action Timer Modifier (Pro-Timer)',
      version: '1.8.2',
      author: 'Sindusk',
      category: 'gameplay',
      status: 'active',
      desc_fr: 'Ajuste la vitesse des actions répétitives (minage, coupe, forge, maçonnerie) pour rendre le gameplay plus dynamique.',
      desc_en: 'Adjusts the speed of repetitive action loops (mining, chopping, smithing, masonry) for dynamic gameplay.',
      downloadUrl: 'https://github.com/Sindusk/WU-Mods/tree/master/ProTimer',
      configs: [
        { key: 'actionSpeedMultiplier', val: '2.5x', desc_fr: 'Vitesse globale de réalisation des actions', desc_en: 'Overall action execution speed' },
        { key: 'minimumActionTimeSeconds', val: '1.5s', desc_fr: 'Temps minimum pour n\'importe quelle action', desc_en: 'Minimum cooldown time for any action' }
      ]
    },
    {
      id: 'mod4',
      name: 'DigToGround Mod',
      version: '1.2.0',
      author: 'Budda',
      category: 'utils',
      status: 'active',
      desc_fr: 'Permet de vider la terre et la roche directement au sol lors du terrassement sans encombrer l\'inventaire.',
      desc_en: 'Allows dropping dirt and rock straight to the ground during terraforming without filling the inventory.',
      downloadUrl: 'https://forum.wurmonline.com/index.php?/topic/135012-released-digtoground-mod/',
      configs: [
        { key: 'dropPileMaximum', val: '100', desc_fr: 'Taille limite des tas de terre accumulés', desc_en: 'Maximum size of soil piles' },
        { key: 'autoEquipShovel', val: 'false', desc_fr: 'Équiper automatiquement la pelle libre', desc_en: 'Automatically equip an available shovel' }
      ]
    },
    {
      id: 'mod5',
      name: 'BountyMod & Hunt Rewards',
      version: '2.1.0',
      author: 'Kai',
      category: 'gameplay',
      status: 'active',
      desc_fr: 'Récompense financièrement les joueurs en pièces de cuivre et d\'argent pour chaque créature agressive abattue.',
      desc_en: 'Awards copper and silver coins to players for slaying wild aggressive monsters and beasts.',
      downloadUrl: 'https://github.com/kai-wu/wurm-bounty-rewards',
      configs: [
        { key: 'bountyMultiplier', val: '1.5x', desc_fr: 'Facteur de gain d\'argent par rapport aux valeurs par défaut', desc_en: 'Money multiplier compared to default values' },
        { key: 'enableBossBounties', val: 'true', desc_fr: 'Activer les méga-primes sur les créatures uniques', desc_en: 'Enable mega-bounties on unique creatures' }
      ]
    },
    {
      id: 'mod6',
      name: 'Corpse Recovery & Celestial Finder Beam',
      version: '1.4.5',
      author: 'Darkone',
      category: 'utils',
      status: 'active',
      desc_fr: 'Affiche un rayon céleste lumineux au-dessus du cadavre du joueur décédé et permet une récupération simplifiée.',
      desc_en: 'Draws an ethereal light pillar above a dead player\'s corpse and eases equipment recovery.',
      downloadUrl: 'https://github.com/darkone-wu/corpse-beam-recovery',
      configs: [
        { key: 'corpseDecayTimeHours', val: '48h', desc_fr: 'Temps de disparition du cadavre', desc_en: 'Time before corpse rots completely' },
        { key: 'allowTeleportToCorpse', val: 'false', desc_fr: 'Téléportation administrative vers le cadavre', desc_en: 'Administrative teleport to corpse' }
      ]
    },
    {
      id: 'mod7',
      name: 'Wyvern Mounts & Exotic Beasts',
      version: '3.0.1',
      author: 'Wyvern Dev Team',
      category: 'gameplay',
      status: 'active',
      desc_fr: 'Introduit de nouvelles montures volantes exotiques (Vouivres, Licornes de guerre) et des créatures légendaires.',
      desc_en: 'Introduces flying wyverns, celestial war unicorns, and high-difficulty legendary beasts.',
      downloadUrl: 'https://github.com/wyvern-wu-team/wyvern-mounts/releases',
      configs: [
        { key: 'spawnChanceMultiplier', val: '1.2x', desc_fr: 'Fréquence d\'apparition de la faune exotique', desc_en: 'Exotic fauna spawn rate' },
        { key: 'tamingDifficultyMod', val: '0.8x', desc_fr: 'Ajustement de la difficulté d\'apprivoisement', desc_en: 'Taming difficulty adjustments' }
      ]
    }
  ]);

  // Map settings and zoom controls
  const [selectedMapId, setSelectedMapId] = useState<string>('doriath_core');
  const [zoom, setZoom] = useState<number>(1);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cursorCoords, setCursorCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Google Maps & WurmMapGen v2 interactive states
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [mapStyle, setMapStyle] = useState<'standard' | 'wurm_mapgen' | 'topo' | 'origin' | 'parchment'>('parchment');
  const [mapLayer, setMapLayer] = useState<'surface' | 'cave'>('surface');
  const [showLegend, setShowLegend] = useState<boolean>(true);
  const [selectedLegendTerrain, setSelectedLegendTerrain] = useState<string | null>(null);
  const [customMapUrl, setCustomMapUrl] = useState<string>(() => {
    return localStorage.getItem(`wurm_map_url_${server.id}`) || '';
  });

  useEffect(() => {
    localStorage.setItem(`wurm_map_url_${server.id}`, customMapUrl);
  }, [customMapUrl, server.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [searchX, setSearchX] = useState<string>('');
  const [searchY, setSearchY] = useState<string>('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showSearchPanel, setShowSearchPanel] = useState<boolean>(false);
  const [showStylePanel, setShowStylePanel] = useState<boolean>(false);
  const [showMemberLinks, setShowMemberLinks] = useState<boolean>(true);

  // Map filter "Mods"
  const [mods, setMods] = useState({
    players: true,
    playerTrails: true,
    villages: true,
    guardTowers: true,
    gridSystem: true,
    resources: true,
    weatherEffects: true
  });

  // Resource Nodes database
  const [resourceNodes] = useState<ResourceNode[]>([
    { id: 'res1', name_fr: 'Gisement de Fer Pur', name_en: 'Pure Iron Ore', type: 'iron', x: 35, y: 31 },
    { id: 'res2', name_fr: 'Filons d\'Or Profonds', name_en: 'Deep Gold Vein', type: 'gold', x: 55, y: 15 },
    { id: 'res3', name_fr: 'Gisement d\'Argile Fine', name_en: 'Fine Clay Pit', type: 'clay', x: 48, y: 62 },
    { id: 'res4', name_fr: 'Puits de Goudron Naturel', name_en: 'Natural Tar Spring', type: 'tar', x: 25, y: 48 },
    { id: 'res5', name_fr: 'Tourbière Ancienne', name_en: 'Ancient Peat Bog', type: 'peat', x: 70, y: 72 }
  ]);

  // Villages & Deeds list
  const [villages, setVillages] = useState<VillageDeed[]>([
    { id: 'v1', name: 'Doriath Capital', mayor: 'GM_Kaelen', citizens: 18, sizeX: 80, sizeY: 80, x: 50, y: 45, guards: 12, hasSpiritTemplar: true, desc_fr: 'La capitale marchande protégée par les templiers divins de Fo. Havres de paix et de commerce.', desc_en: 'The trading capital protected by the divine templars of Fo. A safe haven of peace and commerce.' },
    { id: 'v2', name: 'Silverwood Hollow', mayor: 'Alyssa_Silver', citizens: 6, sizeX: 45, sizeY: 45, x: 28, y: 58, guards: 4, hasSpiritTemplar: false, desc_fr: 'Un village paisible axé sur la menuiserie fine et l\'élevage de chevaux sauvages.', desc_en: 'A quiet village focused on fine carpentry and wild horse breeding.' },
    { id: 'v3', name: 'Ironforge Stronghold', mayor: 'Ulfric_Ironclad', citizens: 8, sizeX: 60, sizeY: 60, x: 34, y: 31, guards: 8, hasSpiritTemplar: true, desc_fr: 'Forteresse minière nichée à flanc de montagne, exploitant le fer et le cuivre de haute pureté.', desc_en: 'Mining stronghold nestled in the mountain slopes, extracting high purity iron and copper.' },
    { id: 'v4', name: 'Moorland Harbor', mayor: 'Captain_Drake', citizens: 4, sizeX: 30, sizeY: 50, x: 65, y: 70, guards: 2, hasSpiritTemplar: false, desc_fr: 'Un comptoir côtier servant d\'embarcadère pour les expéditions marines et le commerce maritime.', desc_en: 'A coastal trading post serving as a launchpad for marine expeditions and maritime trade.' }
  ]);

  // Map markers (custom and system)
  const [markers, setMarkers] = useState<MapMarker[]>(() => {
    const saved = localStorage.getItem(`wurm_markers_${server.id}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [
      { id: 'm1', name: 'Col de la Montagne Bleue', type: 'danger', x: 42, y: 22, creator: 'System', notes: 'Gros spawn d\'ours et de trolls des cavernes' },
      { id: 'm2', name: 'Portail de Départ', type: 'portal', x: 20, y: 80, creator: 'System', notes: 'Lieu de première connexion des nouveaux colons' },
      { id: 'm3', name: 'Tour de Guet Est', type: 'tower', x: 74, y: 44, creator: 'Doriath_Guard', notes: 'Tour de surveillance de la frontière sauvage' }
    ];
  });

  // Online Players list with detailed state
  const [players, setPlayers] = useState<OnlinePlayer[]>([
    { id: 'p1', name: 'Eldrin Oakheart', title: 'Archimage de Fo', alignment: 94, village: 'Doriath Capital', specialty: 'Alchimie & Botanique', level: 88, x: 49.5, y: 46, status: 'crafting', avatar: '🧙‍♂️' },
    { id: 'p2', name: 'Ulfric Ironclad', title: 'Champion de Magranon', alignment: 50, village: 'Ironforge Stronghold', specialty: 'Forge & Minage', level: 82, x: 34.2, y: 31.5, status: 'fighting', avatar: '⚔️' },
    { id: 'p3', name: 'Lilith Vesper', title: 'Ombre Silencieuse', alignment: -45, village: 'Aucun (Hors-la-loi)', specialty: 'Combat & Assassinat', level: 91, x: 42.5, y: 23.0, status: 'fighting', avatar: '🥷' },
    { id: 'p4', name: 'Rowan Green', title: 'Maître Fermier', alignment: 85, village: 'Silverwood Hollow', specialty: 'Agriculture & Élevage', level: 68, x: 29.0, y: 57.5, status: 'active', avatar: '👩‍🌾' },
    { id: 'p5', name: 'Aethelgard', title: 'Grand Charpentier', alignment: 60, village: 'Doriath Capital', specialty: 'Menuiserie & Navires', level: 74, x: 50.8, y: 44.2, status: 'crafting', avatar: '🪚' },
    { id: 'p6', name: 'Garrick Stone', title: 'Maçon d\'Élite', alignment: 20, village: 'Ironforge Stronghold', specialty: 'Maçonnerie', level: 55, x: 33.8, y: 32.2, status: 'active', avatar: '🧱' }
  ]);

  const playersRef = useRef<OnlinePlayer[]>(players);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  const lastUpdatedSlotsRef = useRef<number | null>(null);

  useEffect(() => {
    if (onUpdateSlots && lastUpdatedSlotsRef.current !== players.length) {
      lastUpdatedSlotsRef.current = players.length;
      onUpdateSlots(players.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players.length]);

  // Historical player path trails to render on map
  const [playerTrails, setPlayerTrails] = useState<Record<string, Array<{ x: number; y: number }>>>({
    p1: [{ x: 49.2, y: 45.8 }, { x: 49.5, y: 46 }],
    p2: [{ x: 34.0, y: 31.0 }, { x: 34.2, y: 31.5 }],
    p3: [{ x: 45.0, y: 25.0 }, { x: 43.5, y: 24.2 }, { x: 42.5, y: 23.0 }]
  });

  // UI States
  const [selectedPlayer, setSelectedPlayer] = useState<OnlinePlayer | null>(null);
  const [selectedVillage, setSelectedVillage] = useState<VillageDeed | null>(null);
  const [isAddingMarker, setIsAddingMarker] = useState<boolean>(false);
  const [playerSearch, setPlayerSearch] = useState<string>('');
  const [villageSearch, setVillageSearch] = useState<string>('');

  // Global Chat/System Logs Console
  const [chatInput, setChatInput] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: string; text: string; channel: 'local' | 'alliance' | 'system' | 'glurpf'; timestamp: string; avatar?: string }>>([
    { id: 'c1', sender: 'System', text: 'Bienvenue sur le portail de communication live de Doriath.', channel: 'system', timestamp: '18:32' },
    { id: 'c2', sender: 'Eldrin Oakheart', text: 'Quelqu\'un aurait de l\'argile fine à vendre à la Capitale ?', channel: 'local', timestamp: '18:33', avatar: '🧙‍♂️' },
    { id: 'c3', sender: 'Ulfric Ironclad', text: 'J\'en ai ramené 100 unités à Ironforge, passe quand tu veux !', channel: 'alliance', timestamp: '18:35', avatar: '⚔️' },
    { id: 'c4', sender: 'Lilith Vesper', text: 'Troll furieux repéré près du col de la Montagne Bleue. Prudence !', channel: 'local', timestamp: '18:36', avatar: '🥷' },
    { id: 'c5', sender: 'System', text: 'Alerte Météo: Le brouillard commence à envahir les plaines de l\'Ouest.', channel: 'system', timestamp: '18:38' }
  ]);

  // Marker creation states
  const [newMarkerName, setNewMarkerName] = useState<string>('');
  const [newMarkerType, setNewMarkerType] = useState<MapMarker['type']>('village');
  const [newMarkerX, setNewMarkerX] = useState<number>(50);
  const [newMarkerY, setNewMarkerY] = useState<number>(50);
  const [newMarkerNotes, setNewMarkerNotes] = useState<string>('');

  // --- WurmMapGen v2 D3 Geographic Generation Engine ---
  const d3GeographicData = useMemo(() => {
    // 1. Grid Dimensions (60x60 grid provides balanced performance & visual smooth rendering)
    const gridWidth = 60;
    const gridHeight = 60;
    const values = new Float32Array(gridWidth * gridHeight);

    // Compute height/elevation values for each grid point
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const idx = y * gridWidth + x;
        const px = (x / (gridWidth - 1)) * 100; // 0 to 100% space
        const py = (y / (gridHeight - 1)) * 100; // 0 to 100% space

        let h = 0;

        // Add base organic shape simulating rolling hills and coastal jagged lines
        const nx = px / 100;
        const ny = py / 100;
        const baseNoise = 
          Math.sin(nx * 5) * Math.cos(ny * 5) * 11 +
          Math.sin(nx * 11 + 2.5) * Math.cos(ny * 14 - 1.2) * 5 +
          Math.sin(nx * 24) * Math.sin(ny * 24) * 1.5;

        h += baseNoise;

        // Dynamically elevate hills around actual active villages to simulate safe harbors and citadels
        villages.forEach(v => {
          const dx = px - v.x;
          const dy = py - v.y;
          const distSq = dx * dx + dy * dy;
          const sizeWeight = 14 + v.citizens * 4.5;
          h += sizeWeight * Math.exp(-distSq / 130); // Gaussian bell-curve elevation
        });

        // Add smaller hill mounds around valuable resource nodes
        resourceNodes.forEach(node => {
          const dx = px - node.x;
          const dy = py - node.y;
          const distSq = dx * dx + dy * dy;
          h += 7.5 * Math.exp(-distSq / 35);
        });

        // Landmass tapering mask to ensure it tapers off cleanly into deep ocean at the edges
        const cx = 50;
        const cy = 50;
        const distToCenter = Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));
        
        const maxDist = 46; // Distance where absolute deep water begins
        const landMask = Math.max(0, 1 - (distToCenter / maxDist));
        
        // Multiplicative falloff
        h = (h + 8.5) * (landMask * landMask) - (1 - landMask) * 16;

        values[idx] = h;
      }
    }

    // Generate dynamic isoline contours for 7 levels of elevations
    const thresholds = [-5, 0, 5, 12, 22, 35, 52];
    const contourGenerator = d3.contours()
      .size([gridWidth, gridHeight])
      .thresholds(thresholds);

    const contours = contourGenerator(Array.from(values));

    // Scale contour coordinates back to % (0..100) coordinates for SVG rendering
    const scaleX = 100 / (gridWidth - 1);
    const scaleY = 100 / (gridHeight - 1);
    const d3Path = d3.geoPath(d3.geoTransform({
      point(x, y) {
        this.stream.point(x * scaleX, y * scaleY);
      }
    }));

    const contourPaths = contours.map((contour, i) => {
      return {
        path: d3Path(contour) || '',
        level: i,
        threshold: thresholds[i] || 0
      };
    });

    // 2. Compute Voronoi cells to establish political borders & influence zones around villages
    let voronoiCells: Array<{ id: string; name: string; path: string; x: number; y: number }> = [];
    if (villages.length >= 2) {
      try {
        // Map village centers and apply slight mathematical jitter to avoid co-linear geometry errors
        const coords = villages.map((v, i) => [
          v.x + (Math.sin(i) * 0.001), 
          v.y + (Math.cos(i) * 0.001)
        ] as [number, number]);
        
        const delaunay = d3.Delaunay.from(coords);
        const voronoi = delaunay.voronoi([0, 0, 100, 100]);
        
        voronoiCells = villages.map((v, i) => {
          const cellPolygon = voronoi.cellPolygon(i);
          let path = '';
          if (cellPolygon) {
            path = 'M' + cellPolygon.map(p => `${p[0]},${p[1]}`).join('L') + 'Z';
          }
          return {
            id: v.id,
            name: v.name,
            path,
            x: v.x,
            y: v.y
          };
        });
      } catch (err) {
        console.warn('[D3 Voronoi] Failed to generate influence territories:', err);
      }
    }

    return {
      contourPaths,
      voronoiCells
    };
  }, [villages, resourceNodes]);

  // Dynamic seasonal color schemes for the D3 topographical contours
  const getContourStyles = (level: number, season: string) => {
    if (mapStyle === 'parchment') {
      switch (level) {
        case 0: return { fill: 'rgba(139, 92, 26, 0.02)', stroke: 'rgba(93, 64, 55, 0.25)', strokeWidth: '0.45' };
        case 1: return { fill: 'rgba(139, 92, 26, 0.03)', stroke: 'rgba(93, 64, 55, 0.3)', strokeWidth: '0.45' };
        case 2: return { fill: 'rgba(139, 92, 26, 0.04)', stroke: 'rgba(93, 64, 55, 0.35)', strokeWidth: '0.45' };
        case 3: return { fill: 'rgba(139, 92, 26, 0.05)', stroke: 'rgba(93, 64, 55, 0.4)', strokeWidth: '0.45' };
        default: return { fill: 'rgba(93, 64, 55, 0.02)', stroke: 'rgba(93, 64, 55, 0.3)', strokeWidth: '0.4' };
      }
    }
    if (mapLayer === 'cave') {
      if (mapStyle === 'topo') {
        switch (level) {
          case 0: return { fill: 'rgba(168, 85, 247, 0.05)', stroke: 'rgba(168, 85, 247, 0.45)', strokeWidth: '0.4' };
          case 1: return { fill: 'rgba(192, 132, 252, 0.08)', stroke: 'rgba(192, 132, 252, 0.45)', strokeWidth: '0.4' };
          case 2: return { fill: 'rgba(217, 70, 239, 0.1)', stroke: 'rgba(217, 70, 239, 0.5)', strokeWidth: '0.4' };
          case 3: return { fill: 'rgba(232, 121, 249, 0.12)', stroke: 'rgba(232, 121, 249, 0.55)', strokeWidth: '0.4' };
          default: return { fill: 'rgba(168, 85, 247, 0.03)', stroke: 'rgba(168, 85, 247, 0.3)', strokeWidth: '0.4' };
        }
      } else {
        // Dark purple mysterious cavern outlines
        switch (level) {
          case 0: return { fill: 'rgba(48, 12, 85, 0.12)', stroke: 'rgba(147, 51, 234, 0.18)', strokeWidth: '0.4' };
          case 1: return { fill: 'rgba(59, 7, 100, 0.18)', stroke: 'rgba(168, 85, 247, 0.22)', strokeWidth: '0.4' };
          case 2: return { fill: 'rgba(24, 20, 38, 0.35)', stroke: 'rgba(139, 92, 246, 0.26)', strokeWidth: '0.4' };
          case 3: return { fill: 'rgba(15, 12, 25, 0.5)', stroke: 'rgba(99, 102, 241, 0.22)', strokeWidth: '0.35' };
          default: return { fill: 'rgba(10, 8, 18, 0.6)', stroke: 'rgba(99, 102, 241, 0.15)', strokeWidth: '0.3' };
        }
      }
    }
    if (season === 'winter') {
      switch (level) {
        case 0: return { fill: 'rgba(103, 232, 249, 0.12)', stroke: 'rgba(103, 232, 249, 0.22)', strokeWidth: '0.4' };
        case 1: return { fill: 'rgba(244, 244, 245, 0.15)', stroke: 'rgba(228, 228, 231, 0.2)', strokeWidth: '0.4' };
        case 2: return { fill: 'rgba(224, 242, 254, 0.18)', stroke: 'rgba(186, 230, 253, 0.22)', strokeWidth: '0.4' };
        case 3: return { fill: 'rgba(14, 116, 144, 0.12)', stroke: 'rgba(14, 116, 144, 0.18)', strokeWidth: '0.4' };
        case 4: return { fill: 'rgba(165, 180, 252, 0.1)', stroke: 'rgba(165, 180, 252, 0.16)', strokeWidth: '0.4' };
        case 5: return { fill: 'rgba(241, 245, 249, 0.2)', stroke: 'rgba(255, 255, 255, 0.3)', strokeWidth: '0.5' };
        case 6: return { fill: 'rgba(255, 255, 255, 0.4)', stroke: 'rgba(255, 255, 255, 0.55)', strokeWidth: '0.6' };
        default: return { fill: 'rgba(255, 255, 255, 0.08)', stroke: 'rgba(255, 255, 255, 0.15)', strokeWidth: '0.4' };
      }
    } else if (season === 'autumn') {
      switch (level) {
        case 0: return { fill: 'rgba(14, 165, 233, 0.15)', stroke: 'rgba(14, 165, 233, 0.22)', strokeWidth: '0.4' };
        case 1: return { fill: 'rgba(251, 191, 36, 0.14)', stroke: 'rgba(251, 191, 36, 0.22)', strokeWidth: '0.4' };
        case 2: return { fill: 'rgba(217, 119, 6, 0.1)', stroke: 'rgba(217, 119, 6, 0.18)', strokeWidth: '0.4' };
        case 3: return { fill: 'rgba(185, 28, 28, 0.12)', stroke: 'rgba(185, 28, 28, 0.2)', strokeWidth: '0.4' };
        case 4: return { fill: 'rgba(120, 53, 4, 0.12)', stroke: 'rgba(120, 53, 4, 0.2)', strokeWidth: '0.4' };
        case 5: return { fill: 'rgba(82, 82, 91, 0.2)', stroke: 'rgba(82, 82, 91, 0.3)', strokeWidth: '0.5' };
        case 6: return { fill: 'rgba(254, 240, 138, 0.25)', stroke: 'rgba(254, 240, 138, 0.45)', strokeWidth: '0.6' };
        default: return { fill: 'rgba(185, 28, 28, 0.08)', stroke: 'rgba(185, 28, 28, 0.15)', strokeWidth: '0.4' };
      }
    } else if (season === 'spring') {
      switch (level) {
        case 0: return { fill: 'rgba(6, 182, 212, 0.18)', stroke: 'rgba(6, 182, 212, 0.26)', strokeWidth: '0.4' };
        case 1: return { fill: 'rgba(253, 224, 71, 0.12)', stroke: 'rgba(253, 224, 71, 0.2)', strokeWidth: '0.4' };
        case 2: return { fill: 'rgba(16, 185, 129, 0.12)', stroke: 'rgba(16, 185, 129, 0.22)', strokeWidth: '0.4' };
        case 3: return { fill: 'rgba(4, 120, 87, 0.15)', stroke: 'rgba(4, 120, 87, 0.24)', strokeWidth: '0.4' };
        case 4: return { fill: 'rgba(5, 150, 105, 0.1)', stroke: 'rgba(5, 150, 105, 0.18)', strokeWidth: '0.4' };
        case 5: return { fill: 'rgba(148, 163, 184, 0.18)', stroke: 'rgba(148, 163, 184, 0.3)', strokeWidth: '0.5' };
        case 6: return { fill: 'rgba(248, 250, 252, 0.25)', stroke: 'rgba(248, 250, 252, 0.45)', strokeWidth: '0.6' };
        default: return { fill: 'rgba(16, 185, 129, 0.08)', stroke: 'rgba(16, 185, 129, 0.15)', strokeWidth: '0.4' };
      }
    } else { // Summer / Warm (Standard)
      switch (level) {
        case 0: return { fill: 'rgba(14, 165, 233, 0.18)', stroke: 'rgba(14, 165, 233, 0.26)', strokeWidth: '0.4' };
        case 1: return { fill: 'rgba(234, 179, 8, 0.12)', stroke: 'rgba(234, 179, 8, 0.2)', strokeWidth: '0.4' };
        case 2: return { fill: 'rgba(34, 197, 94, 0.12)', stroke: 'rgba(34, 197, 94, 0.2)', strokeWidth: '0.4' };
        case 3: return { fill: 'rgba(21, 128, 61, 0.14)', stroke: 'rgba(21, 128, 61, 0.22)', strokeWidth: '0.4' };
        case 4: return { fill: 'rgba(139, 92, 26, 0.1)', stroke: 'rgba(139, 92, 26, 0.18)', strokeWidth: '0.4' };
        case 5: return { fill: 'rgba(113, 113, 122, 0.18)', stroke: 'rgba(113, 113, 122, 0.3)', strokeWidth: '0.5' };
        case 6: return { fill: 'rgba(255, 255, 255, 0.25)', stroke: 'rgba(255, 255, 255, 0.45)', strokeWidth: '0.6' };
        default: return { fill: 'rgba(16, 185, 129, 0.08)', stroke: 'rgba(16, 185, 129, 0.15)', strokeWidth: '0.4' };
      }
    }
  };

  // Map Container Reference
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // SQLite custom database integration states
  const [sqliteCreatures, setSqliteCreatures] = useState<any[] | null>(null);
  const [totalKills, setTotalKills] = useState<number>(1438);
  const [sqliteInfo, setSqliteInfo] = useState<{
    lastUpdated: string | null;
    hasVillages: boolean;
    hasPlayers: boolean;
    hasCreatures: boolean;
    hasMapImage: boolean;
  }>({ lastUpdated: null, hasVillages: false, hasPlayers: false, hasCreatures: false, hasMapImage: false });
  const [isUploadingSqlite, setIsUploadingSqlite] = useState<boolean>(false);
  const [sqliteError, setSqliteError] = useState<string | null>(null);

  // Admin Mode states
  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => localStorage.getItem('wurm_admin_mode') === 'true');
  const [showAdminLogin, setShowAdminLogin] = useState<boolean>(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);

  // SFTP Integration states
  const [sftpHost, setSftpHost] = useState<string>(() => localStorage.getItem('wurm_sftp_host') || '');
  const [sftpPort, setSftpPort] = useState<string>(() => localStorage.getItem('wurm_sftp_port') || '22');
  const [sftpUsername, setSftpUsername] = useState<string>(() => localStorage.getItem('wurm_sftp_username') || '');
  const [sftpPassword, setSftpPassword] = useState<string>(() => localStorage.getItem('wurm_sftp_password') || '');
  const [sftpRemotePath, setSftpRemotePath] = useState<string>(() => localStorage.getItem('wurm_sftp_remote_path') || '');
  const [isSyncingSftp, setIsSyncingSftp] = useState<boolean>(false);
  const [sftpSuccessMessage, setSftpSuccessMessage] = useState<string | null>(null);

  // SFTP directory explorer states
  const [sftpBrowsedFiles, setSftpBrowsedFiles] = useState<any[] | null>(null);
  const [isBrowsingSftp, setIsBrowsingSftp] = useState<boolean>(false);
  const [sftpCurrentBrowsePath, setSftpCurrentBrowsePath] = useState<string>('');

  // Fetch SQLite Extracted Data on startup
  const fetchSqliteData = async () => {
    try {
      const res = await fetch('/api/sqlite/data');
      if (res.ok) {
        const data = await res.json();
        if (data.villages && data.villages.length > 0) {
          setVillages(data.villages);
        }
        if (data.players && data.players.length > 0) {
          setPlayers(data.players);
        }
        if (data.creatures && data.creatures.length > 0) {
          setSqliteCreatures(data.creatures);
        } else {
          setSqliteCreatures(null);
        }
        if (data.totalKills) {
          setTotalKills(data.totalKills);
        }
        setSqliteInfo({
          lastUpdated: data.lastUpdated || null,
          hasVillages: !!(data.villages && data.villages.length > 0),
          hasPlayers: !!(data.players && data.players.length > 0),
          hasCreatures: !!(data.creatures && data.creatures.length > 0),
          hasMapImage: !!(data.hasMapImage && data.hasMapImage[server.id])
        });
      }
    } catch (err) {
      console.error('Error fetching SQLite data:', err);
    }
  };

  useEffect(() => {
    fetchSqliteData();
  }, []);

  // Handle local SQLite file drag & drop or selection
  const handleSqliteUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingSqlite(true);
    setSqliteError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        // Fast buffer to string conversion
        const chunkSize = 0xffff;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const sub = bytes.subarray(i, i + chunkSize);
          binary += String.fromCharCode.apply(null, sub as any);
        }
        const base64 = btoa(binary);

        const response = await fetch('/api/sqlite/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filename: file.name,
            base64
          })
        });

        const resData = await response.json();
        if (response.ok) {
          if (resData.data.villages && resData.data.villages.length > 0) {
            setVillages(resData.data.villages);
          }
          if (resData.data.players && resData.data.players.length > 0) {
            setPlayers(resData.data.players);
          }
          if (resData.data.creatures && resData.data.creatures.length > 0) {
            setSqliteCreatures(resData.data.creatures);
          } else if (resData.type === 'zones') {
            setSqliteCreatures(null);
          }
          if (resData.data.totalKills) {
            setTotalKills(resData.data.totalKills);
          }
          setSqliteInfo({
            lastUpdated: resData.data.lastUpdated,
            hasVillages: !!(resData.data.villages && resData.data.villages.length > 0),
            hasPlayers: !!(resData.data.players && resData.data.players.length > 0),
            hasCreatures: !!(resData.data.creatures && resData.data.creatures.length > 0)
          });
          
          const isZones = resData.type === 'zones';
          setChatMessages(prev => [
            ...prev,
            {
              id: `sqlite-sys-${Date.now()}`,
              sender: 'Console SQLite',
              text: lang === 'fr' 
                ? `✅ Importation réussie de la DB [${file.name}]. ${isZones ? `${resData.count} Deeds/Villages chargés !` : `${resData.count} Joueurs extraits !`}`
                : `✅ Imported SQLite DB [${file.name}]. ${isZones ? `${resData.count} Deeds loaded!` : `${resData.count} Players loaded!`}`,
              channel: 'system',
              timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
              avatar: '💾'
            }
          ]);
        } else {
          setSqliteError(resData.error || 'Erreur lors de l\'importation');
        }
      } catch (err: any) {
        console.error('File processing error:', err);
        setSqliteError(err.message || 'Échec du traitement du fichier.');
      } finally {
        setIsUploadingSqlite(false);
      }
    };
    reader.onerror = () => {
      setSqliteError('Impossible de lire le fichier.');
      setIsUploadingSqlite(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleClearSqlite = async () => {
    if (!confirm(lang === 'fr' ? 'Voulez-vous vraiment effacer les données SQLite importées et restaurer la carte de démonstration ?' : 'Are you sure you want to delete custom SQLite data and restore the demo map?')) return;
    
    try {
      const response = await fetch('/api/sqlite/clear', { method: 'POST' });
      if (response.ok) {
        setVillages([
          { id: 'v1', name: 'Doriath Capital', mayor: 'GM_Kaelen', citizens: 18, sizeX: 80, sizeY: 80, x: 50, y: 45, guards: 12, hasSpiritTemplar: true, desc_fr: 'La capitale marchande protégée par les templiers divins de Fo. Havres de paix et de commerce.', desc_en: 'The trading capital protected by the divine templars of Fo. A safe haven of peace and commerce.' },
          { id: 'v2', name: 'Silverwood Hollow', mayor: 'Alyssa_Silver', citizens: 6, sizeX: 45, sizeY: 45, x: 28, y: 58, guards: 4, hasSpiritTemplar: false, desc_fr: 'Un village paisible axé sur la menuiserie fine et l\'élevage de chevaux sauvages.', desc_en: 'A quiet village focused on fine carpentry and wild horse breeding.' },
          { id: 'v3', name: 'Ironforge Stronghold', mayor: 'Ulfric_Ironclad', citizens: 8, sizeX: 60, sizeY: 60, x: 34, y: 31, guards: 8, hasSpiritTemplar: true, desc_fr: 'Forteresse minière nichée à flanc de montagne, exploitant le fer et le cuivre de haute pureté.', desc_en: 'Mining stronghold nestled in the mountain slopes, extracting high purity iron and copper.' },
          { id: 'v4', name: 'Moorland Harbor', mayor: 'Captain_Drake', citizens: 4, sizeX: 30, sizeY: 50, x: 65, y: 70, guards: 2, hasSpiritTemplar: false, desc_fr: 'Un comptoir côtier servant d\'embarcadère pour les expéditions marines et le commerce maritime.', desc_en: 'A coastal trading post serving as a launchpad for marine expeditions and maritime trade.' }
        ]);
        
        setPlayers([
          { id: 'p1', name: 'Eldrin Oakheart', title: 'Archimage de Fo', alignment: 94, village: 'Doriath Capital', specialty: 'Alchimie & Botanique', level: 88, x: 49.5, y: 46, status: 'crafting', avatar: '🧙‍♂️' },
          { id: 'p2', name: 'Ulfric Ironclad', title: 'Champion de Magranon', alignment: 50, village: 'Ironforge Stronghold', specialty: 'Forge & Minage', level: 82, x: 34.2, y: 31.5, status: 'fighting', avatar: '⚔️' },
          { id: 'p3', name: 'Lilith Vesper', title: 'Ombre Silencieuse', alignment: -45, village: 'Aucun (Hors-la-loi)', specialty: 'Combat & Assassinat', level: 91, x: 42.5, y: 23.0, status: 'fighting', avatar: '🥷' },
          { id: 'p4', name: 'Rowan Green', title: 'Maître Fermier', alignment: 85, village: 'Silverwood Hollow', specialty: 'Agriculture & Élevage', level: 68, x: 29.0, y: 57.5, status: 'active', avatar: '👩‍🌾' },
          { id: 'p5', name: 'Aethelgard', title: 'Grand Charpentier', alignment: 60, village: 'Doriath Capital', specialty: 'Menuiserie & Navires', level: 74, x: 50.8, y: 44.2, status: 'crafting', avatar: '🪚' },
          { id: 'p6', name: 'Garrick Stone', title: 'Maçon d\'Élite', alignment: 20, village: 'Ironforge Stronghold', specialty: 'Maçonnerie', level: 55, x: 33.8, y: 32.2, status: 'active', avatar: '🧱' }
        ]);

        setSqliteInfo({ lastUpdated: null, hasVillages: false, hasPlayers: false, hasCreatures: false });
        setSqliteCreatures(null);
        setTotalKills(1438);

        setChatMessages(prev => [
          ...prev,
          {
            id: `sqlite-clear-${Date.now()}`,
            sender: 'Console SQLite',
            text: lang === 'fr' 
              ? `♻️ Base de données SQLite réinitialisée. Retour aux données de démonstration de la Livemap.`
              : `♻️ SQLite custom database cleared. Livemap returned to simulation data mode.`,
            channel: 'system',
            timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
            avatar: '⚙️'
          }
        ]);
      }
    } catch (err) {
      console.error('Error clearing SQLite data:', err);
    }
  };

  const handleSftpSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sftpHost || !sftpUsername || !sftpPassword || !sftpRemotePath) {
      setSqliteError(lang === 'fr' ? 'Veuillez remplir tous les champs SFTP requis.' : 'Please fill in all required SFTP fields.');
      return;
    }

    // Save configurations in local storage
    localStorage.setItem('wurm_sftp_host', sftpHost);
    localStorage.setItem('wurm_sftp_port', sftpPort);
    localStorage.setItem('wurm_sftp_username', sftpUsername);
    localStorage.setItem('wurm_sftp_password', sftpPassword);
    localStorage.setItem('wurm_sftp_remote_path', sftpRemotePath);

    setIsSyncingSftp(true);
    setSqliteError(null);
    setSftpSuccessMessage(null);

    try {
      const response = await fetch('/api/sqlite/sftp-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: sftpHost,
          port: sftpPort,
          username: sftpUsername,
          password: sftpPassword,
          remotePath: sftpRemotePath,
          serverId: server.id
        })
      });

      const resData = await response.json();
      if (response.ok) {
        if (resData.data.villages && resData.data.villages.length > 0) {
          setVillages(resData.data.villages);
        }
        if (resData.data.players && resData.data.players.length > 0) {
          setPlayers(resData.data.players);
        }
        if (resData.data.creatures && resData.data.creatures.length > 0) {
          setSqliteCreatures(resData.data.creatures);
        }
        if (resData.data.totalKills) {
          setTotalKills(resData.data.totalKills);
        }
        setSqliteInfo({
          lastUpdated: resData.data.lastUpdated,
          hasVillages: !!(resData.data.villages && resData.data.villages.length > 0),
          hasPlayers: !!(resData.data.players && resData.data.players.length > 0),
          hasCreatures: !!(resData.data.creatures && resData.data.creatures.length > 0)
        });

        const msg = lang === 'fr'
          ? `⚡ Synchronisation SFTP Réussie ! ${resData.summary}`
          : `⚡ SFTP Synchronization Successful! ${resData.summary}`;
        setSftpSuccessMessage(msg);

        setChatMessages(prev => [
          ...prev,
          {
            id: `sftp-sys-${Date.now()}`,
            sender: 'Synchroniseur SFTP',
            text: msg,
            channel: 'system',
            timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
            avatar: '🚀'
          }
        ]);
      } else {
        setSqliteError(resData.error || 'Erreur lors de la synchronisation SFTP');
      }
    } catch (err: any) {
      console.error('SFTP sync error:', err);
      setSqliteError(err.message || 'Impossible de se connecter au serveur SFTP.');
    } finally {
      setIsSyncingSftp(false);
    }
  };

  const handleSftpBrowse = async (pathToBrowse?: string) => {
    const targetPath = pathToBrowse !== undefined ? pathToBrowse : sftpRemotePath;
    if (!sftpHost || !sftpUsername || !sftpPassword) {
      setSqliteError(lang === 'fr' ? 'Veuillez renseigner Host, Utilisateur et Mot de passe pour explorer.' : 'Please enter Host, Username and Password to explore.');
      return;
    }

    setIsBrowsingSftp(true);
    setSqliteError(null);
    try {
      const response = await fetch('/api/sqlite/sftp-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: sftpHost,
          port: sftpPort,
          username: sftpUsername,
          password: sftpPassword,
          remotePath: targetPath
        })
      });
      const resData = await response.json();
      if (response.ok) {
        setSftpBrowsedFiles(resData.files);
        setSftpCurrentBrowsePath(resData.path);
        setSftpRemotePath(resData.path);
        localStorage.setItem('wurm_sftp_remote_path', resData.path);
      } else {
        setSqliteError(resData.error || 'Erreur lors de l\'exploration SFTP');
      }
    } catch (err: any) {
      setSqliteError(err.message || 'Impossible de lister le dossier SFTP.');
    } finally {
      setIsBrowsingSftp(false);
    }
  };

  // Time & Weather Loop Simulation

  useEffect(() => {
    const interval = setInterval(() => {
      setWurmTime(prev => {
        let nextMin = prev.minute + 1;
        let nextHour = prev.hour;
        let nextDay = prev.day;
        let nextStarfall = prev.starfallIdx;
        let nextYear = prev.year;

        if (nextMin >= 60) {
          nextMin = 0;
          nextHour += 1;
        }
        if (nextHour >= 24) {
          nextHour = 0;
          nextDay += 1;
        }
        if (nextDay > 28) {
          nextDay = 1;
          nextStarfall += 1;
        }
        if (nextStarfall >= WURM_STARFALLS.length) {
          nextStarfall = 0;
          nextYear += 1;
        }

        return { hour: nextHour, minute: nextMin, day: nextDay, year: nextYear, starfallIdx: nextStarfall };
      });
    }, 4000); // Fast minutes

    return () => clearInterval(interval);
  }, []);

  // Synchronize activeSeason with wurmTime.starfallIdx cleanly
  useEffect(() => {
    const starfallIdx = wurmTime.starfallIdx;
    if (starfallIdx <= 2) setActiveSeason('spring');
    else if (starfallIdx <= 5) setActiveSeason('summer');
    else if (starfallIdx <= 8) setActiveSeason('autumn');
    else setActiveSeason('winter');
  }, [wurmTime.starfallIdx]);

  // Weather Auto-Cycle
  useEffect(() => {
    const weatherCycle = setInterval(() => {
      const weathers: Array<'clear' | 'rain' | 'snow' | 'fog' | 'storm'> = ['clear', 'rain', 'fog', 'storm', 'snow'];
      // Filter out snow in summer/spring
      let eligible = weathers;
      if (activeSeason === 'summer' || activeSeason === 'spring') {
        eligible = weathers.filter(w => w !== 'snow');
      } else if (activeSeason === 'winter') {
        eligible = weathers.filter(w => w !== 'rain' && w !== 'storm');
      }

      const randomWeather = eligible[Math.floor(Math.random() * eligible.length)];
      setActiveWeather(randomWeather);

      // Add system message about weather
      const msgText = lang === 'fr'
        ? `Le climat change : Ciel actuellement ${randomWeather === 'clear' ? 'Dégagé' : randomWeather === 'rain' ? 'Pluvieux' : randomWeather === 'snow' ? 'Neigeux' : randomWeather === 'fog' ? 'Brumeux' : 'Orageux'}.`
        : `Weather shift: Sky is now ${randomWeather}.`;

      setChatMessages(prev => [
        ...prev,
        {
          id: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          sender: 'System',
          text: msgText,
          channel: 'system',
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        }
      ].slice(-40)); // keep last 40
    }, 30000); // shifts weather every 30s

    return () => clearInterval(weatherCycle);
  }, [activeSeason, lang]);

  // Player position dynamic drift & path recording
  useEffect(() => {
    const movementInterval = setInterval(() => {
      const currentPlayers = playersRef.current;
      if (!currentPlayers || currentPlayers.length === 0) return;

      const updatedTrails: Record<string, { x: number; y: number }> = {};
      const newChats: any[] = [];

      const nextPlayers = currentPlayers.map(player => {
        if (player.status === 'afk') return player;

        // Standard movement vector
        let dx = (Math.random() - 0.5) * 1.8;
        let dy = (Math.random() - 0.5) * 1.8;

        // Keep players relatively close to their home villages to simulate living breathing settlements
        const home = villages.find(v => v.name === player.village);
        if (home) {
          const distToHomeX = player.x - home.x;
          const distToHomeY = player.y - home.y;
          // Pull back to village if too far
          if (Math.abs(distToHomeX) > 15) dx -= Math.sign(distToHomeX) * 0.8;
          if (Math.abs(distToHomeY) > 15) dy -= Math.sign(distToHomeY) * 0.8;
        }

        const nextX = Math.max(5, Math.min(95, player.x + dx));
        const nextY = Math.max(5, Math.min(95, player.y + dy));

        updatedTrails[player.id] = { x: nextX, y: nextY };

        // Random chance of triggering combat/craft action log
        if (Math.random() > 0.7) {
          const actions_fr = [
            `a coupé un cèdre majestueux`,
            `a forgé une lame d'épée longue en acier`,
            `a récolté de l'orge de haute qualité`,
            `a repoussé une attaque de rat-garou`,
            `a terminé la pose d'un mur en briques de pierre`,
            `a apprivoisé un jeune étalon noir`,
            `a miné un superbe cristal de sel`
          ];
          const actions_en = [
            `chopped down a majestic cedar tree`,
            `forged a high carbon steel longsword blade`,
            `harvested supreme quality barley`,
            `defended against a werewolf ambush`,
            `finished constructing a stone brick wall`,
            `tamed a wild black stallion`,
            `mined a beautiful salt crystal`
          ];

          const act = lang === 'fr'
            ? actions_fr[Math.floor(Math.random() * actions_fr.length)]
            : actions_en[Math.floor(Math.random() * actions_en.length)];

          newChats.push({
            id: `act_${Date.now()}_${player.id}_${Math.random().toString(36).substr(2, 5)}`,
            sender: player.name,
            text: act,
            channel: 'local',
            timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            avatar: player.avatar
          });
        }

        return { ...player, x: nextX, y: nextY };
      });

      // Batch all state updates sequentially at the top-level of the interval
      setPlayers(nextPlayers);

      if (Object.keys(updatedTrails).length > 0) {
        setPlayerTrails(prevTrails => {
          const copy = { ...prevTrails };
          Object.entries(updatedTrails).forEach(([pid, coords]) => {
            const currentTrail = copy[pid] || [];
            copy[pid] = [...currentTrail, coords].slice(-8);
          });
          return copy;
        });
      }

      if (newChats.length > 0) {
        setChatMessages(prev => [...prev, ...newChats].slice(-40));
      }
    }, 7000);

    return () => clearInterval(movementInterval);
  }, [villages, lang]);

  // Hunt interface & state
  interface HuntLog {
    id: string;
    player: string;
    avatar: string;
    creature: string;
    creatureIcon: string;
    bountyCoins: { silver: number, copper: number };
    timestamp: string;
    location: string;
    type?: 'hunt' | 'connection';
  }

  const [huntLogs, setHuntLogs] = useState<HuntLog[]>([]);

  const handleSimulateConnection = () => {
    const currentPlayers = playersRef.current;
    const hunterList = currentPlayers.length > 0 ? currentPlayers : [
      { name: 'Ulfric Ironclad', avatar: '⚔️', village: 'Ironforge Stronghold' },
      { name: 'Lilith Vesper', avatar: '🥷', village: 'Wilderness' }
    ];
    const player = hunterList[Math.floor(Math.random() * hunterList.length)];
    
    const newLog: HuntLog = {
      id: `hl_conn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      player: player.name,
      avatar: player.avatar || '🟢',
      creature: '',
      creatureIcon: '🟢',
      bountyCoins: { silver: 0, copper: 0 },
      timestamp: lang === 'fr' ? 'À l\'instant' : 'Just now',
      location: player.village || (lang === 'fr' ? 'Région sauvage' : 'Wilderness'),
      type: 'connection'
    };
    
    setHuntLogs(prev => [newLog, ...prev.slice(0, 9)]);
    
    setChatMessages(prev => [
      ...prev,
      {
        id: `chat-conn-${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        sender: 'System',
        text: lang === 'fr'
          ? `🔌 [Serveur] ${player.name} s'est connecté au serveur depuis ${newLog.location}.`
          : `🔌 [Server] ${player.name} connected to the server from ${newLog.location}.`,
        channel: 'system',
        timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
        avatar: '🔌'
      }
    ].slice(-40));
  };

  const handleSimulateHunt = async () => {
    const currentPlayers = playersRef.current;
    const hunterList = currentPlayers.length > 0 ? currentPlayers : [
      { name: 'Ulfric Ironclad', avatar: '⚔️', village: 'Ironforge Stronghold' },
      { name: 'Lilith Vesper', avatar: '🥷', village: 'Wilderness' }
    ];
    const player = hunterList[Math.floor(Math.random() * hunterList.length)];
    
    const fallbackCreatures = [
      { name_fr: 'Araignée de lave', name_en: 'Lava spider', icon: '🕷️', silver: 0, copper: 85 },
      { name_fr: 'Démon de lave', name_en: 'Lava fiend', icon: '🔥', silver: 1, copper: 10 },
      { name_fr: 'Gobelin agressif', name_en: 'Aggressive goblin', icon: '👺', silver: 0, copper: 35 },
      { name_fr: 'Ours brun', name_en: 'Brown bear', icon: '🐻', silver: 0, copper: 45 },
      { name_fr: 'Loup affamé', name_en: 'Starving wolf', icon: '🐺', silver: 0, copper: 20 },
      { name_fr: 'Dragonnet de feu', name_en: 'Fire dragon hatchling', icon: '🐉', silver: 2, copper: 50 },
      { name_fr: 'Géant des forêts', name_en: 'Forest giant', icon: '👹', silver: 3, copper: 0 }
    ];
    
    const activeList = (sqliteCreatures && sqliteCreatures.length > 0)
      ? sqliteCreatures.map(c => ({
          name_fr: c.name_fr,
          name_en: c.name_en,
          icon: c.icon,
          silver: Math.floor(Math.random() * 2),
          copper: Math.floor(Math.random() * 100)
        }))
      : fallbackCreatures;
      
    const cre = activeList[Math.floor(Math.random() * activeList.length)];
    const silver = cre.silver !== undefined ? cre.silver : Math.floor(Math.random() * 2);
    const copper = cre.copper !== undefined ? cre.copper : Math.floor(Math.random() * 80);
    
    try {
      const resp = await fetch('/api/sqlite/increment-kills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 1 })
      });
      if (resp.ok) {
        const rData = await resp.json();
        setTotalKills(rData.totalKills);
      } else {
        setTotalKills(prev => prev + 1);
      }
    } catch {
      setTotalKills(prev => prev + 1);
    }
    
    const newLog: HuntLog = {
      id: `hl_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      player: player.name,
      avatar: player.avatar || '⚔️',
      creature: lang === 'fr' ? cre.name_fr : cre.name_en,
      creatureIcon: cre.icon,
      bountyCoins: { silver, copper },
      timestamp: lang === 'fr' ? 'À l\'instant' : 'Just now',
      location: player.village || (lang === 'fr' ? 'Région sauvage' : 'Wilderness'),
      type: 'hunt'
    };
    
    setHuntLogs(prev => [newLog, ...prev.slice(0, 9)]);
    
    setChatMessages(prev => [
      ...prev,
      {
        id: `chat-hunt-${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        sender: 'BountyMod & Hunt',
        text: lang === 'fr'
          ? `🏆 [Chasse] ${player.name} a terrassé un(e) ${cre.name_fr} ! Prime obtenue : ${silver > 0 ? `${silver}s ` : ''}${copper}c.`
          : `🏆 [Hunt] ${player.name} slew a ${cre.name_en}! Bounty reward: ${silver > 0 ? `${silver}s ` : ''}${copper}c.`,
        channel: 'system',
        timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
        avatar: '🏆'
      }
    ].slice(-40));
  };

  // Background hunting loop simulation (handling hunts & connections)
  useEffect(() => {
    // Start with a small timeout to connect a player when they enter the tab so it feels reactive
    const initialTimer = setTimeout(() => {
      handleSimulateConnection();
    }, 4000);

    const huntInterval = setInterval(() => {
      const rand = Math.random();
      // 30% chance to simulate a hunt, 30% chance to simulate player connection
      if (rand < 0.30) {
        handleSimulateHunt();
      } else if (rand < 0.60) {
        handleSimulateConnection();
      }
    }, 15000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(huntInterval);
    };
  }, [sqliteCreatures, lang]);

  // Save custom markers to local storage
  useEffect(() => {
    localStorage.setItem(`wurm_markers_${server.id}`, JSON.stringify(markers));
  }, [markers, server.id]);

  // Handle Drag Map Viewport
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.interactive-map-hud') || (e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('select') || (e.target as HTMLElement).closest('.map-control-panel')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanX(e.clientX - dragStart.x);
      setPanY(e.clientY - dragStart.y);
    }
    if (mapContainerRef.current) {
      const parent = mapContainerRef.current.parentElement;
      if (parent) {
        const rect = parent.getBoundingClientRect();
        const relativeX = Math.round((((e.clientX - rect.left - panX) / zoom) / rect.width) * 4096);
        const relativeY = Math.round((((e.clientY - rect.top - panY) / zoom) / rect.height) * 4096);
        if (relativeX >= 0 && relativeX <= 4096 && relativeY >= 0 && relativeY <= 4096) {
          setCursorCoords({ x: relativeX, y: relativeY });
        }
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const zoomFactor = 0.12;
    const nextZoom = e.deltaY < 0 
      ? Math.min(zoom + zoomFactor, 5.0) 
      : Math.max(zoom - zoomFactor, 0.4);
    
    // Zoom toward viewport center
    setZoom(nextZoom);
  };

  const resetMapControls = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  const focusOnCoordinates = (x: number, y: number) => {
    if (!mapContainerRef.current) return;
    const parent = mapContainerRef.current.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const originalWidth = rect.width;
    const originalHeight = rect.height;
    
    const nextZoom = 1.8;
    setZoom(nextZoom);
    setPanX(originalWidth / 2 - (x / 100) * originalWidth * nextZoom);
    setPanY(originalHeight / 2 - (y / 100) * originalHeight * nextZoom);
  };

  const handleSearchCoords = (e: React.FormEvent) => {
    e.preventDefault();
    const xNum = parseInt(searchX, 10);
    const yNum = parseInt(searchY, 10);
    if (isNaN(xNum) || isNaN(yNum) || xNum < 0 || xNum > 4096 || yNum < 0 || yNum > 4096) {
      setSearchError(lang === 'fr' ? 'Coordonnées de tuiles invalides (0-4096)' : 'Invalid tile coordinates (0-4096)');
      return;
    }
    setSearchError(null);
    // Convert tile coordinates (0-4096) to percent (0-100)
    const xPct = (xNum / 4096) * 100;
    const yPct = (yNum / 4096) * 100;
    focusOnCoordinates(xPct, yPct);
  };

  // Chat message sender
  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg = {
      id: `chat_${Date.now()}`,
      sender: 'Vous (Admin)',
      text: chatInput.trim(),
      channel: 'glurpf' as const,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      avatar: '🛡️'
    };

    setChatMessages(prev => [...prev, newMsg]);
    setChatInput('');
  };

  // Marker creation submission
  const handleAddMarkerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMarkerName.trim()) return;

    const newMarker: MapMarker = {
      id: `m_${Date.now()}`,
      name: newMarkerName.trim(),
      type: newMarkerType,
      x: Math.max(0, Math.min(100, newMarkerX)),
      y: Math.max(0, Math.min(100, newMarkerY)),
      creator: lang === 'fr' ? 'Administrateur' : 'Administrator',
      notes: newMarkerNotes.trim() || undefined
    };

    setMarkers([...markers, newMarker]);
    setNewMarkerName('');
    setNewMarkerNotes('');
    setIsAddingMarker(false);
  };

  const getInspectionData = (x: number, y: number) => {
    // x and y are from 0 to 4096 (Wurm coordinates)
    const px = (x / 4096) * 100;
    const py = (y / 4096) * 100;

    const cx = 50;
    const cy = 50;
    const distToCenter = Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));

    if (mapLayer === 'cave') {
      let biome_fr = 'Souterrains Profonds / Cavernes';
      let biome_en = 'Deep Caverns & Tunnels';
      let elevation = Math.round(-30 - (px + py) / 6);
      let slope = Math.round((Math.sin(px / 8) * Math.cos(py / 8) * 18 + 24) % 60);
      let resource_fr = 'Roche granite solide';
      let resource_en = 'Solid Granite Rock';

      // Iron Forge
      if (Math.abs(px - 34) < 10 && Math.abs(py - 31) < 10) {
        resource_fr = 'Filon de Fer de haute pureté (QL 82)';
        resource_en = 'High-purity Iron Ore Vein (QL 82)';
        elevation = -12;
      } else if (Math.abs(px - 55) < 7 && Math.abs(py - 15) < 7) {
        resource_fr = 'Filon d\'Or Brillant Cristallisé (QL 89)';
        resource_en = 'Crystal Shimmering Gold Vein (QL 89)';
        elevation = -65;
      } else if (Math.abs(px - 48) < 8 && Math.abs(py - 62) < 8) {
        resource_fr = 'Filons d\'Argile argileuse et Kaolin (QL 72)';
        resource_en = 'Clay & Kaolin Subsoil deposit (QL 72)';
        elevation = -8;
      } else if (Math.abs(px - 25) < 10 && Math.abs(py - 48) < 10) {
        resource_fr = 'Source de Goudron souterraine (QL 55)';
        resource_en = 'Underground Tar spring (QL 55)';
        elevation = -24;
      } else if (px + py > 135) {
        resource_fr = 'Gisement d\'Obsidienne & Magma coulant';
        resource_en = 'Volcanic Obsidian & Flowing Magma';
        elevation = -110;
        slope = 45;
      }

      return {
        biome_fr,
        biome_en,
        elevation,
        slope,
        resource_fr,
        resource_en,
        isCave: true
      };
    }

    let biome_fr = 'Plaines herbeuses fertiles';
    let biome_en = 'Fertile Grassy Plains';
    let resource_fr = 'Herbe sauvage & Mousse sauvage';
    let resource_en = 'Wild Grass & Green Moss';
    let baseElev = 14;

    if (distToCenter > 46) {
      biome_fr = 'Océan Profond (Abyssal)';
      biome_en = 'Deep Abyssal Ocean';
      resource_fr = 'Eau salée & Plancton';
      resource_en = 'Deep saltwater & Plankton';
      baseElev = -45;
    } else if (distToCenter > 41) {
      biome_fr = 'Littoral de Sable doré';
      biome_en = 'Golden Sand Shoreline';
      resource_fr = 'Sable de silice pure (Idéal pour le verre)';
      resource_en = 'Silica sand (Great for fine glass)';
      baseElev = 2;
    } else if (Math.abs(px - 28) < 11 && Math.abs(py - 58) < 11) {
      biome_fr = 'Forêt de Cèdres & Bois Blanc';
      biome_en = 'Cedar & Softwood Forest';
      resource_fr = 'Bois de Cèdre ancien (QL 75)';
      resource_en = 'Ancient Cedar logs (QL 75)';
      baseElev = 24;
    } else if (Math.abs(px - 34) < 10 && Math.abs(py - 31) < 10) {
      biome_fr = 'Montagnes Rocheuses d\'Ardoise';
      biome_en = 'Rocky Slate Mountains';
      resource_fr = 'Granite dur & Minerai de Fer';
      resource_en = 'Solid Rock & Raw Iron';
      baseElev = 135;
    } else if (Math.abs(px - 48) < 8 && Math.abs(py - 62) < 8) {
      biome_fr = 'Bas-fonds de Glaise et d\'Argile';
      biome_en = 'Pottery Clay Wet Shallows';
      resource_fr = 'Argile naturelle malléable (QL 68)';
      resource_en = 'Malleable natural Clay (QL 68)';
      baseElev = 4;
    } else if (Math.abs(px - 70) < 12 && Math.abs(py - 72) < 12) {
      biome_fr = 'Tourbière sauvage & Marais';
      biome_en = 'Wild Peat Bog & Swamp';
      resource_fr = 'Bloc de Tourbe combustible & Roseaux';
      resource_en = 'Combustible Peat blocks & Reeds';
      baseElev = 3;
    } else if (px + py > 132) {
      biome_fr = 'Steppe Aride & Plaines Sèches';
      biome_en = 'Arid Steppe & Dry Scrublands';
      resource_fr = 'Herbes sèches & Sable jaune';
      resource_en = 'Dry grass & Yellow sand';
      baseElev = 30;
    }

    const noise = Math.sin(px / 5.5) * Math.cos(py / 5.5) * 11 + Math.sin(px / 11) * 5;
    const elevation = Math.round(baseElev + noise);

    const slope = Math.min(
      88,
      Math.abs(Math.round((Math.cos(px / 4) * 10 + Math.sin(py / 4) * 10 + (baseElev > 50 ? 28 : 2)))) + 1
    );

    return {
      biome_fr,
      biome_en,
      elevation: Math.max(elevation, distToCenter > 46 ? elevation : 1),
      slope,
      resource_fr,
      resource_en,
      isCave: false
    };
  };

  const activeResourceNodes = useMemo(() => {
    if (mapLayer === 'cave') {
      return [
        { id: 'cave-res1', name_fr: 'Filon de Fer Pur (Souterrain)', name_en: 'Pure Iron Ore Vein', type: 'iron', x: 34, y: 31 },
        { id: 'cave-res2', name_fr: 'Cristaux d\'Or d\'Élite', name_en: 'Elite Gold Crystals', type: 'gold', x: 55, y: 15 },
        { id: 'cave-res3', name_fr: 'Veine d\'Argent Cristallin', name_en: 'Crystalline Silver Vein', type: 'silver', x: 70, y: 72 },
        { id: 'cave-res4', name_fr: 'Source de Goudron Collant', name_en: 'Subterranean Tar Spring', type: 'tar', x: 25, y: 48 },
        { id: 'cave-res5', name_fr: 'Filon d\'Argile Kaolin Souple', name_en: 'Kaolin Soft Clay Bed', type: 'clay', x: 48, y: 62 },
        { id: 'cave-res6', name_fr: 'Fissure d\'Obsidienne volcanique', name_en: 'Obsidian Magmatic Fissure', type: 'obsidian', x: 80, y: 80 }
      ];
    }
    return resourceNodes;
  }, [mapLayer, resourceNodes]);

  const activeMapPreset = LARGE_MAPS_PRESETS.find(m => m.id === selectedMapId) || LARGE_MAPS_PRESETS[0];
  const activeSeasonData = WURM_SEASONS.find(s => s.id === activeSeason) || WURM_SEASONS[0];

  const inspectData = useMemo(() => {
    return getInspectionData(cursorCoords.x, cursorCoords.y);
  }, [cursorCoords, mapLayer]);

  return (
    <div className="max-w-7xl mx-auto w-full px-4 md:px-6 mt-6 flex-1 flex flex-col gap-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-black/50 border border-[#ff9900]/15 backdrop-blur-md p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 bg-[#ff9900]/10 hover:bg-[#ff9900]/20 border border-[#ff9900]/25 rounded-lg text-[#ff9900] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl filter drop-shadow">{server.game_icon}</span>
              <h1 className="text-xl md:text-2xl font-mono font-black text-white uppercase tracking-wider">
                {lang === 'fr' ? `Livemap : ${server.name_fr || server.name}` : `Livemap: ${server.name_en || server.name}`}
              </h1>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              🌐 {server.ip} • <span className="text-emerald-400 font-bold">WURM MAP SERVER PRO-MOD</span>
            </p>
          </div>
        </div>

        {/* Selected map dropdown and actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 bg-black/50 border border-zinc-800 rounded px-3 py-1.5 w-full sm:w-auto">
            <Layers className="w-4 h-4 text-[#ff9900]" />
            <select
              value={selectedMapId}
              onChange={(e) => {
                setSelectedMapId(e.target.value);
                resetMapControls();
              }}
              className="bg-transparent font-mono text-xs text-zinc-300 font-bold outline-none cursor-pointer w-full sm:w-44"
            >
              {LARGE_MAPS_PRESETS.map((m) => (
                <option key={m.id} value={m.id} className="bg-zinc-950 text-zinc-300">
                  {lang === 'fr' ? m.name_fr : m.name_en}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={resetMapControls}
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white rounded font-mono text-xs font-bold transition-all cursor-pointer"
          >
            {lang === 'fr' ? 'Centrer' : 'Center Map'}
          </button>

          {/* Admin Mode Toggle */}
          <button
            onClick={() => {
              if (isAdminMode) {
                setIsAdminMode(false);
                localStorage.setItem('wurm_admin_mode', 'false');
                setIsAddingMarker(false);
                if (activeBottomTab === 'sqlite' || activeBottomTab === 'mods') {
                  setActiveBottomTab('market');
                }
              } else {
                setShowAdminLogin(true);
              }
            }}
            className={`px-3 py-1.5 rounded font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              isAdminMode
                ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/35'
                : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white border-zinc-800'
            }`}
          >
            {isAdminMode ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{isAdminMode ? (lang === 'fr' ? 'GM : ADMIN' : 'GM: ADMIN') : (lang === 'fr' ? 'JOUEUR' : 'PLAYER')}</span>
          </button>
        </div>
      </div>

      {/* Dynamic atmospheric Season & Climate bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
        <div className="md:col-span-8 bg-black/45 border border-zinc-800/80 p-4 rounded-xl flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div className="flex items-center gap-3.5">
            <div className={`text-3xl p-3 bg-zinc-900/90 rounded-xl border border-zinc-800 ${activeSeasonData.color} flex items-center justify-center shadow-lg relative overflow-hidden`}>
              <span className="relative z-10 animate-pulse">{activeSeasonData.icon}</span>
              <span className="absolute inset-0 bg-white/2 opacity-10"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono tracking-widest">{lang === 'fr' ? 'Saison en cours' : 'Active Season'}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              </div>
              <h3 className="text-base font-black font-mono text-white mt-0.5">
                {lang === 'fr' ? activeSeasonData.name_fr : activeSeasonData.name_en}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 font-sans">
                {lang === 'fr' ? activeSeasonData.desc_fr : activeSeasonData.desc_en}
              </p>
            </div>
          </div>

          {/* Season controls panel for testing/simulation */}
          <div className="flex items-center gap-1.5 border-t sm:border-t-0 sm:border-l border-zinc-800/80 pt-3 sm:pt-0 sm:pl-4 flex-shrink-0">
            {WURM_SEASONS.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setActiveSeason(s.id as any);
                  if (s.id === 'winter') setActiveWeather('snow');
                  else if (s.id === 'spring') setActiveWeather('rain');
                  else setActiveWeather('clear');
                }}
                className={`w-9 h-9 flex items-center justify-center rounded border transition-all cursor-pointer ${
                  activeSeason === s.id
                    ? 'bg-[#ff9900]/10 border-[#ff9900] text-[#ff9900]'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800'
                }`}
                title={lang === 'fr' ? s.name_fr : s.name_en}
              >
                <span className="text-lg">{s.icon}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Climate HUD & Time */}
        <div className="md:col-span-4 bg-[#0f0a07]/60 border border-[#ff9900]/15 p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{lang === 'fr' ? 'Horloge Céleste' : 'Celestial Clock'}</span>
            <div className="flex items-center gap-1 text-[11px] text-[#ff9900] font-mono bg-[#ff9900]/10 px-2 py-0.5 rounded border border-[#ff9900]/20">
              <Clock className="w-3.5 h-3.5" />
              <span>YEAR {wurmTime.year}</span>
            </div>
          </div>

          <div className="my-2.5 flex items-baseline justify-between gap-1">
            <span className="text-2xl font-black font-mono text-white tracking-wider">
              {String(wurmTime.hour).padStart(2, '0')}:{String(wurmTime.minute).padStart(2, '0')}
            </span>
            <span className="text-xs text-zinc-400 font-mono italic">
              {lang === 'fr' ? WURM_STARFALLS[wurmTime.starfallIdx].fr : WURM_STARFALLS[wurmTime.starfallIdx].en}, Jour {wurmTime.day}
            </span>
          </div>

          <div className="flex items-center gap-1.5 justify-between border-t border-zinc-900 pt-2 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-xs">
                {activeWeather === 'clear' ? '☀️' : activeWeather === 'rain' ? '🌧️' : activeWeather === 'snow' ? '❄️' : activeWeather === 'fog' ? '🌫️' : '⛈️'}
              </span>
              <span className="font-mono text-[11px] text-zinc-300 capitalize">
                {lang === 'fr' ? `Climat: ${activeWeather === 'clear' ? 'Dégagé' : activeWeather === 'rain' ? 'Pluie' : activeWeather === 'snow' ? 'Neige' : activeWeather === 'fog' ? 'Brouillard' : 'Orage'}` : `Weather: ${activeWeather}`}
              </span>
            </div>

            {/* Weather manually selector */}
            <div className="flex gap-1">
              {(['clear', 'rain', 'fog', 'storm'] as const).map(w => (
                <button
                  key={w}
                  onClick={() => setActiveWeather(w)}
                  className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded border transition-colors cursor-pointer ${
                    activeWeather === w
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                      : 'bg-zinc-900 border-zinc-850 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {w.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Map & Mods workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Main interactive Livemap column - 8/12 (With Fullscreen support) */}
        <div className={`flex flex-col bg-zinc-950 overflow-hidden relative transition-all duration-300 ${
          isFullscreen 
            ? 'fixed inset-0 z-[9999] w-screen h-screen rounded-none' 
            : 'lg:col-span-8 border border-zinc-800 rounded-xl shadow-2xl'
        }`}>
          
          {/* Dynamic weather effect canvas wrapper overlays */}
          {mods.weatherEffects && (
            <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden mix-blend-screen">
              {activeWeather === 'rain' && (
                <div className="absolute inset-0 bg-repeat bg-center animate-pulse" style={{
                  backgroundImage: 'radial-gradient(circle, rgba(14,165,233,0.12) 10%, transparent 11%)',
                  backgroundSize: '15px 15px',
                  animationDuration: '1.2s'
                }}>
                  {/* CSS falling lines */}
                  <div className="absolute inset-0 opacity-25" style={{
                    backgroundImage: 'linear-gradient(175deg, transparent, transparent 70%, #0ea5e9 70%, #0ea5e9 80%, transparent 80%)',
                    backgroundSize: '80px 400px',
                    animation: 'scrollBg 0.8s linear infinite'
                  }}></div>
                </div>
              )}
              {activeWeather === 'snow' && (
                <div className="absolute inset-0 opacity-40" style={{
                  backgroundImage: 'radial-gradient(circle, #fff 8%, transparent 12%)',
                  backgroundSize: '24px 24px',
                  animation: 'scrollBg 4s linear infinite'
                }}></div>
              )}
              {activeWeather === 'fog' && (
                <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[1.2px] transition-all duration-1000"></div>
              )}
              {activeWeather === 'storm' && (
                <div className="absolute inset-0 bg-[#0c142c]/10 animate-flash-lightning"></div>
              )}
            </div>
          )}

          {/* Map Titlebar with Live coordinates / metadata */}
          <div className="p-4 bg-zinc-950 border-b border-zinc-900 flex justify-between items-center flex-wrap gap-2.5">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-400 animate-spin" style={{ animationDuration: '8s' }} />
              <div>
                <h3 className="font-mono text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span>🛰️ WURM LIVE NAVIGATION CLUSTER</span>
                  {isFullscreen && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded font-black">
                      {lang === 'fr' ? 'PLEIN ÉCRAN' : 'FULLSCREEN'}
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5 uppercase">
                  Map: {activeMapPreset.name_fr} • Mode: Modded Online
                </p>
              </div>
            </div>

            {/* GPS HUD and Controls */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <div className="font-mono text-[11px] bg-zinc-900 border border-zinc-800 text-emerald-400 px-2.5 py-1 rounded shadow-inner">
                📍 SCANNER COORDS • <span className="font-bold">X: {cursorCoords.x} Y: {cursorCoords.y}</span>
              </div>

              {/* Fullscreen toggle button */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className={`p-1.5 rounded text-zinc-300 hover:text-white transition-all font-mono text-xs font-bold flex items-center gap-1 cursor-pointer shadow border ${
                  isFullscreen
                    ? 'bg-orange-500/15 hover:bg-orange-500/25 border-orange-500/35 text-orange-400'
                    : 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800'
                }`}
                title={isFullscreen ? (lang === 'fr' ? 'Réduire' : 'Minimize') : (lang === 'fr' ? 'Plein écran' : 'Fullscreen')}
              >
                <Maximize2 className={`w-4 h-4 ${isFullscreen ? 'text-orange-400 animate-pulse' : 'text-zinc-400'}`} />
                <span className="hidden sm:inline">
                  {isFullscreen ? (lang === 'fr' ? 'RÉDUIRE' : 'MINIMIZE') : (lang === 'fr' ? 'PLEIN ÉCRAN' : 'FULLSCREEN')}
                </span>
              </button>
            </div>
          </div>

          {/* The interactive canvas map */}
          <div 
            onWheel={handleWheel}
            className="relative flex-1 bg-zinc-950 overflow-hidden select-none min-h-[500px]"
          >
            {/* Real-time Map Inspection HUD - Floating Top-Left */}
            <div className="absolute top-3 left-3 z-30 bg-black/85 border border-[#ff9900]/25 backdrop-blur-md p-3 rounded-lg text-white font-mono text-[10px] w-56 flex flex-col gap-1.5 shadow-2xl pointer-events-none select-none">
              <div className="flex items-center justify-between border-b border-[#ff9900]/20 pb-1.5 mb-1">
                <span className="font-extrabold text-[#ff9900] tracking-wider uppercase flex items-center gap-1">
                  🔍 SCANNER DE TERRAIN
                </span>
                <span className="text-[9px] px-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded uppercase font-black">
                  {mapLayer === 'cave' ? 'CAVE' : 'SURFACE'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 uppercase">BIOME:</span>
                <span className="text-white font-semibold text-right truncate max-w-[130px]" title={lang === 'fr' ? inspectData.biome_fr : inspectData.biome_en}>
                  {lang === 'fr' ? inspectData.biome_fr : inspectData.biome_en}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 uppercase">ALTITUDE:</span>
                <span className={`font-semibold ${inspectData.elevation >= 0 ? 'text-emerald-400' : 'text-purple-400'}`}>
                  {inspectData.elevation} dirks
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 uppercase">PENTE:</span>
                <span className="text-amber-400 font-semibold">{inspectData.slope}°</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 uppercase">RESSOURCE:</span>
                <span className="text-cyan-300 font-semibold text-right truncate max-w-[130px]" title={lang === 'fr' ? inspectData.resource_fr : inspectData.resource_en}>
                  {lang === 'fr' ? inspectData.resource_fr : inspectData.resource_en}
                </span>
              </div>
            </div>

            {/* Draggable Viewport */}
            <div
              ref={mapContainerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{
                transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                transformOrigin: 'top left',
                transition: isDragging ? 'none' : 'transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)'
              }}
              className="absolute inset-0 w-full h-full min-w-[600px] min-h-[500px]"
            >
              {/* Textured Map Backdrop styled according to season / style preset */}
              <div
                className={`absolute inset-0 transition-all duration-1000 ${
                  mapLayer === 'cave'
                    ? mapStyle === 'topo'
                      ? 'bg-zinc-950 border border-purple-500/20'
                      : 'bg-gradient-to-br from-zinc-950 via-[#120f1c] to-zinc-950'
                    : mapStyle === 'wurm_mapgen'
                    ? 'bg-[#eddcb9]'
                    : mapStyle === 'parchment'
                    ? 'bg-[#eddcb9]'
                    : mapStyle === 'topo'
                    ? 'bg-zinc-950 border border-emerald-500/20'
                    : mapStyle === 'origin'
                    ? 'bg-zinc-900'
                    : activeSeason === 'spring'
                    ? 'bg-gradient-to-tr from-emerald-950/95 via-green-900/90 to-teal-900/95'
                    : activeSeason === 'summer'
                    ? 'bg-gradient-to-tr from-green-950 via-emerald-900 to-green-900'
                    : activeSeason === 'autumn'
                    ? 'bg-gradient-to-br from-amber-950/95 via-yellow-950/90 to-orange-950/95'
                    : 'bg-gradient-to-tr from-cyan-950/95 via-zinc-900/95 to-slate-950'
                }`}
                style={mapStyle === 'origin' ? {
                  backgroundImage: `url(${customMapUrl || `/api/map-image/${server.id}?t=${Date.now()}`})`,
                  backgroundSize: '100% 100%',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                } : undefined}
              >
                {/* Fallback configuration dialog if origin map is not loaded or configured */}
                {mapStyle === 'origin' && !customMapUrl && !sqliteInfo.hasMapImage && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-sm pointer-events-auto p-4 text-center z-15">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-sm p-4 shadow-2xl">
                      <span className="text-[#ff9900] text-[11px] font-black block mb-2 uppercase tracking-wider">
                        🗺️ CARTE ORIGINALE NON DISPONIBLE
                      </span>
                      <p className="text-[10px] text-zinc-400 font-mono leading-relaxed mb-3">
                        Pour afficher la carte live d'origine de votre serveur Wurm :
                      </p>
                      <div className="text-[9px] text-zinc-400 text-left space-y-1.5 mb-4 font-mono bg-black/40 p-2.5 rounded border border-zinc-950 leading-tight">
                        <div className="flex gap-1.5"><span className="text-[#ff9900]">1.</span> <span>Collez un <strong>lien d'image</strong> (.png ou .jpg) de votre carte dans le panneau "MOTEUR DE RENDU" à droite.</span></div>
                        <div className="flex gap-1.5"><span className="text-[#ff9900]">2.</span> <span>Ou <strong>synchronisez via SFTP</strong> dans l'onglet "Base de Données" ci-dessous pour télécharger automatiquement le fichier <code>map.png</code> de votre serveur.</span></div>
                      </div>
                      {server.ip && (
                        <button
                          onClick={() => {
                            const ipOnly = server.ip.split(':')[0];
                            setCustomMapUrl(`http://${ipOnly}/map.png`);
                          }}
                          className="w-full bg-[#ff9900] hover:bg-amber-600 text-black text-[9px] font-black uppercase py-1.5 rounded transition-all tracking-wider"
                        >
                          Tenter de deviner via l'IP ({server.ip.split(':')[0]})
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Geographic Grid System (Google Maps / WurmMapGen style) */}
                {mods.gridSystem && (
                  <div className={`absolute inset-0 grid grid-cols-12 grid-rows-12 pointer-events-none transition-opacity duration-300 ${
                    mapStyle === 'wurm_mapgen' || mapStyle === 'parchment' ? 'opacity-35' : mapStyle === 'topo' ? 'opacity-50' : 'opacity-20'
                  }`}>
                    {Array.from({ length: 144 }).map((_, i) => {
                      const colChar = String.fromCharCode(65 + (i % 12));
                      const rowNum = Math.floor(i / 12) + 1;
                      return (
                        <div 
                          key={i} 
                          className={`border p-1 text-[9px] font-mono flex flex-col justify-between ${
                            mapStyle === 'wurm_mapgen' || mapStyle === 'parchment'
                              ? 'border-amber-900/15 text-amber-900/60 font-semibold' 
                              : mapStyle === 'topo' 
                              ? 'border-emerald-500/10 text-emerald-500/60' 
                              : 'border-white/10 text-zinc-500'
                          }`}
                        >
                          <span>{colChar}{rowNum}</span>
                          <span className="text-[7px] opacity-75">{(i % 12) * 340}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* D3 Dynamic Topography - WurmMapGen v2 Engine */}
                {(mapStyle === 'wurm_mapgen' || mapStyle === 'parchment' || mapStyle === 'topo' || mapLayer === 'cave') && mapStyle !== 'origin' && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {/* D3 Contour Paths (Dynamic Landmasses, Hills, Mountains) */}
                    {d3GeographicData.contourPaths.map((contour, i) => {
                      const styles = getContourStyles(contour.level, activeSeason);
                      return (
                        <path
                          key={`contour-${i}`}
                          d={contour.path}
                          fill={styles.fill}
                          stroke={styles.stroke}
                          strokeWidth={styles.strokeWidth}
                          className="transition-all duration-700 ease-in-out"
                        />
                      );
                    })}

                    {/* D3 Voronoi Cells (Political/Influence Territories of Active Villages) */}
                    {mods.villages && mapLayer === 'surface' && d3GeographicData.voronoiCells.map((cell) => {
                      const isSelected = selectedVillage?.id === cell.id;
                      return (
                        <path
                          key={`voronoi-${cell.id}`}
                          d={cell.path}
                          fill={isSelected ? 'rgba(251, 146, 60, 0.08)' : 'rgba(251, 146, 60, 0.015)'}
                          stroke={isSelected ? '#f97316' : 'rgba(251, 146, 60, 0.12)'}
                          strokeWidth={isSelected ? '0.75' : '0.35'}
                          strokeDasharray={isSelected ? '2,1' : '4,3'}
                          className="transition-all duration-500 ease-in-out pointer-events-auto cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            const v = villages.find(v => v.id === cell.id);
                            if (v) {
                               setSelectedVillage(v);
                               setSelectedPlayer(null);
                            }
                          }}
                        >
                          <title>{`${cell.name} Territory`}</title>
                        </path>
                      );
                    })}
                  </svg>
                )}

                {/* SVG Contours - Original Islands, Hills, River for Standard maps */}
                {mapStyle === 'standard' && mapLayer === 'surface' && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {/* Island continent contours */}
                    <path d="M 15,25 Q 35,12 55,22 T 88,28 Q 82,72 52,82 T 12,58 Z"
                      fill={
                        activeSeason === 'winter' ? 'rgba(255,255,255,0.08)' : 'rgba(16,185,129,0.12)'
                      }
                      stroke={
                        activeSeason === 'winter' ? 'rgba(255,255,255,0.3)' : 'rgba(16,185,129,0.35)'
                      }
                      strokeWidth="0.6"
                    />

                    {/* High hills contours */}
                    <circle cx="34" cy="32" r="14" 
                      fill="rgba(0,0,0,0.15)" 
                      stroke="rgba(255,255,255,0.05)" 
                      strokeWidth="0.4" 
                    />
                    <circle cx="50" cy="45" r="22" 
                      fill="rgba(0,0,0,0.1)" 
                      stroke="rgba(255,255,255,0.05)" 
                      strokeWidth="0.4" 
                    />
                    
                    {/* Rivers */}
                    <path d="M 34,31 C 42,42 46,38 50,45 S 58,58 65,70" fill="none"
                      stroke={
                        activeSeason === 'winter' ? '#a5f3fc' : '#0ea5e9'
                      }
                      strokeWidth="1.2"
                      opacity="0.6"
                    />
                  </svg>
                )}

                {/* Subterranean Caves custom paths (Cavern systems and Lava pits) */}
                {mapLayer === 'cave' && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none animate-fade-in" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {/* Cavern tunnels and hollow outline */}
                    <path d="M 20,40 Q 30,25 45,35 T 70,25 T 80,60 T 50,80 T 25,70 Z"
                      fill="rgba(147, 51, 234, 0.02)"
                      stroke={mapStyle === 'parchment' ? 'rgba(93, 64, 55, 0.45)' : mapStyle === 'topo' ? '#c084fc' : 'rgba(168, 85, 247, 0.4)'}
                      strokeWidth="0.75"
                      strokeDasharray={mapStyle === 'parchment' ? '3,2' : '4,4'}
                    />
                    
                    {/* Tunnels intersecting */}
                    <path d="M 34,31 C 28,45 42,50 48,62 C 55,70 65,70 70,72 M 50,45 C 40,42 28,58 25,48"
                      fill="none"
                      stroke={mapStyle === 'parchment' ? 'rgba(93, 64, 55, 0.35)' : mapStyle === 'topo' ? 'rgba(192, 132, 252, 0.6)' : 'rgba(168, 85, 247, 0.5)'}
                      strokeWidth="1.6"
                    />
                    
                    {/* Subterranean Magma Lake */}
                    <path d="M 78,78 Q 88,72 82,85 T 72,82 Z"
                      fill="rgba(239, 68, 68, 0.2)"
                      stroke="#ef4444"
                      strokeWidth="0.55"
                      className="animate-pulse"
                    />
                  </svg>
                )}

                {/* Render Resource Nodes */}
                {mods.resources && activeResourceNodes.map(node => (
                  <div
                    key={node.id}
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-10 group"
                  >
                    <div className="w-5 h-5 rounded bg-zinc-900 border border-zinc-700/80 hover:border-amber-400 flex items-center justify-center text-xs hover:scale-125 transition-all shadow-md cursor-pointer">
                      {node.type === 'iron' ? '🪨' : node.type === 'gold' ? '🪙' : node.type === 'silver' ? '💎' : node.type === 'clay' ? '🧱' : node.type === 'tar' ? '🕳️' : node.type === 'obsidian' ? '🌋' : '🌾'}
                    </div>
                    {/* Resource tooltip */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-7 opacity-0 group-hover:opacity-100 bg-zinc-950 border border-zinc-800 text-white text-[11px] font-mono p-2 rounded w-44 pointer-events-none transition-opacity shadow-2xl leading-snug">
                      <div className="font-extrabold text-amber-400">{lang === 'fr' ? node.name_fr : node.name_en}</div>
                      <div className="text-[9px] text-zinc-500 mt-0.5">X: {Math.round(node.x * 40.96)} Y: {Math.round(node.y * 40.96)}</div>
                    </div>
                  </div>
                ))}

                {/* Render guard tower safezones */}
                {mods.guardTowers && markers.filter(m => m.type === 'tower').map(tower => (
                  <div
                    key={tower.id}
                    style={{ left: `${tower.x}%`, top: `${tower.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  >
                    {/* Protective circular border */}
                    <div className="w-24 h-24 rounded-full border border-emerald-500/20 bg-emerald-500/5 -translate-x-1/2 -translate-y-1/2 absolute"></div>
                  </div>
                ))}

                {/* Render Village borders & center hall */}
                {mods.villages && villages.map(v => (
                  <div
                    key={v.id}
                    style={{ left: `${v.x}%`, top: `${v.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group"
                  >
                    {/* Interactive village bounds highlight */}
                    <div
                      style={{ width: `${v.sizeX * 1.5}px`, height: `${v.sizeY * 1.5}px` }}
                      className={`rounded border -translate-x-1/2 -translate-y-1/2 absolute transition-all pointer-events-none flex items-center justify-center ${
                        selectedVillage?.id === v.id
                          ? 'border-orange-500 border-2 border-dashed bg-orange-500/10 scale-100 z-30'
                          : 'border-[#ff9900]/25 bg-[#ff9900]/4'
                      }`}
                    >
                      {/* Deep cadastre boundary label coordinates on 4 corners */}
                      {selectedVillage?.id === v.id && (
                        <>
                          <div className="absolute -top-6 -left-12 bg-black/90 text-[#ff9900] border border-orange-500/30 font-mono text-[8px] px-1 py-0.5 rounded shadow whitespace-nowrap z-40">
                            NW: {Math.round(v.x * 40.96 - v.sizeX / 2)}, {Math.round(v.y * 40.96 - v.sizeY / 2)}
                          </div>
                          <div className="absolute -top-6 -right-12 bg-black/90 text-[#ff9900] border border-orange-500/30 font-mono text-[8px] px-1 py-0.5 rounded shadow whitespace-nowrap z-40">
                            NE: {Math.round(v.x * 40.96 + v.sizeX / 2)}, {Math.round(v.y * 40.96 - v.sizeY / 2)}
                          </div>
                          <div className="absolute -bottom-6 -left-12 bg-black/90 text-[#ff9900] border border-orange-500/30 font-mono text-[8px] px-1 py-0.5 rounded shadow whitespace-nowrap z-40">
                            SW: {Math.round(v.x * 40.96 - v.sizeX / 2)}, {Math.round(v.y * 40.96 + v.sizeY / 2)}
                          </div>
                          <div className="absolute -bottom-6 -right-12 bg-black/90 text-[#ff9900] border border-orange-500/30 font-mono text-[8px] px-1 py-0.5 rounded shadow whitespace-nowrap z-40">
                            SE: {Math.round(v.x * 40.96 + v.sizeX / 2)}, {Math.round(v.y * 40.96 + v.sizeY / 2)}
                          </div>
                          
                          {/* Inner center marker label */}
                          <div className="bg-black/95 text-white border border-zinc-800 font-mono text-[8px] px-1.5 py-0.5 rounded shadow z-40">
                            CTR: {Math.round(v.x * 40.96)}, {Math.round(v.y * 40.96)}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Deed Hall marker flag */}
                    <button
                      onClick={() => { setSelectedVillage(v); setSelectedPlayer(null); }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center bg-black border hover:scale-125 transition-all shadow-2xl relative ${
                        selectedVillage?.id === v.id ? 'border-orange-500 scale-110' : 'border-[#ff9900]/50'
                      }`}
                    >
                      <Flag className={`w-3.5 h-3.5 ${selectedVillage?.id === v.id ? 'text-orange-500 animate-bounce' : 'text-[#ff9900]'}`} />
                    </button>

                    {/* Deed Tooltip */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-9 opacity-0 group-hover:opacity-100 bg-zinc-950 border border-orange-500/30 text-white text-[11px] font-mono p-3 rounded-lg w-52 pointer-events-none transition-all shadow-2xl leading-tight">
                      <div className="font-black text-[#ff9900] text-xs flex justify-between">
                        <span>{v.name}</span>
                        <span className="text-[10px] text-zinc-500">{v.sizeX}x{v.sizeY}</span>
                      </div>
                      <p className="text-zinc-400 text-[10px] mt-1 font-sans leading-snug">{lang === 'fr' ? v.desc_fr : v.desc_en}</p>
                      <div className="text-[9px] text-zinc-500 mt-2 pt-1 border-t border-zinc-900 flex justify-between">
                        <span>Maire: {v.mayor}</span>
                        <span>👥 {v.citizens} cit.</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Visual Connection Lines linking Citizens to Selected Village / Player */}
                {showMemberLinks && mods.players && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-15">
                    <defs>
                      <linearGradient id="link-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ff9900" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#d97706" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
                      </linearGradient>
                    </defs>
                    {/* Selected Village -> its citizens */}
                    {selectedVillage && players
                      .filter(p => p.village === selectedVillage.name)
                      .map(p => (
                        <g key={`link-v-${selectedVillage.id}-${p.id}`}>
                          <line
                            x1={`${selectedVillage.x}%`}
                            y1={`${selectedVillage.y}%`}
                            x2={`${p.x}%`}
                            y2={`${p.y}%`}
                            stroke="url(#link-gradient)"
                            strokeWidth="2"
                            strokeDasharray="6,4"
                            className="opacity-75"
                          />
                          <circle cx={`${p.x}%`} cy={`${p.y}%`} r="5" fill="#10b981" className="animate-ping" />
                          <circle cx={`${selectedVillage.x}%`} cy={`${selectedVillage.y}%`} r="5" fill="#ff9900" className="animate-ping" />
                        </g>
                      ))
                    }
                    {/* Selected Player -> their home village */}
                    {selectedPlayer && villages
                      .filter(v => v.name === selectedPlayer.village)
                      .map(v => (
                        <g key={`link-p-${selectedPlayer.id}-${v.id}`}>
                          <line
                            x1={`${selectedPlayer.x}%`}
                            y1={`${selectedPlayer.y}%`}
                            x2={`${v.x}%`}
                            y2={`${v.y}%`}
                            stroke="#eab308"
                            strokeWidth="2"
                            strokeDasharray="6,4"
                            className="opacity-75"
                          />
                          <circle cx={`${selectedPlayer.x}%`} cy={`${selectedPlayer.y}%`} r="5" fill="#22c55e" className="animate-ping" />
                          <circle cx={`${v.x}%`} cy={`${v.y}%`} r="5" fill="#f59e0b" className="animate-ping" />
                        </g>
                      ))
                    }
                  </svg>
                )}

                {/* Render Player History Trails */}
                {mods.playerTrails && Object.entries(playerTrails).map(([playerId, pointsList]) => {
                  const points = pointsList as Array<{ x: number; y: number }>;
                  if (points.length < 2) return null;
                  return (
                    <svg key={`trail-${playerId}`} className="absolute inset-0 w-full h-full pointer-events-none z-10">
                      <polyline
                        points={points.map(p => `${(p.x / 100) * 1000},${(p.y / 100) * 1000}`).join(' ')}
                        viewBox="0 0 1000 1000"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="1.5"
                        strokeDasharray="4,4"
                        opacity="0.5"
                      />
                    </svg>
                  );
                })}

                {/* Render Online Player Markers */}
                {mods.players && players.map(p => (
                  <div
                    key={p.id}
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-30 group"
                  >
                    {/* Blinking active beacon */}
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-55 animate-ping" style={{ animationDuration: '2.5s' }}></span>
                    <button
                      onClick={() => { setSelectedPlayer(p); setSelectedVillage(null); }}
                      className={`w-6 h-6 rounded-full flex items-center justify-center bg-zinc-900 border-2 shadow-xl hover:scale-125 transition-all text-sm relative z-10 ${
                        selectedPlayer?.id === p.id ? 'border-yellow-400 scale-110' : 'border-emerald-400'
                      }`}
                    >
                      <span>{p.avatar}</span>
                    </button>

                    {/* Detailed hover overlay */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-8 opacity-0 group-hover:opacity-100 bg-zinc-950/95 border border-emerald-400/40 text-white text-[11px] font-mono p-2.5 rounded-lg w-44 pointer-events-none transition-all shadow-xl leading-snug">
                      <div className="font-extrabold text-emerald-400 flex items-center gap-1">
                        <span>●</span>
                        <span>{p.name}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{p.title}</p>
                      <div className="text-[9px] text-zinc-500 mt-1.5 pt-1 border-t border-zinc-900">
                        {p.village} • Lvl {p.level}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Custom User Markers */}
                {markers.map(m => (
                  <div
                    key={m.id}
                    style={{ left: `${m.x}%`, top: `${m.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group"
                  >
                    <button
                      onClick={() => setSelectedPlayer(null)}
                      className="w-5.5 h-5.5 rounded-full flex items-center justify-center bg-black/85 border border-orange-500 shadow-xl hover:scale-125 transition-all text-xs"
                    >
                      {m.type === 'danger' ? '💀' : m.type === 'portal' ? '🌀' : m.type === 'tower' ? '🏹' : '🛡️'}
                    </button>
                    {/* Marker Tooltip */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-7 opacity-0 group-hover:opacity-100 bg-zinc-950 border border-zinc-800 text-white text-[11px] font-mono p-2.5 rounded-lg w-44 pointer-events-none transition-all shadow-2xl leading-snug">
                      <div className="font-black text-orange-400 flex justify-between">
                        <span>{m.name}</span>
                        <span className="text-[8px] text-zinc-500">({m.type})</span>
                      </div>
                      {m.notes && <p className="text-zinc-400 text-[10px] mt-1 font-sans leading-normal">{m.notes}</p>}
                      <div className="text-[9px] text-zinc-500 mt-2 border-t border-zinc-900 pt-1 flex justify-between">
                        <span>By: {m.creator}</span>
                        <span>{Math.round(m.x * 40.96)}x{Math.round(m.y * 40.96)}</span>
                      </div>
                    </div>
                  </div>
                ))}

              </div>
            </div>

            {/* GOOGLE MAPS STYLE FLOATING CONTROL DECK */}
            <div className="absolute top-4 right-4 z-40 flex flex-col gap-2 max-w-xs w-72">
              {/* Main Search Panel */}
              <div className="bg-zinc-950/90 border border-zinc-800 rounded-lg shadow-2xl backdrop-blur-md p-3 font-mono text-[11px] map-control-panel">
                <div className="flex items-center gap-1.5 justify-between border-b border-zinc-900 pb-2 mb-2">
                  <span className="font-black text-white uppercase tracking-wider flex items-center gap-1">
                    <Search className="w-3.5 h-3.5 text-amber-500" />
                    <span>RECHERCHE GPS TILE</span>
                  </span>
                  <button 
                    onClick={() => setShowSearchPanel(!showSearchPanel)}
                    className="text-zinc-500 hover:text-white text-[9px] uppercase font-bold"
                  >
                    {showSearchPanel ? 'Cacher' : 'Afficher'}
                  </button>
                </div>

                {showSearchPanel && (
                  <form onSubmit={handleSearchCoords} className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[9px] text-zinc-500 uppercase block mb-0.5">X coord (0-4096)</label>
                        <input
                          type="number"
                          placeholder="e.g. 2000"
                          value={searchX}
                          onChange={(e) => setSearchX(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-zinc-500 uppercase block mb-0.5">Y coord (0-4096)</label>
                        <input
                          type="number"
                          placeholder="e.g. 1800"
                          value={searchY}
                          onChange={(e) => setSearchY(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                    {searchError && (
                      <div className="text-[9px] text-rose-500 font-bold bg-rose-950/30 p-1 rounded border border-rose-900/30">
                        ⚠️ {searchError}
                      </div>
                    )}
                    <button
                      type="submit"
                      className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold uppercase py-1 rounded transition-colors text-xs flex items-center justify-center gap-1"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>{lang === 'fr' ? 'CENTRE LA CARTE' : 'LOCATE POSITION'}</span>
                    </button>
                  </form>
                )}
              </div>

              {/* Map Layers & WurmMapGen Style Panel */}
              <div className="bg-zinc-950/90 border border-zinc-800 rounded-lg shadow-2xl backdrop-blur-md p-3 font-mono text-[11px] map-control-panel">
                <div className="flex items-center gap-1.5 justify-between border-b border-zinc-900 pb-2 mb-2">
                  <span className="font-black text-white uppercase tracking-wider flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    <span>STYLE & CARTOGRAPHIE</span>
                  </span>
                  <button 
                    onClick={() => setShowStylePanel(!showStylePanel)}
                    className="text-zinc-500 hover:text-white text-[9px] uppercase font-bold"
                  >
                    {showStylePanel ? 'Cacher' : 'Afficher'}
                  </button>
                </div>

                {showStylePanel && (
                  <div className="flex flex-col gap-2.5">
                    {/* Style selector */}
                    <div>
                      <span className="text-[9px] text-zinc-500 uppercase block mb-1">MOTEUR DE RENDU</span>
                      <div className="grid grid-cols-2 gap-1 mb-2.5">
                        <button
                          onClick={() => setMapStyle('standard')}
                          className={`px-1 py-1 rounded text-[9px] font-bold border transition-all uppercase text-center ${
                            mapStyle === 'standard'
                              ? 'bg-zinc-800 text-white border-zinc-600'
                              : 'bg-zinc-900/50 text-zinc-500 border-zinc-900 hover:text-zinc-300'
                          }`}
                        >
                          Standard
                        </button>
                        <button
                          onClick={() => setMapStyle('wurm_mapgen')}
                          className={`px-1 py-1 rounded text-[9px] font-bold border transition-all uppercase text-center ${
                            mapStyle === 'wurm_mapgen'
                              ? 'bg-amber-500 text-black border-amber-600'
                              : 'bg-zinc-900/50 text-zinc-500 border-zinc-900 hover:text-zinc-300'
                          }`}
                          title="Retro cartographic style WurmMapGen v2"
                        >
                          MapGen v2
                        </button>
                        <button
                          onClick={() => setMapStyle('topo')}
                          className={`px-1 py-1 rounded text-[9px] font-bold border transition-all uppercase text-center ${
                            mapStyle === 'topo'
                              ? 'bg-emerald-500 text-black border-emerald-600'
                              : 'bg-zinc-900/50 text-zinc-500 border-zinc-900 hover:text-zinc-300'
                          }`}
                        >
                          TOPO NEON
                        </button>
                        <button
                          onClick={() => setMapStyle('parchment')}
                          className={`px-1 py-1 rounded text-[9px] font-bold border transition-all uppercase text-center ${
                            mapStyle === 'parchment'
                              ? 'bg-[#eddcb9] text-[#4d2f0a] border-amber-700/60 font-extrabold shadow-sm'
                              : 'bg-zinc-900/50 text-zinc-500 border-zinc-900 hover:text-zinc-300'
                          }`}
                          title="Style manuscrit médiéval et parchemin dessiné à la main"
                        >
                          📜 Parchemin
                        </button>
                        <button
                          onClick={() => setMapStyle('origin')}
                          className={`px-1 py-1 rounded text-[9px] col-span-2 font-bold border transition-all uppercase text-center ${
                            mapStyle === 'origin'
                              ? 'bg-[#ff9900] text-black border-orange-600 font-black'
                              : 'bg-zinc-900/50 text-zinc-500 border-zinc-900 hover:text-zinc-300'
                          }`}
                          title="Display the original live map from SFTP or Custom URL"
                        >
                          Live Origine
                        </button>
                      </div>
                    </div>

                    {/* Layer level (Surface / Cave) */}
                    <div className="mb-2">
                      <span className="text-[9px] text-zinc-500 uppercase block mb-1">COUCHE DU MONDE</span>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          onClick={() => setMapLayer('surface')}
                          className={`px-1 py-1 rounded text-[9px] font-bold border transition-all uppercase text-center flex items-center justify-center gap-1 ${
                            mapLayer === 'surface'
                              ? 'bg-emerald-600/15 text-emerald-400 border-emerald-500/40 font-extrabold'
                              : 'bg-zinc-900/50 text-zinc-500 border-zinc-900 hover:text-zinc-300'
                          }`}
                        >
                          🌳 Surface
                        </button>
                        <button
                          onClick={() => setMapLayer('cave')}
                          className={`px-1 py-1 rounded text-[9px] font-bold border transition-all uppercase text-center flex items-center justify-center gap-1 ${
                            mapLayer === 'cave'
                              ? 'bg-purple-600/20 text-purple-400 border-purple-500/40 font-extrabold'
                              : 'bg-zinc-900/50 text-zinc-500 border-zinc-900 hover:text-zinc-300'
                          }`}
                        >
                          🌋 Souterrain
                        </button>
                      </div>
                    </div>

                    {/* Original map configuration URL */}
                    {mapStyle === 'origin' && (
                      <div className="border-t border-zinc-900 pt-2 flex flex-col gap-1.5 bg-black/30 p-2 rounded border border-zinc-900">
                        <span className="text-[9px] text-[#ff9900] font-bold uppercase block">🔗 LIEN CARTE ORIGINALE</span>
                        <input
                          type="text"
                          placeholder="Ex: http://ip:port/map.png"
                          value={customMapUrl}
                          onChange={(e) => setCustomMapUrl(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[10px] font-mono text-white focus:outline-none focus:border-[#ff9900]"
                        />
                        <div className="flex gap-1 items-center justify-between mt-0.5">
                          <span className="text-[8px] text-zinc-500">Auto-détection / SFTP</span>
                          {server.ip && (
                            <button
                              onClick={() => {
                                const ipOnly = server.ip.split(':')[0];
                                setCustomMapUrl(`http://${ipOnly}/map.png`);
                              }}
                              className="text-[8px] bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 px-1.5 py-0.5 rounded uppercase font-bold"
                            >
                              [IP du Serveur]
                            </button>
                          )}
                        </div>
                        <p className="text-[8px] text-zinc-500 leading-normal italic mt-1">
                          Note : Si aucun lien n'est fourni, l'application utilise l'image "map.png" récupérée automatiquement lors de la synchronisation SFTP de la base de données.
                        </p>
                      </div>
                    )}

                    {/* Quick layer overlays toggles */}
                    <div className="border-t border-zinc-900 pt-2 flex flex-col gap-1.5">
                      <span className="text-[9px] text-zinc-500 uppercase block">FILTRES DE CARTE</span>
                      <div className="flex flex-wrap gap-1">
                        <button
                          onClick={() => setMods(prev => ({ ...prev, gridSystem: !prev.gridSystem }))}
                          className={`px-1.5 py-0.5 rounded text-[9px] border transition-colors ${
                            mods.gridSystem ? 'bg-zinc-800 text-emerald-400 border-emerald-500/30' : 'bg-zinc-900/40 text-zinc-600 border-zinc-950'
                          }`}
                        >
                          Grille
                        </button>
                        <button
                          onClick={() => setShowMemberLinks(!showMemberLinks)}
                          className={`px-1.5 py-0.5 rounded text-[9px] border transition-colors ${
                            showMemberLinks ? 'bg-zinc-800 text-amber-400 border-amber-500/30' : 'bg-zinc-900/40 text-zinc-600 border-zinc-950'
                          }`}
                        >
                          Relier Membres
                        </button>
                        <button
                          onClick={() => setMods(prev => ({ ...prev, players: !prev.players }))}
                          className={`px-1.5 py-0.5 rounded text-[9px] border transition-colors ${
                            mods.players ? 'bg-zinc-800 text-emerald-400 border-emerald-500/30' : 'bg-zinc-900/40 text-zinc-600 border-zinc-950'
                          }`}
                        >
                          Membres
                        </button>
                        <button
                          onClick={() => setMods(prev => ({ ...prev, villages: !prev.villages }))}
                          className={`px-1.5 py-0.5 rounded text-[9px] border transition-colors ${
                            mods.villages ? 'bg-zinc-800 text-emerald-400 border-emerald-500/30' : 'bg-zinc-900/40 text-zinc-600 border-zinc-950'
                          }`}
                        >
                          Villages
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Float quick HUD menu on the map */}
            <div className="absolute bottom-4 left-4 z-40 bg-zinc-950/90 border border-zinc-800 rounded-lg p-3 shadow-2xl backdrop-blur-md max-w-[260px] font-mono text-[10px] text-zinc-400 leading-normal flex flex-col gap-1.5 animate-fade-in">
              <span className="font-black text-white uppercase tracking-wider border-b border-zinc-900 pb-1.5 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-emerald-400" />
                <span>INFO CARTE LIVE</span>
              </span>
              <div>
                ● {lang === 'fr' ? 'Utilisez la molette pour zoomer' : 'Use scroll wheel to zoom'}. <br />
                ● {lang === 'fr' ? 'Faites glisser pour vous déplacer' : 'Drag to pan the map'}. <br />
                ● {lang === 'fr' ? 'Cliquez sur un marqueur pour inspecter' : 'Click markers to inspect details'}.
                {isFullscreen && (
                  <>
                    <br />
                    <span className="text-orange-400 font-bold">
                      ● {lang === 'fr' ? 'Appuyez sur Échap pour quitter le plein écran' : 'Press ESC to exit fullscreen'}.
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Quick zoom control pad */}
            <div className="absolute bottom-4 right-4 z-40 bg-zinc-950/90 border border-zinc-800 rounded-lg p-1.5 flex flex-col gap-1 shadow-2xl backdrop-blur-md">
              <button
                onClick={() => setZoom(prev => Math.min(prev + 0.25, 4))}
                className="w-7 h-7 flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 text-white font-mono font-bold rounded border border-zinc-800 cursor-pointer transition-colors text-xs"
                title="Zoom In"
              >
                +
              </button>
              <button
                onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.4))}
                className="w-7 h-7 flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 text-white font-mono font-bold rounded border border-zinc-800 cursor-pointer transition-colors text-xs"
                title="Zoom Out"
              >
                -
              </button>
              <button
                onClick={resetMapControls}
                className="w-7 h-7 flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 text-amber-500 font-mono text-[9px] font-black rounded border border-zinc-800 cursor-pointer transition-colors"
                title="Reset View"
              >
                FIT
              </button>
            </div>

            {/* Add custom marker button */}
            {isAdminMode && (
              <div className="absolute top-4 left-4 z-40 flex items-center gap-2">
                <button
                  onClick={() => setIsAddingMarker(!isAddingMarker)}
                  className="bg-black/85 hover:bg-black border border-orange-500/40 hover:border-orange-500 text-orange-400 hover:text-white font-mono text-xs font-black px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-xl backdrop-blur"
                >
                  <Plus className="w-4 h-4 animate-pulse" />
                  <span>{lang === 'fr' ? 'Poser Repère' : 'Add Pin'}</span>
                </button>
              </div>
            )}

            {/* Add marker modal drawer */}
            <AnimatePresence>
              {isAddingMarker && (
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  className="absolute top-16 left-4 z-40 bg-zinc-950 border border-zinc-800 rounded-xl p-4 w-72 shadow-2xl font-mono text-xs text-zinc-300 backdrop-blur"
                >
                  <h4 className="font-black text-white uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                    <MapPin className="w-4 h-4 text-orange-500" />
                    <span>{lang === 'fr' ? 'Nouveau Repère' : 'New Map Pin'}</span>
                  </h4>

                  <form onSubmit={handleAddMarkerSubmit} className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-zinc-500 uppercase font-black">Nom :</label>
                      <input
                        type="text"
                        required
                        value={newMarkerName}
                        onChange={(e) => setNewMarkerName(e.target.value)}
                        placeholder="e.g. Ruines, Mine, Tour..."
                        className="bg-zinc-900 border border-zinc-800 rounded p-2 text-white text-xs outline-none focus:border-orange-500"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-zinc-500 uppercase font-black">Type :</label>
                      <select
                        value={newMarkerType}
                        onChange={(e) => setNewMarkerType(e.target.value as MapMarker['type'])}
                        className="bg-zinc-900 border border-zinc-800 rounded p-2 text-white text-xs outline-none focus:border-orange-500"
                      >
                        <option value="danger">💀 Zone de Danger</option>
                        <option value="portal">🌀 Portail de Voyage</option>
                        <option value="tower">🏹 Tour de Garde</option>
                        <option value="safezone">🛡️ Zone Neutre</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-zinc-500 uppercase font-black">X (0 - 4096) :</label>
                        <input
                          type="number"
                          value={Math.round(newMarkerX * 40.96)}
                          onChange={(e) => setNewMarkerX(Math.max(0, Math.min(4096, parseInt(e.target.value, 10) || 0)) / 40.96)}
                          className="bg-zinc-900 border border-zinc-800 rounded p-2 text-white text-xs outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-zinc-500 uppercase font-black">Y (0 - 4096) :</label>
                        <input
                          type="number"
                          value={Math.round(newMarkerY * 40.96)}
                          onChange={(e) => setNewMarkerY(Math.max(0, Math.min(4096, parseInt(e.target.value, 10) || 0)) / 40.96)}
                          className="bg-zinc-900 border border-zinc-800 rounded p-2 text-white text-xs outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-zinc-500 uppercase font-black">Description :</label>
                      <input
                        type="text"
                        value={newMarkerNotes}
                        onChange={(e) => setNewMarkerNotes(e.target.value)}
                        placeholder="Notes de repérage..."
                        className="bg-zinc-900 border border-zinc-800 rounded p-2 text-white text-xs outline-none"
                      />
                    </div>

                    <div className="flex gap-2 mt-2">
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-[#ff9900] hover:bg-orange-600 text-black font-black uppercase rounded text-center transition-all cursor-pointer"
                      >
                        {lang === 'fr' ? 'Poser' : 'Place'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingMarker(false)}
                        className="px-3 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-400 rounded transition-all cursor-pointer"
                      >
                        {lang === 'fr' ? 'Fermer' : 'Close'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick interactive Live map mod togglers footer */}
          <div className="p-3 bg-zinc-950 border-t border-zinc-900/80 flex flex-wrap gap-4 items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase font-bold tracking-wider">🛠️ {lang === 'fr' ? 'Options de Rendu de Mod :' : 'Livemap Rendering Mods :'}</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setMods(prev => ({ ...prev, players: !prev.players }))}
                className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded flex items-center gap-1 cursor-pointer transition-colors ${
                  mods.players ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-zinc-900 border border-zinc-850 text-zinc-500'
                }`}
              >
                <span>👥 Players</span>
              </button>
              <button
                onClick={() => setMods(prev => ({ ...prev, playerTrails: !prev.playerTrails }))}
                className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded flex items-center gap-1 cursor-pointer transition-colors ${
                  mods.playerTrails ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-zinc-900 border border-zinc-850 text-zinc-500'
                }`}
              >
                <span>👣 Trails</span>
              </button>
              <button
                onClick={() => setMods(prev => ({ ...prev, villages: !prev.villages }))}
                className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded flex items-center gap-1 cursor-pointer transition-colors ${
                  mods.villages ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' : 'bg-zinc-900 border border-zinc-850 text-zinc-500'
                }`}
              >
                <span>🏡 Deeds</span>
              </button>
              <button
                onClick={() => setMods(prev => ({ ...prev, guardTowers: !prev.guardTowers }))}
                className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded flex items-center gap-1 cursor-pointer transition-colors ${
                  mods.guardTowers ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400' : 'bg-zinc-900 border border-zinc-850 text-zinc-500'
                }`}
              >
                <span>🛡️ Guards</span>
              </button>
              <button
                onClick={() => setMods(prev => ({ ...prev, resources: !prev.resources }))}
                className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded flex items-center gap-1 cursor-pointer transition-colors ${
                  mods.resources ? 'bg-purple-500/10 border border-purple-500/30 text-purple-400' : 'bg-zinc-900 border border-zinc-850 text-zinc-500'
                }`}
              >
                <span>💎 Resource</span>
              </button>
              <button
                onClick={() => setMods(prev => ({ ...prev, gridSystem: !prev.gridSystem }))}
                className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded flex items-center gap-1 cursor-pointer transition-colors ${
                  mods.gridSystem ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-900 text-zinc-650'
                }`}
              >
                <span>🌐 Grid</span>
              </button>
              <button
                onClick={() => setMods(prev => ({ ...prev, weatherEffects: !prev.weatherEffects }))}
                className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded flex items-center gap-1 cursor-pointer transition-colors ${
                  mods.weatherEffects ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-900 text-zinc-650'
                }`}
              >
                <span>🌫️ Atmos</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right column sidebar: Villages/Deeds & Live in-game chat - 4/12 */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Villages / Deeds list directory */}
          <div className="bg-[#0f0a07]/90 border border-[#ff9900]/20 rounded-xl p-5 flex flex-col justify-between shadow-xl backdrop-blur">
            <div>
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <Flag className="w-4.5 h-4.5 text-[#ff9900]" />
                  <h3 className="font-mono text-xs font-black text-white uppercase tracking-wider">
                    {lang === 'fr' ? 'CADASTRE DES VILLAGES (DEEDS)' : 'VILLAGES & DEEDS REGISTRY'}
                  </h3>
                </div>
              </div>

              {/* Search bar villages */}
              <div className="relative mb-3 flex items-center">
                <Search className="w-3.5 h-3.5 text-zinc-600 absolute left-2.5" />
                <input
                  type="text"
                  value={villageSearch}
                  onChange={(e) => setVillageSearch(e.target.value)}
                  placeholder={lang === 'fr' ? "Rechercher une colonie..." : "Search village deed..."}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder-zinc-700 outline-none focus:border-amber-400"
                />
              </div>

              {/* Village lists */}
              <div className="flex flex-col gap-2 max-h-44 overflow-y-auto pr-1">
                {villages
                  .filter(v => v.name.toLowerCase().includes(villageSearch.toLowerCase()))
                  .map(v => (
                    <button
                      key={v.id}
                      onClick={() => { setSelectedVillage(v); setSelectedPlayer(null); focusOnCoordinates(v.x, v.y); }}
                      className={`w-full text-left p-2.5 rounded border transition-all flex items-center justify-between cursor-pointer ${
                        selectedVillage?.id === v.id
                          ? 'bg-[#ff9900]/10 border-[#ff9900]'
                          : 'bg-black/50 border-zinc-900 hover:border-zinc-800'
                      }`}
                    >
                      <div>
                        <div className="font-mono text-xs font-bold text-white flex items-center gap-1.5">
                          <span className="text-[#ff9900]">🏡</span>
                          <span>{v.name}</span>
                        </div>
                        <div className="text-[9px] text-zinc-500 font-mono mt-0.5">
                          Maire: <span className="text-zinc-300 font-bold">{v.mayor}</span> • {v.sizeX}x{v.sizeY}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 font-mono">
                        <span className="text-[10px] text-emerald-400 font-bold">👥 {v.citizens} CIT.</span>
                        <span className="text-[8px] text-zinc-600">({Math.round(v.x * 40.96)}, {Math.round(v.y * 40.96)})</span>
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            {/* Selected Village Card details */}
            <div className="mt-3 pt-3 border-t border-zinc-800/80">
              {selectedVillage ? (
                <div className="font-mono text-[11px] text-zinc-300 flex flex-col gap-2">
                  <div className="flex justify-between items-center mb-1 bg-zinc-900/60 p-1.5 rounded border border-zinc-800">
                    <span className="font-black text-[#ff9900] uppercase text-xs flex items-center gap-1">
                      🏡 {selectedVillage.name}
                    </span>
                    <button 
                      onClick={() => setSelectedVillage(null)} 
                      className="text-zinc-500 hover:text-white uppercase text-[9px] font-black"
                    >
                      [Fermer]
                    </button>
                  </div>
                  
                  <div className="text-[10px] text-zinc-400 leading-tight">
                    <span className="text-zinc-500 font-bold">Maire :</span> <span className="text-white font-bold">{selectedVillage.mayor}</span>
                  </div>

                  <p className="text-zinc-400 text-[10px] font-sans leading-relaxed bg-black/40 p-2 rounded border border-zinc-900">
                    {lang === 'fr' ? selectedVillage.desc_fr : selectedVillage.desc_en}
                  </p>

                  {/* 📐 DEEP COORDINATES & GEOMETRY */}
                  <div className="bg-zinc-900/40 p-2 rounded border border-zinc-900 flex flex-col gap-1.5">
                    <span className="text-[#ff9900] text-[9px] font-black tracking-wider uppercase flex items-center gap-1 border-b border-zinc-800 pb-1">
                      📐 ANALYSE CADASTRE (WURMMAPGEN V2)
                    </span>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <div>
                        <span className="text-zinc-500">Center:</span> <span className="text-orange-400 font-bold">{Math.round(selectedVillage.x * 40.96)}x{Math.round(selectedVillage.y * 40.96)}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Dimensions:</span> <span className="text-white">{selectedVillage.sizeX}x{selectedVillage.sizeY} T</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Superficie:</span> <span className="text-white">{selectedVillage.sizeX * selectedVillage.sizeY} m²</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Perimeter:</span> <span className="text-white">{(selectedVillage.sizeX + selectedVillage.sizeY) * 2} m</span>
                      </div>
                    </div>

                    <div className="bg-black/60 p-1.5 rounded border border-zinc-900 text-[9px] grid grid-cols-2 gap-x-2 gap-y-0.5 text-zinc-400">
                      <div><span className="text-zinc-600">Min X (Ouest):</span> <span className="text-amber-500 font-bold">{Math.round(selectedVillage.x * 40.96 - selectedVillage.sizeX / 2)}</span></div>
                      <div><span className="text-zinc-600">Max X (Est):</span> <span className="text-amber-500 font-bold">{Math.round(selectedVillage.x * 40.96 + selectedVillage.sizeX / 2)}</span></div>
                      <div><span className="text-zinc-600">Min Y (Nord):</span> <span className="text-amber-500 font-bold">{Math.round(selectedVillage.y * 40.96 - selectedVillage.sizeY / 2)}</span></div>
                      <div><span className="text-zinc-600">Max Y (Sud):</span> <span className="text-amber-500 font-bold">{Math.round(selectedVillage.y * 40.96 + selectedVillage.sizeY / 2)}</span></div>
                    </div>
                  </div>

                  {/* 👥 RESIDENT CITIZENS / MEMBERS */}
                  <div className="bg-zinc-900/40 p-2 rounded border border-zinc-900 flex flex-col gap-1.5">
                    <span className="text-emerald-400 text-[9px] font-black tracking-wider uppercase flex items-center justify-between border-b border-zinc-800 pb-1">
                      <span>👥 CITOYENS SUR LA CARTE</span>
                      <span className="text-[8px] bg-emerald-950 text-emerald-400 px-1 py-0.5 rounded border border-emerald-900/40 font-bold">
                        {players.filter(p => p.village === selectedVillage.name).length} EN LIGNE
                      </span>
                    </span>

                    <div className="flex flex-col gap-1 max-h-24 overflow-y-auto pr-0.5">
                      {players.filter(p => p.village === selectedVillage.name).length > 0 ? (
                        players
                          .filter(p => p.village === selectedVillage.name)
                          .map(p => (
                            <div key={p.id} className="flex justify-between items-center bg-black/30 p-1 rounded hover:bg-black/60 transition-colors border border-zinc-900/40">
                              <span className="text-white text-[10px] flex items-center gap-1 font-sans">
                                <span>{p.avatar}</span>
                                <span className="font-bold">{p.name}</span>
                                <span className="text-[8px] text-zinc-500">({p.role})</span>
                              </span>
                              <button
                                onClick={() => {
                                  setSelectedPlayer(p);
                                  const xPct = p.x;
                                  const yPct = p.y;
                                  focusOnCoordinates(xPct, yPct);
                                }}
                                className="bg-zinc-800 hover:bg-emerald-500 hover:text-black border border-zinc-700 hover:border-emerald-400 text-[8px] font-black px-1.5 py-0.5 rounded transition-colors uppercase cursor-pointer"
                              >
                                [Centrer]
                              </button>
                            </div>
                          ))
                      ) : (
                        <span className="text-zinc-600 text-[10px] italic text-center py-1">Aucun citoyen connecté</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-400 mt-0.5">
                    <div className="bg-zinc-900/40 p-1.5 rounded border border-zinc-900">
                      <span>🛡️ Gardes d'Élite :</span> <span className="text-white font-bold">{selectedVillage.guards}</span>
                    </div>
                    <div className="bg-zinc-900/40 p-1.5 rounded border border-zinc-900">
                      <span>🌀 Templier Esprit :</span> <span className={selectedVillage.hasSpiritTemplar ? 'text-emerald-400 font-black' : 'text-zinc-500'}>{selectedVillage.hasSpiritTemplar ? 'ACTIF' : 'NON'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-zinc-600 font-mono text-[11px]">
                  ℹ️ {lang === 'fr' ? 'Sélectionnez un village pour afficher ses limites cadastrales, sa population et centrer la carte.' : 'Select a village to center the map and view cadastral boundaries.'}
                </div>
              )}
            </div>
          </div>

          {/* Live In-Game Chat Console Simulator */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between shadow-xl min-h-[300px]">
            <div>
              <div className="flex justify-between items-center border-b border-zinc-900 pb-2 mb-3">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-mono text-xs font-black text-white uppercase tracking-wider">
                    💬 {lang === 'fr' ? 'CHAT GLOBAL ET ACTIONS INSTANTA' : 'IN-GAME WORLD CHAT LOGS'}
                  </h3>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>

              {/* Chat Messages scroll area */}
              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                {chatMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`font-mono text-[11px] leading-relaxed p-1.5 rounded border ${
                      msg.channel === 'system'
                        ? 'bg-zinc-900/40 border-zinc-900 text-zinc-400 italic'
                        : msg.channel === 'alliance'
                        ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300'
                        : msg.channel === 'glurpf'
                        ? 'bg-orange-950/20 border-orange-900/40 text-orange-300'
                        : 'bg-black/40 border-zinc-950 text-zinc-300'
                    }`}
                  >
                    <div className="flex justify-between items-center text-[9px] text-zinc-500 mb-0.5">
                      <span className="font-extrabold flex items-center gap-1">
                        <span>{msg.avatar || '💬'}</span>
                        <span className={msg.channel === 'system' ? 'text-zinc-500' : 'text-white'}>{msg.sender}</span>
                        {msg.channel !== 'system' && (
                          <span className="text-[8px] uppercase px-1 bg-zinc-900 rounded border border-zinc-800 text-zinc-400">
                            {msg.channel}
                          </span>
                        )}
                      </span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <div className="pl-1.5">{msg.text}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Send chat message input form */}
            <form onSubmit={handleSendChatMessage} className="mt-3 pt-3 border-t border-zinc-900 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={lang === 'fr' ? "Envoyer un message au monde..." : "Send world message..."}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-white placeholder-zinc-700 outline-none focus:border-emerald-400"
              />
              <button
                type="submit"
                className="px-3 bg-emerald-500 hover:bg-emerald-600 text-black rounded flex items-center justify-center cursor-pointer transition-colors"
                title="Send Message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Quick Player statistics and track info */}
          {selectedPlayer && (
            <div className="bg-gradient-to-br from-zinc-950 to-zinc-900 border border-emerald-500/20 rounded-xl p-4 shadow-2xl">
              <div className="flex justify-between items-start mb-2 border-b border-zinc-900 pb-2">
                <div>
                  <h4 className="font-mono text-xs font-black text-white flex items-center gap-1.5">
                    <span className="text-lg">{selectedPlayer.avatar}</span>
                    <span>{selectedPlayer.name}</span>
                  </h4>
                  <p className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest font-extrabold mt-0.5">
                    {selectedPlayer.title}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPlayer(null)}
                  className="text-zinc-600 hover:text-white font-mono text-[9px] uppercase font-black cursor-pointer"
                >
                  Fermer
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-[10px] text-zinc-300">
                <div className="bg-black/60 p-1.5 rounded border border-zinc-900">
                  <span className="text-zinc-500">Village:</span> <span className="text-white font-bold truncate block">{selectedPlayer.village}</span>
                </div>
                <div className="bg-black/60 p-1.5 rounded border border-zinc-900">
                  <span className="text-zinc-500">Niveau:</span> <span className="text-white font-bold block">Level {selectedPlayer.level}</span>
                </div>
                <div className="bg-black/60 p-1.5 rounded border border-zinc-900">
                  <span className="text-zinc-500">Alignement:</span>{' '}
                  <span className={`font-bold block ${selectedPlayer.alignment >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                    {selectedPlayer.alignment >= 0 ? `+${selectedPlayer.alignment}` : selectedPlayer.alignment}
                  </span>
                </div>
                <div className="bg-black/60 p-1.5 rounded border border-zinc-900">
                  <span className="text-zinc-500">Specialty:</span> <span className="text-white font-bold block truncate">{selectedPlayer.specialty}</span>
                </div>
                <div className="bg-black/60 p-1.5 rounded border border-zinc-900 col-span-2 flex justify-between items-center">
                  <div>
                    <span className="text-zinc-500">GPS Coordinates:</span>{' '}
                    <span className="text-white font-bold block">
                      {Math.round(selectedPlayer.x * 40.96)}x{Math.round(selectedPlayer.y * 40.96)}
                    </span>
                  </div>
                  <button
                    onClick={() => focusOnCoordinates(selectedPlayer.x, selectedPlayer.y)}
                    className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500 hover:text-black rounded text-[9px] font-black text-emerald-400 transition-all cursor-pointer"
                  >
                    FOCUS
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Central Market and Server Mods section */}
      <div className="bg-[#0f0a07]/90 border border-[#ff9900]/20 rounded-2xl p-6 shadow-2xl backdrop-blur-md mt-6 flex flex-col gap-6">
        
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-850 pb-4 gap-4">
          <div className="flex gap-2 p-1 bg-black/60 rounded-lg border border-zinc-900 w-full sm:w-auto">
            <button
              onClick={() => setActiveBottomTab('market')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-md font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeBottomTab === 'market'
                  ? 'bg-[#ff9900] text-black shadow'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{lang === 'fr' ? 'Marché Central' : 'Central Marketplace'}</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                activeBottomTab === 'market' ? 'bg-black/20 text-black' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {marketListings.length}
              </span>
            </button>
            
            <button
              onClick={() => setActiveBottomTab('mods')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-md font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeBottomTab === 'mods'
                  ? 'bg-emerald-500 text-black shadow'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
              }`}
            >
              {isAdminMode ? <Cpu className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />}
              <span>{lang === 'fr' ? 'Mods du Serveur' : 'Server Mods'}</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                activeBottomTab === 'mods' ? 'bg-black/20 text-black' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {serverMods.length}
              </span>
            </button>

            <button
              onClick={() => setActiveBottomTab('sqlite')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-md font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeBottomTab === 'sqlite'
                  ? 'bg-amber-500 text-black shadow'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
              }`}
            >
              {isAdminMode ? <Database className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />}
              <span>{lang === 'fr' ? 'Connexion SQLite' : 'SQLite Connection'}</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                activeBottomTab === 'sqlite' ? 'bg-black/20 text-black' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {sqliteInfo.hasVillages || sqliteInfo.hasPlayers ? 'LIVE' : 'OFF'}
              </span>
            </button>

            <button
              onClick={() => setActiveBottomTab('creatures')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-md font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeBottomTab === 'creatures'
                  ? 'bg-red-500 text-black shadow'
                  : 'text-zinc-400 hover:text-white hover:bg-[#990000]/15'
              }`}
            >
              <Flame className="w-4 h-4 text-red-500" />
              <span>{lang === 'fr' ? 'Créatures & Chasse' : 'Creatures & Hunting'}</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                activeBottomTab === 'creatures' ? 'bg-black/20 text-black' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {sqliteInfo.hasCreatures ? 'LIVE' : 'SIM'}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
            <span>🛡️ {lang === 'fr' ? 'Réseau Wurm Synchrone' : 'Synchronous Wurm Network'}</span>
            <span className="w-2 h-2 rounded-full bg-[#ff9900] animate-pulse"></span>
          </div>
        </div>

        {/* Tab Content: Central Marketplace */}
        {activeBottomTab === 'market' && (
          <div className="flex flex-col gap-6">
            
            {/* Market Controls */}
            <div className="flex flex-col lg:flex-row justify-between gap-4 bg-black/40 p-4 rounded-xl border border-zinc-900">
              
              {/* Search & Category Filter */}
              <div className="flex flex-col sm:flex-row flex-1 gap-3">
                <div className="relative flex items-center min-w-[200px] sm:max-w-xs w-full">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3" />
                  <input
                    type="text"
                    value={marketSearch}
                    onChange={(e) => setMarketSearch(e.target.value)}
                    placeholder={lang === 'fr' ? "Rechercher un objet..." : "Search trade listings..."}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-zinc-650 outline-none focus:border-[#ff9900]"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', fr: 'Tous', en: 'All' },
                    { id: 'gear', fr: 'Équipement', en: 'Gear' },
                    { id: 'tools', fr: 'Outils', en: 'Tools' },
                    { id: 'resources', fr: 'Ressources', en: 'Resources' },
                    { id: 'food', fr: 'Nourriture', en: 'Food' },
                    { id: 'animals', fr: 'Créatures', en: 'Creatures' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setMarketCategory(cat.id)}
                      className={`px-3 py-1.5 rounded text-xs font-mono transition-all cursor-pointer ${
                        marketCategory === cat.id
                          ? 'bg-[#ff9900]/15 border border-[#ff9900]/40 text-[#ff9900] font-bold'
                          : 'bg-zinc-900/60 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                      }`}
                    >
                      {lang === 'fr' ? cat.fr : cat.en}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sell/Buy toggles + Add offer button */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-black/60 rounded border border-zinc-900 p-0.5">
                  {[
                    { id: 'all', fr: 'Tout', en: 'All' },
                    { id: 'sell', fr: 'Vente', en: 'Sell' },
                    { id: 'buy', fr: 'Achat', en: 'Buy' }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setMarketTypeFilter(t.id as 'all' | 'sell' | 'buy')}
                      className={`px-3 py-1 rounded text-[11px] font-mono transition-all uppercase font-bold cursor-pointer ${
                        marketTypeFilter === t.id
                          ? 'bg-zinc-800 text-white'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {lang === 'fr' ? t.fr : t.en}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowAddListingForm(!showAddListingForm)}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-mono text-xs font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 shadow transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-black" />
                  <span>{lang === 'fr' ? 'Créer une offre' : 'Create Listing'}</span>
                </button>
              </div>
            </div>

            {/* Inline Add Offer Form */}
            {showAddListingForm && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-950 border border-amber-500/30 p-5 rounded-xl flex flex-col gap-4 shadow-xl"
              >
                <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                  <h4 className="font-mono text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-amber-400" />
                    <span>{lang === 'fr' ? 'PUBLIER UNE NOUVELLE OFFRE' : 'PUBLISH A NEW OFFER'}</span>
                  </h4>
                  <button
                    onClick={() => setShowAddListingForm(false)}
                    className="text-zinc-500 hover:text-white uppercase text-[9px] font-black"
                  >
                    {lang === 'fr' ? 'Annuler' : 'Cancel'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Item name */}
                  <div className="md:col-span-2 flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                      {lang === 'fr' ? 'Nom de l\'objet' : 'Item Name'}
                    </label>
                    <input
                      type="text"
                      required
                      value={newListingItem}
                      onChange={(e) => setNewListingItem(e.target.value)}
                      placeholder="e.g. Arc long en bois d'if, 50x Clous en fer..."
                      className="bg-zinc-900 border border-zinc-800 rounded p-2 text-xs font-mono text-white outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Category */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                      {lang === 'fr' ? 'Catégorie' : 'Category'}
                    </label>
                    <select
                      value={newListingCategory}
                      onChange={(e) => setNewListingCategory(e.target.value as any)}
                      className="bg-zinc-900 border border-zinc-800 rounded p-2 text-xs font-mono text-white outline-none focus:border-amber-400"
                    >
                      <option value="gear">{lang === 'fr' ? '⚔️ Équipement' : '⚔️ Gear'}</option>
                      <option value="tools">{lang === 'fr' ? '🔨 Outils' : '🔨 Tools'}</option>
                      <option value="resources">{lang === 'fr' ? '🪵 Ressources' : '🪵 Resources'}</option>
                      <option value="food">{lang === 'fr' ? '🧪 Nourriture/Alch' : '🧪 Food/Alch'}</option>
                      <option value="animals">{lang === 'fr' ? '🐎 Créatures' : '🐎 Creatures'}</option>
                    </select>
                  </div>

                  {/* Transaction Type */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                      {lang === 'fr' ? 'Type de transaction' : 'Listing Type'}
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNewListingType('sell')}
                        className={`flex-1 py-2 text-center text-xs font-mono font-bold rounded uppercase border cursor-pointer transition-all ${
                          newListingType === 'sell'
                            ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                        }`}
                      >
                        {lang === 'fr' ? 'Vente' : 'Sell'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewListingType('buy')}
                        className={`flex-1 py-2 text-center text-xs font-mono font-bold rounded uppercase border cursor-pointer transition-all ${
                          newListingType === 'buy'
                            ? 'bg-blue-400/20 border-blue-400 text-blue-300'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                        }`}
                      >
                        {lang === 'fr' ? 'Achat' : 'Buy'}
                      </button>
                    </div>
                  </div>

                  {/* Quality Level (QL) */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                      {lang === 'fr' ? 'Qualité (QL 1-100)' : 'Quality Level (QL)'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={newListingQuality}
                      onChange={(e) => setNewListingQuality(Math.max(1, Math.min(100, Number(e.target.value))))}
                      className="bg-zinc-900 border border-zinc-800 rounded p-2 text-xs font-mono text-white outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Quantity */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                      {lang === 'fr' ? 'Quantité' : 'Quantity'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newListingQuantity}
                      onChange={(e) => setNewListingQuantity(Math.max(1, Number(e.target.value)))}
                      className="bg-zinc-900 border border-zinc-800 rounded p-2 text-xs font-mono text-white outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Price breakdown: Gold, Silver, Copper */}
                  <div className="md:col-span-2 flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                      {lang === 'fr' ? 'Prix demandé (Or, Argent, Cuivre)' : 'Requested Price (Gold, Silver, Copper)'}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={newListingGold}
                          onChange={(e) => setNewListingGold(Math.max(0, Number(e.target.value)))}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 pr-6 text-xs font-mono text-white outline-none focus:border-amber-400"
                        />
                        <span className="absolute right-2 text-amber-500 font-bold text-[10px]">g</span>
                      </div>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={newListingSilver}
                          onChange={(e) => setNewListingSilver(Math.max(0, Number(e.target.value)))}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 pr-6 text-xs font-mono text-white outline-none focus:border-amber-400"
                        />
                        <span className="absolute right-2 text-slate-400 font-bold text-[10px]">s</span>
                      </div>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          placeholder="10"
                          value={newListingCopper}
                          onChange={(e) => setNewListingCopper(Math.max(0, Number(e.target.value)))}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 pr-6 text-xs font-mono text-white outline-none focus:border-amber-400"
                        />
                        <span className="absolute right-2 text-orange-500 font-bold text-[10px]">c</span>
                      </div>
                    </div>
                  </div>

                  {/* Seller */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                      {lang === 'fr' ? 'Vendeur / Nom' : 'Seller Name'}
                    </label>
                    <input
                      type="text"
                      value={newListingSeller}
                      onChange={(e) => setNewListingSeller(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded p-2 text-xs font-mono text-white outline-none focus:border-amber-400 text-zinc-400"
                    />
                  </div>

                  {/* Location */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                      {lang === 'fr' ? 'Lieu de retrait' : 'Collection Point'}
                    </label>
                    <input
                      type="text"
                      value={newListingLocation}
                      onChange={(e) => setNewListingLocation(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded p-2 text-xs font-mono text-white outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Action button */}
                  <div className="md:col-span-4 flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddListingForm(false)}
                      className="px-4 py-2 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded text-xs font-mono cursor-pointer transition-colors"
                    >
                      {lang === 'fr' ? 'Annuler' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newListingItem.trim()) return;
                        const newL: MarketListing = {
                          id: `listing-${Date.now()}`,
                          item: newListingItem,
                          category: newListingCategory,
                          type: newListingType,
                          priceCoins: { gold: newListingGold, silver: newListingSilver, copper: newListingCopper },
                          quantity: newListingQuantity,
                          quality: newListingQuality,
                          seller: newListingSeller || 'Anonyme',
                          location: newListingLocation || 'Doriath Capital',
                          timestamp: lang === 'fr' ? 'À l\'instant' : 'Just now'
                        };
                        setMarketListings([newL, ...marketListings]);
                        setNewListingItem('');
                        setShowAddListingForm(false);
                        
                        // Immersive localized system alert in live chat
                        const chatMsg = {
                          id: `system-market-${Date.now()}`,
                          sender: 'Marché Central',
                          text: lang === 'fr' 
                            ? `📢 Nouvelle annonce de ${newL.seller} : [${newL.item}] (QL ${newL.quality}) mis en ${newL.type === 'sell' ? 'vente' : 'achat'} pour ${newL.priceCoins.gold > 0 ? newL.priceCoins.gold+'g ' : ''}${newL.priceCoins.silver > 0 ? newL.priceCoins.silver+'s ' : ''}${newL.priceCoins.copper}c.`
                            : `📢 New listing from ${newL.seller}: [${newL.item}] (QL ${newL.quality}) is available for ${newL.type === 'sell' ? 'sale' : 'purchase'} for ${newL.priceCoins.gold > 0 ? newL.priceCoins.gold+'g ' : ''}${newL.priceCoins.silver > 0 ? newL.priceCoins.silver+'s ' : ''}${newL.priceCoins.copper}c.`,
                          channel: 'system',
                          timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
                          avatar: '⚖️'
                        };
                        // Inject into chat logs
                        setChatMessages(prev => [...prev, chatMsg]);
                      }}
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-black font-mono text-xs font-black uppercase tracking-wider rounded cursor-pointer transition-colors"
                    >
                      {lang === 'fr' ? 'Publier l\'annonce' : 'Publish Listing'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Market Listings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {marketListings
                .filter(l => {
                  if (marketCategory !== 'all' && l.category !== marketCategory) return false;
                  if (marketTypeFilter !== 'all' && l.type !== marketTypeFilter) return false;
                  if (marketSearch && !l.item.toLowerCase().includes(marketSearch.toLowerCase()) && !l.seller.toLowerCase().includes(marketSearch.toLowerCase())) return false;
                  return true;
                })
                .map(listing => {
                  // Get nice category icon
                  const getCategoryEmoji = (c: string) => {
                    switch(c) {
                      case 'gear': return '⚔️';
                      case 'tools': return '🔨';
                      case 'resources': return '🪵';
                      case 'food': return '🧪';
                      case 'animals': return '🐎';
                      default: return '📦';
                    }
                  };

                  // QL indicator color
                  const getQualityBadgeColor = (ql: number) => {
                    if (ql >= 80) return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                    if (ql >= 60) return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
                    if (ql >= 40) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                    return 'bg-zinc-800 text-zinc-400 border-zinc-700';
                  };

                  return (
                    <div
                      key={listing.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between gap-3 bg-black/40 hover:bg-black/60 transition-all ${
                        listing.type === 'sell'
                          ? 'border-amber-500/10 hover:border-amber-500/30'
                          : 'border-blue-500/10 hover:border-blue-500/30'
                      }`}
                    >
                      <div>
                        {/* Type, QL & Category */}
                        <div className="flex justify-between items-center mb-2.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase ${
                            listing.type === 'sell'
                              ? 'bg-[#ff9900] text-black shadow-sm'
                              : 'bg-sky-500 text-white shadow-sm'
                          }`}>
                            {listing.type === 'sell' ? (lang === 'fr' ? 'VENTE' : 'SELL') : (lang === 'fr' ? 'ACHAT' : 'BUY')}
                          </span>

                          <div className="flex items-center gap-1.5 font-mono">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getQualityBadgeColor(listing.quality)}`}>
                              QL {listing.quality}
                            </span>
                            <span className="text-zinc-650 text-xs">|</span>
                            <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                              <span>{getCategoryEmoji(listing.category)}</span>
                              <span className="uppercase text-[9px]">{listing.category}</span>
                            </span>
                          </div>
                        </div>

                        {/* Title / Item Name */}
                        <h5 className="font-mono text-xs font-bold text-white tracking-tight line-clamp-2 leading-snug">
                          {listing.item}
                        </h5>

                        {/* Quantity */}
                        <p className="text-[10px] font-mono text-zinc-500 mt-1">
                          {lang === 'fr' ? 'Quantité' : 'Quantity'}: <span className="text-zinc-300 font-bold">{listing.quantity}</span>
                        </p>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-zinc-900 my-1"></div>

                      <div>
                        {/* Price rendering */}
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-mono text-zinc-500 uppercase">{lang === 'fr' ? 'Prix total' : 'Total Price'}:</span>
                          <div className="text-xs font-mono flex items-center gap-1 bg-black/50 px-2 py-1 rounded border border-zinc-900">
                            {/* Gold */}
                            {listing.priceCoins.gold > 0 && (
                              <span className="flex items-center gap-0.5 text-amber-450 font-bold">
                                {listing.priceCoins.gold}
                                <span className="text-[9px] text-amber-500 font-black">g</span>
                              </span>
                            )}
                            {/* Silver */}
                            {(listing.priceCoins.silver > 0 || listing.priceCoins.gold > 0) && (
                              <span className="flex items-center gap-0.5 text-slate-300 font-bold">
                                {listing.priceCoins.silver}
                                <span className="text-[9px] text-slate-400 font-black">s</span>
                              </span>
                            )}
                            {/* Copper */}
                            <span className="flex items-center gap-0.5 text-orange-400 font-bold">
                              {listing.priceCoins.copper}
                              <span className="text-[9px] text-orange-500 font-black">c</span>
                            </span>
                          </div>
                        </div>

                        {/* Seller metadata & instant buy action */}
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-zinc-900/40">
                          <div className="font-mono text-[9px] text-zinc-400">
                            <span className="text-zinc-600 block">{lang === 'fr' ? 'Vendeur' : 'Trader'}:</span>
                            <span className="text-white font-bold">{listing.seller}</span>
                            <span className="text-zinc-500 block mt-0.5">🏡 {listing.location}</span>
                          </div>

                          <button
                            onClick={() => {
                              const timestampStr = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                              
                              // Local trade system response
                              const systemMessage = {
                                id: `trade-sys-${Date.now()}`,
                                sender: listing.seller,
                                text: lang === 'fr'
                                  ? `Salut! Je t'attends à ${listing.location} pour procéder à l'échange de: [${listing.item}] (QL ${listing.quality}).`
                                  : `Greetings! I am waiting for you at ${listing.location} to complete the trade for [${listing.item}] (QL ${listing.quality}).`,
                                channel: listing.seller === 'Ulfric Ironclad' ? 'alliance' : 'local',
                                timestamp: timestampStr,
                                avatar: '🤝'
                              };
                              
                              // Add reply to global world chat logs if available
                              setChatMessages(prev => [...prev, systemMessage]);

                              // Alert feedback
                              alert(lang === 'fr' 
                                ? `Demande d'échange envoyée à ${listing.seller} ! L'intéressé a posté un message dans le chat global.`
                                : `Trade request sent to ${listing.seller}! They have replied in the global chat.`
                              );
                            }}
                            className={`px-3 py-1.5 font-mono text-[10px] font-black uppercase rounded transition-all cursor-pointer ${
                              listing.type === 'sell'
                                ? 'bg-amber-400/10 hover:bg-amber-400 text-[#ff9900] hover:text-black border border-amber-400/20'
                                : 'bg-blue-400/10 hover:bg-blue-500 text-sky-400 hover:text-white border border-blue-400/20'
                            }`}
                          >
                            {listing.type === 'sell' ? (lang === 'fr' ? 'Acheter' : 'Buy') : (lang === 'fr' ? 'Vendre' : 'Sell')}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Empty state marketplace */}
            {marketListings.filter(l => {
              if (marketCategory !== 'all' && l.category !== marketCategory) return false;
              if (marketTypeFilter !== 'all' && l.type !== marketTypeFilter) return false;
              if (marketSearch && !l.item.toLowerCase().includes(marketSearch.toLowerCase()) && !l.seller.toLowerCase().includes(marketSearch.toLowerCase())) return false;
              return true;
            }).length === 0 && (
              <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl bg-black/20">
                <p className="font-mono text-zinc-500 text-xs">
                  {lang === 'fr' ? '❌ Aucune annonce ne correspond à votre recherche.' : '❌ No marketplace listings match your query.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Server Mods Directory */}
        {activeBottomTab === 'mods' && (
          !isAdminMode ? (
            <div className="max-w-md mx-auto my-6 p-8 rounded-xl border border-zinc-900 bg-zinc-950/80 backdrop-blur-md text-center w-full">
              <div className="text-4xl mb-4">🛡️</div>
              <h4 className="font-mono text-sm font-black text-white uppercase tracking-wider mb-2">
                {lang === 'fr' ? 'Accès Administrateur Requis' : 'Administrator Access Required'}
              </h4>
              <p className="text-xs text-zinc-500 font-sans mb-6 leading-relaxed">
                {lang === 'fr' 
                  ? 'La configuration des mods contient des paramètres sensibles de votre serveur de jeu. Veuillez vous connecter en Mode Admin.'
                  : 'Mod configurations contain sensitive settings of your game server. Please log in using Admin Mode.'}
              </p>
              
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (adminPasswordInput.trim() === 'admin' || adminPasswordInput.trim() === 'wurm' || adminPasswordInput.trim() === 'wurm123') {
                    setIsAdminMode(true);
                    localStorage.setItem('wurm_admin_mode', 'true');
                    setAdminPasswordInput('');
                    setAdminLoginError(null);
                  } else {
                    setAdminLoginError(lang === 'fr' ? 'Mot de passe incorrect.' : 'Incorrect password.');
                  }
                }}
                className="space-y-4 max-w-xs mx-auto"
              >
                <div>
                  <input
                    type="password"
                    required
                    placeholder={lang === 'fr' ? "Mot de passe (admin)" : "Password (admin)"}
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#ff9900]/50 rounded p-2 text-white placeholder-zinc-700 outline-none text-center font-bold tracking-widest text-xs"
                  />
                  <p className="text-[9px] text-zinc-600 mt-1">
                    {lang === 'fr' ? '(Mot de passe par défaut : admin)' : '(Default password: admin)'}
                  </p>
                </div>

                {adminLoginError && (
                  <div className="p-2 bg-red-500/10 border border-red-500/25 rounded text-red-400 text-center text-[10px] font-bold">
                    {adminLoginError}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-wider rounded cursor-pointer transition-colors text-xs"
                >
                  {lang === 'fr' ? 'Déverrouiller les réglages' : 'Unlock Settings'}
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
            
            {/* Header info */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-zinc-950 border border-zinc-900 rounded-xl gap-3">
              <div>
                <h4 className="font-mono text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-emerald-400" />
                  <span>{lang === 'fr' ? 'DOSSIER DE CONFIGURATION DU SERVEUR' : 'SERVER SIDE MODIFICATION REGISTRY'}</span>
                </h4>
                <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                  {lang === 'fr' ? 'Modifications Java actives chargées par Ago\'s Mod Launcher.' : 'Active Java mods loaded securely via Ago\'s Mod Launcher.'}
                </p>
              </div>
              <div className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded font-mono text-[10px] font-bold text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>⚙️ {serverMods.length}/{serverMods.length} MODS ACTIFS</span>
              </div>
            </div>

            {/* Tableau récapitulatif des modifications installées */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 overflow-hidden">
              <h5 className="font-mono text-xs font-black text-white uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-zinc-900 pb-3">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'fr' ? 'Tableau Récapitulatif des Modifications' : 'Installed Modifications Summary'}</span>
              </h5>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[11px] border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-zinc-900 text-zinc-500 uppercase text-[9px] tracking-wider">
                      <th className="pb-3 pl-2">{lang === 'fr' ? 'Nom du Mod' : 'Mod Name'}</th>
                      <th className="pb-3">{lang === 'fr' ? 'Version' : 'Version'}</th>
                      <th className="pb-3">{lang === 'fr' ? 'Auteur' : 'Author'}</th>
                      <th className="pb-3 text-right pr-2">{lang === 'fr' ? 'Lien de téléchargement' : 'Download Link'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serverMods.map((mod, idx) => (
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
                          {mod.downloadUrl ? (
                            <a
                              href={mod.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/25 px-2.5 py-0.5 rounded text-[10px] font-black uppercase transition-all"
                            >
                              <span>{lang === 'fr' ? 'Télécharger' : 'Download'}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-zinc-600 italic text-[10px]">{lang === 'fr' ? 'Non disponible' : 'N/A'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mods Grid List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {serverMods.map(mod => {
                // Get category styling
                const getModCatBadge = (cat: string) => {
                  switch(cat) {
                    case 'core': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                    case 'gameplay': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                    case 'utils': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
                    case 'map': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                    default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
                  }
                };

                return (
                  <div
                    key={mod.id}
                    className="p-5 rounded-xl border border-zinc-900 bg-zinc-950/40 hover:bg-zinc-950/70 transition-all flex flex-col justify-between gap-4"
                  >
                    <div>
                      {/* Title & Status */}
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h5 className="font-mono text-xs font-black text-white uppercase tracking-tight">
                              {mod.name}
                            </h5>
                            <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900 px-1 py-0.2 rounded border border-zinc-800">
                              v{mod.version}
                            </span>
                          </div>
                          <span className="text-[9px] font-mono text-zinc-500">
                            {lang === 'fr' ? 'Auteur' : 'Author'}: <span className="text-zinc-300">{mod.author}</span>
                          </span>
                        </div>

                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          {mod.status}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-zinc-400 text-[11px] font-sans leading-relaxed mb-4 p-2.5 rounded bg-black/30 border border-zinc-900/50">
                        {lang === 'fr' ? mod.desc_fr : mod.desc_en}
                      </p>

                      {/* Configurations block */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">
                          📋 {lang === 'fr' ? 'Propriétés de configuration (Config)' : 'Configuration properties (.properties)'} :
                        </span>
                        
                        <div className="bg-black/60 rounded border border-zinc-900 p-2.5 flex flex-col gap-1.5">
                          {mod.configs.map((config, index) => (
                            <div key={index} className="font-mono text-[10px] flex flex-col sm:flex-row sm:justify-between items-stretch sm:items-center border-b border-zinc-900/40 pb-1.5 last:border-b-0 last:pb-0 gap-1">
                              <div className="text-zinc-400 truncate">
                                <span className="text-zinc-500">{config.key}</span>
                                <span className="text-zinc-600 font-bold mx-1">=</span>
                                <span className="text-emerald-400 font-bold">{config.val}</span>
                              </div>
                              <span className="text-[9px] text-zinc-500 truncate max-w-xs sm:text-right">
                                // {lang === 'fr' ? config.desc_fr : config.desc_en}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Footer tags */}
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-900/30">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${getModCatBadge(mod.category)}`}>
                        {mod.category}
                      </span>

                      <button
                        onClick={() => {
                          const propString = mod.configs.map(c => `${c.key}=${c.val}`).join('\n');
                          navigator.clipboard.writeText(propString);
                          alert(lang === 'fr' 
                            ? `Propriétés de configuration du mod ${mod.name} copiées dans le presse-papiers !`
                            : `Configuration properties of ${mod.name} copied to clipboard!`
                          );
                        }}
                        className="text-[9px] font-mono text-zinc-500 hover:text-white uppercase flex items-center gap-1 cursor-pointer"
                      >
                        <span>📄 {lang === 'fr' ? 'Copier config' : 'Copy config'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )
        )}

        {/* Tab Content: SQLite live database integration */}
        {activeBottomTab === 'sqlite' && (
          !isAdminMode ? (
            <div className="max-w-md mx-auto my-6 p-8 rounded-xl border border-zinc-900 bg-zinc-950/80 backdrop-blur-md text-center w-full">
              <div className="text-4xl mb-4">🛡️</div>
              <h4 className="font-mono text-sm font-black text-white uppercase tracking-wider mb-2">
                {lang === 'fr' ? 'Accès Administrateur Requis' : 'Administrator Access Required'}
              </h4>
              <p className="text-xs text-zinc-500 font-sans mb-6 leading-relaxed">
                {lang === 'fr' 
                  ? 'La configuration de la base de données et de la synchronisation SFTP en direct contient des données sensibles. Veuillez vous connecter en Mode Admin.'
                  : 'Database settings and live SFTP synchronization contain sensitive data. Please log in using Admin Mode.'}
              </p>
              
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (adminPasswordInput.trim() === 'admin' || adminPasswordInput.trim() === 'wurm' || adminPasswordInput.trim() === 'wurm123') {
                    setIsAdminMode(true);
                    localStorage.setItem('wurm_admin_mode', 'true');
                    setAdminPasswordInput('');
                    setAdminLoginError(null);
                  } else {
                    setAdminLoginError(lang === 'fr' ? 'Mot de passe incorrect.' : 'Incorrect password.');
                  }
                }}
                className="space-y-4 max-w-xs mx-auto"
              >
                <div>
                  <input
                    type="password"
                    required
                    placeholder={lang === 'fr' ? "Mot de passe (admin)" : "Password (admin)"}
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#ff9900]/50 rounded p-2 text-white placeholder-zinc-700 outline-none text-center font-bold tracking-widest text-xs"
                  />
                  <p className="text-[9px] text-zinc-600 mt-1">
                    {lang === 'fr' ? '(Mot de passe par défaut : admin)' : '(Default password: admin)'}
                  </p>
                </div>

                {adminLoginError && (
                  <div className="p-2 bg-red-500/10 border border-red-500/25 rounded text-red-400 text-center text-[10px] font-bold">
                    {adminLoginError}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-wider rounded cursor-pointer transition-colors text-xs"
                >
                  {lang === 'fr' ? 'Déverrouiller les réglages' : 'Unlock Settings'}
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
            
            {/* Header info */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-zinc-950 border border-zinc-900 rounded-xl gap-3">
              <div>
                <h4 className="font-mono text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span>{lang === 'fr' ? 'INTÉGRATION DES DONNÉES SQLITE EN DIRECT' : 'LIVE SQLITE DATABASE INTEGRATION'}</span>
                </h4>
                <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                  {lang === 'fr' ? 'Connectez vos fichiers de base de données Wurm Unlimited réels pour synchroniser la Livemap.' : 'Connect your actual Wurm Unlimited server database files to populate the Livemap.'}
                </p>
              </div>
              
              {(sqliteInfo.hasVillages || sqliteInfo.hasPlayers) && (
                <button
                  onClick={handleClearSqlite}
                  className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded font-mono text-[10px] font-bold text-red-400 transition-all cursor-pointer"
                >
                  🗑️ {lang === 'fr' ? 'RÉINITIALISER LES BASES SQLITE' : 'RESET SQLITE DATABASES'}
                </button>
              )}
            </div>

            {/* Error banner */}
            {sqliteError && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-mono flex items-center gap-2">
                <span>🚨</span>
                <p className="flex-1 whitespace-pre-wrap">{sqliteError}</p>
                <button onClick={() => setSqliteError(null)} className="text-zinc-500 hover:text-white ml-2 cursor-pointer">×</button>
              </div>
            )}

            {/* Dual Import and Status Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Zones / Villages DB import */}
              <div className="p-5 rounded-xl border border-zinc-900 bg-zinc-950/40 hover:bg-zinc-950/60 transition-all flex flex-col justify-between gap-5">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-mono text-xs font-black text-white uppercase tracking-tight flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      wurmzones.db ({lang === 'fr' ? 'Cadastre & Villages' : 'Deeds & Villages'})
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-widest ${
                      sqliteInfo.hasVillages ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {sqliteInfo.hasVillages ? 'ACTIVE (LIVE)' : 'SIMULATION'}
                    </span>
                  </div>

                  <p className="text-zinc-400 text-[11px] font-sans leading-relaxed mb-4">
                    {lang === 'fr'
                      ? "Contient la table VILLAGES et VILLAGE_CITIZENS. L'importer extrait automatiquement tous les cadastres réels, positions de vos deeds, maires et tailles de terrains pour la Livemap !"
                      : "Contains the VILLAGES and VILLAGE_CITIZENS tables. Importing it automatically extracts all active deeds, mayor names, and tile coordinates directly to the Livemap."}
                  </p>

                  {sqliteInfo.hasVillages && (
                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-lg font-mono text-[10px] text-emerald-400 flex flex-col gap-1 mb-2">
                      <div className="flex justify-between">
                        <span>📊 {lang === 'fr' ? 'Villages / Deeds importés:' : 'Imported villages/deeds:'}</span>
                        <span className="font-bold">{villages.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>📍 {lang === 'fr' ? 'Mappe de coordonnées:' : 'Coordinate mapping:'}</span>
                        <span className="font-bold">Automatique (0-4096 / 0-2048)</span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="relative flex items-center justify-center gap-2 w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 rounded-lg text-white font-mono text-xs font-bold transition-all cursor-pointer text-center">
                    <input
                      type="file"
                      accept=".db"
                      onChange={handleSqliteUpload}
                      disabled={isUploadingSqlite}
                      className="hidden"
                    />
                    {isUploadingSqlite ? (
                      <span className="animate-pulse">{lang === 'fr' ? 'Traitement de la DB...' : 'Processing DB...'}</span>
                    ) : (
                      <>
                        <span>📥 {lang === 'fr' ? 'Sélectionner wurmzones.db' : 'Select wurmzones.db'}</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Players Database Import */}
              <div className="p-5 rounded-xl border border-zinc-900 bg-zinc-950/40 hover:bg-zinc-950/60 transition-all flex flex-col justify-between gap-5">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-mono text-xs font-black text-white uppercase tracking-tight flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      wurmplayers.db ({lang === 'fr' ? 'Population & Comptes' : 'Players & Accounts'})
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-widest ${
                      sqliteInfo.hasPlayers ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {sqliteInfo.hasPlayers ? 'ACTIVE (LIVE)' : 'SIMULATION'}
                    </span>
                  </div>

                  <p className="text-zinc-400 text-[11px] font-sans leading-relaxed mb-4">
                    {lang === 'fr'
                      ? "Contient la table PLAYERS. L'importer extrait les vrais joueurs de votre serveur, leurs royaumes, et leurs niveaux de privilèges d'administrateurs (GM) !"
                      : "Contains the PLAYERS table. Importing it populates real player account profiles, registered kingdoms, and Game Master (GM) permissions!"}
                  </p>

                  {sqliteInfo.hasPlayers && (
                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-lg font-mono text-[10px] text-emerald-400 flex flex-col gap-1 mb-2">
                      <div className="flex justify-between">
                        <span>📊 {lang === 'fr' ? 'Comptes joueurs importés:' : 'Imported player accounts:'}</span>
                        <span className="font-bold">{players.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>👑 {lang === 'fr' ? 'Game Masters (GM) détectés:' : 'Game Masters (GM) detected:'}</span>
                        <span className="font-bold">{players.filter(p => p.title.includes('GM')).length}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="relative flex items-center justify-center gap-2 w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 rounded-lg text-white font-mono text-xs font-bold transition-all cursor-pointer text-center">
                    <input
                      type="file"
                      accept=".db"
                      onChange={handleSqliteUpload}
                      disabled={isUploadingSqlite}
                      className="hidden"
                    />
                    {isUploadingSqlite ? (
                      <span className="animate-pulse">{lang === 'fr' ? 'Traitement de la DB...' : 'Processing DB...'}</span>
                    ) : (
                      <>
                        <span>📥 {lang === 'fr' ? 'Sélectionner wurmplayers.db' : 'Select wurmplayers.db'}</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

            </div>

            {/* SFTP Synchronizer Block */}
            <div className="p-6 rounded-xl border border-zinc-900 bg-zinc-950/20 backdrop-blur-md relative overflow-hidden group">
              <div className="absolute right-[-15px] top-[-15px] opacity-10 pointer-events-none text-7xl select-none">
                🚀
              </div>
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900/60 pb-4 mb-4">
                <div>
                  <h5 className="font-mono text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <RefreshCw className={`w-4 h-4 text-emerald-500 ${isSyncingSftp ? 'animate-spin' : ''}`} />
                    <span>{lang === 'fr' ? '🔌 SYNC AUTOMATIQUE SUR SERVEUR EN DIRECT (SFTP)' : '🔌 AUTOMATED LIVE SERVER SYNC (SFTP)'}</span>
                  </h5>
                  <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                    {lang === 'fr' 
                      ? 'Connectez-vous directement à votre serveur dédié ou hébergeur Wurm Unlimited pour synchroniser les bases en un clic.' 
                      : 'Sync wurmzones.db and wurmplayers.db directly from your dedicated server or host.'}
                  </p>
                </div>

                {sftpSuccessMessage && (
                  <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold rounded-md animate-pulse">
                    {sftpSuccessMessage}
                  </div>
                )}
              </div>

              {sqliteError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/25 rounded-lg text-red-400 text-xs font-mono whitespace-pre-wrap">
                  <div className="font-bold mb-1">🚨 {lang === 'fr' ? 'ÉCHEC DE LA SYNCHRONISATION :' : 'SYNC FAILURE DETAILS :'}</div>
                  {sqliteError}
                </div>
              )}

              <form onSubmit={handleSftpSync} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 items-end">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono text-zinc-400 font-black uppercase tracking-tight">Host / IP</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 154.23.44.11"
                    value={sftpHost}
                    onChange={(e) => setSftpHost(e.target.value)}
                    className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-zinc-700 focus:outline-none rounded p-2 text-xs font-mono text-white placeholder-zinc-600"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono text-zinc-400 font-black uppercase tracking-tight">Port</label>
                  <input
                    type="text"
                    required
                    placeholder="22"
                    value={sftpPort}
                    onChange={(e) => setSftpPort(e.target.value)}
                    className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-zinc-700 focus:outline-none rounded p-2 text-xs font-mono text-white placeholder-zinc-600"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono text-zinc-400 font-black uppercase tracking-tight">{lang === 'fr' ? 'Utilisateur' : 'Username'}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. root"
                    value={sftpUsername}
                    onChange={(e) => setSftpUsername(e.target.value)}
                    className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-zinc-700 focus:outline-none rounded p-2 text-xs font-mono text-white placeholder-zinc-600"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono text-zinc-400 font-black uppercase tracking-tight">{lang === 'fr' ? 'Mot de passe' : 'Password'}</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={sftpPassword}
                    onChange={(e) => setSftpPassword(e.target.value)}
                    className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-zinc-700 focus:outline-none rounded p-2 text-xs font-mono text-white placeholder-zinc-600"
                  />
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[9px] font-mono text-zinc-400 font-black uppercase tracking-tight">{lang === 'fr' ? 'Chemin du dossier' : 'Remote Folder Path'}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="e.g. /wurm/creative"
                      value={sftpRemotePath}
                      onChange={(e) => setSftpRemotePath(e.target.value)}
                      className="flex-1 bg-zinc-900/60 border border-zinc-800 focus:border-zinc-700 focus:outline-none rounded p-2 text-xs font-mono text-white placeholder-zinc-600"
                    />
                    <button
                      type="button"
                      disabled={isBrowsingSftp}
                      onClick={() => handleSftpBrowse()}
                      className="px-3 bg-zinc-900 hover:bg-zinc-850 active:scale-95 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded font-mono text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                    >
                      {isBrowsingSftp ? '...' : (lang === 'fr' ? 'Parcourir' : 'Browse')}
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2 md:col-span-5 flex justify-end gap-2 mt-2">
                  <button
                    type="submit"
                    disabled={isSyncingSftp}
                    className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 text-black disabled:text-zinc-500 rounded font-mono text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/10 active:scale-[0.98]"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncingSftp ? 'animate-spin' : ''}`} />
                    <span>{isSyncingSftp ? (lang === 'fr' ? 'SYNCHRONISATION EN COURS...' : 'SYNCING DATABASES...') : (lang === 'fr' ? 'SE CONNECTER ET RECHARGER LA MAP' : 'CONNECT & SYNC MAP')}</span>
                  </button>
                </div>
              </form>

              {/* Interactive SFTP Browser Panel */}
              {sftpBrowsedFiles && (
                <div className="mt-6 border-t border-zinc-900/80 pt-5">
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">📁</span>
                      <h6 className="font-mono text-xs font-bold text-zinc-300">
                        {lang === 'fr' ? 'Explorateur de fichiers SFTP :' : 'SFTP File Browser:'}{' '}
                        <span className="text-emerald-400 font-bold">{sftpCurrentBrowsePath}</span>
                      </h6>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSftpBrowsedFiles(null)}
                      className="px-2.5 py-1 bg-zinc-900/60 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded border border-zinc-800 text-[10px] font-mono cursor-pointer transition-colors"
                    >
                      ✕ {lang === 'fr' ? 'Fermer' : 'Close'}
                    </button>
                  </div>

                  {/* Navigation breadcrumbs or parent button */}
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      type="button"
                      disabled={sftpCurrentBrowsePath === '/' || sftpCurrentBrowsePath === '.' || sftpCurrentBrowsePath === ''}
                      onClick={() => {
                        let parts = sftpCurrentBrowsePath.split('/').filter(Boolean);
                        if (sftpCurrentBrowsePath.startsWith('/')) {
                          parts.pop();
                          handleSftpBrowse('/' + parts.join('/'));
                        } else {
                          parts.pop();
                          handleSftpBrowse(parts.join('/') || '.');
                        }
                      }}
                      className="px-3 py-1.5 bg-zinc-900/80 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-zinc-900/80 rounded border border-zinc-800/80 text-[10px] font-mono text-zinc-300 font-bold cursor-pointer flex items-center gap-1 transition-all"
                    >
                      ↩ {lang === 'fr' ? 'Dossier Parent (..)' : 'Parent Folder (..)'}
                    </button>

                    {/* Detected DBs Quick Action */}
                    {sftpBrowsedFiles.some(f => {
                      const nameLower = f.name.toLowerCase();
                      return nameLower === 'wurmzones.db' || nameLower === 'wurmplayers.db';
                    }) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSftpRemotePath(sftpCurrentBrowsePath);
                          handleSftpSync({ preventDefault: () => {} } as any);
                        }}
                        className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 hover:text-black rounded border border-emerald-500/20 text-[10px] font-mono text-emerald-400 font-black tracking-wider cursor-pointer flex items-center gap-1 transition-all"
                      >
                        ⚡ {lang === 'fr' ? 'SYNCHRONISER CE DOSSIER' : 'SYNC THIS FOLDER NOW'}
                      </button>
                    )}
                  </div>

                  {/* Files Grid list */}
                  <div className="bg-zinc-950/80 border border-zinc-900 rounded-lg max-h-64 overflow-y-auto divide-y divide-zinc-900/50">
                    {sftpBrowsedFiles.length === 0 ? (
                      <div className="p-4 text-center font-mono text-xs text-zinc-600">
                        {lang === 'fr' ? '[Dossier vide]' : '[Empty folder]'}
                      </div>
                    ) : (
                      sftpBrowsedFiles
                        .sort((a, b) => {
                          // Directories first
                          if (a.isDirectory && !b.isDirectory) return -1;
                          if (!a.isDirectory && b.isDirectory) return 1;
                          return a.name.localeCompare(b.name);
                        })
                        .map((file, idx) => {
                          const isDb = file.name.toLowerCase() === 'wurmzones.db' || file.name.toLowerCase() === 'wurmplayers.db';
                          
                          return (
                            <div
                              key={idx}
                              className={`flex items-center justify-between p-2.5 font-mono text-xs transition-colors ${
                                file.isDirectory 
                                  ? 'hover:bg-amber-500/5 cursor-pointer' 
                                  : isDb 
                                    ? 'bg-emerald-500/5 hover:bg-emerald-500/10' 
                                    : 'hover:bg-zinc-900/40'
                              }`}
                              onClick={() => {
                                if (file.isDirectory) {
                                  const slash = sftpCurrentBrowsePath.endsWith('/') ? '' : '/';
                                  handleSftpBrowse(`${sftpCurrentBrowsePath}${slash}${file.name}`);
                                }
                              }}
                            >
                              <div className="flex items-center gap-2 overflow-hidden mr-3">
                                <span className="text-sm select-none">
                                  {file.isDirectory ? '📁' : isDb ? '⚡' : '📄'}
                                </span>
                                <span className={`truncate ${
                                  file.isDirectory 
                                    ? 'text-amber-400 hover:underline font-medium' 
                                    : isDb 
                                      ? 'text-emerald-400 font-bold' 
                                      : 'text-zinc-400'
                                }`}>
                                  {file.name}
                                </span>

                                {isDb && (
                                  <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[8px] font-bold rounded uppercase">
                                    Ready
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-[10px] text-zinc-600">
                                  {file.isDirectory 
                                    ? (lang === 'fr' ? 'Dossier' : 'Folder') 
                                    : file.size 
                                      ? `${(file.size / 1024 / 1024).toFixed(2)} MB` 
                                      : '0.00 MB'
                                  }
                                </span>

                                {file.isDirectory ? (
                                  <span className="text-[10px] text-amber-500/60 font-bold">➔</span>
                                ) : isDb ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSftpRemotePath(sftpCurrentBrowsePath);
                                      handleSftpSync({ preventDefault: () => {} } as any);
                                    }}
                                    className="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-400 text-black text-[9px] font-black rounded uppercase cursor-pointer shadow-sm transition-all"
                                  >
                                    Sync
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>

                  <p className="text-[9px] font-mono text-zinc-500 mt-2 italic">
                    {lang === 'fr'
                      ? "💡 Astuce : Cliquez sur un dossier (📁) pour l'ouvrir. Quand vous voyez wurmzones.db / wurmplayers.db (⚡), cliquez sur 'Sync' pour les charger."
                      : "💡 Tip: Click on folders (📁) to open them. When you see wurmzones.db / wurmplayers.db (⚡), click 'Sync' to load them directly."}
                  </p>
                </div>
              )}
            </div>

            {/* Path Location Guide Card */}
            <div className="p-5 rounded-xl border border-zinc-900 bg-black/40">
              <h5 className="font-mono text-xs font-black text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[#ff9900]" />
                <span>{lang === 'fr' ? "📌 GUIDE DE LOCALISATION DES FICHIERS SQLITE" : "📌 HOW TO LOCATE SQLITE DATABASE FILES"}</span>
              </h5>
              
              <div className="text-[11px] font-sans text-zinc-400 space-y-3 leading-relaxed">
                <p>
                  {lang === 'fr'
                    ? "Sur votre ordinateur ou votre serveur dédié hébergeant Wurm Unlimited, les bases de données SQLite sont localisées dans le répertoire racine du lanceur de serveur :"
                    : "On your local machine or dedicated host running the Wurm Unlimited Server launcher, databases are located inside the launcher directory:"}
                </p>

                <div className="bg-zinc-950 p-3 rounded border border-zinc-900 font-mono text-[10px] text-amber-500 overflow-x-auto">
                  📁 Wurm Unlimited / WurmServerLauncher / [NomDuServeur] /
                </div>

                <p>
                  {lang === 'fr'
                    ? "Ouvrez le dossier portant le nom de votre instance active (par exemple 'creative', 'creative-zones', 'adventure', ou 'Doriath') pour y récupérer les fichiers :"
                    : "Open the folder matching your active server instance name (e.g. 'creative', 'creative-zones', 'adventure') to locate the databases:"}
                </p>

                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong className="text-zinc-200">wurmzones.db</strong> : {lang === 'fr' ? "Contient les structures géographiques, les barrières, les structures de défense et les cadastres des villages (Deeds)." : "Stores structures, fences, guard towers, and village deed property coordinates."}
                  </li>
                  <li>
                    <strong className="text-zinc-200">wurmplayers.db</strong> : {lang === 'fr' ? "Contient la liste de tous les personnages créés, leurs compétences (skills), leurs royaumes et leurs statuts." : "Stores created characters list, skills, aligned kingdoms, and privileges."}
                  </li>
                </ul>

                <p className="text-zinc-500 text-[10px] italic">
                  {lang === 'fr'
                    ? "💡 Note : L'importation s'effectue de manière 100% sécurisée. Les fichiers volumineux sont convertis et traités instantanément par notre moteur d'extraction."
                    : "💡 Note: Database parsing runs fully securely. Large databases are loaded and parsed dynamically using our high-speed WebAssembly parsing engine."}
                </p>
              </div>
            </div>

            {/* SQLite Info and Status */}
            {sqliteInfo.lastUpdated && (
              <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 border-t border-zinc-900 pt-3">
                <span>📂 {lang === 'fr' ? 'Données SQLite extraites' : 'SQLite DB status'}: {sqliteInfo.hasVillages ? 'Zones OK' : ''} {sqliteInfo.hasPlayers ? 'Players OK' : ''}</span>
                <span>📅 {lang === 'fr' ? 'Dernière mise à jour :' : 'Last Sync:'} {sqliteInfo.lastUpdated}</span>
              </div>
            )}

          </div>
          )
        )}

        {/* Tab Content: Creatures & Hunting Statistics */}
        {activeBottomTab === 'creatures' && (
          <div className="flex flex-col gap-6">
            
            {/* Header info */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-zinc-950 border border-zinc-900 rounded-xl gap-3">
              <div>
                <h4 className="font-mono text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-red-500 animate-pulse" />
                  <span>{lang === 'fr' ? 'STATISTIQUES DES CRÉATURES ET ACTIVITÉ DE CHASSE' : 'CREATURE STATS & WILDLIFE CENSUS'}</span>
                </h4>
                <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                  {lang === 'fr' 
                    ? 'Visualisation de la population des créatures du monde, du climat actuel et du registre de chasse.' 
                    : 'Real-time overview of active world creature populations, climate effects, and hunting rewards.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded font-mono text-[10px] font-bold tracking-wider flex items-center gap-1.5 ${
                  sqliteInfo.hasCreatures 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sqliteInfo.hasCreatures ? 'bg-emerald-400 animate-ping' : 'bg-zinc-500'}`}></span>
                  {sqliteInfo.hasCreatures 
                    ? (lang === 'fr' ? 'DONNÉES LIVE SQLITE' : 'LIVE SQLITE DB') 
                    : (lang === 'fr' ? 'MODE SIMULATION' : 'SIMULATION MODE')}
                </span>

                <button
                  onClick={handleSimulateHunt}
                  className="px-3 py-1 bg-red-600 hover:bg-red-500 text-black rounded font-mono text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-lg shadow-red-600/10 active:scale-95"
                >
                  ⚔️ {lang === 'fr' ? 'FORCER UN RAID' : 'FORCE HUNT RAID'}
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Season Stats Card */}
              <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-xl flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400 text-2xl">
                  {activeSeason === 'spring' ? '🌸' : activeSeason === 'summer' ? '☀️' : activeSeason === 'autumn' ? '🍁' : '❄️'}
                </div>
                <div>
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                    {lang === 'fr' ? 'Saison en Cours' : 'Current Season'}
                  </div>
                  <div className="text-sm font-mono font-black text-white capitalize mt-0.5">
                    {lang === 'fr' 
                      ? (activeSeason === 'spring' ? 'Printemps de Wurm' : activeSeason === 'summer' ? 'Été Radieux' : activeSeason === 'autumn' ? 'Automne Doré' : 'Hiver Glacial')
                      : `${activeSeason} time`}
                  </div>
                  <div className="text-[9px] font-mono text-zinc-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    {lang === 'fr' ? `An ${wurmTime.year}, jour ${wurmTime.day}` : `Year ${wurmTime.year}, Day ${wurmTime.day}`}
                  </div>
                </div>
              </div>

              {/* Total Kills Stats Card */}
              <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-xl flex items-center gap-4 relative overflow-hidden group">
                <div className="absolute right-[-10px] bottom-[-10px] text-zinc-900 text-6xl font-black select-none pointer-events-none opacity-10">
                  💀
                </div>
                <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-2xl animate-pulse">
                  💀
                </div>
                <div>
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                    {lang === 'fr' ? 'Créatures Tuées' : 'Total Slain'}
                  </div>
                  <div className="text-xl font-mono font-black text-red-400 mt-0.5">
                    {totalKills.toLocaleString()}
                  </div>
                  <div className="text-[9px] font-mono text-emerald-400 mt-1">
                    ▲ +12% {lang === 'fr' ? 'cette heure' : 'this hour'}
                  </div>
                </div>
              </div>

              {/* Spawn Rate Stats Card */}
              <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-xl flex items-center gap-4">
                <div className="p-3 rounded-lg bg-amber-500/10 text-amber-500 text-2xl">
                  🐙
                </div>
                <div>
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                    {lang === 'fr' ? 'Taux de Spawn Sauvage' : 'Wildlife Spawn Rate'}
                  </div>
                  <div className="text-lg font-mono font-black text-white mt-0.5">
                    94.8%
                  </div>
                  <div className="text-[9px] font-mono text-zinc-400 mt-1">
                    {lang === 'fr' ? 'Limite serveur : 12 000 max' : 'Server limit: 12,000 max'}
                  </div>
                </div>
              </div>

              {/* Hunting Reward Modifier */}
              <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-xl flex items-center gap-4">
                <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 text-2xl">
                  💰
                </div>
                <div>
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                    {lang === 'fr' ? 'Multiplicateur de Primes' : 'Bounty Multiplier'}
                  </div>
                  <div className="text-lg font-mono font-black text-emerald-400 mt-0.5">
                    x1.50
                  </div>
                  <div className="text-[9px] font-mono text-zinc-400 mt-1">
                    {lang === 'fr' ? 'BountyMod Actif' : 'BountyMod Active'}
                  </div>
                </div>
              </div>

            </div>

            {/* Main Content Grid: Populations & Kill Logs */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Populations Table (7 columns) */}
              <div className="lg:col-span-7 bg-zinc-950/20 border border-zinc-900 rounded-xl p-5">
                <h5 className="font-mono text-xs font-black text-white uppercase tracking-wider mb-4 flex items-center justify-between">
                  <span>📊 {lang === 'fr' ? 'Recensement Actuel du Monde' : 'Active Creatures Population'}</span>
                  <span className="text-[10px] text-zinc-500 font-normal">
                    {sqliteInfo.hasCreatures 
                      ? (lang === 'fr' ? 'Extrait de wurmzones.db' : 'Extracted from wurmzones.db') 
                      : (lang === 'fr' ? 'Modèle de référence standard' : 'Standard reference template')}
                  </span>
                </h5>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-900 text-zinc-500 text-[10px] uppercase tracking-wider pb-2">
                        <th className="pb-3 pl-2">{lang === 'fr' ? 'Créature' : 'Creature'}</th>
                        <th className="pb-3 text-center">{lang === 'fr' ? 'Danger' : 'Threat'}</th>
                        <th className="pb-3 text-right">{lang === 'fr' ? 'Population sauvages' : 'Active Count'}</th>
                        <th className="pb-3 text-right pr-2">{lang === 'fr' ? 'Bounty Moyenne' : 'Est. Bounty'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sqliteCreatures && sqliteCreatures.length > 0 ? (
                        sqliteCreatures.map((item, idx) => {
                          const isAggressive = item.name_en?.toLowerCase().includes('fiend') || 
                                              item.name_en?.toLowerCase().includes('spider') || 
                                              item.name_en?.toLowerCase().includes('wolf') || 
                                              item.name_en?.toLowerCase().includes('dragon');
                          return (
                            <tr key={idx} className="border-b border-zinc-900/40 hover:bg-zinc-900/20 transition-all">
                              <td className="py-2.5 pl-2 flex items-center gap-2 font-medium text-white">
                                <span className="text-base">{item.icon || '👾'}</span>
                                <span className="capitalize">{lang === 'fr' ? item.name_fr : item.name_en}</span>
                              </td>
                              <td className="py-2.5 text-center">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  isAggressive ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-zinc-800 text-zinc-400'
                                }`}>
                                  {isAggressive ? (lang === 'fr' ? 'HOSTILE' : 'HOSTILE') : (lang === 'fr' ? 'NEUTRE' : 'NEUTRAL')}
                                </span>
                              </td>
                              <td className="py-2.5 text-right font-bold text-amber-500">
                                {item.qty}
                              </td>
                              <td className="py-2.5 text-right text-zinc-400 pr-2">
                                {isAggressive ? '1s 20c' : '15c'}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        // Fallback simulated list
                        [
                          { fr: 'Dragon rouge légendaire', en: 'Legendary Red Dragon', icon: '🐉', count: 1, threat: 'BOSS', bounty: '5s 50c' },
                          { fr: 'Démon de lave', en: 'Lava fiend', icon: '🔥', count: 12, threat: 'HORS NOIR', bounty: '1s 10c' },
                          { fr: 'Araignée de lave', en: 'Lava spider', icon: '🕷️', count: 48, threat: 'HAUT', bounty: '85c' },
                          { fr: 'Géant des forêts', en: 'Forest giant', icon: '👹', count: 4, threat: 'BOSS', bounty: '3s 00c' },
                          { fr: 'Ours brun des cavernes', en: 'Cave bear', icon: '🐻', count: 114, threat: 'MOYEN', bounty: '45c' },
                          { fr: 'Loup affamé', en: 'Starving wolf', icon: '🐺', count: 245, threat: 'MOYEN', bounty: '20c' },
                          { fr: 'Gobelin agressif', en: 'Aggressive goblin', icon: '👺', count: 182, threat: 'BAS', bounty: '35c' },
                          { fr: 'Sanglier furieux', en: 'Furious boar', icon: '🐗', count: 320, threat: 'BAS', bounty: '12c' },
                          { fr: 'Rat géant', en: 'Giant rat', icon: '🐀', count: 540, threat: 'TRÈS BAS', bounty: '6c' },
                          { fr: 'Chat de forêt', en: 'Forest cat', icon: '🐱', count: 88, threat: 'PASSIF', bounty: '0c' }
                        ].map((item, idx) => (
                          <tr key={idx} className="border-b border-zinc-900/40 hover:bg-zinc-900/20 transition-all">
                            <td className="py-2.5 pl-2 flex items-center gap-2 font-medium text-white">
                              <span className="text-base">{item.icon}</span>
                              <span>{lang === 'fr' ? item.fr : item.en}</span>
                            </td>
                            <td className="py-2.5 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                item.threat === 'BOSS' || item.threat === 'HORS NOIR'
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : item.threat === 'HAUT' || item.threat === 'MOYEN'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                                  : item.threat === 'PASSIF'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-zinc-800 text-zinc-400'
                              }`}>
                                {item.threat}
                              </span>
                            </td>
                            <td className="py-2.5 text-right font-bold text-amber-500">
                              {item.count}
                            </td>
                            <td className="py-2.5 text-right text-emerald-400 pr-2">
                              {item.bounty}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Kill Logs Feed (5 columns) */}
              <div className="lg:col-span-5 bg-zinc-950/20 border border-zinc-900 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <h5 className="font-mono text-xs font-black text-white uppercase tracking-wider mb-4 flex items-center justify-between">
                    <span>⚔️ {lang === 'fr' ? 'Journal de Chasse Récent' : 'Recent Slaying Activity'}</span>
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                  </h5>

                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    <AnimatePresence initial={false}>
                      {huntLogs.length === 0 && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-center py-8 text-zinc-500 border border-dashed border-zinc-900/60 rounded-xl bg-zinc-950/20 px-4"
                        >
                          <p className="text-xs font-mono">💤 {lang === 'fr' ? 'Aucune activité récente' : 'No recent activity'}</p>
                          <p className="text-[10px] mt-1 text-zinc-600 font-sans">
                            {lang === 'fr' 
                              ? "En attente d'une élimination de créature ou de la connexion d'un joueur..." 
                              : "Waiting for player hunts or connections..."
                            }
                          </p>
                        </motion.div>
                      )}
                      
                      {huntLogs.map((log) => (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          className={`p-3 rounded-lg border flex items-start gap-3 hover:border-zinc-800 transition-all ${
                            log.type === 'connection'
                              ? 'bg-emerald-950/10 border-emerald-900/30'
                              : 'bg-zinc-950/80 border-zinc-900'
                          }`}
                        >
                          <div className={`text-xl p-1.5 rounded-md ${
                            log.type === 'connection' ? 'bg-emerald-900/30 text-emerald-400 font-bold' : 'bg-zinc-900'
                          }`}>
                            {log.type === 'connection' ? '🔌' : log.avatar}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <span className="font-mono text-xs font-bold text-zinc-200 truncate">{log.player}</span>
                              <span className="text-[9px] font-mono text-zinc-500">{log.timestamp}</span>
                            </div>

                            {log.type === 'connection' ? (
                              <p className="text-[10px] text-zinc-300 mt-1 font-sans leading-snug flex items-center gap-1.5">
                                <span className="inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                                <span>
                                  {lang === 'fr' 
                                    ? "S'est connecté au serveur de jeu à " 
                                    : "Connected to the game server at "
                                  }
                                  <span className="text-emerald-400 font-mono text-[10px] font-semibold">{log.location}</span>
                                </span>
                              </p>
                            ) : (
                              <>
                                <p className="text-[10px] text-zinc-400 mt-0.5 font-sans leading-snug">
                                  {lang === 'fr' ? 'A éliminé un ' : 'Slew a ' }
                                  <strong className="text-white font-mono">{log.creatureIcon} {log.creature}</strong>
                                  {lang === 'fr' ? ' à ' : ' at ' } 
                                  <span className="text-zinc-500 font-mono text-[9px]">{log.location}</span>
                                </p>

                                <div className="flex gap-2 mt-1.5 items-center">
                                  <span className="text-[9px] font-mono text-zinc-500 uppercase">{lang === 'fr' ? 'Prime :' : 'Bounty :'}</span>
                                  <div className="flex gap-1.5 text-[10px] font-mono">
                                    {log.bountyCoins.silver > 0 && (
                                      <span className="text-zinc-300 font-bold flex items-center gap-0.5">
                                        🪙 {log.bountyCoins.silver}s
                                      </span>
                                    )}
                                    {log.bountyCoins.copper > 0 && (
                                      <span className="text-amber-600 font-bold flex items-center gap-0.5">
                                        🟤 {log.bountyCoins.copper}c
                                      </span>
                                    )}
                                    {log.bountyCoins.silver === 0 && log.bountyCoins.copper === 0 && (
                                      <span className="text-zinc-600 font-bold">Aucune / None</span>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-zinc-900/60 font-mono text-[10px] text-zinc-500 space-y-1.5">
                  <p>🛡️ {lang === 'fr' ? 'Les primes sont gérées par BountyMod en direct.' : 'Bounties are processed live by BountyMod in sync with SQLITE.'}</p>
                  <p>🦖 {lang === 'fr' ? 'Le taux de réapparition s\'adapte aux saisons.' : 'Re-spawning frequency dynamically adapts to active season effects.'}</p>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>

      {showAdminLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 max-w-sm w-full font-mono text-xs text-zinc-300 shadow-2xl relative">
            <button
              onClick={() => {
                setShowAdminLogin(false);
                setAdminPasswordInput('');
                setAdminLoginError(null);
              }}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white text-sm cursor-pointer transition-colors"
            >
              ✕
            </button>

            <div className="text-center mb-5">
              <span className="text-3xl filter drop-shadow">🛡️</span>
              <h4 className="font-black text-white uppercase tracking-wider text-sm mt-2">
                {lang === 'fr' ? 'Connexion Admin' : 'Admin Login'}
              </h4>
              <p className="text-[10px] text-zinc-500 font-sans mt-1">
                {lang === 'fr' 
                  ? 'Entrez le mot de passe administrateur pour accéder aux configurations du serveur.' 
                  : 'Enter the administrator password to access server settings.'}
              </p>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (adminPasswordInput.trim() === 'admin' || adminPasswordInput.trim() === 'wurm' || adminPasswordInput.trim() === 'wurm123') {
                  setIsAdminMode(true);
                  localStorage.setItem('wurm_admin_mode', 'true');
                  setShowAdminLogin(false);
                  setAdminPasswordInput('');
                  setAdminLoginError(null);
                } else {
                  setAdminLoginError(lang === 'fr' ? 'Mot de passe incorrect.' : 'Incorrect password.');
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wide mb-1 text-center">
                  {lang === 'fr' ? 'Mot de passe' : 'Password'}
                </label>
                <input
                  type="password"
                  required
                  placeholder="e.g. admin"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#ff9900]/50 rounded p-2 text-white placeholder-zinc-700 outline-none text-center font-bold tracking-widest text-sm"
                  autoFocus
                />
                <p className="text-[9px] text-zinc-600 mt-1.5 text-center">
                  {lang === 'fr' ? '(Mot de passe par défaut : admin)' : '(Default password: admin)'}
                </p>
              </div>

              {adminLoginError && (
                <div className="p-2 bg-red-500/10 border border-red-500/25 rounded text-red-400 text-center text-[10px] font-bold">
                  {adminLoginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-[#ff9900] hover:bg-[#ff9900]/90 text-black font-black uppercase tracking-wider rounded cursor-pointer transition-colors"
              >
                {lang === 'fr' ? 'Se connecter' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
