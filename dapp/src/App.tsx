import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster, toast } from 'sonner'

const CONTRACT = '0x0743E75212a39d4F8BC1D981641df74A801A079C'

type Claim = {
  id: number
  author: string
  handle: string
  time: string
  text: string
  source: string
  trueStake: number
  falseStake: number
  status: 'open' | 'resolving'
}

const SEED_CLAIMS: Claim[] = [
  {
    id: 1,
    author: 'Mara Okonkwo',
    handle: 'maraonchain',
    time: '2h',
    text: 'Ethereum gas fees averaged under 5 gwei for the entire month of May 2026.',
    source: 'etherscan.io/gastracker',
    trueStake: 8200,
    falseStake: 3100,
    status: 'open',
  },
  {
    id: 2,
    author: 'Dev Halberg',
    handle: 'halberg',
    time: '5h',
    text: 'The GenLayer testnet processed more than 1M optimistic transactions in a single day last week.',
    source: 'genlayer.com/stats',
    trueStake: 4400,
    falseStake: 4900,
    status: 'open',
  },
  {
    id: 3,
    author: 'Sora Lin',
    handle: 'soralin',
    time: '8h',
    text: 'No layer-2 has ever reverted a finalized state root on mainnet.',
    source: 'l2beat.com',
    trueStake: 12750,
    falseStake: 1500,
    status: 'resolving',
  },
  {
    id: 4,
    author: 'Quinn Adebayo',
    handle: 'quinnchains',
    time: '11h',
    text: 'A majority of stablecoin volume in 2026 settles on chains other than Ethereum L1.',
    source: 'defillama.com/stablecoins',
    trueStake: 6600,
    falseStake: 5800,
    status: 'open',
  },
]

const TRENDING = [
  { tag: 'rollup-finality', count: '1.2k claims' },
  { tag: 'gas-economics', count: '880 claims' },
  { tag: 'oracle-truth', count: '640 claims' },
  { tag: 'mev-supply-chain', count: '412 claims' },
  { tag: 'restaking-risk', count: '305 claims' },
]

const RESOLUTION = [
  { n: '1', t: 'Stake', d: 'Back TRUE or FALSE with tokens. Your stake is your conviction.' },
  { n: '2', t: 'Debate', d: 'Sources are attached and challenged in the open feed.' },
  { n: '3', t: 'Resolve', d: 'AI validators read the evidence and reach consensus on-chain.' },
  { n: '4', t: 'Settle', d: 'The correct side splits the losing pool, pro-rata to stake.' },
]

function pct(t: number, f: number) {
  const tot = t + f
  return tot === 0 ? 50 : Math.round((t / tot) * 100)
}

function StakeBar({ claim }: { claim: Claim }) {
  const truePct = pct(claim.trueStake, claim.falseStake)
  return (
    <div className="mt-4">
      <div className="flex justify-between text-xs font-semibold">
        <span className="text-emerald-400">TRUE {truePct}%</span>
        <span className="text-rose-400/80">FALSE {100 - truePct}%</span>
      </div>
      <div className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-rose-500/15">
        <motion.div
          className="h-full bg-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: `${truePct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-white/35">
        <span>{claim.trueStake.toLocaleString()} staked TRUE</span>
        <span>{claim.falseStake.toLocaleString()} staked FALSE</span>
      </div>
    </div>
  )
}

