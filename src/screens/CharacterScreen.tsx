import { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PlayerCurrencies, PlayerHeroProgress } from '../types/game';

type CharacterScreenProps = {
  onBack: () => void;
  currencies: PlayerCurrencies | null;
  fragments: Record<string, number>;
  heroProgress: Record<string, PlayerHeroProgress>;
  onBreakthrough: (heroKey: string) => Promise<void>;
};

const activeTabBg = require('../../assets/UI game/click2.png');
const inactiveTabBg = require('../../assets/UI game/click1.png');
const powerBadgeBg = require('../../assets/UI game/chienluc.png');
const coinIcon = require('../../assets/tai nguyen/coin.png');
const gemIcon = require('../../assets/tai nguyen/daquy.png');
const activeSkillDot = require('../../assets/UI game/diamond.png');
const inactiveSkillDot = require('../../assets/UI game/diamond (1).png');
const emptyRankIcon = require('../../assets/UI game/0.png');
const rankLevelOneIcon = require('../../assets/UI game/1.png');
const rankLevelTwoIcon = require('../../assets/UI game/2.png');
const talentPointIcon = require('../../assets/UI game/thienphu.png');
const treasureBackground = require('../../assets/UI game/bgvukhi.jpg');

const statIcons = {
  hp: require('../../assets/UI game/chỉ số/like.png'),
  atk: require('../../assets/UI game/chỉ số/dame.png'),
  def: require('../../assets/UI game/chỉ số/shield.png'),
  critRate: require('../../assets/UI game/chỉ số/tylebaokich.png'),
  critDmg: require('../../assets/UI game/chỉ số/crit.png'),
  speed: require('../../assets/UI game/chỉ số/sneaker.png'),
  pierce: require('../../assets/UI game/chỉ số/broken-shield.png'),
  accuracy: require('../../assets/UI game/chỉ số/target.png'),
  resist: require('../../assets/UI game/chỉ số/khanghieuung.png'),
};

const skillIcons = [
  require('../../assets/ashlyn vaelys/skill 1.png'),
  require('../../assets/ashlyn vaelys/skill 2.png'),
  require('../../assets/ashlyn vaelys/skill 3.png'),
];

const getRankIconSource = (starLevel: number, slotIndex: number) => {
  const levelTwoCount = Math.max(0, starLevel - 7);
  const levelOneCount = Math.max(0, Math.min(7 - levelTwoCount, starLevel - levelTwoCount * 2));

  if (slotIndex < levelTwoCount) {
    return rankLevelTwoIcon;
  }

  if (slotIndex < levelTwoCount + levelOneCount) {
    return rankLevelOneIcon;
  }

  return emptyRankIcon;
};

const heroes = [
  {
    id: 'ashlyn-vaelys',
    name: 'Ashlyn Vaelys',
    role: 'Tàn Tro Nữ',
    rarity: 'SSR',
    level: 'Cấp 1/100',
    starLevel: 5,
    power: '21.940',
    portrait: require('../../assets/ashlyn vaelys/34.png'),
    compactPortrait: require('../../assets/ashlyn vaelys/11.png'),
    background: require('../../assets/ashlyn vaelys/background.png'),
    stats: [
      { key: 'hp', label: 'HP', value: '9.320', icon: statIcons.hp },
      { key: 'atk', label: 'ATK', value: '1.520', icon: statIcons.atk },
      { key: 'def', label: 'DEF', value: '710', icon: statIcons.def },
      { key: 'critRate', label: 'CRIT Rate', value: '58', icon: statIcons.critRate },
      { key: 'critDmg', label: 'CRIT DMG', value: '214', icon: statIcons.critDmg },
      { key: 'speed', label: 'Tốc độ', value: '126', icon: statIcons.speed },
      { key: 'pierce', label: 'Xuyên giáp', value: '38', icon: statIcons.pierce },
      { key: 'accuracy', label: 'Hiệu ứng chính xác', value: '46', icon: statIcons.accuracy },
      { key: 'resist', label: 'Kháng hiệu ứng', value: '29', icon: statIcons.resist },
    ],
  },
];

const DETAIL_ANIMATION_DURATION = 300;
const COMPACT_LIST_WIDTH = 60;
const COMPACT_AVATAR_SIZE = 52;
const BASE_TALENT_POINTS = 100;
const BREAKTHROUGH_FRAGMENT_COST = 120;
const BREAKTHROUGH_COIN_COST = 24000;
const BREAKTHROUGH_TALENT_GAIN = 12;

const detailTabs = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'equipment', label: 'Trang bị' },
  { key: 'breakthrough', label: 'Đột phá' },
  { key: 'treasure', label: 'Pháp bảo' },
  { key: 'cultivation', label: 'Tu luyện' },
] as const;

type DetailTabKey = (typeof detailTabs)[number]['key'];

