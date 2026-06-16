# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
import json
from genlayer import *


class TruthStake(gl.Contract):
    claims: TreeMap[str, str]
    claim_count: u256
    resolved_count: u256

    def __init__(self):
        self.claim_count = u256(0)
        self.resolved_count = u256(0)

    @gl.public.write
    def post_claim(self, claim_text: str, source_url: str) -> str:
        claim_text = str(claim_text).strip()
        if not claim_text:
            raise Exception("claim_text required")
        key = str(int(self.claim_count))
        claim = {
            "poster": str(gl.message.sender_address),
            "text": claim_text[:1000],
            "source_url": str(source_url).strip() if source_url else "",
            "stakers_true": [],
            "stakers_false": [],
            "resolved": False,
            "verdict": "",
            "reasoning": "",
        }
        self.claims[key] = json.dumps(claim)
        self.claim_count += u256(1)
        return key

    @gl.public.write
    def stake_on(self, claim_key: str, position: str) -> None:
        claim_key = str(claim_key)
        if claim_key not in self.claims:
            raise Exception("unknown claim")
        claim = json.loads(self.claims[claim_key])
        if claim["resolved"]:
            raise Exception("already resolved")
        position = str(position).strip().lower()
        if position not in ("true", "false"):
            raise Exception("position must be 'true' or 'false'")
        addr = str(gl.message.sender_address)
        if position == "true":
            claim["stakers_true"].append(addr)
        else:
            claim["stakers_false"].append(addr)
        self.claims[claim_key] = json.dumps(claim)

    @gl.public.write
    def resolve(self, claim_key: str) -> None:
        claim_key = str(claim_key)
        if claim_key not in self.claims:
            raise Exception("unknown claim")
        claim = json.loads(self.claims[claim_key])
        if claim["resolved"]:
            raise Exception("already resolved")

        verdict = self._judge_claim(claim)
        claim["resolved"] = True
        claim["verdict"] = verdict["verdict"]
        claim["reasoning"] = verdict["reasoning"]
        self.claims[claim_key] = json.dumps(claim)
        self.resolved_count += u256(1)

    def _judge_claim(self, claim: dict) -> dict:
        claim_text = claim["text"]
        source_url = claim["source_url"]

        def leader_fn() -> str:
            evidence = "(no source available)"
            if source_url and source_url.startswith("http"):
                try:
                    raw = gl.nondet.web.get(source_url)
                    evidence = raw.body.decode("utf-8")[:4000]
                except Exception:
                    evidence = "(source fetch failed)"

            prompt = f"""You are a fact-checker. Determine if this claim is TRUE or FALSE based on available evidence.

CLAIM: {claim_text}

EVIDENCE FROM SOURCE:
{evidence}

RULES:
1. If evidence clearly supports the claim → true
2. If evidence clearly contradicts the claim → false
3. If no evidence available or inconclusive → false (default to caution)

Reply ONLY valid JSON:
{{"verdict": "true"/"false", "reasoning": "<brief explanation>"}}"""

            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            data = raw if isinstance(raw, dict) else json.loads(str(raw).strip())

            # Deterministic normalization so honest leaders always pass the
            # validator: strict lowercased enum + substantive reasoning.
            verdict = str(data.get("verdict", "")).strip().lower()
            if verdict not in ("true", "false"):
                verdict = "false"  # default to caution on ambiguous output
            reasoning = str(data.get("reasoning", "")).strip()
            if len(reasoning) < 10:
                reasoning = f"verdict={verdict}; insufficient evidence-based explanation provided"
            return json.dumps({"verdict": verdict, "reasoning": reasoning})

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            try:
                data = json.loads(leader_result.calldata)
                verdict = data.get("verdict")
                # Strict enum: must be exactly the lowercased token.
                if verdict not in ("true", "false"):
                    return False
                reasoning = data.get("reasoning")
                # Substantive reasoning: non-empty str of length >= 10.
                if not isinstance(reasoning, str) or len(reasoning.strip()) < 10:
                    return False
                return True
            except Exception:
                return False

        result_str = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        return json.loads(result_str)

    @gl.public.view
    def get_claim(self, key: str) -> dict:
        key = str(key)
        if key not in self.claims:
            return {"exists": False}
        return json.loads(self.claims[key])

    @gl.public.view
    def read_resolution(self, key: str) -> dict:
        key = str(key)
        if key not in self.claims:
            return {"resolved": False}
        claim = json.loads(self.claims[key])
        return {
            "resolved": claim["resolved"],
            "verdict": claim["verdict"],
            "winners": claim["stakers_true"] if claim["verdict"] == "true" else claim["stakers_false"],
        }

    @gl.public.view
    def stats(self) -> dict:
        return {
            "total_claims": int(self.claim_count),
            "resolved": int(self.resolved_count),
        }
