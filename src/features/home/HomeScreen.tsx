import React, { useEffect, useState } from 'react';
import {
  BackHandler,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/routes';
import { ScreenBackground } from '../../shared/components/ScreenBackground';
import { colors } from '../../shared/theme/tokens';
import { MyScreen } from '../my/MyScreen';

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
  const [selected, setSelected] = useState<TabId>('home');
  const current = tabs.find(tab => tab.id === selected)!;
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (!navigation.isFocused() || selected === 'home') return false;
        setSelected('home');
        return true;
      },
    );
    return () => subscription.remove();
  }, [navigation, selected]);

  return (
    <ScreenBackground>
      <View style={styles.content}>
        {selected === 'my' ? (
          <MyScreen navigation={navigation} />
        ) : (
          <View style={styles.placeholder}>
            <Text accessibilityRole="header" style={styles.title}>
              {current.title}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.tabBar}>
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
              onPress={() => setSelected(tab.id)}
              style={styles.tabTarget}
            />
          ))}
        </View>
      </View>
    </ScreenBackground>
  );
}
const styles = StyleSheet.create({
  content: { flex: 1, minHeight: 0 },
  placeholder: { flex: 1, padding: 24 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginTop: 12 },
  tabBar: {
    width: '100%',
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
});
