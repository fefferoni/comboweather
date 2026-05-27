---
title: Privacy policy
permalink: /privacy/
---

# ComboWeather privacy policy

**Effective date:** 2026-05-25

ComboWeather is a weather app that combines forecasts from SMHI (Sweden), MET Norway, and DMI (Denmark) into a single consensus view. This policy explains what data the app handles, how it is used, and which third parties receive it.

The short version: no accounts, no advertising, no tracking SDKs, no profile of you. The app sends approximate coordinates to a backend that fetches forecasts on your behalf, and you can search for places by name. That is the entire data flow.

---

## What is collected

### Location coordinates
When you grant location permission, the app reads your device's GPS coordinates and sends them to the ComboWeather backend to fetch a forecast. **Coordinates are rounded to two decimal places (~1.1 km) before any storage**, so the cache key for your location is the same as for anyone in the same ~1 km grid square. We do not store your precise position.

You can use the app without granting location permission — pick a place via search instead.

### Search queries
When you search for a place by name (for example, "Stockholm"), the query is sent to the backend, which forwards it to OpenStreetMap's Nominatim geocoding service to look up coordinates. The backend caches search results for 7 days, keyed by a SHA-256 hash of the query, so identical searches don't repeatedly hit Nominatim.

### Favorites and preferences
Places you save as favorites, your theme/language/wind-unit settings, and your selected active location are stored **on your device only**, using the operating system's standard app storage. They are never transmitted to the backend or any third party. Deleting the app removes all of this data.

### Error reports (optional)
The app contains a hook for Sentry crash and error reporting. **It is currently disabled** in the public build — no error data is transmitted. If error reporting is enabled in a future release, this policy will be updated to describe what is captured.

---

## What is **not** collected

- Names, email addresses, or any account information
- Device identifiers (IDFA, advertising ID, etc.)
- Contacts, photos, microphone, camera, calendar, or any other on-device data
- App usage analytics (no Firebase Analytics, no Google Analytics, no PostHog, no Mixpanel, etc.)
- Cross-app or cross-site tracking of any kind

The app makes no in-app purchases and contains no advertising.

---

## Who receives data

| Recipient | What they receive | Purpose |
|---|---|---|
| ComboWeather backend (AWS, eu-north-1, Stockholm) | Rounded coordinates; search queries | Forecast lookup and caching |
| **SMHI** (smhi.se) | Rounded coordinates | Sweden forecast |
| **MET Norway** (met.no) | Rounded coordinates | Norway forecast |
| **DMI** (dmi.dk) | Rounded coordinates | Denmark forecast |
| **OpenStreetMap Nominatim** (osm.org) | Search query string | Place lookup |

The forecast providers and Nominatim do not receive any identifier that links a request to a specific device or user. Requests are stateless coordinate or query lookups.

The backend is hosted on Amazon Web Services in the EU North (Stockholm) region. AWS acts as a sub-processor and may have access to infrastructure logs that include source IP addresses; these are governed by [AWS's privacy notice](https://aws.amazon.com/privacy/).

---

## How long data is kept

- **Forecasts** are cached on the backend for up to 24 hours per coordinate, then garbage-collected. They contain no user-identifying information.
- **Search results** are cached on the backend for 7 days, keyed by a hash of the query. They contain no user-identifying information.
- **Favorites and preferences** are kept on your device until you remove them or delete the app.
- **Server access logs** kept by AWS are retained per AWS's defaults.

---

## Your rights

Because the backend stores no user-keyed records, there is nothing tied to you that we can look up or delete on request. To erase the data the app has stored on your device, uninstall the app.

If you have a question or believe the app is handling data incorrectly, please open an issue at [github.com/fefferoni/comboweather/issues](https://github.com/fefferoni/comboweather/issues).

---

## Children

The app does not knowingly collect any personal information from children. It is rated for ages 4+ on the App Store and PEGI 3 on the Play Store.

---

## Changes to this policy

If this policy changes, the effective date above will be updated and the change will be visible in the app's About screen, which links here. Material changes will also be summarized in the app's release notes on GitHub.

---

## Contact

- Issues and questions: [github.com/fefferoni/comboweather/issues](https://github.com/fefferoni/comboweather/issues)
