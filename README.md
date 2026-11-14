# Abdullah X | Personal website

A typography-led, responsive personal website for research, governance and institutional work.

## Interactive visual system

The landing graphic is a custom Canvas 2D neural lattice with:
- multilayer connected nodes and curved weighted edges
- signals flowing continuously along connections, even at rest
- elastic node displacement and local activation when the cursor approaches
- click-triggered waves of activation
- an integrated but unlabeled control region that subtly modulates the visual structure

The same network language continues behind the page as a quieter, continuously animated background. The ambient layer responds to cursor movement and page interaction, fades in below the introduction, and pauses when the tab is hidden.

The diagram is **generative visual art**, not a reconstruction of research data or a claimed neural-network model of any particular paper.

## Content

- Seven selected publications with expandable links to eight documented external references, distinguished by source type
- Ten professional roles and three appointments or memberships
- Short biographical background and education
- Three professional email contacts

## Run

No build system and no UI library.

```sh
python3 -m http.server 8000
```

Open http://localhost:8000.

## Deploy

The GitHub Pages site deploys directly from the `main` branch, repository root.

## Accessibility

Responsive typography and grid, keyboard navigation for menus and citation panels, reduced-motion support and descriptive labels for the interactive visual.
