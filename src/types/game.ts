export type PlayerAccount = {
  id: string;
  username: string;
  last_server?: string | null;
};

export type PlayerCurrencies = {
  user_id: string;
  coin: number;
  gems: number;
  stamina_current: number;
  stamina_max: number;
  summon_tickets: number;
  updated_at?: string;
};

export type PlayerFragment = {
  user_id: string;
  hero_key: string;
  fragments: number;
};

export type PlayerSummonState = {
  user_id: string;
  banner_key: string;
  total_summons: number;
  pity_counter: number;
  updated_at?: string;
};

export type PlayerHeroProgress = {
  user_id: string;
  hero_key: string;
  breakthrough_level: number;
  talent_points: number;
  updated_at?: string;
};

export type PlayerProfile = {
  id: string;
  username: string;
  created_at?: string;
};

export type PlayerGameState = {
  profile: PlayerProfile | null;
  currencies: PlayerCurrencies | null;
  fragments: Record<string, number>;
  summonStates: Record<string, PlayerSummonState>;
  heroProgress: Record<string, PlayerHeroProgress>;
};

export type SummonReward = {
  id: string;
  amount: number;
};

export type SummonResult = {
  rewards: SummonReward[];
  summonState: PlayerSummonState;
};
