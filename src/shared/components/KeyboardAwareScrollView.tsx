import React, { createContext, useCallback, useEffect, useRef } from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  ScrollViewProps,
  TextInput,
} from 'react-native';

export const InputVisibilityContext = createContext<
  (input?: TextInput | null) => void
>(() => {});

export function KeyboardAwareScrollView({
  children,
  onScroll,
  onLayout,
  ...props
}: ScrollViewProps) {
  const scroll = useRef<ScrollView>(null);
  const offset = useRef(0);
  const keyboardTop = useRef(Number.POSITIVE_INFINITY);
  const activeInput = useRef<TextInput | null>(null);
  const measurement = useRef(0);
  const reveal = useCallback((focusedInput?: TextInput | null) => {
    if (focusedInput) activeInput.current = focusedInput;
    const currentMeasurement = ++measurement.current;
    requestAnimationFrame(() => {
      const input = activeInput.current;
      if (!input?.isFocused() || !scroll.current) return;
      scroll.current
        .getNativeScrollRef()
        ?.measureInWindow((_x, top, _width, height) => {
          input.measureInWindow(
            (_inputX, inputTop, _inputWidth, inputHeight) => {
              if (
                currentMeasurement !== measurement.current ||
                !input.isFocused()
              )
                return;
              const bottom = Math.min(top + height, keyboardTop.current) - 20;
              const delta =
                inputTop + inputHeight > bottom
                  ? inputTop + inputHeight - bottom
                  : Math.min(0, inputTop - top - 20);
              if (delta !== 0)
                scroll.current?.scrollTo({
                  y: Math.max(0, offset.current + delta),
                  animated: false,
                });
            },
          );
        });
    });
  }, []);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', event => {
      keyboardTop.current = event.endCoordinates.screenY;
      reveal();
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTop.current = Number.POSITIVE_INFINITY;
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [reveal]);
  return (
    <InputVisibilityContext.Provider value={reveal}>
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={
          Platform.OS === 'ios'
            ? 'interactive'
            : Platform.OS === 'android'
            ? 'on-drag'
            : 'none'
        }
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        {...props}
        onScroll={event => {
          offset.current = event.nativeEvent.contentOffset.y;
          onScroll?.(event);
        }}
        onLayout={event => {
          reveal();
          onLayout?.(event);
        }}
      >
        {children}
      </ScrollView>
    </InputVisibilityContext.Provider>
  );
}
