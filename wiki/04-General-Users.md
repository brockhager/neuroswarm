# NeuroSwarm — For General Users

Welcome — this short page helps everyday users try NeuroSwarm (chat demos and quickstarts). It's intentionally non-technical. If you need developer-level API or SDK details, go to the technical guide: [03 — Consumer / API Guide](03-Consumer-API-Guide.md).

## Try a demo (quick)

- Hosted demo: If a public demo is available, open it from the project README (../README.md) or the project website.
- Quick local demo (1–2 minutes):
  1. From the repository root, run the demo app:

	  ```powershell
	  # start the web demo (shows example chatbot flows)
	  pnpm -C neuro-web dev
	  # open http://localhost:3000 (or the port shown by the command)
	  ```

  2. If you'd like to view the demo source file on GitHub: `../../neuro-web/pages/sdk-demo.tsx` (clickable from the repo view).

## What if you want to integrate / build

If you're building an integration (SDKs, OpenAPI, or client code) see the technical reference under: [03 — Consumer / API Guide](03-Consumer-API-Guide.md).

## Need help?

- Visit the project Discussions/Issues page for usage questions.
- Try the `neuro-web` demo or open an issue describing what you're trying to do.

_That's it — this page is intentionally short and friendly for everyday users._

## Download the latest build

- Want to run NeuroSwarm locally without building from source? Download a pre-built package from the project Releases page:

	- Latest releases & installers: https://github.com/brockhager/neuroswarm/releases/latest

	- Which file to pick: choose the installer or zip that matches your operating system (Windows, macOS, or Linux) and CPU architecture (x64/arm). Most users on modern desktops pick the `win-x64`, `macos-x64`, or `linux-x64` artifacts.

	- Opening the link: clicking the link above should open the Releases page in your browser. If it doesn't, copy the URL into your browser's address bar and press Enter to view available downloads.

	- Tip: if you want local dev instead of a pre-built package, see the Quick local demo earlier on this page.
