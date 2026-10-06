---
name: validate-deployment
description: Validate a Solana product's deploy config against its deployment ticket. Use when the user runs /validate-deployment with a ticket, or asks to check that a new product's token config (metadata, data feed, minter/redeemer vault params, roles, pause init, payment tokens) matches a deployment spec. Read-only — reports mismatches, does not edit.
---

# Validate a Solana deployment against its ticket

You are given a full deployment ticket (markdown) as the argument. Cross-check the
committed token config and registrations against every value in the ticket and produce
a ✓/✗ report. **This is read-only.** Never edit files; only report findings.

> **NEVER compare addresses by eye.** Solana addresses are 32–44 char **base58** strings
> and are **case-sensitive**. Do **not** lowercase them (that's an EVM habit and would
> hide real differences). Visual comparison is unreliable and has produced false
> mismatches before. For every address comparison, run a programmatic check that trims
> whitespace, tests exact string equality, and also confirms each side decodes to a
> 32-byte key. Batch all of the deployment's address comparisons into one script, e.g.:
>
> ```bash
> python3 - <<'PY'
> B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
> def decode(s):
>     n = 0
>     for ch in s: n = n * 58 + B58.index(ch)
>     raw = n.to_bytes((n.bit_length() + 7) // 8, "big")
>     return b"\0" * (len(s) - len(s.lstrip("1"))) + raw
> pairs = {
>   "minter.feeReceiver":    ("<ticket>", "<config>"),
>   "redeemer.requestRedeemer": ("<ticket>", "<config>"),
>   # ...one entry per address in the ticket
> }
> for k, (t, c) in pairs.items():
>     t, c = t.strip(), c.strip()
>     try: valid = len(decode(t)) == 32 and len(decode(c)) == 32
>     except ValueError: valid = False
>     eq = t == c
>     print(("OK  " if eq and valid else "DIFF"), k, "" if eq and valid else f"{t} != {c} (valid32={valid})")
> PY
> ```
>
> If the check says OK, the row is ✓. Don't second-guess it with a manual "looks
> different" narrative. If the ticket gives an EVM-style `0x…` address for a Solana
> field, that's a ✗ (wrong chain), not a formatting nit.

## 0. Parse the ticket

Extract into a checklist:

- **Token**: ticker (symbol), name, denomination, decimals (default 9), metadata URI if given.
- **Oracle / data feed**: mode (manual / pyth / switchboard), tolerance %, min/max
  price (or Max/MinExpectedAnswer), initial price, staleness / heartbeat.
- **Minter (dv)**: fee recipient, tokens receiver, instantFee, greenlist on/off,
  variationTolerance, instantDailyLimit, minAmount, min mTokens for first mint.
- **Redeemer (rv)**: fee recipient, tokens receiver, request redeemer, instantFee
  (instant redeem fee), greenlist, variationTolerance, instantDailyLimit, minAmount,
  fiatFlatFee, minFiatRedeemAmount. Note: a swapper/LP variant does **not** exist on
  Solana. If the ticket asks for one, flag it.
- **Roles**: token manager, vaults manager, oracle manager, metadata authority.
- **Init / pause**: which functions to pause on minter and redeemer.
- **Payment tokens**: per vault: symbol, mint address, fee, stable?, fiat?, allowance,
  data feed (reused address).
- **Network**: `mainnet` / `devnet` / `localnet` (the key under `networks` in the config).
- **Sanctions list**: Solana vaults have no sanctions-list support. If the ticket
  specifies one, report it as ⚠️ "not supported on Solana" (non-blocking unless the
  ticket makes it a hard requirement).

Derive the `MProduct` key (e.g. `solStockMarketTRBasisTrade`). It's normally the
ticket symbol verbatim. If it isn't obvious, grep `common/tokenTypes.ts`.

## 1. Locate the artifacts

- Token config: `scripts/configs/tokens/<MProduct>.ts`, exporting `<MProduct>Config:
TokenConfigWithNetworks`.
- Registrations:
  - `common/tokenTypes.ts`: `MProduct` enum entry (key and string value both
    `<MProduct>`, matching sibling style).
  - `scripts/configs/tokens/index.ts`: `tokenConfigs[MProduct.<key>]` entry **and** the
    matching `import { <MProduct>Config } from './<MProduct>'`. A missing import is
    a compile error. Call it out.
- Schema / types (reference for allowed fields): `scripts/configs/types.ts`,
  `scripts/configs/roles-types.ts`.
- Payment tokens: `scripts/configs/tokens/payment-tokens.ts` (mint + feed config per
  network) and `common/addresses.ts` → `addresses[<network>].feeds[PaymentToken.X]`
  (`token`, `dataFeed`, `underlyingFeed`, `tokenProgram`).
