import React, { useContext, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { InputVisibilityContext } from '../../shared/components/KeyboardAwareScrollView';
import { CheckupItem } from './types';
import { reviewStyles as s } from './checkupReviewStyles';

type Props = {
  items: CheckupItem[];
  originalItems?: CheckupItem[];
  excluded?: Set<string>;
  busy?: boolean;
  onChange?: (fieldKey: string, field: 'value', value: string) => void;
  onExclude?: (fieldKey: string) => void;
};

// 작성자: 김진우 — 이진 결과 입력만 선택형으로 표시하며 검사 분류나 기관 판정을 바꾸지 않는다.
const binaryValues: Record<string, string> = {
  정상: '정상',
  비정상: '비정상',
  이상: '비정상',
  '이상 없음': '정상',
  이상없음: '정상',
  비이상: '정상',
};
const hearingCodes = new Set(['HEARING_GENERAL_LEFT', 'HEARING_GENERAL_RIGHT']);

export function canExcludeCheckupItem(item: CheckupItem, items: CheckupItem[]) {
  return (
    !item.itemCode ||
    items.filter(other => other.itemCode === item.itemCode).length > 1
  );
}

function ResultInput({
  item,
  original,
  disabled,
  onChange,
}: {
  item: CheckupItem;
  original: CheckupItem;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const input = useRef<TextInput>(null);
  const reveal = useContext(InputVisibilityContext);
  const [focused, setFocused] = useState(false);
  return (
    <View style={[s.valueRow, focused && s.focused, disabled && s.disabled]}>
      <TextInput
        ref={input}
        accessibilityLabel={`${item.itemName} 결과값`}
        value={item.value}
        editable={!disabled}
        onChangeText={onChange}
        onFocus={() => {
          setFocused(true);
          reveal(input.current);
        }}
        onBlur={() => setFocused(false)}
        style={[s.input, original.numericValue == null && s.textInput]}
        selectTextOnFocus
        keyboardType={original.numericValue != null ? 'decimal-pad' : 'default'}
      />
      {!!original.unit && (
        <Text
          accessibilityLabel={`${item.itemName} 단위 ${original.unit}`}
          style={s.unit}
        >
          {original.unit}
        </Text>
      )}
    </View>
  );
}

export function CheckupGeneralResults({
  items,
  originalItems = items,
  excluded = new Set(),
  busy = false,
  onChange,
  onExclude,
}: Props) {
  if (!items.length) return null;
  return (
    <View style={s.section}>
      <View style={s.headingRow}>
        <Text accessibilityRole="header" style={s.heading}>
          검사 결과
        </Text>
        <Text style={s.count}>{items.length}개</Text>
      </View>
      {items.map(item => {
        const before =
          originalItems.find(entry => entry.fieldKey === item.fieldKey) ?? item;
        const omitted = excluded.has(item.fieldKey);
        const exception = canExcludeCheckupItem(before, originalItems);
        const conflict =
          !!item.itemCode &&
          items.filter(
            entry =>
              entry.itemCode === item.itemCode && !excluded.has(entry.fieldKey),
          ).length > 1;
        const binary =
          before.unit == null &&
          (hearingCodes.has(before.itemCode ?? '') ||
            Object.prototype.hasOwnProperty.call(
              binaryValues,
              before.value.trim(),
            ));
        const disabled = busy || omitted;
        return (
          <View
            key={item.fieldKey}
            style={[s.card, exception && !!onChange && s.exceptionCard]}
          >
            <Text accessibilityRole="header" style={s.title}>
              {item.itemName}
            </Text>
            {!!onChange && !item.itemCode && (
              <Text accessibilityRole="alert" style={s.warning}>
                표준 항목을 찾지 못했어요. 원본의 검사명을 확인한 뒤 이번
                저장에서 제외해 주세요.
              </Text>
            )}
            {!!onChange && conflict && (
              <Text accessibilityRole="alert" style={s.warning}>
                같은 검사의 결과가 여러 개예요. 원본의 부위와 시점을 확인하고
                저장할 결과 하나를 남겨 주세요.
              </Text>
            )}
            {!!onChange && item.confidence != null && item.confidence < 0.8 && (
              <Text style={s.warning}>
                인식이 불확실한 항목이에요. 원본과 한 번 더 확인해 주세요.
              </Text>
            )}
            {onChange ? (
              <View>
                <Text style={s.label}>
                  {binary ? '검사 결과 선택' : '검사 결과'}
                </Text>
                {binary ? (
                  <>
                    <View
                      accessibilityRole="radiogroup"
                      accessibilityLabel={`${item.itemName} 결과값`}
                      style={s.radioRow}
                    >
                      {['정상', '비정상'].map(value => {
                        const selected =
                          binaryValues[item.value.trim()] === value;
                        return (
                          <Pressable
                            key={value}
                            accessibilityRole="radio"
                            accessibilityLabel={`${item.itemName} ${value}`}
                        accessibilityState={{ checked: selected, disabled }}
                        aria-checked={selected}
                        aria-disabled={disabled}
                            disabled={disabled}
                            onPress={() =>
                              onChange(item.fieldKey, 'value', value)
                            }
                            style={[
                              s.radio,
                              selected && s.radioSelected,
                              disabled && s.disabled,
                            ]}
                          >
                            <View
                              style={[
                                s.radioDot,
                                selected && s.radioDotSelected,
                              ]}
                            />
                            <Text
                              style={[
                                s.radioText,
                                selected && s.radioSelectedText,
                              ]}
                            >
                              {value}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    {!['정상', '비정상'].includes(item.value) && (
                      <Text style={s.status}>
                        인식된 결과: {item.value || '기재 없음'} · 원본과 비교해
                        선택해 주세요.
                      </Text>
                    )}
                  </>
                ) : (
                  <ResultInput
                    item={item}
                    original={before}
                    disabled={disabled}
                    onChange={value => onChange(item.fieldKey, 'value', value)}
                  />
                )}
              </View>
            ) : (
              <Text style={s.title}>
                {item.value}
                {item.unit ? ` ${item.unit}` : ''}
              </Text>
            )}
            <View style={s.statusRow}>
              <Text style={s.statusLabel}>기관 판정</Text>
              <Text style={s.status}>{item.status ?? '기재 없음'}</Text>
            </View>
            {onExclude && exception && (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel={`${item.itemName} 이번 저장에서 제외`}
                accessibilityState={{ checked: omitted, disabled: busy }}
                disabled={busy}
                onPress={() => onExclude(item.fieldKey)}
                style={s.exceptionAction}
              >
                <Text style={s.exceptionText}>
                  {omitted ? '제외됨 · 다시 검수하기' : '이 결과 제외하기'}
                </Text>
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
}
