# Briis

Briis er en vin-app til smagsnoter, rating og kælderoversigt.

Første version indeholder:

- kælderoversigt med antal flasker
- manuel oprettelse af vin
- smagsnoter med klikbare noter og egne noter
- næse, smag, farve, syre, tannin og struktur
- blindgæt på årgang, drue, område, kommune og producent
- rating på 1-100 point
- redigering af smagninger
- sletning af vine og smagninger
- sprogvalg mellem engelsk og dansk
- kladdevenlig smagning hvor rating og facit kan stå tomt
- filtrering og sortering af kælder på årgang, område, drue og producent
- automatisk nedskrivning af kælder ved egen flaske eller Coravin
- manuel registrering af ekstern rating

## Lokal kørsel

Installer pakker:

```bash
pnpm install
```

Start appen:

```bash
pnpm dev
```

## Supabase

Databasen er ikke koblet på appen endnu. Første SQL-udkast ligger i:

```text
supabase/schema.sql
```

Næste store tekniske trin er Supabase Auth, så appen kan deles med andre.
Planen er ikke én separat database per bruger, men én fælles database hvor hver vin og
smagning får et `user_id`. Supabase Row Level Security skal derefter sikre, at brugere
kun kan se og ændre deres egne data.
