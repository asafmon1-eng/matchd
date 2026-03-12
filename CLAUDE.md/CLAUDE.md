Project: MATCHD

Tech stack:
React + Vite + Google Maps + Vercel

General rules:

* Always edit files directly in the project structure.
* Do not output partial code snippets — return full updated files.
* Never modify the `.env` file.
* Never hardcode API keys or secrets.
* Assume the Google Maps API key is loaded from `VITE_GMAPS_API_KEY`.

Development workflow:

* Prefer minimal safe edits.
* Preserve the current UI and structure unless necessary.
* Keep compatibility with Vite and Vercel deployment.
* Ensure Google Maps loads safely before accessing `google.maps`.
* Prevent runtime crashes if the visualization library is unavailable.

After each change:

1. List the files you modified.
2. Explain briefly what changed.
3. Ensure the app still runs with `npm run dev`.

Goal of the project:
Build MATCHD as a live sports activity map where users can see real activity hotspots by sport and location.

