# Kursly PWA

Eine mobile-first Währungs-App auf Basis von `fawazahmed0/exchange-api`.

## Funktionen

- Fiat-Währungen, Kryptowährungen und Edelmetalle
- Aktuelle und historische Tageskurse
- jsDelivr als Hauptquelle plus Cloudflare-Fallback
- Offline-Nutzung mit zuletzt gespeicherten Kursen
- Installierbar auf Android, iOS und Desktop
- Schnellauswahl, Teilen und beliebte Kurse
- Deutsche Zahlen- und Datumsformatierung
- Kein API-Schlüssel und kein Backend nötig

## Lokal testen

Da die App komplett statisch ist, reicht ein einfacher lokaler Webserver:

```bash
python -m http.server 8080
```

Danach im Browser öffnen: `http://localhost:8080`

> Nicht per Doppelklick als `file://` öffnen, da Service Worker nur über HTTP/HTTPS funktionieren.

## Cloudflare Pages

Die App braucht keinen Build-Schritt.

### Direkter Upload

Den Inhalt dieses Ordners als ZIP in Cloudflare Pages hochladen.

### Git-Deployment

- Build command: leer lassen
- Build output directory: `/`

## Datenquelle und Hinweis

Kursdaten: `https://github.com/fawazahmed0/exchange-api`

Die Daten/API stehen laut Repository unter CC0 1.0. Die App zeigt Referenzkurse; Banken, Kartenanbieter, Börsen und Wechselstuben können eigene Kurse und Gebühren verwenden.