- Deployed product addresses: `common/addresses.ts` → `addresses[<network>].tokens[MProduct.X]`.
  For a **pre-deploy** review these are normally absent. That's expected, not a ✗.
  If they are present, check they look complete (acRole, mToken, tokenAuthority,
  mTokenDataFeed, minter, redeemer).

If the token config file or a registration is missing, that's a ✗.

## 2. Unit conversions (get these exact)

Config values are **human-readable strings**. The deploy scripts convert them like this:

| Config field                                                                                                             | Conversion (deploy script)                     | On-chain meaning                   | Ticket → config example                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `instantFee`, `variationTolerance`, payment-token `fee`                                                                  | `parsePercent(x)` = `parseUnits(x, 2)`         | bps, `ONE_HUNDRED_PERCENT = 10000` | ticket `50 bps` / raw `50` / `0.5%` → `'0.5'`; `100 bps` → `'1'`; `0` → `'0'`                                     |
| `instantDailyLimit`, `minAmount`, `firstMintMinMTokens`, `minFiatRedeemAmount`, `fiatFlatFee`, payment-token `allowance` | `parseUnits(x)`, **9 decimals**                | 9-dp integer                       | `30` → `'30'`. If the ticket gives a raw 18-dp EVM integer (e.g. `30000000000000000000`), divide by 1e18 → `'30'` |
| infinite / uncapped                                                                                                      | `UNLIMITED` from `@/scripts/constants/pricing` | ≈ `MAX_U128` after scaling         | "infinite"/"unlimited" daily limit or allowance → `UNLIMITED`                                                     |
| `dataFeed.minPrice` / `maxPrice`                                                                                         | `floor(x * 1e9)`                               | 9-dp price bound                   | ticket raw 8-dp `99640000` → `'0.9964'`                                                                           |
| `dataFeed.initialPrice`                                                                                                  | `floor(x * 1e8)`                               | 8-dp initial answer                | `1` → `'1'`                                                                                                       |
| `dataFeed.maxStaleness`                                                                                                  | seconds, int                                   | —                                  | `30 days` → `2592000`                                                                                             |

Oracle tolerance: when the ticket gives only a tolerance `P%` and an initial price `X`,
the expected bounds are `minPrice = X·(1 − P/100)`, `maxPrice = X·(1 + P/100)`. Compute
them with a script (not mentally) and compare as decimals. Exact string formatting may
differ (`'1.0036'` vs `'1.00360'`), which is fine. If the ticket gives explicit
Max/MinExpectedAnswer, those take precedence over the tolerance-derived values; if both
are given and inconsistent, report that as a ticket inconsistency.

Reminders:

- Schema enforces `minPrice < maxPrice` and `minPrice ≤ initialPrice ≤ maxPrice`.
- `pyth` mode **requires** `underlyingFeed`; `switchboard` mode requires a `switchboard`
  block. `manual` with no `underlyingFeed` creates a new feed PDA.
- `maxStaleness` is often not in the ticket. Sibling configs use `2592000` (30d) for
  manual feeds. Report it as ⚠️ "not in ticket", not ✓.
- Payment token `stable` and `isFiat` must be set explicitly in Solana configs
  (`isFiat` defaults to `false` if omitted). Ticket "Stable: false" → `stable: false`.

## 3. Config checks (`scripts/configs/tokens/<MProduct>.ts`)

- `metadata`: `name` and `symbol` exactly equal the ticket (case-sensitive). `decimals`
  matches (default 9). `uri` follows the sibling pattern
  `https://raw.githubusercontent.com/midas-apps/midas-assets/refs/heads/main/solana/<lowercased-symbol>-metadata`
  unless the ticket gives one.
- Correct network key under `networks` (e.g. `mainnet`) matching the ticket. Flag any
  extra network blocks the ticket doesn't mention (⚠️), and in particular devnet values
  leaking into mainnet.
- `dataFeed`: mode, bounds, initial price, staleness per §2. Any comment such as
  `// Oracle tolerance: 0.36%` must agree with the actual bounds.
- `minter`: every field per §2, addresses checked programmatically, `greenListEnforced`
  matches ticket greenlist on/off.
- `redeemer`: every field per §2, including `requestRedeemer`, `fiatFlatFee`,
  `minFiatRedeemAmount`.
- **Attribute each config value to the vault the ticket actually names.** Tickets
  often list a field (e.g. "Min Amount") under **only one** vault, while the config
  sets it on **both** minter and redeemer. Do **not** silently match the minter value
  against a redeemer-only ticket line (or the reverse). That would hide an unspecified
  value as ✓. When a config field has no counterpart under that vault in the ticket,
  mark the row **"not in ticket"** (⚠️, non-blocking) rather than ✓, even if the value
  equals the other vault's. "Same as dv" in a ticket line is the one explicit
  cross-reference: those values _should_ be identical, so a divergence is a ✗.
