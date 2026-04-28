# Granbike Face Builder

Generatore web di watch face Garmin Connect IQ parametrizzate.

## Stack
- **Frontend**: React + Vite — form di configurazione + preview live in canvas
- **Backend**: Node.js + Express — templating (mustache) + compilazione via monkeyc
- **Compilatore**: Java 25 + Garmin Connect IQ SDK (già installati sulla tua macchina)

## Requisiti server
- Node.js 20+ (`node --version`)
- JDK 25 (già installato: `C:\Program Files\Eclipse Adoptium\jdk-25.0.2.10-hotspot`)
- Connect IQ SDK (già installato: `C:\Users\Gallico\AppData\Roaming\Garmin\ConnectIQ\Sdks\connectiq-sdk-win-9.1.0-2026-03-09-6a872a80b`)
- Developer key (già esiste: `C:\Users\Gallico\developer_key.der`)

## Setup

### Backend
```bash
cd backend
npm install
cp .env.example .env     # modifica i path se serve
# copia la developer key:
cp C:/Users/Gallico/developer_key.der keys/developer_key.der
npm start                # porta 3000
```

### Frontend (dev)
```bash
cd frontend
npm install
npm run dev              # porta 5173, proxy a 3000
```

Apri `http://localhost:5173`.

### Frontend (produzione)
```bash
cd frontend
npm run build            # genera dist/
```
Il backend serve `frontend/dist/` come statico su `/`.

## Flusso
1. Utente riempie form → preview canvas aggiornato in tempo reale
2. Click "Genera" → POST `/api/build` con JSON + eventuale foto
3. Backend:
   - Copia `templates/` in `tmp/build-<uuid>/`
   - Sostituisce placeholder Mustache (`{{ACCENT_COLOR}}`, `{{#SHOW_HR}}`, ecc.)
   - Processa foto (sharp → 260×260 PNG palette)
   - Invoca `monkeyc` via `java -jar monkeybrains.jar`
   - Restituisce `.prg` al browser
4. Utente copia il `.prg` in `GARMIN/APPS/` dell'orologio

## Deploy Windows
- Service con [nssm](https://nssm.cc/): `nssm install GranbikeFaceBuilder "node" "C:\Users\Gallico\COWORK\GranbikeFaceBuilder\backend\server.js"`
- Reverse proxy IIS con URL Rewrite + ARR verso `localhost:3000`
- HTTPS con [win-acme](https://www.win-acme.com/) (Let's Encrypt)
