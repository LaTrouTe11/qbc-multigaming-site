// =========================================================================
// 🎛️ CENTRALISATION UNIQUE DES REGLAGES QBC MULTIGAMING (QUANTUM 2026)
// =========================================================================
const QBC_GLOBAL_CONFIG = {

    // 🔗 LINK DISCORD COMMUNAUTAIRE OFFICIEL QBC FLAGGARD
    "discordURL": "https://discord.gg",
    
    // ⚠️ TEXTE DÉFILANT : ALERTE GÉNÉRALE (Laissez vide "" pour désactiver)
    "maintenanceMessage": "",
    
    // ⏱️ COMPTE À REBOURS DE FIN DE MAINTENANCE POUR LES JOUEURS
    // Format ISO standard : "AAAA-MM-JJTHH:MM:SS" (Ici réglé pour aujourd'hui à 14:00:00)
    "maintenanceEnd": "2026-06-13T14:00:00", 

    // ⏱️ DATE ET HEURE DE VOTRE DERNIÈRE MISE À JOUR VISUELLE DU SITE
    "lastUpdate": "13 Juin 2026 à 11:55 (QC / EST)",


    // ---------------------------------------------------------------------
    // 🧟 REGLAGES MULTI-IP : 7 DAYS TO DIE (ZOMBIES)
    // ---------------------------------------------------------------------

    // 🟥 SERVEUR 1 : ProjectZ (En ligne standard)
    "7dtd1": { 
        "ip": "15.235.65.131", 
        "port": "25593", 
        "maxPlayers": 16, 
        "map": "http://15.235.65.131:25594", 
        "mapImg": "map_s1.jpg", 
        "voteLink": "https://7daystodie-servers.com" 
    },

    // 🟧 SERVEUR 2 : New Mods ── ⚠️ MAINTENANCE APPLIQUÉE POUR VOS TESTS PORTAIL
    "7dtd2": { 
        "ip": "MAINTENANCE", 
        "port": "25592", 
        "maxPlayers": 20, 
        "map": "#", 
        "mapImg": "map_s2.jpg", 
        "voteLink": "#" 
    },


    // ---------------------------------------------------------------------
    // 🏰 REGLAGES MULTI-IP : WURM UNLIMITED (MEDIEVAL)
    // ---------------------------------------------------------------------

    // 🟨 ROYAUME 1 : Doriath (En ligne standard)
    "wurm1": { 
        "ip": "104.243.40.52", 
        "port": "5134", 
        "maxPlayers": 250, 
        "mapImg": "wurm1_map.jpg", 
        "voteLink": "https://wurm-unlimited.com" 
    },

    // 🟩 ROYAUME 2 : Flaggard (En ligne standard)
    "wurm2": { 
        "ip": "74.50.94.238", 
        "port": "5610", 
        "maxPlayers": 250, 
        "mapImg": "wurm2_map.jpg", 
        "voteLink": "https://wurm-unlimited.com" 
    },


    // ---------------------------------------------------------------------
    // 🚀 REGLAGES MULTI-IP : AVORION (CYBER-SPATIAL)
    // ---------------------------------------------------------------------

    // 🟦 SECTEUR 1 : Core 1 (En ligne standard)
    "avorion1": { 
        "ip": "67.216.85.235", 
        "port": "25598", 
        "maxPlayers": 20, 
        "voteLink": "https://avorion-servers.com" 
    },

    // 🟪 SECTEUR 2 : Core 2 ── ⚠️ MAINTENANCE APPLIQUÉE POUR VOS TESTS PORTAIL
    "avorion2": { 
        "ip": "MAINTENANCE", 
        "port": "25605", 
        "maxPlayers": 20, 
        "voteLink": "#" 
    }

};
// =========================================================================
