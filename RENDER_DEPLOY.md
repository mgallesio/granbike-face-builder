# Deploy su Render

Questa configurazione pubblica la web app su Render usando Docker.

## Soluzione consigliata

Per far vedere il configuratore con dati salvati usa **Render Web Service con Docker e Disk persistente**.

L'app mostra:

- configuratore completo;
- anteprima live;
- download PNG della face;
- logo squadra dinamico;
- layout dinamico.

La generazione `.prg` funziona solo se aggiungi anche SDK Garmin e developer key come variabili private.

## Dati persistenti

Squadre, loghi e default vengono salvati nel filesystem del server. Su Render il filesystem normale viene perso a ogni deploy/riavvio, quindi `render.yaml` monta un disco persistente:

- `TEAM_DATA_DIR=/var/data`
- disk `team-data`
- mount path `/var/data`
- size `1 GB`

Con questa configurazione i file finiscono in `/var/data/data` e restano anche dopo i deploy.

Nota: i dischi persistenti non sono disponibili sul piano Free. Il servizio usa `plan: starter`.

## Deploy

1. Crea una repo GitHub con questa cartella.
2. Fai push della repo.
3. Su Render scegli **New +** > **Blueprint**.
4. Collega la repo.
5. Render legge `render.yaml` e crea il servizio `granbike-face-builder`.

La demo mostra la web app, la preview, il download PNG e tutti i controlli. Se SDK/key non sono configurati, il pulsante PRG resta disattivato con messaggio chiaro.

## Generazione PRG su Render

Per compilare davvero i `.prg` anche su Render servono anche Garmin SDK e developer key.

Imposta queste variabili ambiente nel servizio Render:

- `CONNECTIQ_SDK_ZIP_URL`: URL privato a uno zip del Connect IQ SDK.
- `DEVELOPER_KEY_DER_BASE64`: contenuto base64 di `developer_key.der`.

Lo start script scarica lo zip, trova `bin/monkeybrains.jar`, scrive la key in `/tmp` e abilita il backend.

Su Windows puoi creare il base64 della key con:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\Gallico\COWORK\GranbikeFaceBuilder\backend\keys\developer_key.der"))
```

## Note

- Render Free va in sleep dopo inattivita, quindi il primo accesso puo essere lento.
- Senza disco persistente, squadre e loghi caricati vengono persi al deploy.
- Il deploy usa `Dockerfile`, Node.js 24 e Java.
