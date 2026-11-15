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

### The Unseen Model: prediction as a computational material

Between **Projects** and **Engagements**, a panoramic generative sculpture (`emergence.js`) connects interactive visual behaviour to a central theme in machine learning: a system forms expectations about uncertain input and changes when its expectations fail.

The visual material is a bespoke WebGL raymarched metamaterial with nested porous folds, carved chambers, cross-bracing, surface etching, simulated shadows and jade/copper illumination. It is **not a neural network diagram, particle swarm, or fixed imported 3D model**. Its topology evolves autonomously, including in the absence of visitors.

An actual lightweight online cursor predictor observes recent positions and velocities, predicts a near-future position, and updates its weights from prediction errors. The predicted position illuminates and locally opens the 3D material. Reversals and other unexpected movement can trigger a stronger structural response: irregular facets separate, openings appear, and the material reorganises nonlocally. Prediction state and temporary deformation persist briefly after interaction. The predictor is deliberately small and browser-local; it is not a general-purpose AI or a pretrained model.

The component has no buttons, clicks or mandatory instructions. It renders at a higher, device-aware resolution with smoother surface normals and lighting, supports reduced motion, pauses offscreen, and respects light/dark palettes. When WebGL is unavailable or software-rendered, a high-density, antialiased Canvas 2D sculptural fallback replaces the earlier sparse dot placeholder.

This is an **original conceptual artwork**, not a demonstration of emergent intelligence or a scientifically validated account of learning and cognition.


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
