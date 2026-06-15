window.addEventListener("DOMContentLoaded", () => {
    // Lecture directe de la mémoire locale simplifiée
    const sectors = [
        { id: '7dtd', name: '☣️ SECTEUR 7 DAYS TO DIE', color: '#ef4444', storageKey: 'qbc_backup_7dtd' },
        { id: 'avorion', name: '🚀 SECTEUR AVORION GALAXY', color: '#14b8a6', storageKey: 'qbc_backup_avorion' },
        { id: 'wurm', name: '🛡️ SECTEUR WURM UNLIMITED', color: '#00ffcc', storageKey: 'qbc_backup_wurm' }
    ];

    const mainContainer = document.getElementById("dynamic-sectors-root");
    if (!mainContainer) return;
    mainContainer.innerHTML = "";

    sectors.forEach(sec => {
        const savedData = localStorage.getItem(sec.storageKey);
        let serversHtml = "";

        if (savedData) {
            const data = JSON.parse(savedData);
            const serversList = data.servers || [];

            if (serversList.length === 0) {
                serversHtml = `<div style="color:#64748b; font-size:12px; font-family:monospace; padding:10px;">🔴 AUCUN COMPOSANT ACTIF DANS CE SECTEUR</div>`;
            } else {
                serversList.forEach(srv => {
                    let alertHtml = srv.rebootAlert ? `<div style="background:rgba(255,153,0,0.1); border:1px solid #ff9900; color:#ff9900; padding:4px; font-size:11px; border-radius:4px; margin-top:8px; text-align:center; font-weight:bold;">⚡ ${srv.rebootAlert}</div>` : "";
                    serversHtml += `
                        <div style="background:#0f172a; border:1px solid #1e293b; border-left:4px solid ${sec.color}; padding:15px; border-radius:6px; font-family:monospace; margin-bottom:10px;">
                            <div style="font-weight:bold; color:#fff; font-size:13px; margin-bottom:8px; text-transform:uppercase;">🎮 ${srv.name}</div>
                            <div style="font-size:11px; color:#94a3b8; margin-bottom:5px;">📡 ADDRESS : <span style="color:#fff;">${srv.ip}:${srv.port}</span></div>
                            <div style="font-size:11px; color:#94a3b8;">🟢 STATUS : <span style="color:${sec.color}; font-weight:bold;">CONNECTÉ</span></div>
                            <button onclick="window.location.href='admin_${sec.id}.html';" style="margin-top:10px; width:100%; background:#1e293b; border:1px solid ${sec.color}; color:${sec.color}; padding:6px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:11px;">🎛️ PILOTER L'INSTANCE</button>
                            ${alertHtml}
                        </div>
                    `;
                });
            }
        } else {
            serversHtml = `<div style="color:#64748b; font-size:12px; font-family:monospace; padding:10px;">⚪ SECTEUR EN VEILLE EN ATTENTE D'ACTIVATION</div>`;
        }

        mainContainer.innerHTML += `
            <div style="background:rgba(30,41,59,0.3); border:1px solid #1e293b; padding:20px; border-radius:8px; margin-bottom:20px;">
                <h2 style="color:${sec.color}; font-size:14px; margin-top:0; border-bottom:1px solid #1e293b; padding-bottom:10px; font-family:monospace;">${sec.name}</h2>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap:15px; margin-top:15px;">
                    ${serversHtml}
                </div>
            </div>
        `;
    });
});
