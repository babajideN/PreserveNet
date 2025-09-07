import { describe, it, expect, beforeEach } from "vitest";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_GOAL = 101;
const ERR_INVALID_DEADLINE = 102;
const ERR_INVALID_DESCRIPTION = 103;
const ERR_INVALID_TITLE = 104;
const ERR_CAMPAIGN_ALREADY_EXISTS = 105;
const ERR_CAMPAIGN_NOT_FOUND = 106;
const ERR_CAMPAIGN_ENDED = 107;
const ERR_CAMPAIGN_NOT_ENDED = 108;
const ERR_INSUFFICIENT_CONTRIBUTION = 109;
const ERR_NO_CONTRIBUTIONS = 110;
const ERR_GOAL_NOT_MET = 111;
const ERR_GOAL_MET = 112;
const ERR_INVALID_OWNER = 113;
const ERR_INVALID_CONTRIBUTOR = 114;
const ERR_INVALID_STATUS = 115;
const ERR_MAX_CAMPAIGNS_EXCEEDED = 116;
const ERR_INVALID_MIN_CONTRIBUTION = 117;
const ERR_INVALID_REWARD_TIER = 119;
const ERR_INVALID_UPDATE = 120;
const ERR_REWARD_ALREADY_CLAIMED = 130;

interface RewardTier {
  threshold: number;
  description: string;
}

interface Campaign {
  title: string;
  description: string;
  goal: number;
  deadline: number;
  owner: string;
  totalContributed: number;
  status: string;
  projectId: number;
  rewardTiers: RewardTier[];
}

interface CampaignUpdate {
  updateDescription: string;
  updateTimestamp: number;
  updater: string;
}

