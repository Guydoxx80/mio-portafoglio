# Mio Portafoglio

Web app locale per portfolio, trading journal, analisi visuale, trade aperti, storico e osservazione.

## Come aprire l'app

### Metodo semplice

1. Esegui una volta:

   ```bash
   npm install
   npm run build
   ```

2. Apri la cartella `dist`.
3. Torna nella cartella principale del progetto.
4. Fai doppio click su `Apri App.html`.

La build è single-file: CSS e JavaScript vengono inseriti dentro `Apri App.html`, quindi l'app è pensata per aprirsi direttamente dal browser.

Se il browser o il computer blocca l'apertura diretta del file, nella cartella `dist` puoi usare:

- Windows: doppio click su `start-windows.bat`
- macOS: doppio click su `start-mac.command`

Questi file avviano un piccolo server locale e aprono automaticamente il browser.

### Metodo sviluppatore

```bash
npm install
npm run dev
```

Poi apri l'indirizzo mostrato dal terminale.

## Comandi utili

```bash
npm run build
npm run build:single
npm run preview
```

## Dati e privacy

- L'app continua a funzionare offline/local-first.
- Se non fai login, i trade vengono salvati solo nel `localStorage` del browser.
- Se configuri Supabase e fai login, trade e storico open/close vengono sincronizzati nel cloud.
- La chiave Supabase usata nel browser deve essere solo `publishable` o `anon`, mai `service_role` o secret key.
- Le API esterne per settore o prezzi restano opzionali e collegabili nei file `src/lib/sectorDetection.ts` e `src/lib/marketData.ts`.

## Modalita cloud con Supabase

1. Apri Supabase.
2. Vai in `SQL Editor`.
3. Crea una nuova query.
4. Copia e lancia il contenuto di `supabase-schema.sql`.
5. Crea un file `.env.local` partendo da `.env.example`:

   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
   ```

6. Avvia o ricompila l'app:

   ```bash
   npm run dev
   npm run build
   ```

Al login, l'app unisce i dati locali con quelli cloud e poi salva automaticamente su Supabase.

## Pubblicazione su Vercel

1. Crea un nuovo progetto su Vercel.
2. Collega questa cartella/progetto.
3. Imposta:

   ```bash
   Build Command: npm run build
   Output Directory: dist
   ```

4. In `Settings` -> `Environment Variables`, aggiungi:

   ```bash
   VITE_SUPABASE_URL
   VITE_SUPABASE_PUBLISHABLE_KEY
   ```

5. Fai `Deploy`.


Deploy update
