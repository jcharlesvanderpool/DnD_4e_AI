# Xenoth 4e Compendium Prototype

A responsive, local-first web compendium and character sheet for the Xenoth-edits D&D 4e database.

## Prototype features

- Opens the Xenoth-edits ZIP directly in the browser; the rules database is not uploaded to the site.
- Indexes all `_index.js` category files and searches across the full compendium.
- Category filtering and ranked search results.
- Lazy loading of full HTML entries from the ZIP.
- Responsive desktop/mobile interface.
- Character identity, combat statistics, abilities, skills, and notes.
- Add compendium powers, feats, items, classes, races, and other records to a character.
- Used/reset tracking and short/extended rest controls.
- Multiple characters saved locally in the browser.
- Character JSON import/export for Google Drive, desktop, or phone transfer.
- Expanded print/PDF character output.
- Basic offline app-shell caching.

## Run locally

Because browsers restrict local file access, serve the repository rather than double-clicking `index.html`.

### VS Code

Install the **Live Server** extension, open this repository, then choose **Open with Live Server** on `index.html`.

### Python

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Use

1. Open the site.
2. Select **Load ZIP**.
3. Choose `iws-mx-dnd-xenoth-edits1 (1).zip`.
4. Search the compendium.
5. Use the `+` control or **Add to character** to attach entries.
6. Save locally or export the character as JSON.
7. Use **Print / PDF** for an expanded sheet.

## GitHub Pages

GitHub Pages can host the app shell, but the Xenoth ZIP remains on each user's device. In repository settings, choose **Pages**, deploy from the `main` branch and `/ (root)`, then open the generated Pages URL.

## Current prototype limitations

- Search indexing is performed each time the ZIP is loaded.
- Full entry retrieval scans a category's data batches on first open, then caches the result for the session.
- Character calculations are manually entered; this is a character sheet, not yet a rules-validating builder.
- App icons have not yet been added.
