@echo off
title Generation et Envoi de la Carte Doriath

:: 1. Générer la carte Doriath (Correction de l'argument properties)
echo [1/2] Generation de la carte Google Maps (Doriath)...
cd /d "C:\WurmMapGenTool"
java -jar WurmMapGen.jar --properties config_doriath.properties

:: 2. Envoyer la mise à jour sur GitHub
echo [2/2] Envoi de l'update sur GitHub...
cd /d "C:\WurmMap"
git add .
git commit -m "Mise a jour automatique du monde Doriath-4k-20 : %date% %time%"
git push origin master:gh-pages --force

echo ===================================================
echo     La carte de Doriath a ete mise a jour !
echo ===================================================


