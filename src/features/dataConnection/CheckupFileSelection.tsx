import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../../shared/theme/tokens';
import { CheckupFile, InputType } from './types';

// 작성자: 김진우 — 등록 방식과 파일 안내를 분리해 선택에 집중할 수 있도록 구성한다.
function MethodIcon({ type }: { type: InputType }) {
  return (
    <Svg
      width={26}
      height={26}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colors.primaryDark}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {type === 'pdf' ? (
        <>
          <Path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8Z" />
          <Path d="M14 3v5h5M8.5 12h7M8.5 16h5" />
        </>
      ) : type === 'image' ? (
        <>
          <Rect x={3} y={3} width={18} height={18} rx={4} />
          <Circle cx={8.5} cy={8.5} r={1.5} />
          <Path d="m4 17 5-5 4 4 3-3 4 4" />
        </>
      ) : (
        <>
          <Path d="M8 6 9.5 3.5h5L16 6h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
          <Circle cx={12} cy={12.5} r={3.5} />
          <Path d="M17.5 9h.01" />
        </>
      )}
    </Svg>
  );
}

export function CheckupFileSelection({
  file,
  busy,
  onChoose,
}: {
  file: CheckupFile | null;
  busy: boolean;
  onChoose: (type: InputType) => void;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.intro}>
        <Text style={styles.headline}>검진 결과를{'\n'}가져와 주세요</Text>
        <Text style={styles.description}>
          결과지를 올려주시면 검진 항목을 정리해 드려요.{'\n'}저장 전 직접
          확인하고 수정할 수 있어요.
        </Text>
      </View>
      <View style={styles.methods}>
        {(
          [
            ['pdf', 'PDF 파일 선택', '병원에서 받은 결과 파일'],
            ['image', '사진에서 선택', '앨범에 저장된 결과지'],
            ['camera', '결과지 촬영', '종이 결과지를 바로 촬영'],
          ] as const
        ).map(([type, title, detail]) => {
          const selected = file?.inputType === type;
          return (
            <Pressable
              key={type}
              accessibilityRole="button"
              accessibilityLabel={title}
              accessibilityHint={detail}
              accessibilityState={{ disabled: busy, selected }}
              disabled={busy}
              onPress={() => onChoose(type)}
              style={({ pressed }) => [
                styles.method,
                selected && styles.methodSelected,
                pressed && styles.methodPressed,
                busy && styles.disabled,
              ]}
            >
              <View style={styles.icon}>
                <MethodIcon type={type} />
              </View>
              <View style={styles.methodCopy}>
                <Text style={styles.methodTitle}>{title}</Text>
                <Text style={styles.methodDetail}>{detail}</Text>
              </View>
              <Svg
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke={selected ? colors.primaryDark : '#9CAFA7'}
                strokeWidth={1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Path d={selected ? 'm5 12 4 4 10-10' : 'm9 6 6 6-6 6'} />
              </Svg>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.guidance}>
        <Svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.textMuted}
          strokeWidth={1.6}
        >
          <Circle cx={12} cy={12} r={9} />
          <Path d="M12 10.5v6M12 7v1" />
        </Svg>
        <View style={styles.guidanceCopy}>
          <Text style={styles.hint}>PDF · JPG · PNG · 최대 20MB</Text>
          <Text style={styles.hint}>
            PDF는 최대 20페이지까지 등록할 수 있어요.
          </Text>
        </View>
      </View>
      {file && (
        <View style={styles.file} accessibilityLiveRegion="polite">
          <View style={styles.fileHeader}>
            <Text style={styles.fileLabel}>선택한 파일</Text>
            <Text style={styles.fileSize}>
              {(file.size / 1_000_000).toFixed(1)}MB
            </Text>
          </View>
          <Text
            style={styles.fileName}
            numberOfLines={2}
            ellipsizeMode="middle"
          >
            {file.name}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 18 },
  intro: { gap: 12, paddingTop: 6, paddingBottom: 8 },
  headline: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  description: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 23,
    letterSpacing: -0.25,
  },
  methods: { gap: 12 },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E4EDE8',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 20,
    minHeight: 94,
  },
  methodSelected: {
    borderColor: colors.primaryDark,
    backgroundColor: '#F3FAF6',
  },
  methodPressed: { backgroundColor: '#EAF5EF', transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.55 },
  icon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECF6EF',
  },
  methodCopy: { flex: 1, gap: 5 },
  methodTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  methodDetail: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    letterSpacing: -0.15,
  },
  guidance: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    paddingHorizontal: 6,
    paddingTop: 1,
  },
  guidanceCopy: { flex: 1, gap: 3, marginTop: -2 },
  hint: { color: colors.textMuted, fontSize: 11, lineHeight: 17 },
  file: { backgroundColor: '#EDF6F0', borderRadius: 16, padding: 16, gap: 7 },
  fileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fileLabel: { color: colors.primaryDark, fontSize: 11, fontWeight: '700' },
  fileSize: { color: colors.textMuted, fontSize: 11 },
  fileName: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
});
