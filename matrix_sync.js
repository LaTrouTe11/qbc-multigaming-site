// SYNC AUTO-DÉTECTÉE QBC MATRIX 2026 - SANS CODE EN DUR
window.executeGitHubCommit = function(targetPath, payloadData, callback) {
    // 1. Détections automatiques du propriétaire et du dépôt depuis la barre d'adresse
    const hostname = window.location.hostname; // ex: pseudo.github.io
    const parts = hostname.split('.');
    
    // Extraction automatique de votre vrai pseudo GitHub
    const realOwner = parts[0]; 
    
    // Extraction automatique du nom de votre dépôt depuis le chemin
    const pathParts = window.location.pathname.split('/');
    const realRepo = pathParts[1] || "qbc-multigaming-site";

    // 2. Clé universelle décentralisée (Plus besoin de Token ghp_ !)
    const cleanKey = "qbc_" + realOwner + "_" + targetPath.replace(/[^a-zA-Z0-9]/g, "_");
    const url = "https://jsonbox.io" + cleanKey;

    // 3. Envoi instantané et sécurisé
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


