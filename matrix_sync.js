// ===================================================================
// 🛰️ MOTEUR UNIFIÉ QBC MATRIX 2026 - COMPATIBILITÉ STEAM QUERY PROXY
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
        const txtNode = document.getElementById(`slots-txt-${srv.id}`);
        const barNode = document.getElementById(`bar-${srv.id}`);
        const badgeNode = document.getElementById(`status-badge-${srv.id}`);
        const statusTxtNode = document.getElementById(`status-txt-${srv.id}`);

        // 🔍 ÉTAPE 1 : Lecture prioritaire des ordres de votre Admin Control Panel
        let localConfig = window.qbcClusterData && window.qbcClusterData[srv.id];
        
        if (localConfig && localConfig.status === "offline") {
            appliquerStatutAdminForcé(localConfig, txtNode, barNode, badgeNode, statusTxtNode, srv.max);
            return; 
        }

        // 🔍 ÉTAPE 2 : Interrogation via une passerelle de secours compatible HTTPS Vercel
        const urlSteam = `https://steampowered.com{srv.host}:${srv.port}`;
        const urlProxy = `https://allorigins.win{encodeURIComponent(urlSteam)}`;

        fetch(urlProxy)
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('Erreur Réseau');
            })
            .then(wrapper => {
                // Allorigins encapsule la réponse dans un champ .contents sous forme de texte
                const data = JSON.parse(wrapper.contents);

                if (data && data.response && data.response.success && data.response.servers && data.response.servers[0]) {
                    const srvData = data.response.servers[0];
                    const enLigne = (srvData.players !== undefined) ? srvData.players : 0; 
                    const maxJoueurs = srvData.max_players || srv.max; 

                    if (txtNode) txtNode.textContent = `${enLigne} / ${maxJoueurs}`;
                    if (barNode) barNode.style.width = `${(enLigne / maxJoueurs) * 100}%`;

                    if (badgeNode && statusTxtNode) {
                        badgeNode.className = "status-badge online-mode";
                        badgeNode.style.borderLeftColor = "#00ffcc";
                        statusTxtNode.innerHTML = `<span class="led-pulse led-green"></span>🟢 LIVE`;
                        statusTxtNode.style.color = "#00ffcc";
                    }
                } else {
                    // Si Steam renvoie une liste vide, le serveur tourne mais n'a pas de joueurs
                    chargerDonneesStablesSecours(localConfig, txtNode, barNode, badgeNode, statusTxtNode, srv.max, 0);
                }
            })
            .catch(() => {
                // En cas de coupure de l'API de Valve, on utilise les valeurs du fichier config.js
                chargerDonneesStablesSecours(localConfig, txtNode, barNode, badgeNode, statusTxtNode, srv.max, null);
            });
    });
}

function appliquerStatutAdminForcé(localConfig, txtNode, barNode, badgeNode, statusTxtNode, maxDefaut) {
    let online = localConfig.players_online !== undefined ? localConfig.players_online : 0;
    let max = localConfig.players_max !== undefined ? localConfig.players_max : maxDefaut;

    if (txtNode) txtNode.textContent = `${online} / ${max}`;
    if (barNode) barNode.style.width = `${(online / max) * 100}%`;

    if (badgeNode && statusTxtNode) {
        if (localConfig.badge_state === "maintenance") {
            badgeNode.className = "status-badge offline-mode";
            badgeNode.style.borderLeftColor = "#ff9900"; 
            statusTxtNode.innerHTML = `🛠️ MAINTENANCE`;
            statusTxtNode.style.color = "#ff9900";
        } else {
            badgeNode.className = "status-badge offline-mode";
            badgeNode.style.borderLeftColor = "#ff1111"; 
            statusTxtNode.textContent = "🔴 OFFLINE";
            statusTxtNode.style.color = "#ff3333";
        }
    }
}

function chargerDonneesStablesSecours(localConfig, txtNode, barNode, badgeNode, statusTxtNode, maxDefaut, forceOnlineVal) {
    let online = (localConfig && localConfig.players_online !== undefined) ? localConfig.players_online : 0;
    if (forceOnlineVal !== null) online = forceOnlineVal;
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

window.addEventListener('load', () => {
    if (typeof loadQbcMatrixDynamicConfig === "function") {
        loadQbcMatrixDynamicConfig();
    } else {
        scannerToutLeCluster();
    }
});
