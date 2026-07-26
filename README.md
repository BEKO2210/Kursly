# Kursly

Kursly ist eine installierbare Progressive Web App für einen schnellen Währungsrechner (Fiat, Kryptowährungen, Edelmetalle). Der App-Code liegt in [`kursly-pwa/`](./kursly-pwa).

## Live-Version

Nach dem Merge nach `main` deployt der Workflow [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml) die App automatisch auf GitHub Pages:

`https://beko2210.github.io/Kursly/`

> Damit das funktioniert, muss unter **Settings → Pages → Source** einmalig "GitHub Actions" ausgewählt sein.

## Lokal testen

```bash
cd kursly-pwa
python -m http.server 8080
```

Danach im Browser öffnen: `http://localhost:8080`

Weitere Details siehe [`kursly-pwa/README.md`](./kursly-pwa/README.md).
