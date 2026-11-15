# Abdullah X | Personal website

A minimalist personal website for research, governance and institutional work, with a bespoke interactive neural sculpture.

## Visual system

The hero contains a continuously animated, three-dimensional neural manifold built from curved connections and depth-aware nodes.

- Organic geometry rotates and subtly changes shape on its own.
- Fine signal particles continuously move along the connections.
- Hovering anywhere in the introduction, from the navigation divider to the bottom thematic line, subtly changes the sculpture's orientation.
- Moving closer to the sculpture makes it open up slightly and delicately alters nearby connections.
- Moving away lets the structure settle naturally.
- There are **no click interactions or activation buttons** in the visualization.

The page background uses a much lighter, continuously moving projection of the same structure. It fades in below the hero and remains behind all content.

This is an abstract visual exploration of connected intelligence and control, not a diagram of a specific research result.

### Architecture of Emergence: kinetic abstraction

Between **Projects** and **Engagements**, the horizontal artwork in `emergence.js` consists of hundreds of individual luminous fragments that autonomously assemble, fragment, and reorganize through four recognizable structures:

1. **Arcade:** four architectural arches and their supporting columns
2. **Braid:** interweaving coordinated streams
3. **Channel:** separating boundaries around a shared passage
4. **Dispersal:** a turbulent field that ultimately rebuilds itself as architecture

These forms are *conceptual* expressions of how individual actions, institutions, coordination and constraints create collective structure. They do not represent a particular research result or dataset.

The viewer doesn't have to click, drag, or change any modes. The kinetic installation changes formation automatically, beginning its first transition almost immediately. Pointer motion smoothly deforms the entire field with a local vortex; leaving the artwork allows the independent formation cycle to continue. Motion is time-based and spring-damped, not a series of hard switches or resets.

The artwork preserves the site's restrained colors, works in light/dark mode, uses a compact panoramic layout (approximately 172 to 212 pixels high), pauses when hidden or offscreen, caps canvas pixel ratio, and respects reduced motion. There are no controls, instructions, duplicated titles or extra captions.


## Content

- Seven selected publications, with expandable source lists and transparent source classifications
- Eight documented external references, each classified by source type
- Sixteen carefully selected open-source projects in a four-column editorial grid (two columns on tablets, one on mobile)
- Eight selected speaking, broadcast, guest-lecture and convening engagements. Diplomatic and government consultations remain in the CV only.
- Downloadable four-page master CV (`Abdullah_X_Master_CV_2026.pdf`), preserving the original October 24 master layout and content, with the November 2026 Arcadia Impact Research Associate appointment and October 30 NLU Delhi panel added. The legacy `Abdullah_X_CV_2026.pdf` path resolves to the same master PDF.
- Ten work experience roles and three appointments
- Three contact email addresses

## Run

No build system, framework, or third-party animation library required.

```sh
python3 -m http.server 8000
```

Open http://localhost:8000.

## Deploy

GitHub Pages from the `main` branch, repository root.

## Accessibility and performance

Responsive typography, semantic links and headings, keyboard navigation, capped canvas pixel ratio, offscreen hero throttling, document visibility handling, and reduced-motion support.
