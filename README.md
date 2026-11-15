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

### Attention: computational textile and latent folds

The horizontal artwork between Projects and Engagements is an original, responsive **computational textile** implemented with lightweight Canvas 2D in `emergence.js`. The visual is a continuous fine-threaded surface with dozens of woven contours, fine cross-seams, layered translucent shading and local fold compression, not a neural network diagram, particle swarm or heavy WebGL sculpture.

The interaction takes inspiration from **contextual and long-range attention**: moving the pointer moves attention gradually across the textile while distant folds respond through spatially separated, smoothly varying anchors. A small number of fine connecting filaments emerges, holds briefly, and fades instead of continuously flickering. Only one primary relationship is prominent at a time, with a quieter echo and a short-lived trace of the previous relationship. The underlying weave now drifts more slowly, retaining the same geometry, colours, and pleated surface. There are no buttons or clicks.

The relationship model is illustrative and deterministic; the piece does not run a trained transformer, calculate real attention matrices, or represent published research data. The artwork maintains the site's restrained jade, ink and copper palette, light/dark styling, mobile-responsive shallow panoramic proportions, offscreen pausing, and reduced-motion support. It has no third-party dependencies.


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
