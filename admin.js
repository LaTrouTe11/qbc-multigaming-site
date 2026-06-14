// CONFIGURATION DE LA MATRIX APIS GITHUB 2026
const ghConfig = {
    token: "ghp_VOTRE_TOKEN_ICI", // Remplacer par votre token personnel sécurisé
    owner: "VOTRE_PSEUDO_GITHUB", // Remplacer par votre nom d'utilisateur GitHub
    repo: "VOTRE_DEPOT_NETLIFY"   // Remplacer par le nom de votre dépôt GitHub
};

// Moteur de transmission asynchrone universel pour les 3 consoles admin
window.executeGitHubCommit = function(targetPath, jsonData, callback) {
    const url = `https://github.com{ghConfig.owner}/${ghConfig.repo}/contents/${targetPath}`;
    const headers = {
        "Authorization": `token ${ghConfig.token}`,
        "Accept": "application/vnd.github.v3+json"
    };

    // 1. Récupération du SHA (obligatoire pour modifier un fichier existant)
    fetch(url, { headers })
        .then(res => res.status === 404 ? null : res.json())
        .then(fileData => {
            const sha = fileData ? fileData.sha : null;
            
            // Préparation des données encodées en Base64 pour l'API GitHub
            const contentString = JSON.stringify(jsonData, null, 2);
            const contentBase64 = btoa(unescape(encodeURIComponent(contentString)));

            const bodyPayload = {
                message: `🤖 Matrix Auto-Update : Synchronisation du secteur [${targetPath}]`,
                content: contentBase64
            };
            if (sha) bodyPayload.sha = sha;

            // 2. Envoi de la mise à jour à GitHub
            return fetch(url, {
                method: "PUT",
                headers: headers,
                body: JSON.stringify(bodyPayload)
            });
        })
        .then(response => {
            if (response.ok) {
                const currentTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                callback(true, currentTime);
            } else {
                callback(false, null);
            }
        })
        .catch(err => {
            console.error("Erreur critique Matrix API :", err);
            callback(false, null);
        });
};
