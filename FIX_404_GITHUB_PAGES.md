# Fix rapido errore 404 su GitHub Pages

1. Vai in **Settings → Pages**.
2. Imposta **Source = Deploy from a branch**.
3. Scegli **Branch = main** e **Folder = /docs**.
4. Salva e attendi deploy verde in **Actions**.
5. Apri il sito e fai hard refresh (Ctrl+F5).

Se usi dominio personalizzato o non vuoi backend remoto, il frontend è già impostato con `FORCE_LOCAL_DB: true`.
