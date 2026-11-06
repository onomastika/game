# Keyboard Choice Lab — motion system v1.7

## Design goals
- Calm, intentional motion: hero intro, selection pill, recommendation and incremental catalog entrance, detail open, lightweight comparison feedback.
- All transitions limited to ~170–470 ms, with stagger max 196 ms for 12 catalog cards; no infinite animations, blinking, gradients, blur filters, or global scroll listeners.
- `prefers-reduced-motion: reduce` disables entrance animations/transitions and smooth scrolling; no layout is withheld pending an animation.
- Use compositor-friendly `transform`/`opacity` for card entrance, detail entrance, and count pulse. Only selected-segment pill changes its width (4 groups, layout only once in rAF).
- No visual entrance animations during live search typing; at most 12 newly revealed catalog entries on Show More.
- Comparing instruments updates the comparison section and existing button states without rebuilding the whole catalog or recommendations, preserving pointer/keyboard focus.

## Motion coverage
1. Page arrival: hero label, heading, description, meta in gentle sequence.
2. Segmented controls: selection underlay slides; no extra DOM and no animation on resize.
3. Result updates: top recommendations fade and rise once per intentional filter change.
4. Catalog filters: first visible rows animate, staggered; search remains instant.
5. Show More: only newly added batch animates.
6. Detail: lightweight fade and rise on open; respects reduced-motion scrolling.
7. Comparison: only slots reappear, count softly pulses on changes.
8. Advanced/disclosure content: quick entrance while native `<details>` remains accessible.
9. Touch devices: no hover lift or continuous effects.
10. Mobile comparison dock: subtle, single entrance.

## Manual checks
- 320, 390, 768, 1440 px; tap/keyboard; reduced-motion emulation; rapid filter and search; focus remains on Compare after click; open details near clicked card; no horizontal overflow.
- The motion system requires no extra libraries or external assets.
