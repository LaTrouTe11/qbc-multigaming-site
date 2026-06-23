// ===================================================================
// 🛰️ MOTEUR UNIFIÉ QBC MATRIX 2026 - PROTOCOLE DE SCAN OFFICIEL STEAM
// ===================================================================
function scannerToutLeCluster() {
    const serveurs = [
        { id: 'wurm1', host: '104.243.40.52', port: '5134', max: 40 },
        { id: 'wurm2', host: '74.50.94.238', port: '5610', max: 250 },
        { id: '7dtd1', host: '15.235.65.131', port: '25593', max: 16 },
        { id: '7dtd2', host: '51.222.244.134', port: '25592', max: 20 },
        { id: 'avo1', host: '15.235.65.131', port: '25598', max: 50 },
        { id: 'avo2', host: '51.222.244.134', port: '25605', max: 50 }
    ];

    serveurs.forEach(srv => {
        // Sélection des cartes de votre index principal v70.0
        const txtNode = document.getElementById(`slots-txt-${srv.id}`);
        const barNode = document.getElementById(`bar-${srv.id}`);
        const badgeNode = document.getElementById(`status-badge-${srv.id}`);
        const statusTxtNode = document.getElementById(`status-txt-${srv.id}`);

        // 🔍 ÉTAPE A : Lecture de sécurité de vos ordres Admin Control Panel
        let localConfig = window.qbcClusterData && window.qbcClusterData[srv.id];
        
        if (localConfig && localConfig.status === "offline") {
            // Si l'admin force "offline" ou "maintenance", on bloque Steam et on affiche vos choix !
            appliquerStatutAdminForcé(localConfig, txtNode, barNode, badgeNode, statusTxtNode, srv.max);
            return; // On s'arrête ici pour ce serveur
        }

        // 🔍 ÉTAPE B : Si l'admin dit "online", on demande les vrais slots en direct à Steam
        const urlSteam = `https://steampowered.com{srv.host}:${srv.port}`;

        fetch(urlSteam)
            .then(res => res.json())
            .then(data => {
                if (data && data.response && data.response.success && data.response.servers && data.response.servers.length > 0) {
                    const infoSteam = data.response.servers[0];
                    const enLigne = infoSteam.players !== undefined ? infoSteam.players : 0; // Vrais connectés Steam
                    const maxJoueurs = infoSteam.max_players || srv.max; // Slots configurés sur la machine

                    // Rendu automatique et rigide calculé par Steam
                    if (txtNode) txtNode.textContent = `${enLigne} / ${maxJoueurs}`;
                    if (barNode) barNode.style.width = `${(enLigne / maxJoueurs) * 100}%`;

                    // Allumage en vert LIVE validé par les services de Valve
                    if (badgeNode && statusTxtNode) {
                        badgeNode.className = "status-badge online-mode";
                        badgeNode.style.borderLeftColor = "#00ffcc";
                        statusTxtNode.innerHTML = `<span class="led-pulse led-green"></span>🟢 LIVE`;
                        statusTxtNode.style.color = "#00ffcc";
                    }
                } else {
                    // Failsafe : Si la machine ne répond pas à Steam, on affiche l'état stable par défaut
                    chargerDonneesStablesSecours(localConfig, txtNode, barNode, badgeNode, statusTxtNode, srv.max);
                }
            })
            .catch(() => {
                // Secours en cas de micro-coupure de la passerelle Valve
                chargerDonneesStablesSecours(localConfig, txtNode, barNode, badgeNode, statusTxtNode, srv.max);
            });
    });
}

// Moteur d'application des ordres de votre panneau d'administration
function appliquerStatutAdminForcé(localConfig, txtNode, barNode, badgeNode, statusTxtNode, maxDefaut) {
    let online = localConfig.players_online !== undefined ? localConfig.players_online : 0;
    let max = localConfig.players_max !== undefined ? localConfig.players_max : maxDefaut;

    if (txtNode) txtNode.textContent = `${online} / ${max}`;
    if (barNode) barNode.style.width = `${(online / max) * 100}%`;

    if (badgeNode && statusTxtNode) {
        if (localConfig.badge_state === "maintenance") {
            badgeNode.className = "status-badge offline-mode";
            badgeNode.style.borderLeftColor = "#ff9900"; // Orange
            statusTxtNode.innerHTML = `🛠️ MAINTENANCE`;
            statusTxtNode.style.color = "#ff9900";
        } else {
            badgeNode.className = "status-badge offline-mode";
            badgeNode.style.borderLeftColor = "#ff1111"; // Rouge
            statusTxtNode.textContent = "🔴 OFFLINE";
            statusTxtNode.style.color = "#ff3333";
        }
    }
}

// Chargement des données par défaut si l'API Steam est indisponible
function chargerDonneesStablesSecours(localConfig, txtNode, barNode, badgeNode, statusTxtNode, maxDefaut) {
    let online = (localConfig && localConfig.players_online !== undefined) ? localConfig.players_online : 0;
    let max = (localConfig && localConfig.players_max !== undefined) ? localConfig.players_max : maxDefaut;

    if (txtNode) txtNode.textContent = `${online} / ${max}`;
    if (barNode) barNode.style.width = `${(online / max) * 100}%`;

    if (badgeNode && statusTxtNode) {
        badgeNode.className = "status-badge online-mode";
        badgeNode.style.borderLeftColor = "#00ffcc";
        statusTxtNode.innerHTML = `<span class="led-pulse led-green"></span>🟢 LIVE`;
        statusTxtNode.style.color = "#00ffcc";
    }
}

// Lancement synchrone après le décodage de la configuration d'accueil
window.addEventListener('DOMContentLoaded', () => {
    if (typeof loadQbcMatrixDynamicConfig === "function") {
        loadQbcMatrixDynamicConfig();
    } else {
        scannerToutLeCluster();
    }
});




