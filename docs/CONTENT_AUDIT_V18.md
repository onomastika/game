# Content audit v1.8 — 2026-11-07

## Scope & limitations
- 124 model entries, 11 brands. Exact field-level physical specs were independently checked for **14** models in v1.6; the remaining 110 are not certified as independently verified by this audit.
- **17 year evidence links updated** to manufacturer announcements, official brand videos, or contemporaneous reports explicitly naming the model. Previous false attribution of Korg microSTATION/microARRANGER to microKORG history is removed.
- **84 repeated store-test prompts rewritten**, using verified high-level attributes to help users compare real instruments. These are proposed checks, not claims that an in-store test was performed.
- Yamaha NP-15 Box Type vs NP-35 Graded Soft Touch distinguished; neither should be sold as hammer-action piano. Korg Keystage USB audio is output-only (2 channels) per Korg specifications.
- No new unverified retail prices were added. Catalog pricing remains historical and should not be used to infer availability.
- Original 124 IDs, model names and years retained; targeted source corrections are evidence updates, not new release dates.

## Corrections to prior audit hypotheses
The Yamaha chronology URL ending `2010_2020/` **does contain 2024 models**; its slug alone does not make a citation false. Model-specific announcements are still more transparent.

## Items still open
- **110 models** require primary, model-specific cross-checks for detailed dimensions, weight, keyboard action, power and aftertouch.
- Device generation/local market variants should be individually matched before a user buys.
- Source links are model-date pointers, not automatically an attestation of every specification in a row.
- Prices and availability in Vietnam have not been checked live.

## Tests
Run `npm test`, `node --check app.js`, `npm run build:offline`. Check responsive/mobile browser when the environment allows. 
