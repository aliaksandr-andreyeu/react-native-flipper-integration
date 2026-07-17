# FlipperKit Expo example (New Architecture)

Expo SDK 57 / React Native 0.86, New Architecture, integrating [`react-native-flipper-kit`](../..)
and demonstrating every plugin (Network, Databases, SharedPreferences, LeakCanary, Crash Reporter,
Logs, Layout Inspector). Init is manual (`flipperAutoInit: false`) — press **Run** in the app.

Start it with the project scripts (`npm run android` / `npm run start`), **not** raw `npx expo …`,
so the Expo-specific workarounds below are applied.

## Two Expo-specific gotchas (and how this example handles them)

### 1. Network plugin needs `EXPO_PUBLIC_USE_RN_FETCH=1`

Flipper's Network plugin captures traffic through React Native's `NetworkingModule` (an OkHttp
interceptor installed via `NetworkingModule.setCustomClientBuilder`). Expo's WinterCG runtime
**replaces `global.fetch` with `expo/fetch`**, a separate native client that **bypasses
`NetworkingModule`** — so requests succeed but never reach Flipper and the Network tab stays empty.

This example sets `EXPO_PUBLIC_USE_RN_FETCH=1` in its `start` / `android` / `ios` scripts
(`package.json`), which tells Expo to keep RN's `fetch` (see
`node_modules/expo/src/winter/runtime.native.ts`). The flag is inlined into the JS bundle at build
time, so after changing it restart Metro with `npm run start:clear` — no native rebuild needed.

### 2. Crash / Leak buttons need a native module delivered via a config plugin

The Crash Reporter and LeakCanary demos need a small native `DemoTools` module (a JS `throw` never
reaches the global uncaught handler, and LeakCanary only watches native objects). In a bare app you
just drop the Kotlin into `android/`; in Expo, `expo prebuild` (run by `expo run:android`)
regenerates `android/` and wipes hand-placed native files. So the same Kotlin is shipped through a
local config plugin, [`plugins/withDemoTools.js`](plugins/withDemoTools.js), which re-applies it on
every prebuild. **Lesson: in Expo, all native glue must go through a config plugin, never hand-edits
to `android/`/`ios/`.**

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
