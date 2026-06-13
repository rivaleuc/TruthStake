export interface Claim {
  text: string;
  source_url: string;
  poster: string;
  resolved: boolean;
  resolution: string | null;
  stakers: { true: Staker[]; false: Staker[] };
  total_staked: number;
}

export interface Staker {
  address: string;
  amount: number;
}

export interface Resolution {
  resolved: boolean;
  resolution: string | null;
  winners: Staker[];
  total_pool: number;
}

export interface Stats {
  total_claims: number;
  total_staked: number;
  total_resolved: number;
}

export const CLAIM_POOL_ABI = [
  "function deposit(bytes32 claimKey, bool position) external payable",
  "function resolve(bytes32 claimKey, bool result) external",
  "function getStakeCount(bytes32 claimKey) external view returns (uint256)",
  "function resolved(bytes32) external view returns (bool)",
  "function resolution(bytes32) external view returns (bool)",
  "function resolver() external view returns (address)"
] as const;
