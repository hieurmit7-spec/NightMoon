import { useEffect, useRef, useState } from 'react';
import { useEventListener } from 'expo';
import {
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { PlayerCurrencies, PlayerSummonState, SummonReward, SummonResult } from '../types/game';

type SummonScreenProps = {
  onBack: () => void;
  currencies: PlayerCurrencies | null;
  summonStates: Record<string, PlayerSummonState>;
  onSummonSaved: (cost: number, bannerKey: string) => Promise<SummonResult>;
};

type SummonTabKey = 'hero' | 'weapon';

const heroBanner = require('../../assets/ashlyn vaelys/banner1.png');
const weaponBanner = require('../../assets/ashlyn vaelys/banner2.png');
const ashlynAvatar = require('../../assets/ashlyn vaelys/11.png');
const weaponIcon = require('../../assets/ashlyn vaelys/icon.png');
const rollIcon = require('../../assets/tai nguyen/roll.png');
const coinIcon = require('../../assets/tai nguyen/coin.png');
const gemIcon = require('../../assets/tai nguyen/daquy.png');
const pieceIcon = require('../../assets/UI game/banner/piece.png');
const gachaVideo = require('../../assets/UI game/banner/gacha.mp4');
const repeatVideo = require('../../assets/UI game/banner/re.mp4');

const tabs = [
  {
    key: 'hero',
    label: 'Thỉnh Thần',
    banner: heroBanner,
    icon: ashlynAvatar,
    ribbon: 'Ngôi Sao',
    rarityName: 'Tàn Tro Nữ',
    guarantee: 'Trong vòng 60 lần chắc chắn nhận [Tàn Tro Nữ]',
    multi: 10,
  },
  {
    key: 'weapon',
    label: 'Tìm Báu',
    banner: weaponBanner,
    icon: weaponIcon,
    ribbon: 'Sức Mạnh Ngôi Sao',
    rarityName: 'Nguyệt Vũ Thần Tử',
    guarantee: 'Trong vòng 50 lần chắc chắn nhận [SSR]',
    multi: 5,
  },
] as const;

export default function SummonScreen({ onBack, currencies, summonStates, onSummonSaved }: SummonScreenProps) {
  const [activeTab, setActiveTab] = useState<SummonTabKey>('hero');
  const [gachaOpen, setGachaOpen] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [showRepeatVideo, setShowRepeatVideo] = useState(false);
  const [visibleRewardCount, setVisibleRewardCount] = useState(0);
  const [rewards, setRewards] = useState<SummonReward[]>([]);
  const [savingSummon, setSavingSummon] = useState(false);
  const [summonMessage, setSummonMessage] = useState('');
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rewardTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gachaOpenRef = useRef(false);
  const gachaPlayer = useVideoPlayer(gachaVideo, (player) => {
    player.loop = false;
    player.audioMixingMode = 'doNotMix';
    player.muted = false;
    player.volume = 1;
  });
  const repeatPlayer = useVideoPlayer(repeatVideo, (player) => {
    player.loop = true;
    player.audioMixingMode = 'mixWithOthers';
    player.muted = true;
  });
  const activeBanner = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];
  const activeSummonState = summonStates[activeBanner.key];
  const totalSummons = activeSummonState?.total_summons ?? 0;
  const pityCounter = activeSummonState?.pity_counter ?? 0;
  const rollsUntilGuaranteed = Math.max(1, 60 - pityCounter);

  const clearRevealTimer = () => {
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  };

  const clearRewardTimer = () => {
    if (rewardTimerRef.current) {
      clearInterval(rewardTimerRef.current);
      rewardTimerRef.current = null;
    }
  };

  const startSummon = async (count: number) => {
    if (savingSummon) {
      return;
    }

    if (!currencies) {
      setSummonMessage('Chưa tải dữ liệu người chơi.');
      return;
    }

    if (currencies.summon_tickets < count) {
      setSummonMessage('Không đủ vé chiêu mộ.');
      return;
    }

    clearRevealTimer();
    clearRewardTimer();
    gachaOpenRef.current = true;
    let nextRewards: SummonReward[] = [];

    try {
      setSavingSummon(true);
      setSummonMessage('');
      const result = await onSummonSaved(count, activeBanner.key);
      nextRewards = result.rewards;
    } catch (error) {
      setSummonMessage(error instanceof Error ? error.message : 'Không lưu được lượt chiêu mộ.');
      return;
    } finally {
      setSavingSummon(false);
    }

    setRewards(nextRewards);
    setShowRewards(false);
    setShowRepeatVideo(false);
    setVisibleRewardCount(0);
    setGachaOpen(true);

    gachaPlayer.loop = false;
    gachaPlayer.audioMixingMode = 'doNotMix';
    gachaPlayer.muted = false;
    gachaPlayer.volume = 1;
    gachaPlayer.replay();
    gachaPlayer.play();
    repeatPlayer.replay();
    repeatPlayer.pause();

    revealTimerRef.current = setTimeout(() => {
      setShowRewards(true);
      let nextVisibleCount = 0;

      rewardTimerRef.current = setInterval(() => {
        nextVisibleCount += 1;
        setVisibleRewardCount(nextVisibleCount);

        if (nextVisibleCount >= nextRewards.length) {
          clearRewardTimer();
        }
      }, 180);

      revealTimerRef.current = null;
    }, 6000);
  };

  const closeGacha = () => {
    clearRevealTimer();
    clearRewardTimer();
    gachaOpenRef.current = false;
    gachaPlayer.pause();
    repeatPlayer.pause();
    setGachaOpen(false);
    setShowRewards(false);
    setShowRepeatVideo(false);
    setVisibleRewardCount(0);
  };

  useEventListener(gachaPlayer, 'playToEnd', () => {
    if (!gachaOpenRef.current) {
      return;
    }

    gachaPlayer.pause();
    setShowRepeatVideo(true);
    repeatPlayer.muted = true;
    repeatPlayer.play();
  });

  useEffect(
    () => () => {
      clearRevealTimer();
      clearRewardTimer();
    },
    [],
  );

  return (
    <View style={styles.container}>
      <ImageBackground source={activeBanner.banner} resizeMode="cover" style={styles.banner}>
        <View style={styles.shadowTop} />
        <View style={styles.shadowBottom} />

        <SafeAreaView pointerEvents="box-none" style={styles.safeArea}>
          <View style={styles.topBar}>
            <TouchableOpacity activeOpacity={0.85} style={styles.backButton} onPress={onBack}>
              <Text style={styles.backText}>← Quay lại</Text>
            </TouchableOpacity>

            <View style={styles.titleBlock}>
              <Text style={styles.title}>Chiêu Mộ</Text>
              <Text style={styles.subtitle}>Sự Kiện</Text>
            </View>

            <View style={styles.resourceRow}>
              <View style={styles.resourcePill}>
                <Image source={coinIcon} resizeMode="contain" style={styles.resourceIcon} />
                <Text style={styles.resourceText}>{currencies?.coin ?? '--'}</Text>
                <Text style={styles.plusText}>+</Text>
              </View>
              <View style={styles.resourcePill}>
                <Image source={rollIcon} resizeMode="contain" style={styles.resourceIcon} />
                <Text style={styles.resourceText}>{currencies?.summon_tickets ?? '--'}</Text>
                <Text style={styles.plusText}>+</Text>
              </View>
              <View style={styles.resourcePill}>
                <Image source={gemIcon} resizeMode="contain" style={styles.resourceIcon} />
                <Text style={styles.resourceText}>{currencies?.gems ?? '--'}</Text>
                <Text style={styles.plusText}>+</Text>
              </View>
            </View>
          </View>

          <View style={styles.content}>
            <View style={styles.sideTabs}>
              {tabs.map((tab) => {
                const selected = tab.key === activeTab;
                return (
                  <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} style={styles.sideTab}>
                    <View style={[styles.sideIconFrame, selected && styles.sideIconFrameActive]}>
                      <Image source={tab.icon} resizeMode="cover" style={styles.sideIcon} />
                    </View>
                    <View style={[styles.sideLabel, selected && styles.sideLabelActive]}>
                      <Text style={styles.sideLabelText}>{tab.label}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.bannerTextLayer} pointerEvents="none">
              <View style={styles.timePill}>
                <Text style={styles.timeIcon}>⌛</Text>
                <Text style={styles.timeText}>20 ngày 20 giờ</Text>
              </View>

              <View style={styles.nameGroup}>
                <Text style={styles.ribbonText}>{activeBanner.ribbon}</Text>
                <View style={styles.ssrRow}>
                  <Text style={styles.ssrBadge}>SSR</Text>
                  <Text style={styles.unitName}>{activeBanner.rarityName}</Text>
                </View>
              </View>

              <Text style={styles.eventTitle}>Lưỡi hái vung lên{'\n'}vạn vật hóa tro tàn</Text>
            </View>

            <View style={styles.guaranteeBar} pointerEvents="none">
              <Text style={styles.guaranteeText}>{activeBanner.guarantee}</Text>
              <View style={styles.infoDot}>
                <Text style={styles.infoDotText}>!</Text>
              </View>
            </View>

            <View style={styles.pityBar} pointerEvents="none">
              <Text style={styles.pityText}>
                Đã quay {totalSummons} lần · Còn {rollsUntilGuaranteed} lần chắc chắn 60 mảnh
              </Text>
            </View>

            {!!summonMessage && <Text style={styles.summonMessage}>{summonMessage}</Text>}

            <View style={styles.bottomActions}>
              <TouchableOpacity
                activeOpacity={0.86}
                style={[styles.summonButton, savingSummon && styles.summonButtonDisabled]}
                onPress={() => startSummon(1)}
              >
                <View style={styles.costBlock}>
                  <Image source={rollIcon} resizeMode="contain" style={styles.costIcon} />
                  <Text style={styles.costText}>×1</Text>
                </View>
                <Text style={styles.summonButtonText}>Chiêu mộ ×1</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.86}
                style={[styles.summonButton, savingSummon && styles.summonButtonDisabled]}
                onPress={() => startSummon(activeBanner.multi)}
              >
                <View style={styles.costBlock}>
                  <Image source={rollIcon} resizeMode="contain" style={styles.costIcon} />
                  <Text style={[styles.costText, styles.costTextRed]}>×{activeBanner.multi}</Text>
                </View>
                <Text style={styles.summonButtonText}>Chiêu mộ ×{activeBanner.multi}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity activeOpacity={0.86} style={styles.exchangeButton}>
              <Text style={styles.exchangeIcon}>市</Text>
              <Text style={styles.exchangeText}>Cửa Hàng Đổi</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ImageBackground>

      {gachaOpen && (
        <Pressable style={styles.gachaOverlay} onPress={closeGacha}>
          <VideoView
            player={repeatPlayer}
            style={styles.gachaVideo}
            contentFit="cover"
            nativeControls={false}
            allowsVideoFrameAnalysis={false}
            allowsPictureInPicture={false}
            surfaceType="textureView"
            pointerEvents="none"
          />

          {!showRepeatVideo && (
            <VideoView
              player={gachaPlayer}
              style={styles.gachaVideo}
              contentFit="cover"
              nativeControls={false}
              allowsVideoFrameAnalysis={false}
              allowsPictureInPicture={false}
              surfaceType="textureView"
              pointerEvents="none"
            />
          )}

          {showRewards && (
            <View style={styles.rewardLayer} pointerEvents="none">
              <Text style={styles.rewardTitle}>Chúc Mừng Nhận Được</Text>
              <View style={styles.rewardPanel}>
                <View style={styles.rewardGrid}>
                  {rewards.slice(0, visibleRewardCount).map((reward) => (
                    <View
                      key={reward.id}
                      style={[styles.rewardCard, reward.amount >= 60 && styles.rewardCardRare]}
                    >
                      <View style={styles.rewardImageWrap}>
                        <Image source={ashlynAvatar} resizeMode="cover" style={styles.rewardHeroImage} />
                        <Image source={pieceIcon} resizeMode="contain" style={styles.rewardPieceIcon} />
                      </View>
                      <View style={styles.rewardAmountBar}>
                        <Text style={styles.rewardAmountText}>{reward.amount}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
              <Text style={styles.tapHint}>Ấn vào vị trí bất kì để tiếp tục</Text>
            </View>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1630',
  },
  banner: {
    flex: 1,
  },
  shadowTop: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: 56,
    backgroundColor: 'rgba(7, 10, 29, 0.28)',
  },
  shadowBottom: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: 112,
    backgroundColor: 'rgba(4, 8, 24, 0.22)',
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  backButton: {
    marginTop: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(18, 30, 66, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(144, 201, 255, 0.28)',
  },
  backText: {
    color: '#EAF4FF',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 10,
  },
  titleBlock: {
    marginLeft: 12,
  },
  title: {
    color: '#F9FCFF',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 19,
    lineHeight: 21,
    textShadowColor: '#14366E',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  subtitle: {
    color: '#F9FCFF',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 17,
    lineHeight: 19,
    textShadowColor: '#14366E',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  resourceRow: {
    marginLeft: 'auto',
    flexDirection: 'row',
    columnGap: 7,
  },
  resourcePill: {
    height: 22,
    minWidth: 96,
    borderRadius: 11,
    backgroundColor: 'rgba(24, 28, 49, 0.66)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 6,
    paddingRight: 6,
    columnGap: 6,
  },
  resourceIcon: {
    width: 18,
    height: 18,
  },
  resourceText: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 14,
    textAlign: 'center',
  },
  plusText: {
    color: '#FFF2C4',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 19,
    lineHeight: 21,
  },
  content: {
    flex: 1,
  },
  sideTabs: {
    position: 'absolute',
    left: 12,
    top: 82,
    width: 64,
    rowGap: 20,
    zIndex: 3,
  },
  sideTab: {
    alignItems: 'center',
  },
  sideIconFrame: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(130, 191, 255, 0.55)',
    backgroundColor: 'rgba(30, 83, 149, 0.7)',
    overflow: 'hidden',
  },
  sideIconFrameActive: {
    borderColor: '#FBE887',
    shadowColor: '#70D6FF',
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  sideIcon: {
    width: '100%',
    height: '100%',
  },
  sideLabel: {
    marginTop: -4,
    minWidth: 60,
    borderRadius: 4,
    backgroundColor: 'rgba(11, 18, 38, 0.55)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  sideLabelActive: {
    backgroundColor: 'rgba(16, 38, 76, 0.72)',
  },
  sideLabelText: {
    color: '#FFFFFF',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 11,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bannerTextLayer: {
    position: 'absolute',
    top: 66,
    right: 76,
    left: 150,
    height: 204,
  },
  timePill: {
    position: 'absolute',
    top: 20,
    right: 136,
    minWidth: 138,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(81, 101, 179, 0.72)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
  },
  timeIcon: {
    color: '#C8EDFF',
    fontSize: 16,
  },
  timeText: {
    color: '#FFFFFF',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 13,
  },
  nameGroup: {
    position: 'absolute',
    left: 0,
    top: 62,
  },
  ribbonText: {
    alignSelf: 'flex-start',
    borderRadius: 15,
    backgroundColor: '#E58317',
    color: '#FFF4CC',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 18,
    paddingHorizontal: 18,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  ssrRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 13,
    backgroundColor: 'rgba(34, 111, 203, 0.76)',
    paddingRight: 12,
  },
  ssrBadge: {
    color: '#FFB956',
    fontFamily: 'Lobster',
    fontSize: 22,
    paddingHorizontal: 9,
    textShadowColor: '#772B09',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  unitName: {
    color: '#F3F4FF',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 17,
    lineHeight: 21,
  },
  eventTitle: {
    position: 'absolute',
    right: 0,
    top: 74,
    width: 318,
    color: '#FFF6B8',
    fontFamily: 'Lobster',
    fontSize: 30,
    lineHeight: 39,
    textAlign: 'left',
    textShadowColor: 'rgba(24, 46, 92, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  guaranteeBar: {
    position: 'absolute',
    left: 150,
    right: 170,
    bottom: 90,
    minHeight: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(33, 47, 68, 0.62)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 11,
  },
  guaranteeText: {
    color: '#FFFFFF',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 13,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  infoDot: {
    marginLeft: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1A65AE',
    borderWidth: 1,
    borderColor: '#D7E9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoDotText: {
    color: '#FFF6A8',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 15,
    lineHeight: 18,
  },
  pityBar: {
    position: 'absolute',
    left: 190,
    right: 190,
    bottom: 66,
    minHeight: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(8, 13, 29, 0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  pityText: {
    color: '#FFE8A8',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 10,
    textAlign: 'center',
  },
  summonMessage: {
    position: 'absolute',
    left: 210,
    right: 210,
    bottom: 70,
    color: '#FFF2B8',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 13,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bottomActions: {
    position: 'absolute',
    left: 210,
    right: 210,
    bottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summonButton: {
    width: 158,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#B84239',
    borderWidth: 2,
    borderColor: '#F2D790',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  summonButtonDisabled: {
    opacity: 0.55,
  },
  costBlock: {
    width: 62,
    height: '100%',
    backgroundColor: '#FFF5DA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 3,
  },
  costIcon: {
    width: 23,
    height: 23,
  },
  costText: {
    color: '#2B2532',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 12,
  },
  costTextRed: {
    color: '#D4362D',
  },
  summonButtonText: {
    flex: 1,
    color: '#FFF4DA',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 12,
    textAlign: 'center',
  },
  exchangeButton: {
    position: 'absolute',
    right: 15,
    bottom: 15,
    alignItems: 'center',
  },
  exchangeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 105, 168, 0.82)',
    borderWidth: 2,
    borderColor: '#AEEAFF',
    color: '#F5FCFF',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 22,
    lineHeight: 46,
    textAlign: 'center',
  },
  exchangeText: {
    marginTop: -5,
    borderRadius: 10,
    backgroundColor: '#EBDDA3',
    color: '#6C4A24',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 10,
    paddingHorizontal: 9,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  gachaOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 30,
    backgroundColor: '#000',
  },
  gachaVideo: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  rewardLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.24)',
  },
  rewardTitle: {
    position: 'absolute',
    top: 86,
    color: '#FFF2B8',
    fontFamily: 'Lobster',
    fontSize: 46,
    lineHeight: 54,
    textAlign: 'center',
    textShadowColor: '#9F3E13',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  rewardPanel: {
    width: '66%',
    minHeight: 206,
    marginTop: 60,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(249, 216, 116, 0.28)',
    backgroundColor: 'rgba(33, 27, 37, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  rewardGrid: {
    maxWidth: 526,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  rewardCard: {
    width: 70,
    height: 70,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#C95347',
    backgroundColor: 'rgba(111, 58, 39, 0.9)',
    overflow: 'hidden',
  },
  rewardCardRare: {
    borderColor: '#FFD95C',
    backgroundColor: 'rgba(139, 95, 25, 0.95)',
  },
  rewardImageWrap: {
    flex: 1,
  },
  rewardHeroImage: {
    width: '100%',
    height: '100%',
  },
  rewardPieceIcon: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 18,
    height: 18,
  },
  rewardAmountBar: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardAmountText: {
    color: '#FFFFFF',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 15,
    lineHeight: 18,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tapHint: {
    position: 'absolute',
    bottom: 26,
    color: 'rgba(255, 255, 255, 0.92)',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 14,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
