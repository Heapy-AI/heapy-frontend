import React, { useEffect, useState } from 'react';
import {
  Animated,
  BackHandler,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/routes';
import { ScreenBackground } from '../../shared/components/ScreenBackground';
import { colors } from '../../shared/theme/tokens';
import { HomeDashboard } from './HomeDashboard';
import { ChatScreen } from '../chat/ChatScreen';
import { MyScreen } from '../my/MyScreen';
import { HealthScreen } from '../health/HealthScreen';
import { ScreenTransition } from '../../shared/components/ScreenTransition';
import { AmbientEffect } from '../../shared/components/AmbientEffect';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { usePressFeedback } from '../../shared/hooks/usePressFeedback';

const tabs = [
  { id: 'home', title: '홈', image: require('../../assets/my/nav-home.png') },
  {
    id: 'health',
    title: '내 건강',
    image: require('../../assets/my/nav-health.png'),
  },
  {
    id: 'chatbot',
    title: '챗봇',
    image: require('../../assets/my/nav-chatbot.png'),
  },
  {
    id: 'missions',
    title: '미션',
    image: require('../../assets/my/nav-missions.png'),
  },
  { id: 'my', title: '마이', image: require('../../assets/my/nav-my.png') },
] as const;
type TabId = (typeof tabs)[number]['id'];

export function HomeScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Home'>) {
  const insets = useSafeAreaInsets();
  const chatbotPress = usePressFeedback(0.92);
  const [chatButtonSize, setChatButtonSize] = useState(68);
  const [focused, setFocused] = useState(true);
  useEffect(() => {
    const focus = navigation.addListener?.('focus', () => setFocused(true));
    const blur = navigation.addListener?.('blur', () => setFocused(false));
    return () => {
      focus?.();
      blur?.();
    };
  }, [navigation]);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  // 작성자: 김진우 — 키보드가 닫히면 탭 표시를 복원하고 이벤트를 정리한다.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      event => {
        Keyboard.scheduleLayoutAnimation(event);
        setKeyboardVisible(true);
      },
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      event => {
        Keyboard.scheduleLayoutAnimation(event);
        setKeyboardVisible(false);
      },
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const [homeEditing, setHomeEditing] = useState(false);
  const [healthEditing, setHealthEditing] = useState(false);
  const [selected, setSelected] = useState<TabId>('home');
  const [tabResets, setTabResets] = useState({
    home: 0,
    health: 0,
    missions: 0,
    my: 0,
  });
  // 작성자: 김진우 — 챗봇을 제외한 탭 누르기는 항상 해당 탭의 처음으로 돌아간다.
  const selectTab = (tab: TabId) => {
    if (tab !== 'chatbot') {
      Keyboard.dismiss();
      setTabResets(value => ({ ...value, [tab]: value[tab] + 1 }));
    }
    setSelected(tab);
  };
  const current = tabs.find(tab => tab.id === selected)!;
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (
          !navigation.isFocused() ||
          selected === 'home' ||
          selected === 'health'
        )
          return false;
        setSelected('home');
        return true;
      },
    );
    return () => subscription.remove();
  }, [navigation, selected]);

  return (
    <ScreenBackground theme={selected === 'chatbot' ? 'chat' : 'default'}>
      <KeyboardAvoidingView
        style={styles.content}
        enabled={
          (selected === 'chatbot' || selected === 'health') &&
          Platform.OS !== 'web'
        }
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top}
      >
        <ScreenTransition transitionKey={selected}>
          <View
            style={{ flex: 1, display: selected === 'home' ? 'flex' : 'none' }}
          >
            <HomeDashboard
              resetVersion={tabResets.home}
              active={selected === 'home' && focused}
              onEditingChange={setHomeEditing}
              onConnect={() =>
                navigation.navigate('DataConnection', { from: 'my' })
              }
              onCheckup={() => navigation.navigate('CheckupRegistration')}
              onDetail={recordId =>
                navigation.navigate('CheckupDetail', { recordId })
              }
              onChat={() => setSelected('chatbot')}
            />
          </View>
          {selected === 'home' ? null : selected === 'chatbot' ? (
            <ChatScreen />
          ) : selected === 'health' ? (
            <HealthScreen
              key={tabResets.health}
              active={focused}
              onNestedChange={setHealthEditing}
              onExit={() => setSelected('home')}
              onRegister={() => navigation.navigate('CheckupRegistration')}
            />
          ) : selected === 'my' ? (
            <MyScreen
              key={tabResets.my}
              navigation={navigation}
              active={focused}
            />
          ) : (
            <View key={tabResets.missions} style={styles.placeholder}>
              <Text accessibilityRole="header" style={styles.title}>
                {current.title}
              </Text>
            </View>
          )}
        </ScreenTransition>
        <View
          style={[
            styles.tabBar,
            ((selected === 'home' && homeEditing) ||
              (selected === 'health' && healthEditing) ||
              (selected === 'chatbot' && keyboardVisible)) && {
              display: 'none',
            },
          ]}
        >
          <Image
            source={current.image}
            style={styles.tabArtwork}
            resizeMode="stretch"
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          />
          <View style={styles.tabTargets} accessibilityRole="tablist">
            {tabs.map(tab => (
              <Pressable
                key={tab.id}
                accessibilityRole="tab"
                accessibilityLabel={tab.title}
                accessibilityState={{ selected: tab.id === selected }}
                aria-selected={tab.id === selected}
                onPress={() => selectTab(tab.id)}
                onPressIn={
                  tab.id === 'chatbot' ? chatbotPress.onPressIn : undefined
                }
                onPressOut={
                  tab.id === 'chatbot' ? chatbotPress.onPressOut : undefined
                }
                style={[
                  styles.tabTarget,
                  tab.id === 'chatbot' && styles.chatTarget,
                ]}
                onLayout={
                  tab.id === 'chatbot'
                    ? event =>
                        setChatButtonSize(
                          Math.min(
                            82,
                            Math.max(62, event.nativeEvent.layout.width - 10),
                          ),
                        )
                    : undefined
                }
              >
                {tab.id === 'chatbot' && (
                  <Animated.View
                    pointerEvents="none"
                    testID="chatbot-button-core"
                    style={[
                      { width: chatButtonSize, height: chatButtonSize },
                      chatbotPress.style,
                    ]}
                  >
                    <LinearGradient
                      colors={['#8975F6', '#A16BD6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.chatCircle}
                    >
                      <Svg
                        width={26}
                        height={26}
                        viewBox="0 0 26 26"
                        accessible={false}
                      >
                        <Path
                          d="M7 5h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-6l-5 4v-4H7a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3ZM9 11h8"
                          fill="none"
                          stroke="white"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                      <Text style={styles.chatLabel}>챗봇</Text>
                    </LinearGradient>
                    <AmbientEffect
                      variant="ripple"
                      active={
                        focused &&
                        !(selected === 'home' && homeEditing) &&
                        !keyboardVisible
                      }
                      testID="chatbot-ripple"
                    />
                  </Animated.View>
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}
const styles = StyleSheet.create({
  content: { flex: 1, minHeight: 0 },
  placeholder: { flex: 1, padding: 24 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginTop: 12 },
  tabBar: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    aspectRatio: 395 / 82,
    minHeight: 72,
    maxHeight: 100,
    backgroundColor: colors.surface,
  },
  tabArtwork: { width: '100%', height: '100%' },
  tabTargets: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
  },
  tabTarget: { flex: 1, minHeight: 48 },
  // 작성자: 김진우 — 이미지에 포함된 기존 버튼을 덮고 원과 파동을 같은 중심에 배치한다.
  chatTarget: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    boxShadow: '0px 3px 9px rgba(128, 91, 211, 0.22)',
  },
  chatLabel: { color: 'white', fontSize: 11, fontWeight: '700' },
});
