// 작성자: 김진우 — 서버 프로필을 불러와 변경한 항목만 저장한다.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RootStackParamList } from '../../navigation/routes';
import { heapyApi } from '../../shared/api/heapyApi';
import { UserProfile } from '../../shared/types/api';
import { FormField } from '../../shared/components/FormField';
import { BirthDateField } from '../../shared/components/BirthDateField';
import { ChoicePill } from '../../shared/components/ChoicePill';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { ConfirmModal } from '../../shared/components/ConfirmModal';
import { KeyboardAwareScrollView } from '../../shared/components/KeyboardAwareScrollView';
import { colors } from '../../shared/theme/tokens';
import {
  alcoholOptions,
  conditionOptions,
  smokingOptions,
  profileDraft,
  profileErrors,
  profilePatch,
  toggleCondition,
} from './profileEditModel';
type Props = NativeStackScreenProps<RootStackParamList, 'ProfileEdit'>;
export function ProfileEditScreen({ navigation }: Props) {
  const query = useQuery({
    queryKey: ['me'],
    queryFn: ({ signal }) => heapyApi.getMe(signal),
    retry: false,
    staleTime: 0,
  });
  if (!query.data)
    return (
      <SafeAreaView style={s.screen}>
        <Pressable
          style={s.back}
          accessibilityRole="button"
          accessibilityLabel="프로필 수정 닫기"
          onPress={() => navigation.goBack()}
        >
          <Text style={s.link}>‹ 뒤로</Text>
        </Pressable>
        <View style={s.loading}>
          {query.isPending ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Text style={s.text}>프로필을 불러오지 못했어요.</Text>
              <PrimaryButton
                label="다시 시도"
                onPress={() => query.refetch()}
              />
            </>
          )}
        </View>
      </SafeAreaView>
    );
  return (
    <ProfileForm
      key={query.data.userId}
      initial={query.data}
      navigation={navigation}
    />
  );
}
function ProfileForm({
  initial,
  navigation,
}: {
  initial: UserProfile;
  navigation: Props['navigation'];
}) {
  const client = useQueryClient();
  const [original] = useState(initial);
  const [draft, setDraft] = useState(() => profileDraft(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [discard, setDiscard] = useState(false);
  const working = useRef(false);
  const dirty =
    JSON.stringify(draft) !== JSON.stringify(profileDraft(original));
  const mutation = useMutation({
    mutationFn: () => heapyApi.updateProfile(profilePatch(original, draft)),
    onSuccess: async profile => {
      await client.cancelQueries({ queryKey: ['me'] });
      client.setQueryData(['me'], profile);
      void client.invalidateQueries({ queryKey: ['home'] });
      navigation.goBack();
    },
    onSettled: () => {
      working.current = false;
    },
    retry: false,
  });
  const back = useCallback(() => {
    if (working.current) return;
    if (dirty) setDiscard(true);
    else navigation.goBack();
  }, [dirty, navigation]);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => sub.remove();
  }, [back]);
  const set = <K extends keyof typeof draft>(
    key: K,
    value: (typeof draft)[K],
  ) => {
    setDraft(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: '' }));
    mutation.reset();
  };
  const save = () => {
    if (working.current) return;
    Keyboard.dismiss();
    const next = profileErrors(draft);
    setErrors(next);
    if (Object.keys(next).length) return;
    if (!Object.keys(profilePatch(original, draft)).length) {
      navigation.goBack();
      return;
    }
    working.current = true;
    mutation.mutate();
  };
  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <Pressable
          style={s.back}
          accessibilityRole="button"
          accessibilityLabel="프로필 수정 닫기"
          disabled={mutation.isPending}
          onPress={back}
        >
          <Text style={s.link}>‹ 뒤로</Text>
        </Pressable>
        <Text style={s.title}>프로필 수정</Text>
      </View>
      <KeyboardAvoidingView
        style={s.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <KeyboardAwareScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.subtitle}>내 정보를 최신 상태로 관리해요</Text>
          <View
            pointerEvents={mutation.isPending ? 'none' : 'auto'}
            style={s.groups}
          >
            <View style={s.card}>
              <Text style={s.heading}>기본 정보</Text>
              <FormField
                label="이름 또는 닉네임"
                value={draft.name}
                onChangeText={v => set('name', v)}
                maxLength={50}
                editable={!mutation.isPending}
                error={errors.name}
              />
              <BirthDateField
                value={draft.birthDate}
                onChange={v => set('birthDate', v)}
                error={errors.birthDate}
              />
              <Text style={s.label}>성별</Text>
              <View style={s.row}>
                {(
                  [
                    ['Male', '남성'],
                    ['Female', '여성'],
                  ] as const
                ).map(([key, label]) => (
                  <ChoicePill
                    key={key}
                    label={label}
                    selected={draft.sex === key}
                    onPress={() => set('sex', key)}
                    flex
                  />
                ))}
              </View>
              {errors.sex ? <Text style={s.error}>{errors.sex}</Text> : null}
            </View>
            <View style={s.card}>
              <Text style={s.heading}>신체 정보</Text>
              <FormField
                label="키 (cm)"
                value={draft.heightCm}
                onChangeText={v => set('heightCm', v)}
                keyboardType="decimal-pad"
                editable={!mutation.isPending}
                error={errors.heightCm}
              />
              <FormField
                label="몸무게 (kg)"
                value={draft.weightKg}
                onChangeText={v => set('weightKg', v)}
                keyboardType="decimal-pad"
                editable={!mutation.isPending}
                error={errors.weightKg}
              />
              <Text style={s.note}>
                프로필 정보가 변경돼요. 날짜별 체성분 기록은 내 건강에서 관리할
                수 있어요.
              </Text>
            </View>
            <View style={s.card}>
              <Text style={s.heading}>생활 습관</Text>
              <Text style={s.label}>흡연</Text>
              <View style={s.row}>
                {smokingOptions.map(([key, label]) => (
                  <ChoicePill
                    key={key}
                    compact
                    label={label}
                    selected={draft.smokingStatus === key}
                    onPress={() => set('smokingStatus', key)}
                  />
                ))}
              </View>
              {errors.smokingStatus ? (
                <Text style={s.error}>{errors.smokingStatus}</Text>
              ) : null}
              <Text style={s.label}>음주 빈도</Text>
              <View style={s.row}>
                {alcoholOptions.map(([key, label]) => (
                  <ChoicePill
                    key={key}
                    compact
                    label={label}
                    selected={draft.alcoholFrequency === key}
                    onPress={() => set('alcoholFrequency', key)}
                  />
                ))}
              </View>
              {errors.alcoholFrequency ? (
                <Text style={s.error}>{errors.alcoholFrequency}</Text>
              ) : null}
            </View>
            <View style={s.card}>
              <Text style={s.heading}>건강 배경</Text>
              <Text style={s.label}>진단받은 질환</Text>
              <View style={s.row}>
                <ChoicePill
                  compact
                  label="없음"
                  selected={!draft.chronicConditions.length}
                  onPress={() => set('chronicConditions', [])}
                />
                {conditionOptions.map(([key, label]) => (
                  <ChoicePill
                    key={key}
                    compact
                    label={label}
                    selected={draft.chronicConditions.some(
                      c => c.canonicalKey === key,
                    )}
                    onPress={() =>
                      set(
                        'chronicConditions',
                        toggleCondition(draft.chronicConditions, key, label),
                      )
                    }
                  />
                ))}
                {draft.chronicConditions
                  .filter(
                    c => !conditionOptions.some(o => o[0] === c.canonicalKey),
                  )
                  .map((c, i) => (
                    <ChoicePill
                      key={i}
                      compact
                      selected
                      label={c.displayName}
                      onPress={() =>
                        set(
                          'chronicConditions',
                          draft.chronicConditions.filter(v => v !== c),
                        )
                      }
                    />
                  ))}
              </View>
              <FormField
                label="알레르기 (선택, 쉼표로 구분)"
                value={draft.allergies}
                onChangeText={v => set('allergies', v)}
                editable={!mutation.isPending}
                error={errors.allergies}
                placeholder="예: 땅콩, 페니실린"
              />
              <FormField
                label="건강 주의사항 (선택)"
                value={draft.healthCautions}
                onChangeText={v => set('healthCautions', v)}
                multiline
                maxLength={1000}
                editable={!mutation.isPending}
                error={errors.healthCautions}
                placeholder="비워두셔도 돼요"
              />
            </View>
          </View>
          {Object.values(errors).some(Boolean) ? (
            <Text accessibilityRole="alert" style={s.error}>
              입력한 항목을 확인해 주세요.
            </Text>
          ) : null}
          {mutation.error ? (
            <Text accessibilityRole="alert" style={s.error}>
              {mutation.error.message}
            </Text>
          ) : null}
          <PrimaryButton
            label="변경사항 저장"
            onPress={save}
            loading={mutation.isPending}
            disabled={!dirty}
          />
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>
      <ConfirmModal
        visible={discard}
        title="변경사항을 저장하지 않고 나갈까요?"
        description="수정한 내용은 저장되지 않아요."
        confirmLabel="저장하지 않고 나가기"
        onCancel={() => setDiscard(false)}
        onConfirm={() => {
          setDiscard(false);
          navigation.goBack();
        }}
      />
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3F8F6' },
  fill: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 14,
  },
  back: { padding: 12 },
  link: { color: colors.primaryDark, fontSize: 15, fontWeight: '600' },
  title: { fontSize: 19, fontWeight: '700', color: colors.text },
  loading: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  content: {
    padding: 20,
    paddingBottom: 36,
    gap: 18,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  groups: { gap: 18 },
  subtitle: { fontSize: 14, color: colors.textMuted },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: '#E5EFEA',
  },
  heading: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 4,
  },
  label: { fontSize: 13, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  note: { fontSize: 12, lineHeight: 18, color: colors.textMuted },
  error: { fontSize: 12, lineHeight: 18, color: colors.danger },
  text: { fontSize: 14, color: colors.text },
});
