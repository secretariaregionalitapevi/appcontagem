import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  View,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { theme } from '../theme';

interface RefreshableScrollViewProps extends ScrollViewProps {
  refreshing: boolean;
  onRefresh: () => void | Promise<void>;
}

const WEB_PULL_DISTANCE = 72;

export const RefreshableScrollView: React.FC<RefreshableScrollViewProps> = ({
  refreshing,
  onRefresh,
  onScroll,
  scrollEventThrottle,
  children,
  ...props
}) => {
  const scrollYRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);
  const refreshRunningRef = useRef(false);
  const [pulling, setPulling] = useState(false);

  const runRefresh = useCallback(() => {
    if (refreshRunningRef.current || refreshing) return;

    refreshRunningRef.current = true;
    Promise.resolve(onRefresh()).finally(() => {
      refreshRunningRef.current = false;
      setPulling(false);
    });
  }, [onRefresh, refreshing]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollYRef.current = event.nativeEvent.contentOffset?.y || 0;
      onScroll?.(event);
    },
    [onScroll]
  );

  if (Platform.OS !== 'web') {
    return (
      <ScrollView
        {...props}
        onScroll={handleScroll}
        scrollEventThrottle={scrollEventThrottle || 16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={Platform.OS === 'android' ? [theme.colors.primary] : undefined}
            tintColor={Platform.OS === 'ios' ? theme.colors.primary : undefined}
            title={Platform.OS === 'android' ? 'Puxe para atualizar' : undefined}
            titleColor={Platform.OS === 'android' ? theme.colors.textSecondary : undefined}
            progressBackgroundColor={Platform.OS === 'android' ? theme.colors.surface : undefined}
            enabled={true}
          />
        }
      >
        {children}
      </ScrollView>
    );
  }

  const webTouchHandlers = {
    onTouchStart: (event: any) => {
      if (scrollYRef.current <= 0) {
        touchStartYRef.current = event.nativeEvent?.pageY ?? event.touches?.[0]?.pageY ?? null;
      }
    },
    onTouchMove: (event: any) => {
      if (touchStartYRef.current === null || scrollYRef.current > 0) return;

      const currentY = event.nativeEvent?.pageY ?? event.touches?.[0]?.pageY ?? 0;
      const distance = currentY - touchStartYRef.current;
      setPulling(distance > 18);
    },
    onTouchEnd: (event: any) => {
      if (touchStartYRef.current === null) return;

      const endY = event.nativeEvent?.pageY ?? event.changedTouches?.[0]?.pageY ?? touchStartYRef.current;
      const distance = endY - touchStartYRef.current;
      touchStartYRef.current = null;

      if (scrollYRef.current <= 0 && distance >= WEB_PULL_DISTANCE) {
        runRefresh();
        return;
      }

      setPulling(false);
    },
    onTouchCancel: () => {
      touchStartYRef.current = null;
      setPulling(false);
    },
  };

  return (
    <View style={styles.webContainer}>
      {(pulling || refreshing) && (
        <View style={styles.webIndicator}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      )}
      <ScrollView
        {...props}
        {...webTouchHandlers}
        onScroll={handleScroll}
        scrollEventThrottle={scrollEventThrottle || 16}
      >
        {children}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'visible',
  },
  webIndicator: {
    pointerEvents: 'none',
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
});
