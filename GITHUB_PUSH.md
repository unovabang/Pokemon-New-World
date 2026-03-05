# Envoyer le projet sur GitHub

## 1. Créer un dépôt sur GitHub
- Allez sur https://github.com/new
- Nom du dépôt : par ex. `Pokemon-New-World-2.0`
- **Ne pas** cocher "Add a README file"
- Cliquez sur "Create repository"

## 2. Ajouter le remote GitHub (à faire une seule fois)
Remplacez `VOTRE_USERNAME` par votre nom d'utilisateur GitHub et `NOM_DU_REPO` par le nom du dépôt :

```powershell
cd "c:\Users\lamou\Documents\Pokemon New World 2.0"
git remote add origin https://github.com/VOTRE_USERNAME/NOM_DU_REPO.git
```

## 3. Commiter vos changements (optionnel)
Si vous voulez inclure les modifications actuelles :

```powershell
git add .
git commit -m "Mise à jour du projet"
```

## 4. Pousser sur GitHub
```powershell
git push -u origin main
```

Si votre branche s'appelle `master` au lieu de `main` :
```powershell
git push -u origin master
```

---

**Note :** La première fois, GitHub peut demander de vous connecter (navigateur ou token).
