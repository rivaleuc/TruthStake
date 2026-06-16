"""Tests for TruthStake: strict lowercased verdict enum + substantive reasoning."""
import json

import pytest


def posted(contract_module, gl_runtime):
    c = contract_module.TruthStake()
    key = c.post_claim("The earth orbits the sun", "https://example.com/astro")
    return c, key


@pytest.mark.parametrize(
    "llm_out,expected_verdict",
    [
        ({"verdict": "true", "reasoning": "evidence clearly supports the claim"}, "true"),
        ({"verdict": "false", "reasoning": "evidence contradicts the claim outright"}, "false"),
        ({"verdict": "TRUE", "reasoning": "uppercase normalized to lowercase token"}, "true"),
        ({"verdict": "  False  ", "reasoning": "whitespace and case normalized away"}, "false"),
        # Garbage verdict -> defaults to caution ('false').
        ({"verdict": "maybe", "reasoning": "ambiguous evidence here so far"}, "false"),
        ({"reasoning": "no verdict key at all in the output"}, "false"),
    ],
)
def test_verdict_normalized(contract_module, gl_runtime, llm_out, expected_verdict):
    gl_runtime.nondet.exec_prompt = lambda prompt, _o=llm_out, **kw: dict(_o)
    c, key = posted(contract_module, gl_runtime)
    c.resolve(key)
    claim = json.loads(c.claims[key])
    assert claim["verdict"] == expected_verdict
    assert claim["verdict"] in ("true", "false")
    assert len(claim["reasoning"]) >= 10


def test_normalized_output_always_validates(contract_module, gl_runtime):
    weird = [
        {"verdict": "true", "reasoning": "x"},          # too-short reasoning -> padded
        {"verdict": "False", "reasoning": ""},          # empty -> padded
        {"verdict": "nonsense", "reasoning": "short"},  # bad enum + short
        {"reasoning": "no verdict"},
        {"verdict": "TRUE"},                             # missing reasoning
    ]
    for out in weird:
        gl_runtime.nondet.exec_prompt = lambda prompt, _o=out, **kw: dict(_o)
        c, key = posted(contract_module, gl_runtime)
        c.resolve(key)
        validator = gl_runtime.vm.last_validator
        ret = gl_runtime.vm.Return(gl_runtime.vm.last_leader_result)
        assert validator(ret) is True


def test_validator_rejects_bad_inputs(contract_module, gl_runtime):
    gl_runtime.nondet.exec_prompt = lambda prompt, **kw: {"verdict": "true", "reasoning": "good enough reasoning"}
    c, key = posted(contract_module, gl_runtime)
    c.resolve(key)
    validator = gl_runtime.vm.last_validator
    R = gl_runtime.vm.Return

    bad = [
        "not-a-return",
        R("{bad json"),
        R(json.dumps({"verdict": "maybe", "reasoning": "long enough reasoning here"})),  # bad enum
        R(json.dumps({"verdict": "True", "reasoning": "long enough reasoning here"})),   # not lowercased
        R(json.dumps({"verdict": "true", "reasoning": "short"})),                        # < 10 chars
        R(json.dumps({"verdict": "true", "reasoning": 123})),                            # non-str
        R(json.dumps({"verdict": "false"})),                                             # missing reasoning
    ]
    for b in bad:
        assert validator(b) is False


def test_good_input_validates(contract_module, gl_runtime):
    gl_runtime.nondet.exec_prompt = lambda prompt, **kw: {"verdict": "true", "reasoning": "ok"}
    c, key = posted(contract_module, gl_runtime)
    c.resolve(key)
    validator = gl_runtime.vm.last_validator
    R = gl_runtime.vm.Return
    assert validator(R(json.dumps({"verdict": "true", "reasoning": "evidence supports it"}))) is True
    assert validator(R(json.dumps({"verdict": "false", "reasoning": "evidence refutes it"}))) is True
