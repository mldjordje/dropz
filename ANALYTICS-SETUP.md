# Vercel Analytics u admin panelu

Admin → **Analitika** prikazuje preglede, posetioce, najgledanije strane,
izvore, zemlje i uređaje iz Vercel Web Analytics API-ja.

## Vercel environment variables

| Promenljiva | Obavezna | Vrednost |
| --- | --- | --- |
| `WEB_ANALYTICS_TOKEN` | da | Vercel Access Token |
| `WEB_ANALYTICS_PROJECT_ID` | da* | Dropz Project ID (`prj_...`) |
| `WEB_ANALYTICS_TEAM_ID` | za team projekat | Dropz Team ID (`team_...`) |

*Na Vercelu kod koristi sistemski `VERCEL_PROJECT_ID` kao rezervnu vrednost,
ali je eksplicitna promenljiva korisna i za lokalni rad.

Sve promenljive su server-only. Ne koristiti `NEXT_PUBLIC_` prefiks.

1. U Vercelu uključi Web Analytics za Dropz projekat.
2. Napravi Access Token sa scope-om za team koji poseduje Dropz.
3. Dodaj promenljive za Production (i Preview ako je potrebno).
4. Uradi redeploy.

Ako panel vrati `403`, token obično nema odgovarajući team scope. `404` obično
znači da Project ID i Team ID ne pripadaju istom projektu/accountu.
