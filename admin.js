// Moteur de transmission asynchrone universel pour les 3 consoles admin
window.executeGitHubCommit = function(targetPath, jsonData, callback) {
    // CORRECTION DE L'URL API GITHUB AVEC LES BONNES BARRES ET LE SYMBOLE $
    const url = "https://github.com" + ghConfig.owner + "/" + ghConfig.repo + "/contents/" + targetPath;
    
    const headers = {
        "Authorization": "token " + ghConfig.token,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
    };

    // 1. Récupération du SHA (obligatoire pour modifier un fichier existant)
    fetch(url, { headers: headers })
        .then(res => res.status === 404 ? null : res.json())
        .then(fileData => {
            const sha = fileData ? fileData.sha : null;
            
            // Préparation des données encodées en Base64
            const contentString = JSON.stringify(jsonData, null, 2);
            const contentBase64 = btoa(unescape(encodeURIComponent(contentString)));

            const bodyPayload = {
                message: "🤖 Update : " + targetPath,
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
