import { useEffect, useState } from 'react';
import {
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import { useFonts } from 'expo-font';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Asset } from 'expo-asset';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import CharacterScreen from './src/screens/CharacterScreen';
import SummonScreen from './src/screens/SummonScreen';
import { getStoredPlayerSession, loginPlayer, logoutPlayer, registerPlayer, savePlayerServer } from './src/services/auth';
import {
  incrementPlayerFragments,
  loadPlayerGameState,
  setPlayerFragments,
  updatePlayerCurrencies,
  updatePlayerHeroProgress,
  updatePlayerSummonState,
} from './src/services/game';
import type { PlayerAccount, PlayerCurrencies, PlayerGameState, SummonReward, SummonResult } from './src/types/game';

const bgImage = require('./assets/bg.png');
const bgVideo = require('./assets/bggg.mp4');
const loadVideo = require('./assets/load.mp4');
const thelucIcon = require('./assets/tai nguyen/theluc.png');
const coinIcon = require('./assets/tai nguyen/coin.png');
const daquyIcon = require('./assets/tai nguyen/daquy.png');
const rollIcon = require('./assets/tai nguyen/roll.png');
const avatarIcon = require('./assets/ashlyn vaelys/11.png');
const featuredBanner = require('./assets/ashlyn vaelys/banner1.png');

const preloadAssets = [
  bgImage,
  bgVideo,
  loadVideo,
  thelucIcon,
  coinIcon,
  daquyIcon,
  rollIcon,
  require('./assets/ashlyn vaelys/11.png'),
  require('./assets/ashlyn vaelys/34.png'),
  require('./assets/ashlyn vaelys/background.png'),
  require('./assets/ashlyn vaelys/banner1.png'),
  require('./assets/ashlyn vaelys/banner2.png'),
  require('./assets/ashlyn vaelys/icon.png'),
  require('./assets/UI game/banner/gacha.mp4'),
  require('./assets/UI game/banner/re.mp4'),
  require('./assets/UI game/banner/piece.png'),
];

const servers = ['S3 - Tàn Tro Mới', 'S2 - Nguyệt Vũ', 'S1 - Khởi Nguyên'];

const topButtons = [
  {
    key: 'nhanvat',
    label: 'Nhân vật',
    source: require('./assets/UI game/butten/nhanvat.png'),
  },
  {
    key: 'linhthu',
    label: 'Linh thú',
    source: require('./assets/UI game/butten/linhthu.png'),
  },
  {
    key: 'lienminh',
    label: 'Liên minh',
    source: require('./assets/UI game/butten/lienminh.png'),
  },
];

const bottomButtons = [
  {
    key: 'chieumo',
    label: 'Chiêu mộ',
    source: require('./assets/UI game/butten/chieumo.png'),
    width: 126,
    height: 112,
  },
  {
    key: 'hanhly',
    label: 'Hành lý',
    source: require('./assets/UI game/butten/hanhly.png'),
    width: 56,
    height: 50,
  },
  {
    key: 'vuonnha',
    label: 'Vườn nhà',
    source: require('./assets/UI game/butten/vuonnha.png'),
    width: 56,
    height: 50,
  },
];

const allBottomRowButtons = [
  ...topButtons.map((button) => ({ ...button, width: 56, height: 50 })),
  ...bottomButtons.slice(1),
  bottomButtons[0],
];

const ASHLYN_HERO_KEY = 'ashlyn-vaelys';
const PITY_LIMIT = 60;
const BREAKTHROUGH_FRAGMENT_COST = 120;
const BREAKTHROUGH_COIN_COST = 24000;
const BREAKTHROUGH_TALENT_GAIN = 12;
const BASE_TALENT_POINTS = 100;

const getShardAmount = () => {
  const roll = Math.random();

  if (roll < 0.02) {
    return 60;
  }

  if (roll < 0.15) {
    return 5;
  }

  if (roll < 0.45) {
    return 3;
  }

  return 2;
};

const createSummonRewardsWithPity = (count: number, currentPity: number) => {
  const rewards: SummonReward[] = [];
  let pityCounter = currentPity;

  for (let index = 0; index < count; index += 1) {
    const isGuaranteed = pityCounter + 1 >= PITY_LIMIT;
    const amount = isGuaranteed ? 60 : getShardAmount();

    rewards.push({
      id: `${Date.now()}-${index}`,
      amount,
    });

    pityCounter = amount >= 60 ? 0 : pityCounter + 1;
  }

  return {
    rewards,
    pityCounter,
  };
};

type LoadingScreenProps = {
  progress: number;
};