- `paymentTokens` (per vault): symbol is a valid `PaymentToken`, and
  fee/allowance/stable/isFiat match the ticket. Minter and redeemer lists may differ, so
  check each list.
- `grantRoles`: `tokenManagerAddress`, `vaultsManagerAddress`, `oracleManagerAddress`,
  `metadataAuthority` match the ticket. Role groups granted (see
  `scripts/configs/roles-types.ts` `ROLE_GROUPS`):
  - token manager → `m_minter_role`, `m_burner_role`, `m_freezer_role`
  - vaults manager → `vault_admin_role`, `vault_pauser_role`
  - oracle manager → `data_feed_admin`
    If the ticket assigns a role to a different party than this grouping implies, flag it.
- `postDeploy.pauseFunctions`: map ticket function names/selectors to the allowed
  names in `vaultFunctionNameSchema` (`scripts/configs/types.ts`), resolved via
  `scripts/utils/vaultPause.ts`:
  - `depositInstant` / `mintInstant` → MINT_INSTANT (minter only)
  - `depositRequest` / `mintRequest` → MINT_REQUEST (minter only)
  - `redeemInstant` → REDEEM_INSTANT (redeemer only)
  - `redeemRequest` → REDEEM_REQUEST (redeemer only)
  - `redeemFiatRequest` / `redeemRequestFiat` → REDEEM_REQUEST_FIAT (redeemer only)

  If the ticket lists EVM selectors, translate them: `0x6e26b9f8`→`depositRequest`,
  `0xe50e3dbb`→`depositRequestWithCustomRecipient` (no separate Solana instruction, so
  it's covered by `depositRequest`), `0xd5f73f5c`→`redeemFiatRequest`. Verify the config
  lists exactly the set the ticket asks for, on the right vault. A minter action under
  `redeemer` (or the reverse) is a ✗.

## 4. Registration checks

- `MProduct` enum contains the key.
- `scripts/configs/tokens/index.ts` imports the config **and** registers it under
  `MProduct.<key>`.
- Load the config through the real loader and report the error message verbatim if it
  fails. (`tsc --noEmit` is not useful in this repo: it only emits TS6305 project-reference
  noise.) Use a temp file in the repo root so the `@/` path alias resolves (`tsx -e`
  doesn't resolve it), and always delete it afterwards:

  ```bash
  printf "import { loadTokenConfig } from '@/scripts/configs/loadTokenConfig';\nimport { MProduct } from '@/common/tokenTypes';\nconsole.log(JSON.stringify(loadTokenConfig(MProduct.<key>, '<network>'), null, 2));\n" > ./.vd-check.ts
  npx tsx ./.vd-check.ts 2>&1 | grep -v '^    at '; rm -f ./.vd-check.ts
  ```

  This catches missing imports/registrations (`ReferenceError: <MProduct>Config is not
defined`) and runs the zod schema (publicKey validity, price ordering, required
  fields). Any failure is a ✗ blocker. On success, use the printed merged config as the
  source of truth for the tables.

## 5. Address-book checks (`common/addresses.ts`, `payment-tokens.ts`)

For each payment token in the ticket, under the ticket's network, check these
programmatically (using the script at the top):

- `addresses[<network>].feeds[PaymentToken.X].token` equals the ticket mint address.
- `addresses[<network>].feeds[PaymentToken.X].dataFeed` equals the ticket's "reuse"
  data feed address.
- `paymentTokenConfigs[X].networks[<network>].tokenAddress` equals the same mint.

If the payment token has no `feeds` entry for that network, the vault can't add it
(`add:payment-token` needs the feed). That's a ✗.

## 6. Report

Report in this order: **tables first, all prose last**.

1. **Per-section ✓/✗ tables** (Token metadata, Data feed, Minter, Redeemer, Roles,
   Pause, Payment tokens, Registrations / type-check). For each row show:
   ticket value → config value → ✓/✗/⚠️.
2. **Non-blocking notes**: "not in ticket but standard default" items and
   Solana-unsupported ticket items (sanctions list, swapper/LP), listed after the tables.
3. **Verdict (at the very bottom)**: one line saying either that it matches or exactly
   which fixes are needed. Any blockers/mismatches belong in this closing section too,
   not above the tables. Do **not** put a summary or blocker callout before the tables.

A row's status is driven by what the ticket says about **that vault**:

- ticket value present and equal → ✓
- ticket value present and different → ✗ (blocker)
- **no ticket value for that vault** → ⚠️ "not in ticket" (non-blocking), never ✓.
  State what the config uses and where the value likely came from (sibling default,
  or the other vault's value). This applies to minter/redeemer fields and to standard
  defaults (`maxStaleness`, `firstMintMinMTokens`, `minFiatRedeemAmount`,
  `metadataAuthority`, etc.).