function ClaimCard({ claim, onStake }: { claim: Claim; onStake: (id: number, side: 'true' | 'false') => void }) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-white/[0.07] px-5 py-5 transition hover:bg-white/[0.015]"
    >
      <div className="flex gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/80 to-emerald-700 text-sm font-bold text-white">
          {claim.author.split(' ').map((w) => w[0]).join('')}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="font-semibold text-white">{claim.author}</span>
            <span className="text-white/40">@{claim.handle}</span>
            <span className="text-white/30">· {claim.time}</span>
            {claim.status === 'resolving' && (
              <span className="ml-auto rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                resolving
              </span>
            )}
          </div>
          <p className="mt-1 text-[15px] leading-relaxed text-white/90">{claim.text}</p>
          <a
            href={`https://${claim.source}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline"
          >
            🔗 {claim.source}
          </a>

          <StakeBar claim={claim} />

          <div className="mt-4 flex gap-2.5">
            <button
              onClick={() => onStake(claim.id, 'true')}
              className="flex-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
            >
              ↑ Stake TRUE
            </button>
            <button
              onClick={() => onStake(claim.id, 'false')}
              className="flex-1 rounded-lg border border-rose-500/40 bg-rose-500/10 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20"
            >
              ↓ Stake FALSE
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  )
}

function App() {
  const [claims, setClaims] = useState<Claim[]>(SEED_CLAIMS)
  const [draft, setDraft] = useState('')
  const [src, setSrc] = useState('')

  function compose() {
    if (!draft.trim()) {
      toast.error('Write a claim before posting.')
      return
    }
    const next: Claim = {
      id: Date.now(),
      author: 'You',
      handle: 'you',
      time: 'now',
      text: draft.trim(),
      source: src.trim() || 'no-source-attached',
      trueStake: 0,
      falseStake: 0,
      status: 'open',
    }
    setClaims((c) => [next, ...c])
    setDraft('')
    setSrc('')
    toast.success('Claim posted to the feed — open for staking.')
  }

  function stake(id: number, side: 'true' | 'false') {
    setClaims((cs) =>
      cs.map((c) =>
        c.id === id
          ? {
              ...c,
              trueStake: c.trueStake + (side === 'true' ? 500 : 0),
              falseStake: c.falseStake + (side === 'false' ? 500 : 0),
            }
          : c,
      ),
    )
    toast(`Staked 500 on ${side.toUpperCase()}`, { description: 'Position recorded on-chain (demo).' })
  }

  const totalStaked = claims.reduce((s, c) => s + c.trueStake + c.falseStake, 0)

  return (
    <div className="min-h-screen bg-[#0E1116] text-slate-100 antialiased">
      <Toaster theme="dark" position="bottom-right" richColors />

      <div className="mx-auto flex max-w-6xl gap-6 px-4">
        {/* LEFT RAIL — trending / stats */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-5 overflow-y-auto py-6 lg:flex">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 font-black text-[#0E1116]">
              T
            </span>
            <div>
              <p className="font-bold leading-none">TruthStake</p>
              <p className="text-[10px] uppercase tracking-widest text-white/40">stake on facts</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
            <p className="text-[11px] uppercase tracking-widest text-white/40">network</p>
            <p className="mt-2 text-2xl font-bold text-emerald-400">{totalStaked.toLocaleString()}</p>
            <p className="text-xs text-white/40">tokens staked across {claims.length} claims</p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
            <p className="text-[11px] uppercase tracking-widest text-white/40">trending</p>
            <ul className="mt-2 space-y-3">
              {TRENDING.map((t) => (
                <li key={t.tag} className="cursor-pointer">
                  <p className="text-sm font-semibold text-white/90">#{t.tag}</p>
                  <p className="text-[11px] text-white/35">{t.count}</p>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* CENTER FEED */}
        <main className="min-h-screen w-full max-w-xl flex-1 border-x border-white/[0.07]">
          {/* sticky composer */}
          <div className="sticky top-0 z-10 border-b border-white/[0.07] bg-[#0E1116]/85 px-5 py-4 backdrop-blur">
            <p className="text-[11px] uppercase tracking-widest text-emerald-400/80">compose a claim</p>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="State a verifiable claim. The crowd stakes TRUE or FALSE…"
              rows={2}
              className="mt-2 w-full resize-none bg-transparent text-[15px] text-white placeholder-white/30 outline-none"
            />
            <div className="mt-2 flex items-center gap-2">
              <input
                value={src}
                onChange={(e) => setSrc(e.target.value)}
                placeholder="🔗 source link"
                className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white placeholder-white/25 outline-none focus:border-emerald-500/40"
              />
              <button
                onClick={compose}
                className="rounded-full bg-emerald-500 px-5 py-1.5 text-sm font-bold text-[#0E1116] transition hover:bg-emerald-400"
              >
                Post claim
              </button>
            </div>
          </div>

          {/* feed */}
          <AnimatePresence initial={false}>
            {claims.map((c) => (
              <ClaimCard key={c.id} claim={c} onStake={stake} />
            ))}
          </AnimatePresence>

          <p className="px-5 py-8 text-center text-xs text-white/25">
            You&apos;ve reached the end of the feed · contract {CONTRACT.slice(0, 8)}…{CONTRACT.slice(-6)}
          </p>
        </main>

        {/* RIGHT RAIL — how resolution works */}
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col gap-5 overflow-y-auto py-6 xl:flex">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
            <p className="text-sm font-bold text-white">How resolution works</p>
            <ol className="mt-4 space-y-4">
              {RESOLUTION.map((r) => (
                <li key={r.n} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-400">
                    {r.n}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white/90">{r.t}</p>
                    <p className="text-xs leading-relaxed text-white/45">{r.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
            <p className="text-sm font-bold text-emerald-300">Truth is a market.</p>
            <p className="mt-1.5 text-xs leading-relaxed text-white/50">
              Claims resolve through AI-validator consensus on GenLayer. Stake what you believe; the evidence
              decides.
            </p>
            <p className="mt-3 break-all font-mono text-[10px] text-white/30">{CONTRACT}</p>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default App
