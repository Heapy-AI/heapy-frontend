import React, { useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery } from '@tanstack/react-query';
import { RootStackParamList } from '../../navigation/routes';
import { OnboardingLayout } from '../../shared/components/OnboardingLayout';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { heapyApi } from '../../shared/api/heapyApi';
import { createIdempotencyKey } from '../../shared/utils/idempotency';
import { colors } from '../../shared/theme/tokens';
import { areRequiredTermsSelected } from './termsValidation';
type Props = NativeStackScreenProps<RootStackParamList, 'Terms'>;
export function TermsScreen({ navigation }: Props) {
  const query = useQuery({ queryKey: ['terms'], queryFn: heapyApi.getTerms });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const key = useRef(createIdempotencyKey());
  React.useEffect(() => {
    key.current = createIdempotencyKey();
  }, [selected]);
  const terms = useMemo(() => query.data ?? [], [query.data]);
  const initialized = useRef(false);
  React.useEffect(() => {
    if (!query.data || initialized.current) return;
    initialized.current = true;
    setSelected(
      new Set(
        query.data
          .filter(term => term.consentStatus === 'agreed')
          .map(term => term.termsId),
      ),
    );
  }, [query.data]);
  const requiredComplete = useMemo(
    () => areRequiredTermsSelected(terms, selected),
    [terms, selected],
  );
  const mutation = useMutation({
    mutationFn: () =>
      heapyApi.saveConsents(
        terms.map(v => ({
          termsId: v.termsId,
          action: selected.has(v.termsId)
            ? ('agreed' as const)
            : ('revoked' as const),
        })),
        key.current,
      ),
    onSuccess: () => navigation.navigate('BasicProfile'),
  });
  const toggle = (id: number) =>
    setSelected(current => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const allSelected =
    terms.length > 0 && terms.every(v => selected.has(v.termsId));
  return (
    <OnboardingLayout
      title="약관 동의"
      step={1}
      headline={'서비스 이용을 위해\n동의해 주세요'}
      footer={
        <PrimaryButton
          label="동의하고 계속하기"
          disabled={!requiredComplete || query.isLoading}
          loading={mutation.isPending}
          onPress={() => mutation.mutate()}
        />
      }
    >
      <View style={styles.info}>
        <Text style={styles.infoTitle}>건강정보는 안전하게 관리해요</Text>
        <Text style={styles.infoText}>
          동의한 범위 안에서만 분석에 사용됩니다
        </Text>
      </View>
      {query.isError ? (
        <Text style={styles.error}>약관을 불러오지 못했습니다.</Text>
      ) : null}
      <Pressable
        style={styles.all}
        onPress={() =>
          setSelected(
            allSelected ? new Set() : new Set(terms.map(v => v.termsId)),
          )
        }
      >
        <Text style={styles.check}>{allSelected ? '✓' : '○'}</Text>
        <Text style={styles.allText}>전체 동의</Text>
      </Pressable>
      <View>
        {terms.map(term => (
          <Pressable
            key={term.termsId}
            style={styles.row}
            onPress={() => toggle(term.termsId)}
          >
            <Text style={styles.check}>
              {selected.has(term.termsId) ? '✓' : '○'}
            </Text>
            <Text style={styles.term}>{term.title}</Text>
            <Pressable onPress={() => Linking.openURL(term.contentUrl)}>
              <Text style={term.required ? styles.required : styles.optional}>
                {term.required ? '필수' : '선택'} 〉
              </Text>
            </Pressable>
          </Pressable>
        ))}
      </View>
      {mutation.error ? (
        <Text style={styles.error}>{mutation.error.message}</Text>
      ) : null}
    </OnboardingLayout>
  );
}
const styles = StyleSheet.create({
  info: { padding: 18, borderRadius: 18, backgroundColor: '#EFF7FF' },
  infoTitle: { fontSize: 13, fontWeight: '800', color: '#315A9A' },
  infoText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 6,
  },
  all: {
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
  },
  allText: { fontSize: 14, fontWeight: '800', color: colors.text },
  row: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F0',
  },
  check: { fontSize: 20, color: colors.primary },
  term: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },
  required: { fontSize: 11, fontWeight: '700', color: colors.primary },
  optional: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  error: { fontSize: 12, color: colors.danger },
});
