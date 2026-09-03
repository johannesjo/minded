# Third-Party Notices

minded bundles a small number of third-party assets. This file records their origin and license.

## Icons - Google Material Symbols

SVG icons under `extension/src/assets/img/` and `extension/icons/` (recognizable by `viewBox="0 -960 960 960"`) are derived from [Google Material Symbols](https://fonts.google.com/icons), licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).

No modifications other than export from the Material Symbols web tool.

## Fonts - Inter and Newsreader

Web fonts are sourced from [Fontsource](https://fontsource.org/) and bundled as
`extension/src/assets/fonts/`:

- **Inter** - [SIL Open Font License 1.1](https://openfontlicense.org/) - © The Inter Project Authors
- **Newsreader** - [SIL Open Font License 1.1](https://openfontlicense.org/) - © The Newsreader Project Authors

## Audio - bell sounds

The three bells under `extension/src/assets/` (`single-bell.mp3`,
`warm-bells.mp3`, `warm-bells-sequence.mp3`) are short edited excerpts of one
recording: **"Meditation Bowls" by Sandhwani**, dedicated to the public domain
under [Creative Commons Zero 1.0](https://creativecommons.org/publicdomain/zero/1.0/).

- Original: [freesound.org/people/Sandhwani/sounds/473813](https://freesound.org/people/Sandhwani/sounds/473813/) - uploaded 2019-06-01, 1:50, 48 kHz mono
- Obtained through the Pixabay mirror [`meditation-bowls-23651`](https://pixabay.com/sound-effects/meditation-bowls-23651/), which redistributes the same recording under the [Pixabay Content License](https://pixabay.com/service/license-summary/)

Modifications: trimmed in Audacity to 5-7 second excerpts and re-encoded to
48 kHz mono MP3.

CC0 waives copyright, so no attribution is legally required and redistribution
in this MIT-licensed repository is unrestricted; the entry is kept for
provenance. If you contribute new audio assets, add their source and license
here.

## JavaScript dependencies

Runtime and build-time dependencies are listed in `extension/package.json` and `landing-page/package.json`. Their licenses are available via `npm ls --json --long` or in each package's `node_modules/<pkg>/LICENSE` file.

---

If you spot an asset that should be listed here but isn't, please open an issue or PR.
