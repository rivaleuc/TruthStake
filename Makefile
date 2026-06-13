deploy:
	genlayer deploy --contract /Users/rivale/TruthStake/core/truth_stake.py

test:
	genlayer call --method post_claim --args '["Company X revenue is 10M", "https://example.com/report", 100]'
	genlayer call --method resolve --args '["claim_1"]'

serve:
	python3 -m http.server 8080 --directory dapp

.PHONY: deploy test serve
