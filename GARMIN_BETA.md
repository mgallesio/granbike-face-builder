# Pubblicazione Beta Garmin Connect IQ

La web app puo generare un pacchetto `-beta.iq` pronto per Garmin Connect IQ.

## Passi

1. Apri la web app.
2. Configura la watch face.
3. Premi `Scarica pacchetto beta Garmin (.iq)`.
4. Entra nella dashboard Garmin Developer.
5. Crea o apri l'app Connect IQ.
6. Carica il file `.iq` scaricato.
7. Seleziona la modalita beta, se disponibile nel tuo account.
8. Completa nome, descrizione, icona e screenshot.

## Note

- Garmin non offre un'API pubblica per pubblicare automaticamente sullo store.
- Il file `.iq` e diverso dal `.prg`: il `.prg` serve per installazione manuale, il `.iq` serve per Garmin Connect IQ Store.
- Se attivi il gadget `Altitudine`, il pacchetto richiede il permesso `SensorHistory`.
