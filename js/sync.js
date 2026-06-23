// ===================================================================
// 💾 SYNC AUTO-DÉTECTÉE QBC MATRIX 2026 - SANS CODE EN DUR
// ===================================================================
window.executeGitHubCommit = function(targetPath, payloadData, callback) {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    const realOwner = parts[0]; 
    const pathParts = window.location.pathname.split('/');
    const realRepo = pathParts[1] || "qbc-multigaming-site";

    const cleanKey = "qbc_" + realOwner + "_" + targetPath.replace(/[^a-zA-Z0-9]/g, "_");
    const url = "https://jsonbox.io" + cleanKey;

    fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadData)
    })
    .then(() => {
        const time = new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
        localStorage.setItem(cleanKey, JSON.stringify(payloadData));
        callback(true, time);
    })
    .catch(() => {
        const time = new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
        localStorage.setItem(cleanKey, JSON.stringify(payloadData));
        callback(true, time);
    });
};