const talentStats = [
  { key: 'hp', label: 'HP', value: '15581', icon: statIcons.hp },
  { key: 'atk', label: 'Tấn Công', value: '9434', icon: statIcons.atk },
  { key: 'def', label: 'Phòng Thủ', value: '3016', icon: statIcons.def },
  { key: 'speed', label: 'Tốc Độ', value: '114', icon: statIcons.speed },
  { key: 'critRate', label: 'Tỷ Lệ Bạo Kích', value: '15%', icon: statIcons.critRate },
  { key: 'critDmg', label: 'ST Bạo Kích', value: '150%', icon: statIcons.critDmg },
  { key: 'accuracy', label: 'Hiệu Ứng Chính Xác', value: '0%', icon: statIcons.accuracy },
  { key: 'resist', label: 'Kháng Hiệu Ứng', value: '0%', icon: statIcons.resist },
];

export default function CharacterScreen({
  onBack,
  currencies,
  fragments,
  heroProgress,
  onBreakthrough,
}: CharacterScreenProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [selectedHeroId, setSelectedHeroId] = useState(heroes[0].id);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTabKey>('overview');
  const [talentOpen, setTalentOpen] = useState(false);
  const [breakthroughMessage, setBreakthroughMessage] = useState('');
  const [breakthroughLoading, setBreakthroughLoading] = useState(false);
  const detailAnim = useRef(new Animated.Value(0)).current;

  const selectedHero = useMemo(
    () => heroes.find((hero) => hero.id === selectedHeroId) ?? heroes[0],
    [selectedHeroId],
  );
  const selectedHeroFragments = fragments[selectedHero.id] ?? 0;
  const selectedHeroProgress = heroProgress[selectedHero.id];
  const breakthroughLevel = selectedHeroProgress?.breakthrough_level ?? 0;
  const currentStarLevel = selectedHero.starLevel + breakthroughLevel;
  const talentPoints = selectedHeroProgress?.talent_points ?? BASE_TALENT_POINTS;
  const breakthroughReady =
    selectedHeroFragments >= BREAKTHROUGH_FRAGMENT_COST && (currencies?.coin ?? 0) >= BREAKTHROUGH_COIN_COST;

  const handleBreakthrough = async () => {
    try {
      setBreakthroughLoading(true);
      setBreakthroughMessage('');
      await onBreakthrough(selectedHero.id);
      setBreakthroughMessage(`Đột phá thành công. Nhận ${BREAKTHROUGH_TALENT_GAIN} điểm Thiên Phú.`);
    } catch (error) {
      setBreakthroughMessage(error instanceof Error ? error.message : 'Không đột phá được.');
    } finally {
      setBreakthroughLoading(false);
    }
  };
  const openDetail = () => {
    if (detailOpen) {
      return;
    }

    setDetailOpen(true);
    Animated.timing(detailAnim, {
      toValue: 1,
      duration: DETAIL_ANIMATION_DURATION,
      useNativeDriver: false,
    }).start();
  };

  const listWidth = detailAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [screenWidth * 0.5, COMPACT_LIST_WIDTH],
  });

  const detailTranslateX = detailAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [260, 0],
  });

  const backgroundRevealWidth = detailAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [screenWidth * 0.5, screenWidth],
  });

  const backgroundRevealLeft = detailAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [screenWidth * 0.5, 0],
  });

  const listBackgroundOpacity = detailAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const resourceTranslateX = detailAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [screenWidth * 0.18, 0],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.bgReveal,
          {
            width: backgroundRevealWidth,
            left: backgroundRevealLeft,
          },
          activeTab === 'treasure' && styles.bgRevealTreasure,
        ]}
      >
        <Animated.Image
          source={activeTab === 'treasure' ? treasureBackground : selectedHero.background}
          resizeMode="cover"
          style={[
            styles.bgRevealImage,
            { width: screenWidth },
            activeTab === 'treasure' && styles.bgRevealTreasureImage,
          ]}
        />
      </Animated.View>

      <View style={styles.overlay}>
        <View style={styles.contentRow}>
          <Animated.View style={[styles.leftList, talentOpen && styles.leftListTalent, { width: listWidth }]}>
            <Animated.View
              pointerEvents="none"
              style={[styles.listBackground, { opacity: listBackgroundOpacity }]}
            >
              <Animated.Image
                source={selectedHero.background}
                resizeMode="cover"
                blurRadius={12}
                style={[
                  styles.listBackgroundImage,
                  {
                    width: screenWidth,
                    transform: [{ translateX: -screenWidth * 0.5 }],
                  },
                ]}
              />
              <View style={styles.listBackgroundShade} />
            </Animated.View>

            <SafeAreaView style={styles.leftListSafeArea}>
              <ScrollView
                horizontal={!detailOpen}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={detailOpen ? styles.compactListContent : styles.gridListContent}
              >
                {heroes.map((hero) => {
                  const selected = hero.id === selectedHeroId;
                  return (
                    <Pressable
                      key={hero.id}
                      onPress={() => setSelectedHeroId(hero.id)}
                      style={[
                        styles.heroItem,
                        selected && styles.heroItemSelected,
                        detailOpen && styles.heroItemCompact,
                      ]}
                    >
                      {detailOpen ? (
                        <View style={[styles.compactAvatarFrame, selected && styles.compactAvatarSelected]}>
                          <Image source={hero.compactPortrait} resizeMode="cover" style={styles.compactAvatarImage} />
                        </View>
                      ) : (
                        <View style={[styles.portraitFrame, selected && styles.portraitFrameSelected]}>
                          <Image source={hero.portrait} resizeMode="cover" style={styles.heroThumb} />
                        </View>
                      )}
                    </Pressable>
                  );
                })}

                {!detailOpen && <View style={styles.partialThirdRowHint} />}
              </ScrollView>
            </SafeAreaView>
          </Animated.View>

          <View style={styles.rightPanel}>
            <Animated.View
              pointerEvents={detailOpen ? 'auto' : 'none'}
              style={[
                styles.detailPanel,
                {
                  transform: [{ translateX: detailTranslateX }],
                  opacity: detailAnim,
                },
              ]}
            >
              {activeTab === 'overview' ? (
                <ScrollView
                  style={styles.overviewContent}
                  contentContainerStyle={styles.overviewContentInner}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.heroSummary}>
                    <View style={styles.nameRow}>
                      <View style={styles.heroTitleBlock}>
                        <View style={styles.nameWithBadge}>
                          <Text style={styles.detailTitle}>{selectedHero.name}</Text>
                          <View style={styles.rarityBadge}>
                            <Text style={styles.rarityText}>{selectedHero.rarity}</Text>
                          </View>
                        </View>
                        <Text style={styles.detailRole}>{selectedHero.role}</Text>

                        <View style={styles.starRow}>
                          {Array.from({ length: 7 }).map((_, index) => (
                            <Image
                              key={index}
                              source={getRankIconSource(currentStarLevel, index)}
                              resizeMode="contain"
                              style={styles.rankIcon}
                            />
                          ))}
                        </View>
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.85}
                        style={styles.talentButton}
                        onPress={() => setTalentOpen(true)}
                      >
                        <Text style={styles.talentButtonText}>Thiên Phú</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.levelRow}>
                      <Text style={styles.levelLabel}>Cấp độ</Text>
                      <Text style={styles.levelText}>{selectedHero.level.replace('Cấp ', '')}</Text>
                    </View>

                  </View>

                  <View style={styles.statsList}>
                    {selectedHero.stats.map((stat, index) => (
                      <View
                        key={stat.key}
                        style={[styles.statRow, index % 2 === 0 ? styles.statRowEven : styles.statRowOdd]}
                      >
                        <View style={styles.statName}>
                          <Image source={stat.icon} resizeMode="contain" style={styles.statIcon} />
                          <Text style={styles.statLabel}>{stat.label}</Text>
                        </View>
                        <Text style={styles.statValue}>{stat.value}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.skillDivider} />
                  <View style={styles.skillRow}>
                    {skillIcons.map((source, index) => (
                      <View key={index} style={styles.skillSlot}>
                        <Image source={source} resizeMode="cover" style={styles.skillIcon} />
                        <View style={styles.skillStars}>
                          {Array.from({ length: 4 }).map((_, starIndex) => {
                            const activeDots = index === 0 ? 2 : 4;
                            return (
                              <Image
                                key={starIndex}
                                source={starIndex < activeDots ? activeSkillDot : inactiveSkillDot}
                                resizeMode="contain"
                                style={styles.skillDot}
                              />
                            );
                          })}
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              ) : activeTab === 'breakthrough' ? (
                <ScrollView
                  style={styles.breakthroughContent}
                  contentContainerStyle={styles.breakthroughContentInner}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.breakthroughHeader}>
                    <Text style={styles.breakthroughPanelTitle}>Đột Phá</Text>
                    <View style={styles.breakthroughTitleRow}>
                      <Text style={styles.breakthroughHeroName}>{selectedHero.role}</Text>
                      <View style={styles.breakthroughRarityBadge}>
                        <Text style={styles.breakthroughRarityText}>{selectedHero.rarity}</Text>
                      </View>
                    </View>

                    <View style={styles.breakthroughStars}>
                      {Array.from({ length: 7 }).map((_, index) => (
                        <Image
                          key={index}
                          source={getRankIconSource(currentStarLevel, index)}
                          resizeMode="contain"
                          style={styles.breakthroughRankIcon}
                        />
                      ))}
                    </View>

                    <View style={styles.breakthroughLevelRow}>
                      <Text style={styles.breakthroughLevelLabel}>Cấp độ</Text>
                      <Text style={styles.breakthroughLevelText}>{breakthroughLevel + 1}/20</Text>
                      <TouchableOpacity activeOpacity={0.85} style={styles.previewButton}>
                        <Text style={styles.previewButtonText}>Xem trước</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.breakthroughRewardBlock}>
                    <View style={styles.breakthroughRewardRow}>
                      <View style={styles.breakthroughRewardIconCircle}>
                        <Image source={statIcons.hp} resizeMode="contain" style={styles.breakthroughRewardIcon} />
                      </View>
                      <Text style={styles.breakthroughRewardText}>Bonus HP </Text>
                      <Text style={styles.breakthroughRewardValue}>+{10 + breakthroughLevel * 2}%</Text>
                    </View>

                    <View style={styles.breakthroughRewardRow}>
                      <View style={styles.breakthroughRewardIconCircle}>
                        <Image source={talentPointIcon} resizeMode="contain" style={styles.breakthroughRewardIcon} />
                      </View>
                      <Text style={styles.breakthroughRewardText}>Nhận điểm Thiên Phú </Text>
                      <Text style={styles.breakthroughRewardValue}>{BREAKTHROUGH_TALENT_GAIN}</Text>
                    </View>
                  </View>

                  <View style={styles.breakthroughMaterialFooter}>
                    <View style={styles.breakthroughDivider} />

                    <View style={styles.fragmentCostRow}>
                      <Image source={selectedHero.compactPortrait} resizeMode="cover" style={styles.fragmentHeroIcon} />
                      <View style={styles.fragmentCountBox}>
                        <Text
                          style={[
                            styles.fragmentCountText,
                            selectedHeroFragments < BREAKTHROUGH_FRAGMENT_COST && styles.fragmentCountTextLow,
                          ]}
                        >
                          {selectedHeroFragments}/{BREAKTHROUGH_FRAGMENT_COST}
                        </Text>
                      </View>
                      <TouchableOpacity activeOpacity={0.85} style={styles.fragmentPlusButton}>
                        <Text style={styles.fragmentPlusText}>+</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.breakthroughCoinPill}>
                      <Image source={coinIcon} resizeMode="contain" style={styles.breakthroughCoinIcon} />
                      <Text style={styles.breakthroughCoinText}>{BREAKTHROUGH_COIN_COST}</Text>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.86}
                      style={[
                        styles.breakthroughButton,
                        (!breakthroughReady || breakthroughLoading) && styles.breakthroughButtonDisabled,
                      ]}
                      onPress={!breakthroughReady || breakthroughLoading ? undefined : handleBreakthrough}
                    >
                      <Text style={styles.breakthroughButtonText}>
                        {breakthroughLoading ? 'Đang đột phá...' : 'Đột phá'}
                      </Text>
                    </TouchableOpacity>

                    {!!breakthroughMessage && <Text style={styles.breakthroughMessage}>{breakthroughMessage}</Text>}
                  </View>
                </ScrollView>
              ) : activeTab === 'treasure' ? (
                <View style={styles.treasureContent}>
                  <View style={styles.treasureBackgroundShade} />
                  <View style={styles.treasureCenterPlus}>
                    <Text style={styles.treasureCenterPlusText}>+</Text>
                  </View>

                  <View style={styles.treasureEmptyPanel}>
                    <View style={styles.treasureEmptyArt}>
                      <Image source={selectedHero.compactPortrait} resizeMode="cover" style={styles.treasureEmptyAvatar} />
                    </View>
                    <Text style={styles.treasureEmptyText}>Chưa trang bị Pháp Bảo, vui lòng{'\n'}đến để thay đổi</Text>
                    <TouchableOpacity activeOpacity={0.86} style={styles.treasureChangeButton}>
                      <Text style={styles.treasureChangeButtonText}>Đổi</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.emptyTabContent}>
                  <Text style={styles.emptyTabText}>
                    {detailTabs.find((tab) => tab.key === activeTab)?.label}
                  </Text>
                </View>
              )}
            </Animated.View>

            <Animated.View
              pointerEvents={detailOpen ? 'auto' : 'none'}
              style={[styles.tabRail, { opacity: detailAnim }]}
            >
              {detailTabs.map((tab) => {
                const selected = tab.key === activeTab;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => {
                      setTalentOpen(false);
                      setActiveTab(tab.key);
                    }}
                    style={[styles.tabButton, !selected && styles.tabButtonDim]}
                  >
                    <Image
                      source={selected ? activeTabBg : inactiveTabBg}
                      resizeMode="contain"
                      style={styles.tabButtonImage}
                    />
                    <Text style={[styles.tabText, selected && styles.tabTextActive]}>{tab.label}</Text>
                  </Pressable>
                );
              })}
            </Animated.View>

            <Animated.View pointerEvents="none" style={[styles.powerBadge, { opacity: detailAnim }]}>
              {activeTab !== 'treasure' && (
                <View style={styles.powerBar}>
                  <Image source={powerBadgeBg} resizeMode="contain" style={styles.powerBadgeImage} />
                  <Text style={styles.powerLabel}>Chiến{'\n'}Lực</Text>
                  <Text style={styles.powerValue}>{selectedHero.power}</Text>
                </View>
              )}
            </Animated.View>
          </View>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.resourceSafeArea,
            {
              opacity: detailAnim,
              transform: [{ translateX: resourceTranslateX }],
            },
          ]}
        >
          <View style={styles.resourceRow}>
            <View style={styles.resourceCard}>
              <Image source={coinIcon} resizeMode="contain" style={styles.resourceIcon} />
              <Text style={styles.resourceText}>{currencies?.coin ?? '--'}</Text>
            </View>
            <View style={styles.resourceCard}>
              <Image source={gemIcon} resizeMode="contain" style={styles.resourceIcon} />
              <Text style={styles.resourceText}>{currencies?.gems ?? '--'}</Text>
            </View>
          </View>
        </Animated.View>
        </View>

        {talentOpen && (
          <View style={styles.talentOverlay}>
            <View style={styles.talentBackdrop} />

            <View style={styles.talentTitleRow}>
              <Image source={talentPointIcon} resizeMode="contain" style={styles.talentTitleIcon} />
              <Text style={styles.talentTitle}>Thiên Phú</Text>
            </View>

            <View style={styles.talentBody}>
              <View style={styles.talentGrid}>
                <View style={styles.talentColumn}>
                  {talentStats.slice(0, 4).map((stat) => (
                    <View key={stat.key} style={styles.talentStatCard}>
                      <View style={styles.talentStatHeader}>
                        <View style={styles.talentStatName}>
                          <Image source={stat.icon} resizeMode="contain" style={styles.talentStatIcon} />
                          <Text style={styles.talentStatLabel}>
                            {stat.label} {stat.value}
                          </Text>
                        </View>
                        <View style={styles.talentCostPill}>
                          <Image source={talentPointIcon} resizeMode="contain" style={styles.talentCostIcon} />
                          <Text style={styles.talentCostText}>1</Text>
                        </View>
                      </View>
                      <View style={styles.talentControlRow}>
                        <Pressable style={styles.talentStepButton}>
                          <Text style={styles.talentStepText}>-</Text>
                        </Pressable>
                        <View style={styles.talentSliderTrack}>
                          <View style={styles.talentSliderFill} />
                        </View>
                        <Pressable style={[styles.talentStepButton, styles.talentStepButtonPlus]}>
                          <Text style={styles.talentStepText}>+</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.talentCenter}>
                  <View style={styles.talentPointBadge}>
                    <Text style={styles.talentPointValue}>{talentPoints}</Text>
                    <Text style={styles.talentPointLabel}>Điểm còn lại</Text>
                  </View>
                  <Image source={talentPointIcon} resizeMode="contain" style={styles.talentCenterIcon} />
                </View>

                <View style={styles.talentColumn}>
                  {talentStats.slice(4).map((stat) => (
                    <View key={stat.key} style={styles.talentStatCard}>
                      <View style={styles.talentStatHeader}>
                        <View style={styles.talentStatName}>
                          <Image source={stat.icon} resizeMode="contain" style={styles.talentStatIcon} />
                          <Text style={styles.talentStatLabel}>
                            {stat.label} {stat.value}
                          </Text>
                        </View>
                        <View style={styles.talentCostPill}>
                          <Image source={talentPointIcon} resizeMode="contain" style={styles.talentCostIcon} />
                          <Text style={styles.talentCostText}>1</Text>
                        </View>
                      </View>
                      <View style={styles.talentControlRow}>
                        <Pressable style={styles.talentStepButton}>
                          <Text style={styles.talentStepText}>-</Text>
                        </Pressable>
                        <View style={styles.talentSliderTrack}>
                          <View style={styles.talentSliderFill} />
                        </View>
                        <Pressable style={[styles.talentStepButton, styles.talentStepButtonPlus]}>
                          <Text style={styles.talentStepText}>+</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.talentFooter}>
              <TouchableOpacity activeOpacity={0.85} style={[styles.talentFooterButton, styles.talentRecommendButton]}>
                <Text style={styles.talentFooterButtonText}>Đề cử điểm cộng</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} style={[styles.talentFooterButton, styles.talentSaveButton]}>
                <Text style={styles.talentFooterButtonText}>Lưu</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} style={styles.talentDiamondButton}>
                <Text style={styles.talentDiamondText}>Phương án{'\n'}cộng điểm</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} style={[styles.talentDiamondButton, styles.talentResetButton]}>
                <Text style={styles.talentDiamondText}>Cài lại{'\n'}Thiên Phú</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!detailOpen && (
          <TouchableOpacity style={styles.detailBtn} onPress={openDetail} activeOpacity={0.85}>
            <Text style={styles.detailBtnText}>Xem chi tiết</Text>
          </TouchableOpacity>
        )}

        <SafeAreaView pointerEvents="box-none" style={styles.headerSafeArea}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={talentOpen ? () => setTalentOpen(false) : onBack}
              activeOpacity={0.85}
            >
              <Text style={styles.backText}>{talentOpen ? '← Tổng quan' : '← Quay lại'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  bgReveal: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  bgRevealImage: {
    height: '100%',
  },
  bgRevealTreasure: {
    left: 0,
    width: '100%',
  },
  bgRevealTreasureImage: {
    width: '100%',
  },
  overlay: {
    flex: 1,
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
  },
  leftList: {
    height: '100%',
    overflow: 'hidden',
  },
  leftListTalent: {
    backgroundColor: 'rgba(9, 13, 30, 0.96)',
  },
  listBackground: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  listBackgroundImage: {
    height: '100%',
  },
  listBackgroundShade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
  },
  leftListSafeArea: {
    flex: 1,
    zIndex: 1,
  },
  headerSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  resourceSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 18,
    alignItems: 'center',
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 6,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  backText: {
    color: '#F7EAB0',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 13,
  },
  gridListContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 54,
    paddingLeft: 8,
    paddingRight: 4,
    columnGap: 8,
  },
  compactListContent: {
    alignItems: 'center',
    paddingTop: 54,
    rowGap: 8,
  },
  heroItem: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    width: 108,
  },
  heroItemCompact: {
    width: COMPACT_AVATAR_SIZE,
    alignItems: 'center',
  },
  heroItemSelected: {},
  portraitFrame: {
    width: 104,
    height: 132,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  portraitFrameSelected: {
    borderColor: '#F7EAB0',
  },
  heroThumb: {
    width: '100%',
    height: '100%',
  },
  partialThirdRowHint: {
    width: 52,
  },
  compactAvatarFrame: {
    width: COMPACT_AVATAR_SIZE,
    height: COMPACT_AVATAR_SIZE,
    borderRadius: COMPACT_AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  compactAvatarSelected: {
    borderColor: '#F7EAB0',
  },
  compactAvatarImage: {
    width: '100%',
    height: '100%',
  },
  rightPanel: {
    flex: 1,
    overflow: 'hidden',
  },
  detailBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    zIndex: 30,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(20,24,34,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  detailBtnText: {
    color: '#FFF2C2',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 12,
  },
  detailPanel: {
    position: 'absolute',
    right: 104,
    top: 40,
    bottom: 8,
    width: '34%',
    borderRadius: 7,
    backgroundColor: 'rgba(235, 232, 231, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(72, 56, 70, 0.55)',
    padding: 6,
  },
  overviewContent: {
    flex: 1,
  },
  overviewContentInner: {
    paddingBottom: 4,
  },
  heroSummary: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(70, 60, 66, 0.28)',
    paddingHorizontal: 5,
    paddingTop: 4,
    paddingBottom: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroTitleBlock: {
    flex: 1,
    paddingRight: 6,
  },
  nameWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 5,
  },
  detailTitle: {
    color: '#191316',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 12,
  },
  rarityBadge: {
    borderRadius: 7,
    backgroundColor: '#EF693F',
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  rarityText: {
    color: '#fff',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 7,
  },
  detailRole: {
    marginTop: 1,
    color: '#34292D',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 9,
  },
  starRow: {
    flexDirection: 'row',
    columnGap: 2,
    marginTop: 2,
  },
  rankIcon: {
    width: 14,
    height: 14,
  },
  talentButton: {
    minWidth: 58,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(151, 82, 57, 0.55)',
    backgroundColor: '#C9795E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  talentButtonText: {
    color: '#FFF3DD',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 9,
  },
  levelRow: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'baseline',
    columnGap: 5,
  },
  levelLabel: {
    color: '#6D6262',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 9,
  },
  levelText: {
    color: '#161216',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 13,
  },
  statsList: {
    marginTop: 3,
  },
  statRow: {
    height: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 5,
    paddingRight: 5,
  },
  statName: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 5,
  },
  statIcon: {
    width: 13,
    height: 13,
    tintColor: '#A9A1A3',
  },
  statLabel: {
    color: '#241D21',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 11,
  },
  statValue: {
    color: '#1F1A1E',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 11,
  },
  statRowEven: {
    backgroundColor: 'rgba(230, 225, 227, 0.78)',
  },
  statRowOdd: {
    backgroundColor: 'rgba(215, 210, 214, 0.78)',
  },
  skillDivider: {
    height: 1,
    backgroundColor: 'rgba(68, 60, 64, 0.25)',
    marginTop: 7,
    marginBottom: 5,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
  },
  skillSlot: {
    alignItems: 'center',
  },
  skillIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(231, 233, 242, 0.82)',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  skillStars: {
    flexDirection: 'row',
    columnGap: 3,
    marginTop: 2,
  },
  skillDot: {
    width: 7,
    height: 7,
    tintColor: '#FFE226',
  },
  emptyTabContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  emptyTabText: {
    color: '#FFF2C2',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 16,
  },
  breakthroughContent: {
    flex: 1,
    backgroundColor: '#EEEDEE',
    borderRadius: 5,
  },
  breakthroughContentInner: {
    minHeight: '100%',
    paddingBottom: 6,
    justifyContent: 'space-between',
  },
  breakthroughHeader: {
    minHeight: 76,
    backgroundColor: '#FBF6E8',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(77, 55, 65, 0.22)',
    paddingHorizontal: 8,
    paddingTop: 5,
    paddingBottom: 5,
  },
  breakthroughPanelTitle: {
    color: '#7F4038',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 12,
    marginBottom: 2,
  },
  breakthroughTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 8,
  },
  breakthroughHeroName: {
    flex: 1,
    color: '#1D171B',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 12,
  },
  breakthroughRarityBadge: {
    width: 42,
    height: 30,
    transform: [{ rotate: '45deg' }],
    backgroundColor: '#F09A42',
    borderWidth: 2,
    borderColor: '#D46A31',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakthroughRarityText: {
    color: '#FFE7A4',
    fontFamily: 'Lobster',
    fontSize: 15,
    transform: [{ rotate: '-45deg' }],
    textShadowColor: '#9E3B14',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  breakthroughStars: {
    flexDirection: 'row',
    columnGap: 2,
    marginTop: 3,
  },
  breakthroughRankIcon: {
    width: 14,
    height: 14,
  },
  breakthroughLevelRow: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakthroughLevelLabel: {
    color: '#4B4447',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 11,
  },
  breakthroughLevelText: {
    marginLeft: 6,
    color: '#181317',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 14,
  },
  previewButton: {
    marginLeft: 'auto',
    minWidth: 66,
    height: 22,
    borderRadius: 4,
    backgroundColor: '#5B4750',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewButtonText: {
    color: '#FFF4EA',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 9,
  },
  breakthroughRewardBlock: {
    flex: 1,
    justifyContent: 'center',
    rowGap: 16,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  breakthroughRewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakthroughRewardIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(210, 207, 211, 0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  breakthroughRewardIcon: {
    width: 18,
    height: 18,
    tintColor: '#9A949A',
  },
  breakthroughRewardText: {
    color: '#1F1B20',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 12,
  },
  breakthroughRewardValue: {
    color: '#28A768',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 12,
  },
  breakthroughDivider: {
    height: 1,
    marginHorizontal: 16,
    backgroundColor: 'rgba(80, 70, 76, 0.18)',
  },
  breakthroughMaterialFooter: {
    paddingBottom: 5,
  },
  fragmentCostRow: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fragmentHeroIcon: {
    width: 28,
    height: 28,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#D34D4D',
  },
  fragmentCountBox: {
    width: 68,
    height: 22,
    backgroundColor: '#B4B1B6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fragmentCountText: {
    color: '#FFFFFF',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 11,
  },
  fragmentCountTextLow: {
    color: '#FFE0E0',
  },
  fragmentPlusButton: {
    width: 24,
    height: 24,
    backgroundColor: '#AE474D',
    borderWidth: 1,
    borderColor: '#B99694',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fragmentPlusText: {
    color: '#FFFFFF',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 17,
    lineHeight: 19,
  },
  breakthroughCoinPill: {
    alignSelf: 'center',
    marginTop: 5,
    minWidth: 52,
    height: 12,
    borderRadius: 8,
    backgroundColor: '#A9A6AC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 4,
    paddingHorizontal: 7,
  },
  breakthroughCoinIcon: {
    width: 8,
    height: 8,
  },
  breakthroughCoinText: {
    color: '#FFFFFF',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 7,
  },
  breakthroughButton: {
    alignSelf: 'center',
    marginTop: 5,
    minWidth: 92,
    height: 26,
    borderRadius: 9,
    backgroundColor: '#C55F4F',
    borderWidth: 2,
    borderColor: '#E9C28D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakthroughButtonDisabled: {
    opacity: 0.42,
  },
  breakthroughButtonText: {
    color: '#FFF7ED',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 10,
  },
  breakthroughMessage: {
    marginTop: 5,
    color: '#7F4038',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 8,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  treasureContent: {
    position: 'absolute',
    top: -40,
    right: -82,
    bottom: -8,
    left: -250,
    overflow: 'hidden',
  },
  treasureBackgroundShade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(7, 9, 19, 0.1)',
  },
  treasureCenterPlus: {
    position: 'absolute',
    left: '43%',
    top: '45%',
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(150, 185, 194, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  treasureCenterPlusText: {
    color: '#FFE8A8',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 42,
    lineHeight: 48,
  },
  treasureEmptyPanel: {
    position: 'absolute',
    top: 42,
    right: 88,
    bottom: 12,
    width: 292,
    borderRadius: 6,
    backgroundColor: 'rgba(242, 239, 234, 0.94)',
    borderWidth: 2,
    borderColor: 'rgba(109, 62, 72, 0.45)',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 58,
    paddingBottom: 14,
  },
  treasureEmptyArt: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(190, 186, 188, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.35,
    overflow: 'hidden',
  },
  treasureEmptyAvatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
  },
  treasureEmptyText: {
    marginTop: 22,
    color: '#5C5558',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  treasureChangeButton: {
    marginTop: 'auto',
    width: 150,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#C55F4F',
    borderWidth: 2,
    borderColor: '#E9C28D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  treasureChangeButtonText: {
    color: '#FFF7ED',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 16,
  },
  talentOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: COMPACT_LIST_WIDTH,
    zIndex: 19,
    paddingTop: 10,
    paddingRight: 14,
    paddingBottom: 8,
    paddingLeft: 34,
    backgroundColor: 'rgba(53, 67, 118, 0.86)',
  },
  talentBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(53, 67, 118, 0.86)',
  },
  talentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    marginLeft: 0,
    marginBottom: 4,
  },
  talentTitleIcon: {
    width: 30,
    height: 30,
  },
  talentTitle: {
    color: '#FFE8A8',
    fontFamily: 'Lobster',
    fontSize: 26,
    lineHeight: 30,
    textShadowColor: 'rgba(77, 30, 20, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  talentBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingTop: 2,
  },
  talentGrid: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
  },
  talentColumn: {
    flex: 1,
    rowGap: 8,
  },
  talentStatCard: {
    height: 56,
    borderRadius: 7,
    backgroundColor: '#565B84',
    borderWidth: 1,
    borderColor: '#626895',
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  talentStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  talentStatName: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    flex: 1,
    paddingRight: 8,
  },
  talentStatIcon: {
    width: 14,
    height: 14,
    tintColor: '#B6B2C3',
  },
  talentStatLabel: {
    flex: 1,
    color: '#F5F1FF',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 13,
    lineHeight: 16,
  },
  talentCostPill: {
    width: 54,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#34365D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 5,
  },
  talentCostIcon: {
    width: 16,
    height: 16,
  },
  talentCostText: {
    color: '#FFFFFF',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 14,
    lineHeight: 17,
  },
  talentControlRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
  },
  talentStepButton: {
    width: 28,
    height: 26,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(126, 131, 141, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  talentStepButtonPlus: {
    backgroundColor: 'rgba(161, 70, 68, 0.96)',
  },
  talentStepText: {
    color: '#FFFFFF',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 25,
    lineHeight: 25,
  },
  talentSliderTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(199, 205, 204, 0.78)',
    overflow: 'hidden',
  },
  talentSliderFill: {
    width: 14,
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#FFD88E',
  },
  talentCenter: {
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  talentPointBadge: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#6774B2',
    borderWidth: 2,
    borderColor: 'rgba(153, 171, 239, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  talentPointValue: {
    color: '#FFFFFF',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 31,
    lineHeight: 34,
  },
  talentPointLabel: {
    color: '#E7E4EF',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 10,
  },
  talentCenterIcon: {
    position: 'absolute',
    left: 0,
    bottom: '37%',
    width: 24,
    height: 24,
  },
  talentFooter: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 22,
  },
  talentFooterButton: {
    minWidth: 124,
    height: 34,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  talentRecommendButton: {
    backgroundColor: '#C96C54',
    borderColor: '#E6B77D',
  },
  talentSaveButton: {
    backgroundColor: 'rgba(178, 178, 178, 0.92)',
    borderColor: '#D7D7D7',
  },
  talentFooterButtonText: {
    color: '#FFF5E8',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 12,
  },
  talentDiamondButton: {
    width: 54,
    height: 54,
    transform: [{ rotate: '45deg' }],
    backgroundColor: 'rgba(62, 47, 55, 0.9)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  talentResetButton: {
    backgroundColor: 'rgba(29, 30, 39, 0.96)',
  },
  talentDiamondText: {
    width: 72,
    color: '#FFFFFF',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 9,
    lineHeight: 12,
    textAlign: 'center',
    transform: [{ rotate: '-45deg' }],
  },
  tabRail: {
    position: 'absolute',
    right: 16,
    top: 28,
    bottom: 28,
    justifyContent: 'space-between',
  },
  tabButton: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonDim: {
    opacity: 0.56,
  },
  tabButtonImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  tabText: {
    width: 54,
    color: '#E1E6EF',
    fontFamily: 'BeVietnamProSemiBold',
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tabTextActive: {
    color: '#FFF2C2',
  },
  powerBadge: {
    position: 'absolute',
    left: -54,
    width: '58%',
    bottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  powerBar: {
    width: 126,
    height: 25,
    backgroundColor: 'rgba(63, 24, 28, 0.7)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 226, 140, 0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 40,
    paddingRight: 8,
  },
  powerBadgeImage: {
    position: 'absolute',
    left: 8,
    width: 40,
    height: 40,
  },
  powerLabel: {
    position: 'absolute',
    left: 10,
    width: 38,
    color: '#FFE126',
    fontFamily: 'Lobster',
    fontSize: 10,
    lineHeight: 10,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 2,
  },
  powerValue: {
    color: '#FFE126',
    fontFamily: 'Lobster',
    fontSize: 24,
    lineHeight: 26,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 2,
  },
});
