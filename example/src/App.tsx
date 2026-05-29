import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { initializeFlipper, isFlipperDebugOnly, isFlipperEnabled } from 'react-native-flipper-integration';

export default function App() {
  const enabled = isFlipperEnabled();
  const debugOnly = isFlipperDebugOnly();

  if (__DEV__ && enabled) {
    initializeFlipper();
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card} testID='flipper-example-card'>
        <Text testID='flipper-example-title' style={styles.title}>
          Flipper Integration Example
        </Text>
        <Text testID='flipper-status-enabled'>Flipper enabled: {String(enabled)}</Text>
        <Text testID='flipper-status-debug-only'>Debug only mode: {String(debugOnly)}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    gap: 8
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8
  }
});
