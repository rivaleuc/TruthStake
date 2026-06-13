# TruthStake

Decentralized fact-checking market. Stake on claims, AI validators fetch sources and judge truth. Correct stakers win, wrong ones lose.

## Why this exists

Information markets today depend on centralized resolution — a single oracle or a small committee decides what's "true." This creates obvious attack vectors: bribe the resolver, compromise the feed, or simply disagree with a subjective call with no recourse. TruthStake decentralizes the judgment itself: multiple AI validators independently fetch evidence from the web and reach consensus on whether a claim holds.

## Why GenLayer

Fact-checking is fundamentally interpretive. "Company X had 10M revenue" requires reading a source, understanding context, and making a judgment call — is the source reliable? Does the number match? Is it referring to the right time period?

- **A deterministic VM can't do this.** Solidity can compare numbers, but it can't read an earnings report and decide if a claim about it is true.
- **A single oracle can be bribed.** One feed, one point of failure.
- **GenLayer validators independently fetch evidence** from the source URL using `gl.nondet.web.get` — no oracle middleman.
- **Each validator runs its own LLM** and judges independently. Consensus emerges from agreement across diverse models, not from trusting one source.
- **The judgment is on-chain and appealable.** If validators got it wrong, fresh evidence or a new validator set can re-evaluate.

The EVM handles the stakes and payouts. GenLayer handles the truth.

## Structure

```
TruthStake/
├── core/
│   ├── truth_stake.py    ← GenLayer intelligent contract
│   └── ClaimPool.sol     ← ETH staking pool (Solidity)
├── dapp/
│   └── index.html        ← Lit web components (no build)
├── shared/
│   └── types.ts          ← Types + ABI
├── Makefile
└── README.md
```

No monorepo. No package.json at root. `make deploy` and open `dapp/index.html`.

## How it works

1. **Post a claim** with text + source URL + initial stake
2. **Others stake** — choose "true" or "false" with ETH
3. **Resolve** — AI validators fetch the source, judge the claim
4. **Winners collect** — correct side splits the entire pool proportionally

## Deploy

```bash
make deploy
# or
genlayer deploy --contract core/truth_stake.py
```

## Frontend

Open `dapp/index.html` in a browser. No build step needed.
