# Privacy policy update — data deletion procedure

Google Play rejected the app (22 June) because the privacy policy does **not**
explain how users can request deletion of their data. Google's requirement: add
clear instructions for requesting data deletion, *or* state that no such
procedure exists.

The current policy lives in **two places that must be kept in sync**:

- `johannesjo/minded-support` → file `privacy-policy-android`
  (raw: <https://raw.githubusercontent.com/johannesjo/minded-support/main/privacy-policy-android>)
- The website page at <https://minded.today/privacy/> (source in
  `johannesjo/minded-landing-page`)

Whichever URL is registered under **App content → Privacy policy** in the Play
Console is the one Google checks, but update both so they don't contradict.

This session is scoped to `johannesjo/minded` only, so the text below is provided
ready to paste into those repos.

---

## Why the fix is simple

minded stores **all** user data locally — `chrome.storage` in the extension,
app storage on Android. There is no backend, no telemetry, no analytics, and no
network transmission of user data (the only `fetch` in the code loads a local
audio file). We operate no servers, so there is no account and no server-side
copy to delete. The honest, compliant deletion procedure is therefore
self-service: uninstall / clear local storage, plus a contact address for
questions.

While editing, also fix the stale support email: the current policy says
`contact@super-productivity.com` (a leftover from another project). It should be
`contact@minded.today`.

---

## 1. New section to add (English) — paste after the "Key Points" section

> ### Data Retention and Deletion
>
> minded stores all of your data locally on your device. We do not operate any
> servers, and we never collect, transmit, or store your data — so there is no
> account to close and no copy of your data held by us.
>
> Because your data lives only on your device, you are always in full control of
> it and can delete it at any time:
>
> - **Android:** Uninstall the app to remove all of its data, or go to
>   **Settings → Apps → minded → Storage → Clear storage** to erase your data
>   while keeping the app installed.
> - **Browser extension (Chrome, Edge, Brave, Firefox):** Remove the extension
>   from your browser (right-click the minded icon → **Remove**, or open your
>   browser's extensions page and remove minded). This deletes all data the
>   extension has stored, including data synced through your browser account.
>
> If you have any questions about deleting your data, contact us at
> contact@minded.today.

---

## 2. New section to add (German) — falls die Erklärung auf Deutsch vorliegt

> ### Aufbewahrung und Löschung von Daten
>
> minded speichert alle deine Daten lokal auf deinem Gerät. Wir betreiben keine
> Server und erfassen, übertragen oder speichern deine Daten zu keinem Zeitpunkt
> – es gibt also kein Konto, das geschlossen werden müsste, und keine Kopie
> deiner Daten bei uns.
>
> Da deine Daten ausschließlich auf deinem Gerät liegen, hast du jederzeit die
> volle Kontrolle darüber und kannst sie jederzeit löschen:
>
> - **Android:** Deinstalliere die App, um alle ihre Daten zu entfernen, oder
>   gehe zu **Einstellungen → Apps → minded → Speicher → Speicher löschen**, um
>   deine Daten zu löschen, ohne die App zu deinstallieren.
> - **Browser-Erweiterung (Chrome, Edge, Brave, Firefox):** Entferne die
>   Erweiterung aus deinem Browser (Rechtsklick auf das minded-Symbol →
>   **Entfernen**, oder öffne die Erweiterungsseite deines Browsers und entferne
>   minded). Damit werden alle von der Erweiterung gespeicherten Daten gelöscht,
>   einschließlich der über dein Browser-Konto synchronisierten Daten.
>
> Bei Fragen zur Löschung deiner Daten kontaktiere uns unter
> contact@minded.today.

---

## 3. Full revised policy (English) — drop-in replacement for `privacy-policy-android`

This is the existing policy with (a) the new **Data Retention and Deletion**
section and (b) the corrected support email.

```markdown
# Privacy Policy

Johannes Millan provides this app at no cost for use as-is. This privacy policy
explains data collection, use, and disclosure practices.

## Key Points

All data related to the use of this app is stored locally on your device and is
not collected by us in any way. The app does not employ third-party services for
identification purposes. External links may appear in the service, but Johannes
Millan accepts no responsibility for their content or policies.

## Data Retention and Deletion

minded stores all of your data locally on your device. We do not operate any
servers, and we never collect, transmit, or store your data — so there is no
account to close and no copy of your data held by us.

Because your data lives only on your device, you are always in full control of
it and can delete it at any time:

- **Android:** Uninstall the app to remove all of its data, or go to
  **Settings → Apps → minded → Storage → Clear storage** to erase your data
  while keeping the app installed.
- **Browser extension (Chrome, Edge, Brave, Firefox):** Remove the extension
  from your browser (right-click the minded icon → **Remove**, or open your
  browser's extensions page and remove minded). This deletes all data the
  extension has stored, including data synced through your browser account.

If you have any questions about deleting your data, contact us at
contact@minded.today.

## Policy Updates

The developer may revise this policy periodically, with changes taking effect
immediately upon posting.

## Service Disclaimers

The application operates on an "AS IS" and "AS AVAILABLE" basis. The developer
provides no warranties regarding uninterrupted operation, error correction,
absence of viruses, or fitness for particular purposes.

## User Agreement

Using the service constitutes acceptance of these terms.

## Support

Questions about this privacy policy can be directed to contact@minded.today.
```

---

## Steps to clear the rejection

1. Update the policy text in `johannesjo/minded-support` (`privacy-policy-android`)
   and on the website (`johannesjo/minded-landing-page`, `/privacy/`).
2. In the Play Console: **App content → Privacy policy**, confirm the URL points
   to the updated page, and **Save**.
3. Submit the change for review via **Publishing overview**.
4. Review takes ~5–8 days (or file an appeal / Einspruch if needed).
