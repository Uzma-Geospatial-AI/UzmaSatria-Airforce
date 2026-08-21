/**
 * OSIRIS — local feature flags.
 *
 * Switches for modules this deployment does not want. Setting one to `false`
 * hides the feature everywhere it surfaces — toolbar entry, mobile tab,
 * keyboard shortcut, status-bar readout — and stops its background polling,
 * so a disabled module costs no network traffic.
 *
 * The code stays in the tree. Flip the flag back to `true` to restore the
 * feature exactly as it was; nothing else needs changing.
 */
export const FEATURES = {
  /**
   * MARKETS — the desktop tool-rail panel (crypto, indices, space weather),
   * the mobile MARKETS tab, the `M` shortcut, the BTC/ETH/SOL prices in the
   * bottom ticker, and `/api/markets` polling.
   *
   * Disabled: not needed for this deployment.
   *
   * Note: the bottom bar itself stays — its earthquake ticker (USGS), the
   * Discord/X/Docs links and the ONLINE indicator are unrelated to markets.
   * The top-bar `SOLAR: Kp` readout also stays; it reads /api/space-weather
   * directly, not the markets feed.
   */
  markets: false,

  /**
   * PROMO — the two badges at the top-right of the header: the `$OSIRIS`
   * token button (and the modal it opens) and the gold `SUPPORT` ko-fi link.
   * Covers both the desktop status bar and the mobile top-right cluster.
   *
   * Disabled: not needed for this deployment.
   */
  promo: false,
} as const;
