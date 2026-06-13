// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ClaimPool {
    struct Stake {
        address staker;
        uint256 amount;
        bool position; // true = claim is true, false = claim is false
    }

    mapping(bytes32 => Stake[]) public stakes;
    mapping(bytes32 => bool) public resolved;
    mapping(bytes32 => bool) public resolution;
    address public resolver;

    modifier onlyResolver() {
        require(msg.sender == resolver, "Not resolver");
        _;
    }

    constructor() {
        resolver = msg.sender;
    }

    function deposit(bytes32 claimKey, bool position) external payable {
        require(msg.value > 0, "Must stake ETH");
        require(!resolved[claimKey], "Already resolved");
        stakes[claimKey].push(Stake(msg.sender, msg.value, position));
    }

    function resolve(bytes32 claimKey, bool result) external onlyResolver {
        require(!resolved[claimKey], "Already resolved");
        resolved[claimKey] = true;
        resolution[claimKey] = result;

        uint256 loserPool;
        uint256 winnerPool;
        Stake[] storage s = stakes[claimKey];

        for (uint i = 0; i < s.length; i++) {
            if (s[i].position == result) winnerPool += s[i].amount;
            else loserPool += s[i].amount;
        }

        for (uint i = 0; i < s.length; i++) {
            if (s[i].position == result) {
                uint256 reward = s[i].amount + (loserPool * s[i].amount / winnerPool);
                payable(s[i].staker).transfer(reward);
            }
        }
    }

    function getStakeCount(bytes32 claimKey) external view returns (uint256) {
        return stakes[claimKey].length;
    }
}