function LoadingScreen({ progress }: LoadingScreenProps) {
  return (
    <ImageBackground source={bgImage} resizeMode="cover" style={styles.authShell}>
      <View style={styles.loadingShade} />
      <View style={styles.loadingPanel}>
        <Text style={styles.loadingTitle}>Đang tải tài nguyên</Text>
        <View style={styles.loadingBar}>
          <View style={[styles.loadingFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.loadingText}>{Math.round(progress)}%</Text>
      </View>
    </ImageBackground>
  );
}

type LoginScreenProps = {
  authenticatedAccount: PlayerAccount | null;
  onAuthenticated: (account: PlayerAccount) => Promise<void>;
  onStart: (serverKey: string) => Promise<void>;
  onLogout: () => Promise<void>;
};

function LoginScreen({ authenticatedAccount, onAuthenticated, onStart, onLogout }: LoginScreenProps) {
  const loginVideoPlayer = useVideoPlayer(loadVideo, (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [accountName, setAccountName] = useState('');
  const [password, setPassword] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirm, setRegisterConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [selectedServer, setSelectedServer] = useState(servers[0]);
  const [serverPickerOpen, setServerPickerOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const selectedServerCode = selectedServer.split(' - ')[0] || selectedServer;

  const resetAuthMessage = () => {
    setMessage('');
  };

  useEffect(() => {
    if (!authenticatedAccount) {
      return;
    }

    setSelectedServer(
      authenticatedAccount.last_server && servers.includes(authenticatedAccount.last_server)
        ? authenticatedAccount.last_server
        : servers[0],
    );
    setServerPickerOpen(false);
    setMessage('');
    setTermsAccepted(true);
  }, [authenticatedAccount]);

  const handleLogin = async () => {
    const name = accountName.trim();

    if (!name || !password) {
      setMessage('Nhập tên tài khoản và mật khẩu.');
      return;
    }

    try {
      setAuthLoading(true);
      const account = await loginPlayer(name, password);
      await onAuthenticated(account);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không đăng nhập được.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async () => {
    const name = accountName.trim();

    if (!name || !registerPassword || !registerConfirm) {
      setMessage('Nhập đủ tài khoản và 2 lần mật khẩu.');
      return;
    }

    if (registerPassword !== registerConfirm) {
      setMessage('Hai mật khẩu chưa trùng nhau.');
      return;
    }

    try {
      setAuthLoading(true);
      await registerPlayer(name, registerPassword);
      setMode('login');
      setPassword(registerPassword);
      setRegisterPassword('');
      setRegisterConfirm('');
      setMessage(`Đăng ký thành công ${name}. Hãy đăng nhập để vào game.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không đăng ký được.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleStart = async () => {
    if (!termsAccepted) {
      setMessage('Hãy đồng ý điều khoản trước khi bắt đầu.');
      return;
    }

    try {
      setStarting(true);
      setMessage('');
      await onStart(selectedServer);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không vào được game.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <View style={styles.authShell}>
      <VideoView
        player={loginVideoPlayer}
        style={styles.backgroundVideo}
        contentFit="cover"
        nativeControls={false}
        allowsVideoFrameAnalysis={false}
        allowsPictureInPicture={false}
        pointerEvents="none"
        surfaceType="textureView"
      />
      <View style={styles.loginShade} />
      <SafeAreaView style={styles.loginSafeArea}>
        <View style={authenticatedAccount ? styles.serverInlinePanel : styles.loginCard}>
          {!authenticatedAccount ? (
            <>
              <Text style={styles.loginTitle}>NightMoon</Text>
              <Text style={styles.loginSubtitle}>Đăng nhập để bắt đầu hành trình</Text>

              <View style={styles.authTabs}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.authTab, mode === 'login' && styles.authTabActive]}
                  onPress={() => {
                    setMode('login');
                    resetAuthMessage();
                  }}
                >
                  <Text style={[styles.authTabText, mode === 'login' && styles.authTabTextActive]}>Đăng nhập</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.authTab, mode === 'register' && styles.authTabActive]}
                  onPress={() => {
                    setMode('register');
                    resetAuthMessage();
                  }}
                >
                  <Text style={[styles.authTabText, mode === 'register' && styles.authTabTextActive]}>Đăng ký</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                value={accountName}
                onChangeText={(value) => {
                  setAccountName(value);
                  resetAuthMessage();
                }}
                placeholder="Tên tài khoản"
                placeholderTextColor="rgba(234, 244, 255, 0.52)"
                style={styles.authInput}
                autoCapitalize="none"
              />

              {mode === 'login' ? (
                <TextInput
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    resetAuthMessage();
                  }}
                  placeholder="Mật khẩu"
                  placeholderTextColor="rgba(234, 244, 255, 0.52)"
                  style={styles.authInput}
                  secureTextEntry
                />
              ) : (
                <>
                  <TextInput
                    value={registerPassword}
                    onChangeText={(value) => {
                      setRegisterPassword(value);
                      resetAuthMessage();
                    }}
                    placeholder="Mật khẩu"
                    placeholderTextColor="rgba(234, 244, 255, 0.52)"
                    style={styles.authInput}
                    secureTextEntry
                  />
                  <TextInput
                    value={registerConfirm}
                    onChangeText={(value) => {
                      setRegisterConfirm(value);
                      resetAuthMessage();
                    }}
                    placeholder="Nhập lại mật khẩu"
                    placeholderTextColor="rgba(234, 244, 255, 0.52)"
                    style={styles.authInput}
                    secureTextEntry
                  />
                </>
              )}

              <TouchableOpacity
                activeOpacity={0.86}
                style={styles.primaryAuthButton}
                onPress={authLoading ? undefined : mode === 'login' ? handleLogin : handleRegister}
              >
                <Text style={styles.primaryAuthText}>
                  {authLoading ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.serverTopLeft}>
                <Text style={styles.gameLogoMain}>NightMoon</Text>
              </View>

              <View style={styles.serverRightMenu}>
                {[
                  ['▣', 'Thông báo'],
                  ['↻', 'Khôi phục'],
                  ['⚙', 'Cài đặt'],
                  ['☏', 'CSKH'],
                ].map(([icon, label]) => (
                  <TouchableOpacity key={label} activeOpacity={0.82} style={styles.serverMenuItem}>
                    <Text style={styles.serverMenuIcon}>{icon}</Text>
                    <Text style={styles.serverMenuText}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                activeOpacity={0.86}
                style={styles.serverCenterBar}
                onPress={() => setServerPickerOpen((current) => !current)}
              >
                <Text style={styles.serverHotText}>Hot</Text>
                <Text style={styles.serverCodeText}>{selectedServerCode}</Text>
                <Text style={styles.serverRefreshText}>↻</Text>
              </TouchableOpacity>

              {serverPickerOpen && (
                <View style={styles.serverDropdown}>
                  {servers.map((server, index) => {
                    const selected = selectedServer === server;
                    return (
                      <TouchableOpacity
                        key={server}
                        activeOpacity={0.85}
                        style={[styles.serverPillWide, selected && styles.serverPillActive]}
                        onPress={() => {
                          setSelectedServer(server);
                          setServerPickerOpen(false);
                        }}
                      >
                        <Text style={[styles.serverText, selected && styles.serverTextActive]}>{server}</Text>
                        {server === authenticatedAccount.last_server && (
                          <Text style={styles.serverMetaText}>Đã có tài khoản</Text>
                        )}
                        {!authenticatedAccount.last_server && index === 0 && (
                          <Text style={styles.serverMetaText}>Mới nhất</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <TouchableOpacity activeOpacity={0.86} style={styles.heroStartButton} onPress={starting ? undefined : handleStart}>
                <Text style={styles.heroStartText}>{starting ? 'Đang tải...' : 'Bắt đầu trò chơi'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.86}
                style={styles.termsRow}
                onPress={() => setTermsAccepted((current) => !current)}
              >
                <View style={[styles.termsBox, termsAccepted && styles.termsBoxChecked]}>
                  {termsAccepted && <Text style={styles.termsCheck}>✓</Text>}
                </View>
                <Text style={styles.termsText}>
                  Tôi đã đọc kỹ và đồng ý với Thoả thuận Người dùng và Thoả thuận Bảo vệ Riêng Tư
                </Text>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.86} style={styles.switchAccountButton} onPress={onLogout}>
                <Text style={styles.switchAccountText}>Đổi tài khoản</Text>
              </TouchableOpacity>

              <Text style={styles.versionText}>Phiên bản trò chơi: 1.09.0</Text>
            </>
          )}

          {!!message && <Text style={styles.authMessage}>{message}</Text>}

        </View>
      </SafeAreaView>
    </View>
  );
}

type HomeScreenProps = {
  onOpenCharacter: () => void;
  onOpenSummon: () => void;
  showUi: boolean;
  currencies: PlayerCurrencies | null;
  username: string;
};

function HomeScreen({ onOpenCharacter, onOpenSummon, showUi, currencies, username }: HomeScreenProps) {
  const bgPlayer = useVideoPlayer(bgVideo, (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  return (
    <>
      <VideoView
        player={bgPlayer}
        style={styles.backgroundVideo}
        contentFit="cover"
        nativeControls={false}
        allowsVideoFrameAnalysis={false}
        allowsPictureInPicture={false}
        pointerEvents="none"
        surfaceType="textureView"
      />

      {showUi && (
        <>
          <SafeAreaView pointerEvents="box-none" style={styles.homeOverlaySafeArea}>
            <View style={styles.profilePanel}>
              <View style={styles.profileAvatarFrame}>
                <Image source={avatarIcon} style={styles.profileAvatar} resizeMode="cover" />
                <Text style={styles.profileLevel}>1</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{username || 'NightMoon'}</Text>
                <View style={styles.profileExpBar}>
                  <View style={styles.profileExpFill} />
                </View>
              </View>
            </View>

            <View style={styles.leftQuestStack}>
              {['Rèn luyện', 'Thưởng Hội', 'Phúc Lợi'].map((label) => (
                <TouchableOpacity key={label} activeOpacity={0.82} style={styles.leftQuestButton}>
                  <Text style={styles.leftQuestIcon}>🎁</Text>
                  <Text style={styles.leftQuestText}>{label}</Text>
                  <View style={styles.redNotifyDot} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.quickTopRow}>
              {['Hòm thư', 'Bạn bè'].map((label, index) => (
                <TouchableOpacity key={label} activeOpacity={0.82} style={styles.quickTopItem}>
                  <Text style={styles.quickTopIcon}>{index === 0 ? '✉' : '♟'}</Text>
                  <Text style={styles.quickTopText}>{label}</Text>
                  <View style={styles.redNotifyDotSmall} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity activeOpacity={0.86} style={styles.featuredEvent} onPress={onOpenSummon}>
              <Image source={featuredBanner} style={styles.featuredEventImage} resizeMode="cover" />
              <View style={styles.featuredEventShade} />
              <Text style={styles.featuredEventTitle}>Tàn Tro Nữ</Text>
              <Text style={styles.featuredEventText}>Xác suất chiêu mộ tăng lên</Text>
            </TouchableOpacity>

            <View style={styles.chatBar}>
              <Text style={styles.chatBubbleIcon}>●</Text>
              <Text style={styles.chatText}>Kênh thế giới: Chào mừng đến NightMoon</Text>
            </View>

            <View style={styles.mainModeCluster}>
              <TouchableOpacity activeOpacity={0.84} style={styles.duelModeButton}>
                <Text style={styles.duelModeTitle}>Đấu Pháp</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.84} style={styles.storyModeButton}>
                <Text style={styles.storyChapter}>Chương 23</Text>
                <Text style={styles.storyModeTitle}>Nhập Thế</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.84} style={styles.challengeModeButton}>
                <Text style={styles.challengeModeTitle}>Khiêu Chiến</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          <View pointerEvents="none" style={styles.resourceSafeArea}>
            <View style={styles.resourceRow}>
              <View style={styles.resourceCard}>
                <Image source={thelucIcon} style={styles.resourceIcon} resizeMode="contain" />
                <Text style={styles.resourceText}>
                  {currencies ? `${currencies.stamina_current}/${currencies.stamina_max}` : '--/--'}
                </Text>
              </View>
              <View style={styles.resourceCard}>
                <Image source={coinIcon} style={styles.resourceIcon} resizeMode="contain" />
                <Text style={styles.resourceText}>{currencies?.coin ?? '--'}</Text>
              </View>
              <View style={styles.resourceCard}>
                <Image source={daquyIcon} style={styles.resourceIcon} resizeMode="contain" />
                <Text style={styles.resourceText}>{currencies?.gems ?? '--'}</Text>
              </View>
            </View>
          </View>

          <SafeAreaView style={styles.safeArea}>
            <View style={styles.spacer} />

            <View style={styles.bottomRow}>
              {allBottomRowButtons.map((button) => (
                <TouchableOpacity
                  key={button.key}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (button.key === 'nhanvat') {
                      onOpenCharacter();
                    }

                    if (button.key === 'chieumo') {
                      onOpenSummon();
                    }
                  }}
                  style={[
                    styles.bottomRowButtonTouch,
                    { width: button.width },
                    button.key !== 'chieumo' && styles.bottomRowButtonDim,
                    button.key === 'chieumo' && styles.chieumoOffset,
                  ]}
                >
                  <Image
                    source={button.source}
                    style={{ width: button.width, height: button.height }}
                    resizeMode="contain"
                  />
                  <Text
                    style={[
                      styles.bottomLabel,
                      button.key === 'chieumo' ? styles.bottomLabelMain : styles.bottomLabelSub,
                    ]}
                  >
                    {button.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </SafeAreaView>
        </>
      )}
    </>
  );
}

export default function App() {
  const [appStage, setAppStage] = useState<'loading' | 'auth' | 'server' | 'game'>('loading');
  const [loadProgress, setLoadProgress] = useState(8);
  const [activeScreen, setActiveScreen] = useState<'home' | 'character' | 'summon'>('home');
  const [currentAccount, setCurrentAccount] = useState<PlayerAccount | null>(null);
  const [playerState, setPlayerState] = useState<PlayerGameState>({
    profile: null,
    currencies: null,
    fragments: {},
    summonStates: {},
    heroProgress: {},
  });
  const [sessionChecked, setSessionChecked] = useState(false);
  const [fontsLoaded] = useFonts({
    BeVietnamProSemiBold: require('./assets/text/Be_Vietnam_Pro,Lobster,Montserrat,Poppins/Be_Vietnam_Pro/BeVietnamPro-SemiBold.ttf'),
    Lobster: require('./assets/text/Be_Vietnam_Pro,Lobster,Montserrat,Poppins/Lobster/Lobster-Regular.ttf'),
    MontserratSemiBold: require('./assets/text/Be_Vietnam_Pro,Lobster,Montserrat,Poppins/Montserrat/static/Montserrat-SemiBold.ttf'),
    PoppinsMedium: require('./assets/text/Be_Vietnam_Pro,Lobster,Montserrat,Poppins/Poppins/Poppins-Medium.ttf'),
  });

  const showServerForAccount = async (account: PlayerAccount) => {
    setCurrentAccount(account);
    setActiveScreen('home');
    setAppStage('auth');
  };

  const openGameForAccount = async (account: PlayerAccount) => {
    const nextPlayerState = await loadPlayerGameState(account);
    setCurrentAccount(account);
    setPlayerState(nextPlayerState);
    setActiveScreen('home');
    setAppStage('game');
  };

  const handleLogout = async () => {
    await logoutPlayer();
    setCurrentAccount(null);
    setPlayerState({ profile: null, currencies: null, fragments: {}, summonStates: {}, heroProgress: {} });
    setActiveScreen('home');
    setAppStage('auth');
  };

  const handleStartGame = async (serverKey: string) => {
    if (!currentAccount) {
      throw new Error('Chưa đăng nhập tài khoản.');
    }

    const nextAccount = await savePlayerServer(currentAccount, serverKey);
    await openGameForAccount(nextAccount);
  };

  const handleSummonSaved = async (cost: number, bannerKey: string): Promise<SummonResult> => {
    if (!currentAccount || !playerState.currencies) {
      throw new Error('Chưa tải dữ liệu người chơi.');
    }

    if (playerState.currencies.summon_tickets < cost) {
      throw new Error('Không đủ vé chiêu mộ.');
    }

    const currentSummonState = playerState.summonStates[bannerKey];
    const currentTotalSummons = currentSummonState?.total_summons ?? 0;
    const currentPity = currentSummonState?.pity_counter ?? 0;
    const { rewards, pityCounter } = createSummonRewardsWithPity(cost, currentPity);
    const totalFragments = rewards.reduce((total, reward) => total + reward.amount, 0);
    const [nextCurrencies, nextFragment, nextSummonState] = await Promise.all([
      updatePlayerCurrencies(currentAccount.id, {
        ...playerState.currencies,
        summon_tickets: playerState.currencies.summon_tickets - cost,
      }),
      incrementPlayerFragments(currentAccount.id, playerState.fragments, ASHLYN_HERO_KEY, totalFragments),
      updatePlayerSummonState(currentAccount.id, bannerKey, currentTotalSummons + cost, pityCounter),
    ]);

    setPlayerState((currentState) => ({
      ...currentState,
      currencies: nextCurrencies,
      fragments: {
        ...currentState.fragments,
        [nextFragment.hero_key]: nextFragment.fragments,
      },
      summonStates: {
        ...currentState.summonStates,
        [nextSummonState.banner_key]: nextSummonState,
      },
    }));

    return {
      rewards,
      summonState: nextSummonState,
    };
  };

  const handleBreakthrough = async (heroKey: string) => {
    if (!currentAccount || !playerState.currencies) {
      throw new Error('Chưa tải dữ liệu người chơi.');
    }

    const currentFragments = playerState.fragments[heroKey] ?? 0;

    if (currentFragments < BREAKTHROUGH_FRAGMENT_COST) {
      throw new Error('Không đủ mảnh để đột phá.');
    }

    if (playerState.currencies.coin < BREAKTHROUGH_COIN_COST) {
      throw new Error('Không đủ coin để đột phá.');
    }

    const currentProgress = playerState.heroProgress[heroKey];
    const nextBreakthroughLevel = (currentProgress?.breakthrough_level ?? 0) + 1;
    const nextTalentPoints = (currentProgress?.talent_points ?? BASE_TALENT_POINTS) + BREAKTHROUGH_TALENT_GAIN;
    const nextFragmentsAmount = currentFragments - BREAKTHROUGH_FRAGMENT_COST;

    const [nextCurrencies, nextFragment, nextProgress] = await Promise.all([
      updatePlayerCurrencies(currentAccount.id, {
        ...playerState.currencies,
        coin: playerState.currencies.coin - BREAKTHROUGH_COIN_COST,
      }),
      setPlayerFragments(currentAccount.id, heroKey, nextFragmentsAmount),
      updatePlayerHeroProgress(currentAccount.id, heroKey, nextBreakthroughLevel, nextTalentPoints),
    ]);

    setPlayerState((currentState) => ({
      ...currentState,
      currencies: nextCurrencies,
      fragments: {
        ...currentState.fragments,
        [nextFragment.hero_key]: nextFragment.fragments,
      },
      heroProgress: {
        ...currentState.heroProgress,
        [nextProgress.hero_key]: nextProgress,
      },
    }));
  };

  useEffect(() => {
    let active = true;

    getStoredPlayerSession().then((account) => {
      if (!active) {
        return;
      }

      setCurrentAccount(account);
      setSessionChecked(true);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (sessionChecked && currentAccount && appStage === 'auth') {
      showServerForAccount(currentAccount).catch(() => {
        if (active) {
          setAppStage('auth');
        }
      });
    }

    return () => {
      active = false;
    };
  }, [sessionChecked, currentAccount, appStage]);

  useEffect(() => {
    let active = true;

    const preload = async () => {
      try {
        const totalAssets = preloadAssets.length;

        await Promise.all(
          preloadAssets.map(async (asset, index) => {
            await Asset.fromModule(asset).downloadAsync();

            if (active) {
              setLoadProgress(Math.min(92, 12 + ((index + 1) / totalAssets) * 78));
            }
          }),
        );
      } catch {
        if (active) {
          setLoadProgress(92);
        }
      } finally {
        setTimeout(() => {
          if (active) {
            setLoadProgress(100);
            setAppStage('auth');
          }
        }, 450);
      }
    };

    preload();

    return () => {
      active = false;
    };
  }, []);

  return (
    <SafeAreaProvider>
      <View style={styles.background}>
        <StatusBar hidden />
        <NavigationBar hidden />

        {(!fontsLoaded || appStage === 'loading') && <LoadingScreen progress={loadProgress} />}

        {fontsLoaded && appStage === 'auth' && (
          <LoginScreen
            authenticatedAccount={currentAccount}
            onAuthenticated={showServerForAccount}
            onStart={handleStartGame}
            onLogout={handleLogout}
          />
        )}

        {fontsLoaded && appStage === 'game' && (
          <>
            <HomeScreen
              onOpenCharacter={() => setActiveScreen('character')}
              onOpenSummon={() => setActiveScreen('summon')}
              showUi={activeScreen === 'home'}
              currencies={playerState.currencies}
              username={currentAccount?.username ?? playerState.profile?.username ?? ''}
            />

            {activeScreen === 'character' && (
              <ImageBackground source={bgImage} resizeMode="cover" style={styles.characterLayer}>
                <CharacterScreen
                  onBack={() => setActiveScreen('home')}
                  currencies={playerState.currencies}
                  fragments={playerState.fragments}
                  heroProgress={playerState.heroProgress}
                  onBreakthrough={handleBreakthrough}
                />
              </ImageBackground>
            )}

            {activeScreen === 'summon' && (
              <View style={styles.characterLayer}>
                <SummonScreen
                  onBack={() => setActiveScreen('home')}
                  currencies={playerState.currencies}
                  summonStates={playerState.summonStates}
                  onSummonSaved={handleSummonSaved}
                />
              </View>
            )}
          </>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  characterLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  authShell: {
    flex: 1,
    backgroundColor: '#081427',
  },
  loadingShade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(4, 8, 20, 0.34)',
  },
  loadingPanel: {
    position: 'absolute',
    right: 36,
    bottom: 28,
    width: 270,
    borderRadius: 8,
    backgroundColor: 'rgba(7, 13, 29, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(174, 222, 255, 0.28)',
    padding: 14,
  },
  loadingTitle: {
    color: '#F7EAB0',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 15,
  },
  loadingBar: {
    marginTop: 9,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
  },
  loadingFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#68C9FF',
  },
  loadingText: {
    marginTop: 5,
    color: '#EAF4FF',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 11,
    textAlign: 'right',
  },
  loginShade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(7, 12, 28, 0.56)',
  },
  loginSafeArea: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 6,
    alignItems: 'center',
  },
  serverSelectBlock: {
    marginTop: 12,
  },
  serverLabel: {
    color: '#EAF4FF',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 11,
    textAlign: 'center',
  },
  serverChoices: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    columnGap: 6,
  },
  serverPill: {
    minWidth: 88,
    height: 25,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 25, 53, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serverPillActive: {
    backgroundColor: 'rgba(41, 90, 154, 0.82)',
    borderColor: 'rgba(153, 221, 255, 0.68)',
  },
  serverText: {
    color: 'rgba(234, 244, 255, 0.72)',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 8,
  },
  serverTextActive: {
    color: '#FFFFFF',
  },
  newServerText: {
    position: 'absolute',
    top: -7,
    right: 6,
    borderRadius: 7,
    backgroundColor: '#E48D2E',
    color: '#FFF6DD',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 7,
    paddingHorizontal: 5,
    overflow: 'hidden',
  },
  serverEntryCard: {
    width: 318,
    marginTop: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(9, 16, 34, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(174, 222, 255, 0.25)',
    padding: 16,
  },
  serverSelectButton: {
    marginTop: 16,
    minHeight: 62,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 25, 53, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(153, 221, 255, 0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  serverSelectedText: {
    marginTop: 3,
    color: '#FFF2C2',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 13,
  },
  serverChoicesVertical: {
    marginTop: 10,
    rowGap: 7,
  },
  serverPillWide: {
    minHeight: 26,
    borderRadius: 6,
    backgroundColor: 'rgba(15, 25, 53, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serverMetaText: {
    marginTop: 0,
    color: '#FFE8A8',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 7,
  },
  loginCard: {
    width: 310,
    marginTop: 18,
    borderRadius: 8,
    backgroundColor: 'rgba(9, 16, 34, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(174, 222, 255, 0.25)',
    padding: 16,
  },
  serverInlinePanel: {
    position: 'relative',
    flex: 1,
    width: '100%',
  },
  serverTopLeft: {
    position: 'absolute',
    top: 20,
    left: 28,
  },
  gameLogoMain: {
    color: '#FFE7A4',
    fontFamily: 'Lobster',
    fontSize: 40,
    lineHeight: 44,
    textShadowColor: '#7A3A13',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  serverRightMenu: {
    position: 'absolute',
    top: 18,
    right: 16,
    rowGap: 8,
    alignItems: 'center',
  },
  serverMenuItem: {
    width: 56,
    alignItems: 'center',
  },
  serverMenuIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(65, 40, 41, 0.54)',
    borderWidth: 1,
    borderColor: 'rgba(255, 231, 164, 0.55)',
    color: '#FFF3C7',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 18,
    lineHeight: 30,
    textAlign: 'center',
    textShadowColor: '#7A3A13',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  serverMenuText: {
    marginTop: 0,
    color: '#FFF4D1',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 10,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  serverCenterBar: {
    position: 'absolute',
    left: '34%',
    right: '34%',
    bottom: 100,
    height: 28,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(234, 202, 120, 0.36)',
    backgroundColor: 'rgba(16, 15, 20, 0.62)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serverHotText: {
    position: 'absolute',
    left: 24,
    color: '#FF5D36',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 13,
  },
  serverCodeText: {
    color: '#FFFFFF',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 16,
  },
  serverRefreshText: {
    position: 'absolute',
    right: 24,
    color: '#D18A36',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 17,
  },
  serverDropdown: {
    position: 'absolute',
    left: '37%',
    right: '37%',
    bottom: 132,
    rowGap: 5,
    zIndex: 4,
  },
  heroStartButton: {
    position: 'absolute',
    left: '32%',
    right: '32%',
    bottom: 58,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStartText: {
    color: '#FFE6A7',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
    textShadowColor: '#9B4D1E',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  termsRow: {
    position: 'absolute',
    left: '22%',
    right: '22%',
    bottom: 24,
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 6,
  },
  termsBox: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#FFE6A7',
    backgroundColor: 'rgba(18, 16, 20, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsBoxChecked: {
    backgroundColor: '#B57A31',
  },
  termsCheck: {
    color: '#FFF4CC',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 10,
    lineHeight: 12,
  },
  termsText: {
    color: '#FFF4CC',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 10,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  switchAccountButton: {
    position: 'absolute',
    left: 22,
    bottom: 18,
    borderRadius: 12,
    backgroundColor: 'rgba(11, 12, 20, 0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  switchAccountText: {
    color: 'rgba(255, 244, 209, 0.86)',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 9,
  },
  versionText: {
    position: 'absolute',
    right: 12,
    bottom: 8,
    color: 'rgba(255, 244, 209, 0.8)',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 8,
  },
  loginTitle: {
    color: '#FFF2C2',
    fontFamily: 'Lobster',
    fontSize: 31,
    lineHeight: 35,
    textAlign: 'center',
  },
  loginSubtitle: {
    marginTop: 2,
    color: 'rgba(234, 244, 255, 0.76)',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 11,
    textAlign: 'center',
  },
  authTabs: {
    marginTop: 13,
    flexDirection: 'row',
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 3,
  },
  authTab: {
    flex: 1,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authTabActive: {
    backgroundColor: '#C9795E',
  },
  authTabText: {
    color: 'rgba(234, 244, 255, 0.7)',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 11,
  },
  authTabTextActive: {
    color: '#FFF3DD',
  },
  authInput: {
    marginTop: 9,
    height: 36,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    color: '#FFFFFF',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 12,
    paddingHorizontal: 10,
  },
  primaryAuthButton: {
    marginTop: 12,
    height: 36,
    borderRadius: 7,
    backgroundColor: '#C9795E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryAuthText: {
    color: '#FFF3DD',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 13,
  },
  authMessage: {
    marginTop: 8,
    minHeight: 16,
    color: '#F7EAB0',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 10,
    textAlign: 'center',
  },
  startButton: {
    marginTop: 11,
    height: 42,
    borderRadius: 18,
    backgroundColor: '#2F8CCF',
    borderWidth: 1,
    borderColor: '#AEEAFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 16,
  },
  logoutButton: {
    marginTop: 10,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: 'rgba(234, 244, 255, 0.72)',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 11,
  },
  serverHint: {
    marginTop: 8,
    color: 'rgba(234, 244, 255, 0.66)',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 10,
    textAlign: 'center',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  homeOverlaySafeArea: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 12,
  },
  profilePanel: {
    position: 'absolute',
    top: 8,
    left: 12,
    width: 188,
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatarFrame: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: '#D99B48',
    backgroundColor: 'rgba(25, 20, 30, 0.72)',
    overflow: 'hidden',
  },
  profileAvatar: {
    width: '100%',
    height: '100%',
  },
  profileLevel: {
    position: 'absolute',
    top: 1,
    left: 2,
    color: '#FFF4CC',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 10,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  profileInfo: {
    flex: 1,
    height: 42,
    marginLeft: -4,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: 'rgba(31, 27, 39, 0.55)',
    justifyContent: 'center',
    paddingLeft: 14,
    paddingRight: 8,
  },
  profileName: {
    color: '#FFF8E3',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 15,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  profileExpBar: {
    marginTop: 6,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
  },
  profileExpFill: {
    width: '34%',
    height: '100%',
    backgroundColor: '#F4C45E',
  },
  leftQuestStack: {
    position: 'absolute',
    top: 78,
    left: 14,
    rowGap: 0,
  },
  leftQuestButton: {
    width: 52,
    alignItems: 'center',
  },
  leftQuestIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 238, 177, 0.55)',
    backgroundColor: 'rgba(32, 31, 42, 0.58)',
    color: '#FFF0BD',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 14,
    lineHeight: 34,
    textAlign: 'center',
  },
  leftQuestText: {
    marginTop: -4,
    color: '#FFF4D1',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 8,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  redNotifyDot: {
    position: 'absolute',
    top: 0,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D9283A',
    borderWidth: 1,
    borderColor: '#FFF4D1',
  },
  quickTopRow: {
    position: 'absolute',
    left: 42,
    bottom: 114,
    flexDirection: 'row',
    columnGap: 8,
  },
  quickTopItem: {
    width: 34,
    alignItems: 'center',
  },
  quickTopIcon: {
    width: 30,
    height: 26,
    borderRadius: 5,
    backgroundColor: 'rgba(22, 25, 36, 0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255, 238, 177, 0.32)',
    color: '#FFF0BD',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 13,
    lineHeight: 24,
    textAlign: 'center',
  },
  quickTopText: {
    marginTop: 1,
    color: '#FFF4D1',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 7,
    textAlign: 'center',
  },
  redNotifyDotSmall: {
    position: 'absolute',
    top: -2,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D9283A',
    borderWidth: 1,
    borderColor: '#FFF4D1',
  },
  featuredEvent: {
    position: 'absolute',
    left: 20,
    bottom: 48,
    width: 214,
    height: 62,
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 238, 177, 0.45)',
    backgroundColor: 'rgba(12, 18, 36, 0.58)',
  },
  featuredEventImage: {
    width: '100%',
    height: '100%',
  },
  featuredEventShade: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: 30,
    backgroundColor: 'rgba(16, 15, 34, 0.62)',
  },
  featuredEventTitle: {
    position: 'absolute',
    right: 10,
    bottom: 24,
    color: '#FFF0A8',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 12,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  featuredEventText: {
    position: 'absolute',
    right: 10,
    bottom: 7,
    color: '#FFFFFF',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 9,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  chatBar: {
    position: 'absolute',
    left: 18,
    bottom: 13,
    width: 286,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(7, 10, 18, 0.62)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    columnGap: 6,
  },
  chatBubbleIcon: {
    color: '#FFF4D1',
    fontSize: 12,
  },
  chatText: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 11,
  },
  mainModeCluster: {
    position: 'absolute',
    right: 22,
    top: 95,
    width: 330,
    height: 154,
  },
  duelModeButton: {
    position: 'absolute',
    top: 0,
    right: 62,
    width: 126,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duelModeTitle: {
    color: '#FFF6E0',
    fontFamily: 'Lobster',
    fontSize: 24,
    lineHeight: 30,
    textShadowColor: '#7E2E22',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  storyModeButton: {
    position: 'absolute',
    right: 0,
    top: 62,
    width: 184,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyChapter: {
    position: 'absolute',
    top: -24,
    right: 10,
    minWidth: 92,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#DAC88A',
    backgroundColor: 'rgba(255, 250, 221, 0.9)',
    color: '#6E5332',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 3,
  },
  storyModeTitle: {
    color: '#FFF9EB',
    fontFamily: 'Lobster',
    fontSize: 34,
    lineHeight: 42,
    textShadowColor: '#7E2E22',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  challengeModeButton: {
    position: 'absolute',
    left: 0,
    bottom: 2,
    width: 170,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeModeTitle: {
    color: '#FFF9EB',
    fontFamily: 'Lobster',
    fontSize: 32,
    lineHeight: 38,
    textShadowColor: '#7E2E22',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  resourceSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 18,
    alignItems: 'flex-end',
    paddingRight: 10,
  },
  resourceRow: {
    flexDirection: 'row',
    columnGap: 6,
    paddingTop: 5,
  },
  resourceCard: {
    minWidth: 74,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(19, 22, 32, 0.66)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    columnGap: 4,
  },
  resourceIcon: {
    width: 14,
    height: 14,
  },
  resourceText: {
    color: '#FCE7A1',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    width: '100%',
    columnGap: 6,
    paddingRight: 2,
  },
  bottomRowButtonTouch: {
    alignItems: 'center',
  },
  bottomRowButtonDim: {
    opacity: 0.75,
  },
  bottomLabel: {
    marginTop: -2,
    color: 'rgba(255, 242, 194, 0.62)',
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  bottomLabelMain: {
    fontSize: 14,
    fontFamily: 'Lobster',
    marginTop: -8,
  },
  bottomLabelSub: {
    fontSize: 11,
    fontFamily: 'BeVietnamProSemiBold',
  },
  chieumoOffset: {
    marginBottom: -8,
  },
  spacer: {
    flex: 1,
  },
});
