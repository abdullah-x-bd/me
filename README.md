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

### Emergence: distributed representations

The compact artwork between Projects and Engagements is a dot-based, neural-inspired latent representation field (`emergence.js`). Unlike the earlier stigmergy and swarm studies, it explores how distributed nonlinear activations can generate an unexpectedly coherent global projection.

- A compact **8 → 14 → 8 nonlinear feature mixer** evolves latent activations from autonomous signals and live cursor input. The weights are deterministic generative parameters, **not trained weights**.
- Approximately 5,100 to 12,600 tiny points form a diffuse spatial field. As a nonlinear **coherence threshold** is crossed, the points condense into two interacting, folded feature subspaces with depth and changing topology.
- The coherent geometry is recomputed from the current feature state each frame. There are no scripted flowers, icons, or fixed pictures to assemble.
- Cursor movement supplies new input to the feature mixer, changing the representation across distant regions as well as triggering short, travelling activation pulses. The whole structure continues evolving after the pointer leaves.
- The piece uses point-only Canvas rendering, responsive dimensions, light/dark palettes, offscreen pausing, and gentler reduced-motion behaviour. There are no clicks, controls, menus, or instructional captions.

This is a **conceptual visual analogy** for distributed representations and emergent structure in neural computation, not an empirical visualization, demonstration of a trained neural network, or claim that the artwork has learned or developed intelligence.


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
