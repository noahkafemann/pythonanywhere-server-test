# Notizen-Website (GitHub Pages + PythonAnywhere API)

Statische, responsive Website (HTML/CSS/JS) ohne Build-Schritt, veröffentlicht über GitHub Pages. Das Backend läuft unter `https://nkwinner.pythonanywhere.com` und wird **nicht** von diesem Repository verwaltet.

## Projektstruktur

```
/workspace/app
├── index.html          # Einzelseite (Auth + Dashboard)
├── css/
│   └── style.css       # Responsives, modernes Design
├── js/
│   └── app.js          # Auth, Notizen-CRUD, API-Kommunikation
└── README.md           # Diese Datei
```

Alle Dateien unter `/workspace/app` (außer `.git`) gehören ins GitHub-Repository.

## Funktionen

- Registrierung & Login (`POST /api/register`, `POST /api/login`)
- Token im `sessionStorage` (kein Token/Passwort in URL, Logs oder öffentlichen Dateien)
- Geschützte Anfragen mit `Authorization: Bearer TOKEN`
- `/api/me` lädt den eingeloggten Benutzer (E-Mail im Dashboard anzeigen)
- `POST /api/logout` widerruft die Sitzung, lokaler Token wird entfernt
- `401` wird als abgelaufene/ungültige Anmeldung behandelt → Weiterleitung zum Login
- Notizen laden (`GET /api/notes`), erstellen (`POST /api/notes`, `{ "content": "..." }`), löschen (`DELETE /api/notes/{id}`)
- Lade- und Fehlerzustände, Eingabevalidierung, leere Einträge werden verhindert
- Nutzereingaben werden mit `textContent` (nicht `innerHTML`) gerendert
- Keine API-Geheimnisse, keine fest eingebauten Testkonten im Frontend
- Alle API-Anfragen über HTTPS

## GitHub Pages aktivieren

1. Neues öffentliches GitHub-Repository erstellen.
2. Dateien `index.html`, `css/style.css`, `js/app.js`, `README.md` ins Repository hochladen (Hauptbranch, z. B. `main`).
3. Im Repository auf **Settings → Pages** gehen.
4. Unter "Build and deployment" als Source den Branch auswählen (z. B. `main`, Ordner `/root`).
5. Speichern. Die Seite ist danach unter `https://<user>.github.io/<repo>/` erreichbar.

Kein Build-Schritt erforderlich — die Seite ist rein statisch.

## Wichtige Hinweise (aus tatsächlichen API-Tests)

Die Authentifizierungs-Endpunkte wurden gegen die Live-API getestet und funktionieren wie spezifiziert:

- `POST /api/register` → 201 mit `token`, `token_type`, `expires_in`, `user`
- `POST /api/login` → 200 mit Token
- `GET /api/me` → 200 mit Benutzerdaten
- `POST /api/logout` → 200, danach liefern geschützte Endpunkte 401
- Falsches Passwort → 401
- Ungültiger Token → 401
- Doppelte Registrierung → 409

**Notizen:** `GET /api/notes` funktioniert (gibt leere Liste zurück). `POST /api/notes` mit `{"content":"..."}` wurde von der Live-API konsistent mit `400 {"error":"content muss Text sein."}` abgelehnt – unabhängig vom Payload-Format. Das ist ein Backend-Problem, das nicht im Frontend behoben werden kann (keine Backend-Änderungen im Auftrag). `DELETE /api/notes/{id}` konnte deshalb nicht mit existierendem Eintrag getestet werden.

**CORS:** Die API sendet keine `Access-Control-Allow-Origin`-Header. Bei Aufrufen von GitHub Pages (andere Origin) kann der Browser CORS-Fehler melden. Das Frontend fängt Netzwerk-/CORS-Fehler ab und zeigt eine verständliche Meldung an. Eine funktionsfähige Cross-Origin-Nutzung erfordert CORS-Konfiguration auf der API-Seite (Backend-Verantwortung).

## Sicherheit

- Token nur in `sessionStorage`, nie in URL oder Logs
- Passwörter/Tokens werden nie protokolliert oder in Fehlermeldungen ausgegeben
- Keine fest eingebauten Zugangsdaten
- Alle API-Aufrufe über HTTPS
