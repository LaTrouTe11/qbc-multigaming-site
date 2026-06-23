// ===================================================================
// 🛰️ COMPOSANT DE SECOURS QBC - RÉACTIVATION DE L'AFFICHAGE DE L'INDEX
// ===================================================================
function scannerToutLeCluster() {
    const serveurs = [
        { id: 'wurm1', max: 40 },
        { id: 'wurm2', max: 250 },
        { id: '7dtd1', max: 16 },
        { id: '7dtd2', max: 20 },
        { id: 'avo1', max: 50 },
        { id: 'avo2', max: 50 }
    ];

    serveurs.forEach(srv => {
        // Sélection des cartes de l'index v70.0
        const txtNode = document.getElementById(`slots-txt-${srv.id}`);
        const barNode = document.getElementById(`bar-${srv.id}`);
        const badgeNode = document.getElementById(`status-badge-${srv.id}`);
        const statusTxtNode = document.getElementById(`status-txt-${srv.id}`);

        // Lecture de sécurité de votre configuration js/config.js
        let localConfig = window.qbcClusterData && window.qbcClusterData[srv.id];
        let online = (localConfig && localConfig.players_online !== undefined) ? localConfig.players_online : 0;
        let max = (localConfig && localConfig.players_max !== undefined) ? localConfig.players_max : srv.max;

        // Injection forcée du texte dans les cartes pour enlever l'écran noir
        if (txtNode) txtNode.textContent = `${online} / ${max}`;
        if (barNode) barNode.style.width = `${(online / max) * 100}%`;

        // Gestion automatique des couleurs de badges selon vos choix d'admin
        if (localConfig && localConfig.status === "offline") {
            if (badgeNode && statusTxtNode) {
                if (localConfig.badge_state === "maintenance") {
                    badgeNode.className = "status-badge offline-mode";
                    badgeNode.style.borderLeftColor = "#ff9900"; // Badge Orange
                    statusTxtNode.innerHTML = `🛠️ MAINTENANCE`;
                    statusTxtNode.style.color = "#ff9900";
                } else {
                    badgeNode.className = "status-badge offline-mode";
                    badgeNode.style.borderLeftColor = "#ff1111"; // Badge Rouge
                    statusTxtNode.textContent = "🔴 OFFLINE";
                    statusTxtNode.style.color = "#ff3333";
                }
            }
        } else {
            if (badgeNode && statusTxtNode) {
                badgeNode.className = "status-badge online-mode";
                badgeNode.style.borderLeftColor = "#00ffcc"; // Allumage Vert Néon
                statusTxtNode.innerHTML = `<span class="led-pulse led-green"></span>🟢 LIVE`;
                statusTxtNode.style.color = "#00ffcc";
            }
        }
    });
}

// Relance automatique après l'analyse de la configuration
window.addEventListener('DOMContentLoaded', () => {
    if (typeof loadQbcMatrixDynamicConfig === "function") {
        loadQbcMatrixDynamicConfig();
    } else {
        scannerToutLeCluster();
    }
});



