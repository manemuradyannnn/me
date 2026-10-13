# Cindy Ly

Editable base of [cindyly.design](https://www.cindyly.design/). Content and visual tokens live in source files so the design can change without scraping the live site again.

## Edit

- Copy, links, and project cards: `src/data/site.ts`
- Quest window text: `src/data/quests.json`
- Quest tiles: `questTiles` in `src/data/site.ts` and `src/components/Quests.astro`
- Colors and type: `src/styles/tokens.css`
- Homepage layout: `src/styles/home.css` and `src/components/`
- Case studies: `src/case-html/*.html` with styles in `src/styles/cases/`

## Run

```bash
npm install
npm run dev
```

The homepage keeps the welcome line, works, profile, and quests. The 3D Tamagotchi is not on the home page.
