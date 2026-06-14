window.addEventListener("DOMContentLoaded", () => {
    // 1. Récupération de l'Alerte Matrice Globale
    const globalTicker = localStorage.getItem('qbc_global_ticker_msg') || "Lancement de la Cohort QBC 2026...";
    const tickerElement = document.getElementById("admin-live-ticker");
    if (tickerElement) {
        tickerElement.innerText = globalTicker;
    }

    // 2. Génération dynamique des cartes serveurs
    const portalContainer = document.getElementById("matrix-portal-container");
    if (!portalContainer) return;

    let htmlContent = "";

    // --- ACCÈS UNIVERSE 7DTD (Fixes + Serveurs créés comme 7dtd3) ---
    htmlContent += `<div class="universe-section" style="border: 1px solid #ef4444; padding: 20px; border-radius: 8px; margin-bottom: 25px; background: rgba(239,68,68,0.02);">
        <h2 style="color: #ef4444; font-family: monospace; margin-top: 0;">☣️ SECTEUR 7 DAYS TO DIE</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">`;

    // Serveurs fixes 7DTD
    const base7Dtd = ["7dtd1", "7dtd2"];
    base7Dtd.forEach(srvId => {
        htmlContent += generateServerCard(srvId, "🎮 7DTD INSTANCE", "#ef4444", "67.216.85.235", srvId === "7dtd1" ? "26900" : "26901");
    });

    // Serveurs customs 7DTD (7dtd3, 7dtd4, etc.)
    const custom7Dtd = JSON.parse(localStorage.getItem('qbc_matrix_custom_7dtd_list') || "[]");
    custom7Dtd.forEach(srv => {
        htmlContent += generateServerCard(srv.srvId, "🎮 " + srv.label, "#ef4444", "0.0.0.0", "26900");
    });

    htmlContent += `</div></div>`;

    // --- ACCÈS UNIVERSE WURM ---
    htmlContent += `<div class="universe-section" style="border: 1px solid #00ffcc; padding: 20px; border-radius: 8px; margin-bottom: 25px; background: rgba(0,255,204,0.02);">
        <h2 style="color: #00ffcc; font-family: monospace; margin-top: 0;">🛡️ SECTEUR WURM UNLIMITED</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">`;
    htmlContent += generateServerCard("wurm1", "🌾 ROYAUME DORIATH", "#00ffcc", "74.50.94.238", "5517");
    htmlContent += generateServerCard("wurm2", "🏰 ROYAUME FLAGGARD", "#00ffcc", "74.50.94.239", "5518");
    htmlContent += `</div></div>`;

    // --- ACCÈS UNIVERSE AVORION (LE COCKPIT CYBER-TURQUOISE) ---
    htmlContent += `<div class="universe-section" style="border: 1px solid #14b8a6; padding: 20px; border-radius: 8px; margin-bottom: 25px; background: rgba(20,184,166,0.02);">
        <h2 style="color: #14b8a6; font-family: monospace; margin-top: 0;">🚀 SECTEUR AVORION GALAXY</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">`;
    htmlContent += generateServerCard("avorion1", "🛰️ ALPHA CORE GALAXY", "#14b8a6", "45.134.8.12", "27015");
    htmlContent += generateServerCard("avorion2", "🛸 FRONTIÈRE SANS LOI", "#14b8a6", "45.134.8.13", "27016");
    htmlContent += `</div></div>`;

    // --- ACCÈS UNIVERSE RISING WORLD ---
    htmlContent += `<div class="universe-section" style="border: 1px solid #eab308; padding: 20px; border-radius: 8px; background: rgba(234,179,8,0.02);">
        <h2 style="color: #eab308; font-family: monospace; margin-top: 0;">🌍 SECTEUR RISING WORLD</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">`;
    htmlContent += generateServerCard("rw1", "🧱 NEW WORLD S1", "#eab308", "0.0.0.0", "4255");
    htmlContent += `</div></div>`;

    // Injection propre dans l'index HTML
    portalContainer.innerHTML = htmlContent;
});

// Fonction de fabrication de carte réseau sécurisée
function generateServerCard(srvId, defaultLabel, colorColor, defaultIp, defaultPort) {
    const name = localStorage.getItem('qbc_custom_name_2026_' + srvId) || defaultLabel;
    const ip = localStorage.getItem('qbc_ip_2026_' + srvId) || defaultIp;
    const port = localStorage.getItem('qbc_port_2026_' + srvId) || defaultPort;
    const rebootAlert = localStorage.getItem('qbc_ticker_msg_2026_' + srvId) || "";
    
    let alertHtml = "";
    if (rebootAlert) {
        alertHtml = `<div style="background: rgba(255,153,0,0.1); border: 1px solid #ff9900; color: #ff9900; padding: 4px; font-size: 11px; border-radius: 4px; margin-top: 8px; font-weight: bold; text-align: center;">⚡ ${rebootAlert}</div>`;
    }

    return `
        <div class="server-card" style="background: #0f172a; border: 1px solid #1e293b; border-left: 4px solid ${colorColor}; padding: 15px; border-radius: 6px; font-family: monospace; position: relative;">
            <div style="font-weight: bold; color: #fff; font-size: 13px; margin-bottom: 8px; text-transform: uppercase;">${name}</div>
            <div style="font-size: 11px; color: #94a3b8;">📡 ADDRESS : <span style="color:#fff;">${ip}:${port}</span></div>
            <button onclick="localStorage.setItem('qbc_last_active_srv_key', '${srvId}'); window.location.href='admin.html';" style="margin-top: 10px; width: 100%; background: #1e293b; border: 1px solid ${colorColor}; color: ${colorColor}; padding: 6px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 11px;">🎛️ PILOTER L'INSTANCE</button>
            ${alertHtml}
        </div>
    `;
}
