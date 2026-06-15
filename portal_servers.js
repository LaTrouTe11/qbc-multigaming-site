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
            
            <!-- ICI : LE LIEN CORRIGÉ QUI APPELLE LE BON FICHIER À LA RACINE -->
            <button onclick="window.location.href='admin_${gameId}.html';" style="margin-top: 10px; width: 100%; background: #1e293b; border: 1px solid ${color}; color: ${color}; padding: 6px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 11px;">🎛️ PILOTER L'INSTANCE</button>
            
            ${alertHtml}
        </div>
    `;
}