class CrowdfundingMock {
  state!: {
    nextCampaignId: number;
    maxCampaigns: number;
    minContribution: number;
    campaigns: Map<number, Campaign>;
    contributions: Map<string, number>;
    campaignUpdates: Map<number, CampaignUpdate>;
    claimedRewards: Map<string, boolean>;
  };
  blockHeight = 0;
  caller = "ST1TEST";
  stxBalance = new Map<string, number>();

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextCampaignId: 0,
      maxCampaigns: 500,
      minContribution: 100,
      campaigns: new Map(),
      contributions: new Map(),
      campaignUpdates: new Map(),
      claimedRewards: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.stxBalance.set("contract", 0);
    this.stxBalance.set(this.caller, 1000000);
  }

  createCampaign(
    title: string,
    description: string,
    goal: number,
    deadline: number,
    projectId: number,
    rewardTiers: RewardTier[]
  ) {
    const nextId = this.state.nextCampaignId;
    if (nextId >= this.state.maxCampaigns) return { ok: false, value: ERR_MAX_CAMPAIGNS_EXCEEDED };
    if (title.length === 0) return { ok: false, value: ERR_INVALID_TITLE };
    if (description.length === 0) return { ok: false, value: ERR_INVALID_DESCRIPTION };
    if (goal <= 0) return { ok: false, value: ERR_INVALID_GOAL };
    if (deadline <= this.blockHeight) return { ok: false, value: ERR_INVALID_DEADLINE };
    if (rewardTiers.some(t => t.threshold <= 0 || t.description.length === 0)) return { ok: false, value: ERR_INVALID_REWARD_TIER };

    const newCampaign: Campaign = {
      title,
      description,
      goal,
      deadline,
      owner: this.caller,
      totalContributed: 0,
      status: "active",
      projectId,
      rewardTiers,
    };
    this.state.campaigns.set(nextId, newCampaign);
    this.state.nextCampaignId++;
    return { ok: true, value: nextId };
  }

  contribute(campaignId: number, amount: number) {
    const campaign = this.state.campaigns.get(campaignId);
    if (!campaign) return { ok: false, value: ERR_CAMPAIGN_NOT_FOUND };
    if (this.blockHeight >= campaign.deadline || campaign.status !== "active") return { ok: false, value: ERR_CAMPAIGN_ENDED };
    if (amount < this.state.minContribution) return { ok: false, value: ERR_INSUFFICIENT_CONTRIBUTION };
    const callerBalance = this.stxBalance.get(this.caller) ?? 0;
    if (callerBalance < amount) return { ok: false, value: ERR_INSUFFICIENT_CONTRIBUTION };
    const key = `${campaignId}-${this.caller}`;
    const current = this.state.contributions.get(key) ?? 0;
    this.state.contributions.set(key, current + amount);
    campaign.totalContributed += amount;
    this.stxBalance.set(this.caller, callerBalance - amount);
    this.stxBalance.set("contract", (this.stxBalance.get("contract") ?? 0) + amount);
    return { ok: true, value: true };
  }

  withdrawFunds(campaignId: number) {
    const campaign = this.state.campaigns.get(campaignId);
    if (!campaign) return { ok: false, value: ERR_CAMPAIGN_NOT_FOUND };
    if (this.caller !== campaign.owner) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (this.blockHeight <= campaign.deadline) return { ok: false, value: ERR_CAMPAIGN_ACTIVE };
    if (campaign.totalContributed < campaign.goal) return { ok: false, value: ERR_GOAL_NOT_MET };
    if (campaign.status !== "active") return { ok: false, value: ERR_INVALID_STATUS };
    const contractBalance = this.stxBalance.get("contract") ?? 0;
    if (contractBalance < campaign.totalContributed) return { ok: false, value: ERR_WITHDRAW_FAILED };
    this.stxBalance.set("contract", contractBalance - campaign.totalContributed);
    this.stxBalance.set(this.caller, (this.stxBalance.get(this.caller) ?? 0) + campaign.totalContributed);
    campaign.status = "funded";
    return { ok: true, value: true };
  }

  refund(campaignId: number) {
    const campaign = this.state.campaigns.get(campaignId);
    if (!campaign) return { ok: false, value: ERR_CAMPAIGN_NOT_FOUND };
    if (this.blockHeight <= campaign.deadline) return { ok: false, value: ERR_CAMPAIGN_ACTIVE };
    if (campaign.totalContributed >= campaign.goal) return { ok: false, value: ERR_GOAL_MET };
    if (campaign.status !== "active") return { ok: false, value: ERR_INVALID_STATUS };
    const key = `${campaignId}-${this.caller}`;
    const amount = this.state.contributions.get(key) ?? 0;
    if (amount === 0) return { ok: false, value: ERR_NO_CONTRIBUTIONS };
    const contractBalance = this.stxBalance.get("contract") ?? 0;
    if (contractBalance < amount) return { ok: false, value: ERR_REFUND_FAILED };
    this.stxBalance.set("contract", contractBalance - amount);
    this.stxBalance.set(this.caller, (this.stxBalance.get(this.caller) ?? 0) + amount);
    this.state.contributions.delete(key);
    campaign.totalContributed -= amount;
    campaign.status = "failed";
    return { ok: true, value: true };
  }

  updateCampaignDescription(campaignId: number, newDescription: string) {
    const campaign = this.state.campaigns.get(campaignId);
    if (!campaign) return { ok: false, value: ERR_CAMPAIGN_NOT_FOUND };
    if (this.caller !== campaign.owner) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (this.blockHeight >= campaign.deadline || campaign.status !== "active") return { ok: false, value: ERR_CAMPAIGN_ENDED };
    if (newDescription.length === 0) return { ok: false, value: ERR_INVALID_DESCRIPTION };
    campaign.description = newDescription;
    this.state.campaignUpdates.set(campaignId, {
      updateDescription: newDescription,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  claimReward(campaignId: number, tierIndex: number) {
    const campaign = this.state.campaigns.get(campaignId);
    if (!campaign) return { ok: false, value: ERR_CAMPAIGN_NOT_FOUND };
    if (this.blockHeight <= campaign.deadline) return { ok: false, value: ERR_CAMPAIGN_ACTIVE };
    if (campaign.totalContributed < campaign.goal) return { ok: false, value: ERR_GOAL_NOT_MET };
    const key = `${campaignId}-${this.caller}`;
    const contrib = this.state.contributions.get(key) ?? 0;
    if (contrib === 0) return { ok: false, value: ERR_NO_CONTRIBUTIONS };
    const tier = campaign.rewardTiers[tierIndex];
    if (!tier) return { ok: false, value: ERR_INVALID_REWARD_TIER };
    if (contrib < tier.threshold) return { ok: false, value: ERR_INSUFFICIENT_CONTRIBUTION };
    const rewardKey = `${campaignId}-${this.caller}-${tierIndex}`;
    if (this.state.claimedRewards.get(rewardKey)) return { ok: false, value: ERR_REWARD_ALREADY_CLAIMED };
    this.state.claimedRewards.set(rewardKey, true);
    return { ok: true, value: true };
  }
}

describe("Crowdfunding", () => {
  let contract: CrowdfundingMock;

  beforeEach(() => {
    contract = new CrowdfundingMock();
  });

  it("creates a valid campaign", () => {
    const result = contract.createCampaign(
      "Temple Restoration",
      "Restore ancient temple",
      10000,
      100,
      1,
      [{ threshold: 100, description: "Bronze NFT" }]
    );
    expect(result.ok).toBe(true);
    const campaign = contract.state.campaigns.get(0);
    expect(campaign?.title).toBe("Temple Restoration");
  });

  it("rejects invalid goal", () => {
    const result = contract.createCampaign(
      "Test",
      "Desc",
      0,
      100,
      1,
      [{ threshold: 100, description: "Reward" }]
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_GOAL);
  });

  it("rejects invalid deadline", () => {
    contract.blockHeight = 50;
    const result = contract.createCampaign(
      "Test",
      "Desc",
      1000,
      40,
      1,
      [{ threshold: 100, description: "Reward" }]
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_DEADLINE);
  });

  it("allows contribution to active campaign", () => {
    contract.createCampaign(
      "Test",
      "Desc",
      1000,
      100,
      1,
      [{ threshold: 100, description: "Reward" }]
    );
    const result = contract.contribute(0, 200);
    expect(result.ok).toBe(true);
    const campaign = contract.state.campaigns.get(0);
    expect(campaign?.totalContributed).toBe(200);
  });

  it("rejects contribution below min", () => {
    contract.createCampaign(
      "Test",
      "Desc",
      1000,
      100,
      1,
      [{ threshold: 100, description: "Reward" }]
    );
    const result = contract.contribute(0, 50);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INSUFFICIENT_CONTRIBUTION);
  });

  it("allows withdrawal if goal met", () => {
    contract.createCampaign(
      "Test",
      "Desc",
      1000,
      100,
      1,
      [{ threshold: 100, description: "Reward" }]
    );
    contract.contribute(0, 1000);
    contract.blockHeight = 101;
    const result = contract.withdrawFunds(0);
    expect(result.ok).toBe(true);
    const campaign = contract.state.campaigns.get(0);
    expect(campaign?.status).toBe("funded");
  });

  it("rejects withdrawal if goal not met", () => {
    contract.createCampaign(
      "Test",
      "Desc",
      1000,
      100,
      1,
      [{ threshold: 100, description: "Reward" }]
    );
    contract.contribute(0, 500);
    contract.blockHeight = 101;
    const result = contract.withdrawFunds(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_GOAL_NOT_MET);
  });

  it("allows refund if goal not met", () => {
    contract.createCampaign(
      "Test",
      "Desc",
      1000,
      100,
      1,
      [{ threshold: 100, description: "Reward" }]
    );
    contract.contribute(0, 500);
    contract.blockHeight = 101;
    const result = contract.refund(0);
    expect(result.ok).toBe(true);
    const campaign = contract.state.campaigns.get(0);
    expect(campaign?.totalContributed).toBe(0);
    expect(campaign?.status).toBe("failed");
  });

  it("rejects refund if goal met", () => {
    contract.createCampaign(
      "Test",
      "Desc",
      1000,
      100,
      1,
      [{ threshold: 100, description: "Reward" }]
    );
    contract.contribute(0, 1000);
    contract.blockHeight = 101;
    const result = contract.refund(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_GOAL_MET);
  });

  it("updates campaign description", () => {
    contract.createCampaign(
      "Test",
      "Old Desc",
      1000,
      100,
      1,
      [{ threshold: 100, description: "Reward" }]
    );
    const result = contract.updateCampaignDescription(0, "New Desc");
    expect(result.ok).toBe(true);
    const campaign = contract.state.campaigns.get(0);
    expect(campaign?.description).toBe("New Desc");
  });

  it("rejects update for ended campaign", () => {
    contract.createCampaign(
      "Test",
      "Desc",
      1000,
      100,
      1,
      [{ threshold: 100, description: "Reward" }]
    );
    contract.blockHeight = 101;
    const result = contract.updateCampaignDescription(0, "New");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_CAMPAIGN_ENDED);
  });

  it("claims reward if eligible", () => {
    contract.createCampaign(
      "Test",
      "Desc",
      1000,
      100,
      1,
      [{ threshold: 500, description: "Silver" }]
    );
    contract.contribute(0, 600);
    contract.blockHeight = 101;
    const campaign = contract.state.campaigns.get(0)!;
    campaign.totalContributed = 1000;
    const result = contract.claimReward(0, 0);
    expect(result.ok).toBe(true);
  });

  it("rejects claim if not eligible", () => {
    contract.createCampaign(
      "Test",
      "Desc",
      1000,
      100,
      1,
      [{ threshold: 500, description: "Silver" }]
    );
    contract.contribute(0, 400);
    contract.blockHeight = 101;
    const campaign = contract.state.campaigns.get(0)!;
    campaign.totalContributed = 1000;
    const result = contract.claimReward(0, 0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INSUFFICIENT_CONTRIBUTION);
  });

  it("rejects duplicate claim", () => {
    contract.createCampaign(
      "Test",
      "Desc",
      1000,
      100,
      1,
      [{ threshold: 500, description: "Silver" }]
    );
    contract.contribute(0, 600);
    contract.blockHeight = 101;
    const campaign = contract.state.campaigns.get(0)!;
    campaign.totalContributed = 1000;
    contract.claimReward(0, 0);
    const result = contract.claimReward(0, 0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_REWARD_ALREADY_CLAIMED);
  });
});