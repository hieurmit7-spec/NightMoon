import { supabase } from '../lib/supabase';
import type {
  PlayerAccount,
  PlayerCurrencies,
  PlayerFragment,
  PlayerGameState,
  PlayerHeroProgress,
  PlayerProfile,
  PlayerSummonState,
} from '../types/game';

export const STARTER_CURRENCIES = {
  coin: 999999,
  gems: 9999,
  stamina_current: 100,
  stamina_max: 100,
  summon_tickets: 10,
};

const getSupabaseMessage = (message: string) => message || 'Không lưu được dữ liệu người chơi.';

export const ensureStarterData = async (account: PlayerAccount) => {
  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: account.id,
      username: account.username,
    },
    { onConflict: 'id' },
  );

  if (profileError) {
    throw new Error(getSupabaseMessage(profileError.message));
  }

  const { data: existingCurrencies, error: currencyReadError } = await supabase
    .from('player_currencies')
    .select('user_id')
    .eq('user_id', account.id)
    .maybeSingle();

  if (currencyReadError) {
    throw new Error(getSupabaseMessage(currencyReadError.message));
  }

  if (!existingCurrencies) {
    const { error: currencyInsertError } = await supabase.from('player_currencies').insert({
      user_id: account.id,
      ...STARTER_CURRENCIES,
    });

    if (currencyInsertError) {
      throw new Error(getSupabaseMessage(currencyInsertError.message));
    }
  }
};

export const loadPlayerGameState = async (account: PlayerAccount): Promise<PlayerGameState> => {
  await ensureStarterData(account);

  const [
    { data: profile, error: profileError },
    { data: currencies, error: currenciesError },
    { data: fragments, error: fragmentsError },
    { data: summonStates, error: summonStatesError },
    { data: heroProgress, error: heroProgressError },
  ] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', account.id).maybeSingle<PlayerProfile>(),
      supabase.from('player_currencies').select('*').eq('user_id', account.id).maybeSingle<PlayerCurrencies>(),
      supabase.from('player_fragments').select('*').eq('user_id', account.id).returns<PlayerFragment[]>(),
      supabase.from('player_summon_states').select('*').eq('user_id', account.id).returns<PlayerSummonState[]>(),
      supabase.from('player_hero_progress').select('*').eq('user_id', account.id).returns<PlayerHeroProgress[]>(),
    ]);

  if (profileError) {
    throw new Error(getSupabaseMessage(profileError.message));
  }

  if (currenciesError) {
    throw new Error(getSupabaseMessage(currenciesError.message));
  }

  if (fragmentsError) {
    throw new Error(getSupabaseMessage(fragmentsError.message));
  }

  if (summonStatesError) {
    throw new Error(getSupabaseMessage(summonStatesError.message));
  }

  if (heroProgressError) {
    throw new Error(getSupabaseMessage(heroProgressError.message));
  }

  return {
    profile: profile ?? null,
    currencies: currencies ?? null,
    fragments: (fragments ?? []).reduce<Record<string, number>>((currentFragments, fragment) => {
      currentFragments[fragment.hero_key] = fragment.fragments;
      return currentFragments;
    }, {}),
    summonStates: (summonStates ?? []).reduce<Record<string, PlayerSummonState>>((currentStates, summonState) => {
      currentStates[summonState.banner_key] = summonState;
      return currentStates;
    }, {}),
    heroProgress: (heroProgress ?? []).reduce<Record<string, PlayerHeroProgress>>((currentProgress, progress) => {
      currentProgress[progress.hero_key] = progress;
      return currentProgress;
    }, {}),
  };
};

export const updatePlayerCurrencies = async (userId: string, currencies: PlayerCurrencies) => {
  const nextCurrencies = {
    user_id: userId,
    coin: currencies.coin,
    gems: currencies.gems,
    stamina_current: currencies.stamina_current,
    stamina_max: currencies.stamina_max,
    summon_tickets: currencies.summon_tickets,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('player_currencies')
    .upsert(nextCurrencies, { onConflict: 'user_id' })
    .select('*')
    .single<PlayerCurrencies>();

  if (error) {
    throw new Error(getSupabaseMessage(error.message));
  }

  return data;
};

export const updatePlayerSummonState = async (
  userId: string,
  bannerKey: string,
  totalSummons: number,
  pityCounter: number,
) => {
  const { data, error } = await supabase
    .from('player_summon_states')
    .upsert(
      {
        user_id: userId,
        banner_key: bannerKey,
        total_summons: totalSummons,
        pity_counter: pityCounter,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,banner_key' },
    )
    .select('*')
    .single<PlayerSummonState>();

  if (error) {
    throw new Error(getSupabaseMessage(error.message));
  }

  return data;
};

export const incrementPlayerFragments = async (
  userId: string,
  currentFragments: Record<string, number>,
  heroKey: string,
  amount: number,
) => {
  const nextAmount = (currentFragments[heroKey] ?? 0) + amount;
  const { data, error } = await supabase
    .from('player_fragments')
    .upsert(
      {
        user_id: userId,
        hero_key: heroKey,
        fragments: nextAmount,
      },
      { onConflict: 'user_id,hero_key' },
    )
    .select('*')
    .single<PlayerFragment>();

  if (error) {
    throw new Error(getSupabaseMessage(error.message));
  }

  return data;
};

export const setPlayerFragments = async (userId: string, heroKey: string, amount: number) => {
  const { data, error } = await supabase
    .from('player_fragments')
    .upsert(
      {
        user_id: userId,
        hero_key: heroKey,
        fragments: amount,
      },
      { onConflict: 'user_id,hero_key' },
    )
    .select('*')
    .single<PlayerFragment>();

  if (error) {
    throw new Error(getSupabaseMessage(error.message));
  }

  return data;
};

export const updatePlayerHeroProgress = async (
  userId: string,
  heroKey: string,
  breakthroughLevel: number,
  talentPoints: number,
) => {
  const { data, error } = await supabase
    .from('player_hero_progress')
    .upsert(
      {
        user_id: userId,
        hero_key: heroKey,
        breakthrough_level: breakthroughLevel,
        talent_points: talentPoints,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,hero_key' },
    )
    .select('*')
    .single<PlayerHeroProgress>();

  if (error) {
    throw new Error(getSupabaseMessage(error.message));
  }

  return data;
};
