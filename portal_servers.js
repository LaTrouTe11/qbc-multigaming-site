window.addEventListener("DOMContentLoaded", () => {
    // 1. Récupération de l'Alerte Matrice Globale depuis GitHub
    fetch('fichierjs/7dtd.js')
        .then(r => r.json())
        .then(data => {
            if (data.globalTicker) {
                const tickerElement = document.getElementById("admin-live-ticker");
                if (tickerElement) tickerElement.innerText = data.globalTicker;
            }
        }).catch(() => {});

    // 2. Génération dynamique des cartes serveurs
    const portalContainer = document.getElementById("matrix-portal-container");
    if (!portalContainer) return;

    // Configuration des 3 secteurs du réseau QBC
    const sectors = [
        { id: '7dtd', name: '☣️ SECTEUR 7 DAYS TO DIE', color: '#ef4444', file: 'fichierjs/7dtd.js' },
        { id: 'avorion', name: '🚀 SECTEUR AVORION GALAXY', color: '#14b8a6', file: 'fichierjs/avorion.js' },
        { id: 'wurm', name: '🛡️ SECTEUR WURM UNLIMITED', color: '#00ffcc', file: 'fichierjs/wurm.js' }
    ];

    portalContainer.innerHTML = ""; // Nettoyage de sécurité

    sectors.forEach(sec => {
        // Lecture asynchrone et étanche de chaque fichier de jeu
        fetch(sec.file)
            .then(res => res.json())
            .then(data => {
                const servers = data.servers || [];
                if (servers.length === 0) {
                    // Si le fichier est vide, afficher le mode Secours/Standby isolé
                    portalContainer.innerHTML += generateSectorHtml(sec.name, sec.color, `
                        <div style="color: #64748b; font-family: monospace; font-size: 12px; padding: 10px;">⏳ AUCUN SERVEUR ACTIF (STANDBY)</div>
                    `);
                    return;
                }

                let cardsHtml = "";
                servers.forEach(srv => {
                    cardsHtml += generateServerCard(srv, sec.color, sec.id);
                });
                portalContainer.innerHTML += generateSectorHtml(sec.name, sec.color, cardsHtml);
            })
            .catch(() => {
                // Sécurité anti-plantage si un fichier est corrompu sur GitHub
                portalContainer.innerHTML += generateSectorHtml(sec.name, sec.color, `
                    <div style="color: #ef4444; font-family: monospace; font-size: 12px; padding: 10px;">⚠️ RECHERCHE RESEAU EN COURS...</div>
                `);
            });
    });
});

// Fabrication de la zone du secteur de jeu
function generateSectorHtml(title, color, cards) {
    return `
        <div class="universe-section" style="border: 1px solid ${color}; padding: 20px; border-radius: 8px; margin-bottom: 25px; background: rgba(255,255,255,0.01);">
            <h2 style="color: ${color}; font-family: monospace; margin-top: 0;">${title}</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">${cards}</div>
        </div>
    `;
}

// Fabrication de la carte serveur dynamique 2026
function generateServerCard(srv, color, gameId) {
    let alertHtml = "";
    if (srv.rebootAlert) {
        alertHtml = `<div style="background: rgba(255,153,0,0.1); border: 1px solid #ff9900; color: #ff9900; padding: 4px; font-size: 11px; border-radius: 4px; margin-top: 8px; font-weight: bold; text-align: center;">⚡ ${srv.rebootAlert}</div>`;
    }

    return `
        <div class="server-card" style="background: #0f172a; border: 1px solid #1e293b; border-left: 4px solid ${color}; padding: 15px; border-radius: 6px; font-family: monospace;">
            <div style="font-weight: bold; color: #fff; font-size: 13px; margin-bottom: 8px; text-transform: uppercase;">🎮 ${srv.name}</div>
            <div style="font-size: 11px; color: #94a3b8; margin-bottom: 5px;">📡 ADDRESS : <span style="color:#fff;">${srv.ip}:${srv.port}</span></div>
            <div style="font-size: 11px; color: #94a3b8;">🟢 STATUS : <span style="color:${color}; font-weight:bold;">CONNECTÉ</span></div>
            <button onclick="window.location.href='admin_${gameId}.html';" style="margin-top: 10px; width: 100%; background: #1e293b; border: 1px solid ${color}; color: ${color}; padding: 6px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 11px;">🎛️ PILOTER L'INSTANCE</button>
            ${alertHtml}
        </div>
    `;
}
