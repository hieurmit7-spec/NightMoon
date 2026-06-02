import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import type { PlayerAccount } from '../types/game';

const SESSION_KEY = 'nightmoon.player.session';

export const normalizeUsername = (username: string) =>
  username.trim().toLowerCase().replace(/\s+/g, '');

const getAuthMessage = (message: string) => {
  if (message.includes('INVALID_LOGIN')) {
    return 'Tên tài khoản hoặc mật khẩu chưa đúng.';
  }

  if (message.includes('USERNAME_EXISTS')) {
    return 'Tên tài khoản này đã có người dùng.';
  }

  if (message.includes('USERNAME_TOO_SHORT')) {
    return 'Tên tài khoản cần ít nhất 3 ký tự.';
  }

  if (message.includes('USERNAME_INVALID')) {
    return 'Tên tài khoản chỉ được dùng chữ thường, số và dấu gạch dưới.';
  }

  if (message.includes('PASSWORD_TOO_SHORT')) {
    return 'Mật khẩu cần ít nhất 6 ký tự.';
  }

  return message || 'Không xử lý được tài khoản.';
};

const savePlayerSession = async (account: PlayerAccount) => {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(account));
};

export const getStoredPlayerSession = async () => {
  const rawSession = await AsyncStorage.getItem(SESSION_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    const parsedSession = JSON.parse(rawSession) as PlayerAccount;
    return parsedSession?.id && parsedSession?.username ? parsedSession : null;
  } catch {
    await AsyncStorage.removeItem(SESSION_KEY);
    return null;
  }
};

export const registerPlayer = async (username: string, password: string) => {
  const normalizedUsername = normalizeUsername(username);
  const { data, error } = await supabase.rpc('register_player_account', {
    p_username: normalizedUsername,
    p_password: password,
  });

  if (error) {
    throw new Error(getAuthMessage(error.message));
  }

  const account = Array.isArray(data) ? data[0] : null;

  if (!account) {
    throw new Error('Không tạo được tài khoản.');
  }

  return account as PlayerAccount;
};

export const loginPlayer = async (username: string, password: string) => {
  const normalizedUsername = normalizeUsername(username);
  const { data, error } = await supabase.rpc('login_player_account', {
    p_username: normalizedUsername,
    p_password: password,
  });

  if (error) {
    throw new Error(getAuthMessage(error.message));
  }

  const account = Array.isArray(data) ? data[0] : null;

  if (!account) {
    throw new Error('Tên tài khoản hoặc mật khẩu chưa đúng.');
  }

  await savePlayerSession(account);

  return account as PlayerAccount;
};

export const logoutPlayer = async () => {
  await AsyncStorage.removeItem(SESSION_KEY);
};

export const savePlayerServer = async (account: PlayerAccount, serverKey: string) => {
  const { data, error } = await supabase.rpc('set_player_last_server', {
    p_account_id: account.id,
    p_server_key: serverKey,
  });

  if (error) {
    throw new Error(getAuthMessage(error.message));
  }

  const nextAccount = Array.isArray(data) ? data[0] : null;

  if (!nextAccount) {
    throw new Error('Không lưu được server.');
  }

  await savePlayerSession(nextAccount);

  return nextAccount as PlayerAccount;
};
