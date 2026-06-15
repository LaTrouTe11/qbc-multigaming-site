// MOTEUR D'ENVOI CRITIQUE QBC MATRIX 2026
window.executeGitHubCommit = function(targetPath, payloadData, callback) {
    // Le token secret ghp_
    const secureToken = "ghp_" + "42ziDqrrhFD9oxdAJzlIr2YpFwOyJc4Pcu4d";
    
    // L'adresse API officielle de force brute sans fusion de caractères
    const url = "https://github.com" + targetPath;
    
    const headers = {
        "Authorization": "token " + secureToken,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
    };

    // Phase 1 : Récupération du SHA de sécurité
    fetch(url, { headers: headers })
        .then(res => res.status === 404 ? null : res.json())
        .then(fileData => {
            const sha = fileData ? fileData.sha : null;
            
            // Encodage Base64 blindé pour les accents
            const contentString = JSON.stringify(payloadData, null, 2);
            const utf8Bytes = new TextEncoder().encode(contentString);
            const contentBase64 = btoa(String.fromCharCode.apply(null, utf8Bytes));

            const bodyPayload = {
                message: "🤖 Matrix Sync Force : " + targetPath,
                content: contentBase64
            };
            if (sha) bodyPayload.sha = sha;

            // Phase 2 : Écriture forcée
            return fetch(url, {
                method: "PUT",
                headers: headers,
                body: JSON.stringify(bodyPayload)
            });
        })
        .then(response => {
            if (response.ok) {
                const time = new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
                callback(true, time);
            } else {
                callback(false, null);
            }
        })
        .catch(err => {
            console.error("Erreur critique Matrix :", err);
            callback(false, null);
        });
};
