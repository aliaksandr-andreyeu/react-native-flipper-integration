import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

/**
 * Phase 1: paint a tiny tree (proves Paper mount). Phase 2: load DemoApp on next tick.
 */
export default function App() {
  const [DemoApp, setDemoApp] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setDemoApp(() => require('./DemoApp').default);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  if (DemoApp != null) {
    return <DemoApp />;
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#f2f3f5',
        justifyContent: 'center',
        padding: 24
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: '700' }}>FlipperKit Bare Old Arch</Text>
      <Text style={{ marginTop: 8, color: '#666' }}>Loading demo…</Text>
    </View>
  );
}
