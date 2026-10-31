# Stockfish.js 19.0.1 — Ascendo bot engine

This directory distributes the unmodified **lite, single-threaded** browser engine
from `stockfish@19.0.1`, built from upstream commit
`0d5dd7944f88c817c07a26bc4fb1905d5f9c46d6` (tag `v19.0.1`).

Stockfish.js engine copyright © 2026 Chess.com, LLC; based on Stockfish by
T. Romstad, M. Costalba, J. Kiiski, G. Linscott and other contributors.
The lite network is by Chris Bao (sscg13). The engine is licensed under GPLv3;
see [the complete license](Copying.txt). Upstream non-engine tooling retains
its own notices. Ascendo's controller communicates with the standalone worker
using the UCI protocol; the upstream engine/loader are not modified.

- [Complete corresponding source and build scripts](stockfish-19.0.1-source.tar.gz)
- [Matching embedded network data](nn-61e7af4bb97d.nnue)
- [Pinned download URLs, sizes and SHA-256 checksums](manifest.json)
- Upstream: <https://github.com/nmrugg/stockfish.js/tree/v19.0.1>
- Published package: <https://www.npmjs.com/package/stockfish/v/19.0.1>

## Rebuilding

1. Extract the source archive. Install Node.js and Emscripten **6.0.9** and
   activate its environment; make, a Python runtime and the upstream build's
   normal compiler utilities are required.
2. Copy the supplied `nn-61e7af4bb97d.nnue` into the extracted `src/` directory.
3. Install the source package's pinned build dependencies with
   `npm install --ignore-scripts`.
4. From the extracted source directory run:

   ```sh
   node build.js --single-threaded --lite --no-split --strict-em-check
   ```

The output is `src/stockfish-19-lite-single.js` plus its matching `.wasm`.
See the included `build.js --help`, README, makefiles and source notices for
the complete build options. These source materials and network data are served
alongside the distributed binary, without sign-in or an external download host.

For an exact copy of the reviewed prebuilt files in this repository, run
`node scripts/vendor-chess-bot.mjs` from the Ascendo repository root. Downloads
must match every pinned SHA-256 before they are written. This script is not run
when a visitor opens the site. Only the loader and WASM are downloaded during
bot play; license/source/network downloads are ordinary explicit links.
