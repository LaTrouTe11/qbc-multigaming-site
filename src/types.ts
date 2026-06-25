export interface GlobalConfig {
  type: string;
  indexMainTitle?: string;
  indexMainTitle_fr?: string;
  indexMainTitle_en?: string;
  indexSubTitle?: string;
  indexSubTitle_fr?: string;
  indexSubTitle_en?: string;
  title?: string;
  desc?: string;
  desc_en?: string;
  warn?: string;
  global_badge?: string;
  global_warn_text?: string;
  portalTheme?: 'standard' | 'noel' | 'halloween' | 'paques' | 'cyberpunk' | 'apocalypse' | 'space';
  securityNoCopy?: string; // "true" | "false"
}

export interface ServerInstance {
  id: string;
  type: 'wurm' | '7dtd' | 'avorion';
  game_icon: string;
  name: string;
  name_fr?: string;
  name_en?: string;
  ip: string;
  rb: string;
  badge_state: 'stable' | 'urgent' | 'maintenance' | 'pack' | 'sync';
  wn_text?: string;
  status: 'online' | 'offline';
  slots: string; // e.g., "12/40" or "0/250"
  votes: string; // e.g., "45"
  
  // Static cluster defaults as fallbacks
  host?: string;
  port?: string;
  max?: number;
  topSiteId?: string;
  badgeStyle?: string;

  // Telnet server configurations and live data
  worldDay?: number;
  telnetHost?: string;
  telnetPort?: string;
  telnetPassword?: string;
}

export interface ClusterData {
  global: GlobalConfig;
  [key: string]: ServerInstance | GlobalConfig;
}
