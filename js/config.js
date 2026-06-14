// 🌌 QBC NETWORKING CLUSTER — CONFIGURATION DES PORTS ET REPERTOIRES DE MODS 2026
const QBC_GLOBAL_CONFIG = {
    "lastUpdate": "2026-06-14 06:40",
    "maintenanceMessage": "Mise à jour et synchronisation des modules de mods réseau en cours.",
    "discordURL": "https://discord.gg",
    
    // ☣️ LOGIQUE INSTANCES 7 DAYS TO DIE (PORTS DÉDIÉS DE GESTION DES MODS)
    "7dtd1": {
        "ip": "67.216.85.235",
        "port": "26900",
        "maxPlayers": "30",
        "modded": true,
        "modFolder": "/Mods",
        "webDashPort": "26902"
    },
    "7dtd2": {
        "ip": "67.216.85.236",
        "port": "26901",
        "maxPlayers": "30",
        "modded": true,
        "modFolder": "/Mods",
        "webDashPort": "26903"
    },
    
    // 🛡️ LOGIQUE INSTANCES WURM UNLIMITED (ROYAUMES RE-SOUDES)
    "wurm1": {
        "ip": "104.243.40.52",
        "port": "3724",
        "maxPlayers": "250"
    },
    "wurm2": {
        "ip": "74.50.94.238",
        "port": "3724",
        "maxPlayers": "250"
    },
    
    // 🚀 LOGIQUE INSTANCES SATELLITES AVORION
    "avorion1": {
        "ip": "45.134.8.12",
        "port": "27015",
        "maxPlayers": "20"
    },
    "avorion2": {
        "ip": "45.134.8.13",
        "port": "27016",
        "maxPlayers": "20"
    }
};

// Sécurité pour s'assurer que la matrice navigateur charge la config sans interférence
if (typeof window !== 'undefined') {
    window.QBC_GLOBAL_CONFIG = QBC_GLOBAL_CONFIG;
}
