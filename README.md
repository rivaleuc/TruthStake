# TruthStake

**A fact-checking staking market resolved by AI validator consensus.**

TruthStake lets anyone post a claim, stake on whether it's true or false, and have the outcome decided by GenLayer validators who crawl the cited source and reason about the evidence. The truth is not hard-coded — it's a living verdict reached by reading the web, and the winning side splits the losing pool.

- **Contract (Bradbury, chain 4221):** `0x016fC29dAC7795A9d268EC068fbC09D5ecc233CC`
- **Explorer:** https://explorer-bradbury.genlayer.com/contract/0x016fC29dAC7795A9d268EC068fbC09D5ecc233CC
- **Live app:** https://truthstake.pages.dev

## What it does

A poster calls `post_claim(claim_text, source_url)`, which stores a claim under an integer key (returned as a string): `{poster, text, source_url, stakers_true, stakers_false, resolved, verdict, reasoning}` and increments `claim_count`. Anyone takes a side with `stake_on(claim_key, position)` where position is `"true"` or `"false"` (rejected once the claim is resolved) — the staker's address is appended to the matching list. When `resolve(claim_key)` is called, the contract runs a fact-checking round, marks the claim resolved, writes the `verdict` + `reasoning`, and increments `resolved_count`.

The resolution runs in `gl.vm.run_nondet_unsafe(leader_fn, validator_fn)`. The leader fetches the cited source with `gl.nondet.web.get(source_url)` (clamped to 4000 chars) and calls `gl.nondet.exec_prompt(..., response_format="json")` to decide TRUE or FALSE: evidence clearly supports → true, clearly contradicts → false, and inconclusive/unavailable → false (default to caution). The `validator_fn` re-parses the leader's calldata and accepts only if `verdict` is exactly `"true"` or `"false"` and `reasoning` is a string, so validators that read the page slightly differently still converge on the same binary verdict.

State lives in a `TreeMap[str, str]` (`claims`). The frontend reads a claim with `get_claim(key)`, the resolution and winners with `read_resolution(key)` — `{resolved, verdict, winners}` — and the aggregate `stats()`. On the EVM side, `ClaimPool.sol` holds the staked ETH: stakers `deposit(claimKey, position)`, and a resolver calls `resolve(claimKey, result)` to pay the winning side their stake plus a proportional share of the losing pool.

## Why GenLayer

"Is this claim true?" requires reading a source, interpreting unstructured prose, and exercising judgment about what the evidence supports — possibly against pages that change over time. A deterministic VM can't fetch a URL, can't read an article, and can't tolerate two validators seeing slightly different content while still agreeing on the answer. That's exactly GenLayer's Optimistic Democracy: validators each crawl the source, reason independently, and converge on a semantically-equivalent verdict via `validator_fn`. Use GenLayer when settlement depends on interpreting real-world, web-hosted evidence; use a plain backend (or an oracle) when the answer is a structured feed you can read deterministically.

## Architecture

| Layer | Responsibility |
|---|---|
| Intelligent contract (`core/truth_stake.py`) | Stores claims + staker lists, crawls the cited source, runs LLM resolution rounds, exposes `read_resolution` |
| Frontend (`dapp/`) | Reads live claims/resolutions/stats with no wallet; submits `post_claim` / `stake_on` / `resolve` writes via MetaMask |
| EVM / off-chain (`core/ClaimPool.sol`) | Holds staked ETH; a resolver mirrors the GenLayer verdict via `resolve(claimKey, result)` and pays winners their stake + a proportional share of the losing pool |

## Tech

- **Contract:** GenVM Python runner, pinned (`py-genlayer:1jb45aa8…jpz09h6`). `claim_count` / `resolved_count` as `u256`, claims stored as a `TreeMap[str, str]` of JSON (staker addresses kept in JSON lists). Web evidence via `gl.nondet.web.get`, verdict via `gl.nondet.exec_prompt`, consensus via `gl.vm.run_nondet_unsafe` + structural `validator_fn`.
- **Frontend:** Vite + React 19 + TypeScript, genlayer-js for reads (CORS-open RPC) and writes (MetaMask wallet on chain 4221, no snap — the client is created with the address as a string so writes route to `eth_sendTransaction`). UI uses Tailwind CSS v4, framer-motion animations, and sonner toasts.

## Project structure

```
TruthStake/
├── core/
│   ├── truth_stake.py       # intelligent contract (gl.Contract)
│   └── ClaimPool.sol        # EVM staking pool / payout
├── shared/
│   └── types.ts             # shared TS types
├── dapp/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── genlayer.ts      # client, connectWallet, read/write helpers
│   │   ├── main.tsx
│   │   ├── index.css
│   │   └── assets/
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── Makefile
└── README.md
```

## Develop

```
cd dapp
npm install
npm run dev
npm run build
```

The frontend reads contract state with no wallet. Writes require MetaMask on GenLayer Bradbury (chain 4221) with some GEN — the app auto-switches the network.

## Deploy the frontend (Cloudflare Pages)

- **Root directory:** dapp
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Environment:** `NODE_VERSION=20`

## Why GenLayer (engineering notes)

- **No floats.** Staker addresses live in JSON lists and counters are `u256`; the GenLayer contract tracks no fractional amounts (payout math lives in `ClaimPool.sol` on the EVM side).
- **Validate structure, not exact text.** The verdict is a strict binary, so `validator_fn` requires `verdict` to be exactly `"true"`/`"false"` and `reasoning` to be a string — validators converge on the answer, not the wording.
- **Evidence is untrusted.** The cited page is data the fact-checker reasons over; the rules live in the prompt body, so a source that embeds instructions is judged, not obeyed (greybox against prompt injection). Inconclusive evidence defaults to `false`.
- **ACCEPTED ≠ paid out.** A finalized resolution stores the verdict; it moves no ETH. `ClaimPool` must separately `resolve` to distribute the pool.
- **Optimistic finality paces writes.** The frontend waits for `FINALIZED` receipts; staking and resolution settle on the appeal-window cadence, and `stake_on` is rejected once a claim is resolved.

## License

MIT
