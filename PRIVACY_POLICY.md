# Privacy Policy — ClickTuto

**Last updated:** 2025-05-29

## Overview

ClickTuto is a browser extension that helps users create step-by-step tutorials by recording clicks and capturing screenshots. This policy explains what data is collected, how it is used, and your rights as a user.

---

## What data ClickTuto collects

### Screenshots and page content

When you start a recording session and click on a page element, ClickTuto captures a screenshot of the visible area of the current tab. This screenshot is stored **locally on your device** using the browser's built-in `chrome.storage.local` API.

ClickTuto also stores, per tutorial step:

- The URL of the page at the time of the click
- The page title
- The CSS selector and text content of the clicked element (for metadata display only)

### Tutorial data

All tutorial content — titles, descriptions, step metadata, screenshots, and annotations — is stored exclusively in `chrome.storage.local` on your device.

---

## What ClickTuto does NOT collect

- ClickTuto does **not** transmit any data to any external server.
- ClickTuto does **not** collect personal information (name, email, account credentials, etc.).
- ClickTuto does **not** track your browsing history.
- ClickTuto does **not** use analytics, telemetry, or crash reporting services.
- ClickTuto does **not** use cookies or any cross-site tracking mechanism.
- ClickTuto does **not** share any data with third parties.

---

## Permissions and why they are needed

| Permission | Reason |
|---|---|
| `activeTab` | To capture a screenshot of the current tab when the user clicks during a recording session. Only triggered by explicit user action. |
| `tabs` | To open the tutorial editor in a new tab after recording stops, and to query the active tab's window ID for screenshot capture. |
| `storage` | To save tutorials, steps, screenshots, and settings locally on your device. |
| `scripting` | To temporarily hide the recording overlay before capturing a screenshot (so it doesn't appear in the saved image) and restore it immediately after. |
| `<all_urls>` (host permission) | To inject the recording overlay content script on any page the user chooses to record. No page data is collected beyond what the user explicitly records. |

---

## Data storage and retention

All data is stored locally in your browser's `chrome.storage.local`. It remains on your device until you:

- Delete individual tutorials from the ClickTuto tutorial list, or
- Uninstall the extension (which removes all associated storage automatically)

No data is backed up to any cloud service by ClickTuto.

---

## Exported files

When you export a tutorial (HTML, PDF, or Markdown ZIP), the resulting file is saved to your local machine via your browser's standard download mechanism. ClickTuto has no access to where the file is saved or what you do with it after export.

---

## Third-party libraries

ClickTuto bundles the following open-source libraries, all of which run entirely within the extension and make no external network requests:

- [Konva.js](https://konvajs.org/) — canvas rendering
- [jsPDF](https://github.com/parallax/jsPDF) — PDF generation
- [JSZip](https://stuk.github.io/jszip/) — ZIP file creation
- [React](https://react.dev/) — UI framework
- [@hello-pangea/dnd](https://github.com/hello-pangea/dnd) — drag-and-drop

---

## Children's privacy

ClickTuto does not knowingly collect any information from children under the age of 13. The extension does not target children and has no features designed for their use.

---

## Changes to this policy

If this policy is updated, the new version will be published in this repository with an updated **Last updated** date. Continued use of the extension after changes constitutes acceptance of the updated policy.

---

## Contact

If you have questions about this privacy policy, please open an issue on the [GitHub repository](https://github.com/vagkaefer/ClickTuto).
