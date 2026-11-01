# Marginalia UI redesign v3

## Direction

The v3 concept moves Marginalia from a generic warm reading-app aesthetic to an
"editorial research desk / loose-leaf marginal notes" system. The interface is
quiet and dense; the memorable element is the spatial link between a passage
and its note in the margin.

### Core tokens

- Cool paper: `#F5F6F4`
- White: `#FFFFFF`
- Ink navy: `#14213D`
- Cobalt interaction: `#2F5BFF`
- Annotation yellow: `#F4E66A`
- Proofreader coral: `#E85D4A`
- Graphite: `#667085`
- Radius: `2px`, `4px`, `6px` only
- Borders: mostly `1px`; use shadow only for transient overlays

### Typography

- UI: a compact Chinese grotesk/sans family with clear numerals
- Reading content: a restrained modern Chinese serif
- Keep body lines near 36 Chinese characters; avoid decorative labels and
  oversized headings outside the article title.

## Prototype screens

- `04-library-editorial-v3.png`: two-column editorial feed with an expanded
  annotation preview
- `05-reader-marginalia-v3.png`: reading canvas with passage-to-margin note
  connectors

Both screens were generated with the built-in ImageGen tool from the existing
v2 prototype screens as product-structure references. The prompt direction was:

> Redesign the current Marginalia React/Electron screen as a high-fidelity
> desktop app in an editorial research-desk style. Preserve real Chinese
> content and functionality. Use cool paper, ink navy, cobalt, annotation
> yellow, and proofreader coral. Avoid gradients, glassmorphism, large rounded
> cards, decorative blobs, sage green, and terracotta. Make connected
> marginalia the signature interaction.

## Motion specification

| Interaction | Motion | Timing |
| --- | --- | --- |
| Open an article | Shared thumbnail/title transition into the reader | 260–320 ms spring |
| Expand a library item | FLIP layout; neighboring rows yield space | 220–280 ms spring |
| Create a highlight | Highlight wipes with selection direction | 140–180 ms ease-out |
| Attach a note | Connector draws, then note unfolds from its anchor | 180 ms + 220 ms spring |
| Open/close margin | Article measure shifts while panel clips in | 240–300 ms spring |
| Filter or sort | Existing rows move to new positions; no full fade | 180–240 ms |
| Save feedback | Bookmark mark compresses once; toast rises 8 px | 160–220 ms |

Use one orchestrated transition per action. Avoid perpetual motion, staggered
card entrances, and hover movement on every surface. Respect
`prefers-reduced-motion` and preserve every state change without animation.

## Open-source references

- [Karakeep](https://github.com/karakeep-app/karakeep): reference for dense
  bookmark-library organization and search; AGPL-3.0, so treat it as product
  research unless that license fits the project.
- [Omnivore](https://github.com/omnivore-app/omnivore): reference for reading,
  highlighting, and note workflows; AGPL-3.0.
- [Readest](https://github.com/readest/readest): reference for calm desktop
  reader chrome and cross-platform reading; AGPL-3.0.
- [Motion](https://github.com/motiondivision/motion): recommended for shared
  layout, springs, and the passage-to-note connector; MIT.
- [AutoAnimate](https://github.com/formkit/auto-animate): smaller alternative
  for filters, sorting, and simple list reflow; MIT.
- [Sonner](https://github.com/emilkowalski/sonner): optional reference for
  accessible, restrained save/error feedback; MIT.

## Implementation order

1. Replace visual tokens and convert the library grid into the editorial list.
2. Build the expanded annotation preview as a real list state.
3. Add the reader's anchored note model and connector geometry.
4. Add Motion only for shared layout and anchored note transitions.
5. Add reduced-motion behavior and validate at narrow desktop widths.
