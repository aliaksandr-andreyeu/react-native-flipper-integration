import React, { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { initializeFlipper, isFlipperDebugOnly, isFlipperEnabled } from 'react-native-flipper-kit';
import { ANDROID_DATABASE_PATH, open } from '@op-engineering/op-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DefaultPreference from 'react-native-default-preference';
import { demoTools } from './nativeDemoTools';


// A free, public, HTTPS REST API for the Network plugin demo. dummyjson covers realistic CRUD
// plus arbitrary status codes (/http/{code}) and latency (?delay=ms) from one origin.
const API_BASE = 'https://dummyjson.com';

// NOTE: Flipper's Network plugin hooks React Native's NetworkingModule (via an OkHttp
// interceptor). Expo's WinterCG runtime replaces global.fetch with `expo/fetch`, which uses a
// separate native client and BYPASSES NetworkingModule — so requests succeed but never reach
// Flipper. This example sets EXPO_PUBLIC_USE_RN_FETCH=1 (see package.json scripts) to keep RN's
// fetch, so the calls below flow through NetworkingModule and show up in the Network tab.

export default function FlipperDemo() {
  // Flipper initializes automatically — Android on native-module creation, iOS on
  // UIApplicationDidFinishLaunchingNotification. No manual call required.
  const enabled = isFlipperEnabled();
  const debugOnly = isFlipperDebugOnly();

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.container} testID='flipper-example-scroll'>
          <Text testID='flipper-example-title' style={styles.h1}>
            Flipper Integration — Plugin Demos
          </Text>
          <Text style={styles.subtitle}>Expo · New Architecture (SDK 57 · RN 0.86)</Text>
          {Platform.OS !== 'android' && (
            <Text style={styles.warn}>
              ⚠ Not all plugins work on iOS: Database, LeakCanary and Crash Reporter are Android-only (no FlipperKit
              equivalent) and disabled below; AsyncStorage runs but isn’t visible in any Flipper plugin on iOS. Network,
              Layout, UserDefaults and Logs work on iOS.
            </Text>
          )}

          <View style={styles.card} testID='flipper-example-card'>
            <Text style={styles.h2}>Status &amp; init</Text>
            <Text testID='flipper-status-enabled'>Flipper enabled: {String(enabled)}</Text>
            <Text testID='flipper-status-debug-only'>Debug only mode: {String(debugOnly)}</Text>
            <Text style={styles.note}>
              Init is automatic by default (Android: on module creation; iOS: on app launch).
            </Text>
            <Text style={styles.warn}>
              ⚠ This example sets `FLIPPER_AUTO_INIT=false` on purpose, so Flipper does NOT start on launch. Tap “Run”
              below to start it — until then Flipper Desktop shows no client and no logs/plugins flow.
            </Text>
            <Button
              testID='btn-init'
              label='Run initializeFlipper() (JS)'
              onPress={() => {
                initializeFlipper();
                return 'initializeFlipper() called — Flipper started';
              }}
            />
          </View>

          <NetworkCard />
          <DatabaseCard />
          <StorageCard />
          <PreferencesCard />
          <LogsCard />
          <CrashLeakCard />

          <View style={styles.card}>
            <Text style={styles.h2}>Layout Inspector</Text>
            <Text style={styles.note}>
              No action needed — open the Layout plugin to inspect this view tree. The cards above carry `testID`s for
              easy identification.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function NetworkCard() {
  const { status, run } = useAction();
  return (
    <View style={styles.card}>
      <Text style={styles.h2}>Network</Text>
      <Text style={styles.note}>
        Requests to {API_BASE} — watch the Network plugin (Android OkHttp interceptor / iOS NSURLConnection adapter,
        both installed by the module). The buttons cover methods, 2xx/4xx/5xx status codes and latency, so you can see
        status colors and timing.
      </Text>
      <Row>
        <Button
          testID='btn-net-get'
          label='GET 200'
          onPress={() =>
            run(async () => {
              const res = await fetch(`${API_BASE}/products/1`);
              const json = await res.json();
              return `GET ${res.status}: ${json.title}`;
            })
          }
        />
        <Button
          testID='btn-net-post'
          label='POST'
          onPress={() =>
            run(async () => {
              const res = await fetch(`${API_BASE}/products/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'flipper-kit demo' })
              });
              const json = await res.json();
              return `POST ${res.status}: created id=${json.id}`;
            })
          }
        />
        <Button
          testID='btn-net-404'
          label='GET 404'
          onPress={() =>
            run(async () => {
              const res = await fetch(`${API_BASE}/http/404`);
              return `status ${res.status} (${res.statusText || 'Not Found'})`;
            })
          }
        />
        <Button
          testID='btn-net-500'
          label='GET 500'
          onPress={() =>
            run(async () => {
              const res = await fetch(`${API_BASE}/http/500`);
              return `status ${res.status} (server error)`;
            })
          }
        />
        <Button
          testID='btn-net-slow'
          label='GET slow (1.5s)'
          onPress={() =>
            run(async () => {
              const t0 = Date.now();
              const res = await fetch(`${API_BASE}/products/1?delay=1500`);
              await res.json();
              return `GET ${res.status} in ${Date.now() - t0}ms`;
            })
          }
        />
      </Row>
      <Output testID='out-net' value={status} />
    </View>
  );
}

function DatabaseCard() {
  const { status, run } = useAction();
  return (
    <View style={styles.card}>
      <Text style={styles.h2}>Database (SQLite via op-sqlite)</Text>
      <Text style={styles.note}>
        Creates a `users` table in `demo.db` and inserts a row. On Android the DB is opened in the databases directory
        so it shows in the Databases plugin; the AsyncStorage card below also appears there (RKStorage).
      </Text>
      {Platform.OS !== 'android' && (
        <Text style={styles.androidOnly}>
          ⚠ Flipper’s Databases plugin is Android-only (it appears under “Unavailable” in Flipper on iOS). The SQLite
          write below still runs locally.
        </Text>
      )}
      <Button
        testID='btn-db-insert'
        disabled={Platform.OS !== 'android'}
        label={Platform.OS === 'android' ? 'Insert + query row' : 'Insert (Android only)'}
        onPress={() =>
          run(async () => {
            const db = open({
              name: 'demo.db',
              // Put the DB where Flipper's Android Databases plugin scans (context.databaseList()).
              location: Platform.OS === 'android' ? ANDROID_DATABASE_PATH : undefined
            });
            await db.execute(
              'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, created_at TEXT)'
            );
            await db.execute('INSERT INTO users (name, created_at) VALUES (?, ?)', [
              `user_${Date.now() % 1000}`,
              new Date().toISOString()
            ]);
            const res = await db.execute('SELECT COUNT(*) AS n FROM users');
            const count = res.rows?.[0]?.n ?? '?';
            return `users table now has ${String(count)} row(s)`;
          })
        }
      />
      <Output testID='out-db' value={status} />
    </View>
  );
}

function StorageCard() {
  const { status, run } = useAction();
  return (
    <View style={styles.card}>
      <Text style={styles.h2}>AsyncStorage</Text>
      <Text style={styles.note}>
        On Android, AsyncStorage is backed by the SQLite database `RKStorage`, which shows up in the Databases plugin
        automatically.
      </Text>
      {Platform.OS !== 'android' && (
        <Text style={styles.androidOnly}>
          ⚠ iOS: AsyncStorage is file-based (not SQLite), so it is not shown by any Flipper plugin. The write/read below
          still works — verify via the output line or the app container’s RCTAsyncLocalStorage_V1/manifest.json.
        </Text>
      )}
      <Button
        testID='btn-storage'
        label='Write + read a key'
        onPress={() =>
          run(async () => {
            const value = `v_${Date.now() % 10000}`;
            await AsyncStorage.setItem('@demo/key', value);
            const read = await AsyncStorage.getItem('@demo/key');
            return `stored & read back: ${read}`;
          })
        }
      />
      <Output testID='out-storage' value={status} />
    </View>
  );
}

function PreferencesCard() {
  const { status, run } = useAction();
  return (
    <View style={styles.card}>
      <Text style={styles.h2}>SharedPreferences / UserDefaults</Text>
      <Text style={styles.note}>
        Writes via react-native-default-preference to the default store — default SharedPreferences on Android (the
        `…_preferences` file) / standard NSUserDefaults on iOS. That file already exists at Flipper init, so the plugin
        shows updates live (no `setName` to a custom file created after init).
      </Text>
      <Button
        testID='btn-prefs'
        label='Set + get a preference'
        onPress={() =>
          run(async () => {
            const value = `pref_${Date.now() % 10000}`;
            await DefaultPreference.set('demoKey', value);
            const read = await DefaultPreference.get('demoKey');
            return `pref set & read back: ${read}`;
          })
        }
      />
      <Output testID='out-prefs' value={status} />
    </View>
  );
}

function LogsCard() {
  const { status, run } = useAction();
  return (
    <View style={styles.card}>
      <Text style={styles.h2}>Logs</Text>
      <Text style={styles.note}>
        `console.*` reaches the Logs plugin (Android: logcat as `ReactNativeJS`; iOS: device console). No module wiring
        needed.
      </Text>
      <Row>
        <Button
          testID='btn-log'
          label='log'
          onPress={() =>
            run(() => {
              console.log('[demo] console.log at', new Date().toISOString());
              return 'console.log emitted';
            })
          }
        />
        <Button
          testID='btn-warn'
          label='warn'
          onPress={() =>
            run(() => {
              console.warn('[demo] console.warn');
              return 'console.warn emitted';
            })
          }
        />
        <Button
          testID='btn-error'
          label='error'
          onPress={() =>
            run(() => {
              console.error('[demo] console.error');
              return 'console.error emitted';
            })
          }
        />
      </Row>
      <Output testID='out-logs' value={status} />
    </View>
  );
}

function CrashLeakCard() {
  const { status, run } = useAction();
  return (
    <View style={styles.card}>
      <Text style={styles.h2}>Crash &amp; Leak</Text>
      <Text style={styles.note}>
        Crash: Android throws natively → Flipper Crash Reporter (then the app crashes). Leak: Android only — LeakCanary
        reports a retained object to Flipper. Both need the native DemoTools module (
        {demoTools.hasNative ? 'linked' : 'NOT linked on this platform'}).
      </Text>
      {!demoTools.hasNative && (
        <Text style={styles.androidOnly}>
          ⚠ iOS: FlipperKit has no Crash Reporter or LeakCanary plugin (both appear under “Unavailable” in Flipper), so
          these demos are Android-only and disabled here.
        </Text>
      )}
      <Row>
        <Button
          testID='btn-crash'
          danger
          disabled={!demoTools.hasNative}
          label={demoTools.hasNative ? 'Force crash' : 'Crash (Android only)'}
          onPress={() =>
            run(() => {
              demoTools.crash();
              return 'crash requested';
            })
          }
        />
        <Button
          testID='btn-leak'
          danger
          disabled={!demoTools.hasNative}
          label={demoTools.hasNative ? 'Trigger leak' : 'Leak (Android only)'}
          onPress={() =>
            run(() => {
              const ok = demoTools.triggerLeak();
              return ok ? 'leak triggered (check LeakCanary)' : 'leak demo is Android-only';
            })
          }
        />
      </Row>
      <Output testID='out-crashleak' value={status} />
    </View>
  );
}

/* ---------- small UI helpers ---------- */

function useAction() {
  const [status, setStatus] = useState('—');
  const run = useCallback((fn: () => string | Promise<string>) => {
    setStatus('…');
    Promise.resolve()
      .then(fn)
      .then((msg) => setStatus(msg))
      .catch((e: unknown) => setStatus(`error: ${e instanceof Error ? e.message : String(e)}`));
  }, []);
  return { status, run };
}

type ButtonProps = {
  label: string;
  onPress: () => string | Promise<string> | void;
  testID?: string;
  disabled?: boolean;
  danger?: boolean;
};

function Button({ label, onPress, testID, disabled, danger }: ButtonProps) {
  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPress={() => onPress()}
      style={({ pressed }) => [
        styles.button,
        danger && styles.buttonDanger,
        disabled && styles.buttonDisabled,
        pressed && styles.buttonPressed
      ]}
    >
      <Text style={[styles.buttonText, danger && styles.buttonTextDanger]}>{label}</Text>
    </Pressable>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

function Output({ value, testID }: { value: string; testID?: string }) {
  return (
    <Text testID={testID} style={styles.output} numberOfLines={3}>
      {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f2f3f5' },
  container: { padding: 16, gap: 12 },
  h1: { fontSize: 20, fontWeight: '700' },
  h2: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  subtitle: { color: '#666', marginBottom: 4 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 6 },
  note: { color: '#555', fontSize: 12, lineHeight: 17 },
  androidOnly: { color: '#b25f00', fontSize: 12, lineHeight: 17, fontStyle: 'italic' },
  warn: { color: '#b25f00', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  button: {
    backgroundColor: '#e8eefc',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4
  },
  buttonDanger: { backgroundColor: '#fde8e8' },
  buttonDisabled: { opacity: 0.45 },
  buttonPressed: { opacity: 0.6 },
  buttonText: { color: '#1b4fd8', fontWeight: '600' },
  buttonTextDanger: { color: '#c0392b' },
  output: {
    marginTop: 8,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 12,
    color: '#222'
  }
});
