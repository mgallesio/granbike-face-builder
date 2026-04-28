# Deploy su Render

Questa configurazione pubblica la web app su Render Free usando Docker.

## Soluzione consigliata

Per far vedere il configuratore gratuitamente usa **Render Free Web Service con Docker**.

La demo gratuita mostra:

- configuratore completo;
- anteprima live;
- download PNG della face;
- logo squadra dinamico;
- layout dinamico.

La generazione `.prg` funziona solo se aggiungi anche SDK Garmin e developer key come variabili private.

## Demo visuale gratis

Funziona subito:

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
- Il filesystem Render Free e temporaneo: va bene per questa app, perche i `.prg` vengono creati e scaricati al volo.
- Il deploy usa `Dockerfile`, Node.js 24 e Java.
