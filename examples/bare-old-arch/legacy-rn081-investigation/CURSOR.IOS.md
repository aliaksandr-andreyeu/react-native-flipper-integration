# bare-old-arch — iOS fixes (Old Architecture, RN 0.81.6)

> ## ✅ RESOLVED — root cause found (2026-07-04)
> Первопричина всего описанного ниже каскада — **не монорепо-линковка**, а **сам FlipperKit**:
> его замороженный `Flipper-Folly` (~2021) конфликтует по ODR с `RCT-Folly` (2024.x) React Native.
> Paper-мост маршалит константы/сообщения через `folly::dynamic` (`convertIdToFollyDynamic`);
> при смешении двух ABI словари приходят в JS пустыми `{}` — это и есть «сломанный marshalling
> NSDictionary» из пункта 2 ниже. **Доказано экспериментально на `bare-old-arch2` (RN 0.76.9):**
> `NO_FLIPPER=1 pod install` (убирает Flipper-поды, всё остальное идентично) → приложение
> рендерится и работает полностью; возврат подов → белый экран. Тот же корень крашит
> `expo-old-arch` (RN 0.79, SIGABRT в fusebox `folly::toJson`). New Arch не задет — JSI
> маршалит напрямую, минуя `folly::dynamic`. Рабочий режим old-arch iOS: `NO_FLIPPER=1`.
> Подробно: корневой README → Troubleshooting → «Old Architecture + iOS».
>
> Всё ниже — исторический лог посимптомного расследования (патчи лечили следствия, не причину).

> Консолидированная документация по runtime- и build-фиксам для iOS в этом example.
> Последнее обновление: **2026-06-28** (слои 1–7). `bare-new-arch` (RN 0.85, New Arch) эти проблемы **не** воспроизводит.

Контекст: example линкует `react-native-flipper-kit` через `file:../..`, архитектура закреплена
нативно (`RCT_NEW_ARCH_ENABLED=0` в Podfile, `newArchEnabled=false` в Gradle). AppDelegate
регистрирует модуль `FlipperKitBareOldArch` — имя совпадает с `app.json`.

**Корневая тема:** на Paper bridge (Old Arch) iOS два класса проблем:
1. **Lazy constants** — `getConstants()` → `{}` до `RCTInitializing.initialize()`.
2. **Сломанный marshalling `NSDictionary`** — объект приходит в JS как `{}` без enumerable-ключей
   (`rootTag`, touch fields, `Dimensions.window`). Числа и отдельные аргументы маршалятся нормально.

---

## История изменений (2026-06-28)

Приведение `examples/bare-old-arch` к рабочему состоянию на iOS (RN 0.81.6, Paper / Old Arch).
Ошибки шли **каскадом** — каждый слой блокировал следующий; фиксы накапливались в одном патче
[`patches/react-native+0.81.6.patch`](patches/react-native+0.81.6.patch) (**14 файлов** в `node_modules/react-native`) +
изменения в **`react-native-flipper-kit`** (repo root) + **`metro.config.js`** + **`AppDelegate`** + **`src/App.tsx`**.

### Хронология слоёв

| # | Слой | Симптом | Причина | Fix |
| --- | --- | --- | --- | --- |
| 1 | DevTools / Settings | `getDevServer`: `match` of undefined; `Settings.get`: convert undefined | Lazy native modules: `getConstants()` → `{}` при evaluate bundle | Optional chaining, default `{}` |
| 2 | InitializeCore | `major` / `screen` of undefined; `AppRegistry` not callable | Те же lazy constants; ES namespace в `registerCallableModule` | Guards + plain object для callable module |
| 3 | **rootTag / mount** | `Expect to have a valid rootTag`; `Running "…" with {}` | `NSDictionary` не маршалится в JS-объект на Paper bridge | Native: 3 аргумента `(moduleName, rootTag, initialProps)` |
| 4 | **react-native-flipper-kit** | `isEnabled is not a function`; белый экран без redbox | `constantsToExport` → NSNumber 0/1; TurboModule-stub; sync в render; stale `lib/` | `coerceNativeBool`, `constantsToExport`, `useEffect`, `npm run build`, Metro |
| 5 | Touch events | `Touch object is missing identifier` | Touch dict не маршалится на Paper bridge | `RCTTouchEvent.m` tuples + `RCTEventEmitter.js` |
| 6 | SafeArea / layout | `No dimension set for key window` | `Dimensions` dict → `{}` без `window` | `NativeDeviceInfo.js` + `Dimensions.js` fallback |
| 7 | **SafeAreaProvider** | Белый экран / `bottom of undefined` | `onInsetsChange` шлёт `{}` insets; без insets → `null` children | RN built-in `SafeAreaView` вместо `react-native-safe-area-context` |

### Слой 1–2 — Lazy constants (DevTools / InitializeCore)

**Симптомы:**

```
TypeError: Cannot read property 'match' of undefined       — getDevServer.js
TypeError: Cannot convert undefined value to object        — Settings.ios.js
TypeError: Cannot read property 'major' of undefined       — ReactNativeVersionCheck.js
TypeError: Cannot read property 'screen' of undefined      — Dimensions.js (до слоя 6)
Invariant Violation: AppRegistry.runApplication not callable
```

**Fix (patch):** guards в `getDevServer.js`, `Settings.ios.js`, `ReactNativeVersionCheck.js`,
`Platform.ios.js`, `AppRegistry.js` (plain object вместо ES namespace), `setUpReactDevTools.js`
(skip Fusebox/CDP), `setUpDefaultReactNativeEnvironment.js` (skip `LogBox.install()`).

---

### Слой 3 — rootTag (ключевой фикс mount)

**Диагностика.** Xcode / native log:

```
Running application FlipperKitBareOldArch ({ initialProps = {}; rootTag = 1; })
```

Metro / JS (~10 с позже):

```
Running "FlipperKitBareOldArch" with {}
Invariant Violation: Expect to have a valid rootTag, instead got
```

Native формирует корректный `NSDictionary`, но на Paper bridge он приходит в JS как пустой `{}`
без enumerable-ключей. `normalizeAppParameters()` не может восстановить `rootTag` из `{}`.

**Решение — обход сломанного marshalling:**

1. **Native** (`RCTRootView.m`) — вместо одного словаря передаём `rootTag` и `initialProps` отдельно:

```objc
// было:
[bridge enqueueJSCall:@"AppRegistry" method:@"runApplication"
               args:@[ moduleName, appParameters ] completion:NULL];

// стало:
[bridge enqueueJSCall:@"AppRegistry" method:@"runApplication"
               args:@[ moduleName, _contentView.reactTag, _appProperties ?: @{} ]
         completion:NULL];
```

2. **Native** (`RCTSurface.mm`) — то же для LogBox / Surface mount:

```objc
args:@[ moduleName, params[@"rootTag"], params[@"initialProps"] ?: @{} ]
```

3. **JS** (`AppRegistryImpl.js`) — `runApplication` принимает оба формата:
   - legacy: `(appKey, { rootTag, initialProps })`
   - patched native: `(appKey, rootTag, initialProps[, displayMode])`

**Признак успеха** в Metro:

```
Running "FlipperKitBareOldArch" with {"rootTag":1,"initialProps":{}}
```

После изменений в `RCTRootView.m` / `RCTSurface.mm` нужна **полная пересборка** (`npx react-native run-ios`), reload Metro (`r`) недостаточен.

---

### Слой 4 — react-native-flipper-kit

Отдельно от RN-патча. После успешного mount (`rootTag` OK) UI мог падать в `useEffect` или висеть белым.

**Симптомы:**

```
TypeError: getReactNativeFlipperKitModule().isEnabled is not a function (it is undefined)
  at App (…/src/App.tsx) — useEffect
```

Белый экран без redbox (Metro без явной ошибки) — deadlock JS thread при sync native в первом render.

**Причины:**

1. **Old Arch iOS** экспортирует флаги через `constantsToExport` (`flipperEnabled`, `flipperDebugOnly`), не через
   `isEnabled()` / `isDebugOnly()`. NSNumber → JS **number (0/1)**, не boolean — строгая проверка
   `typeof === 'boolean'` не срабатывала, код падал на `legacy.isEnabled`.
2. **`TurboModuleRegistry.get('ReactNativeFlipperKit')`** может вернуть пустой stub без callable getters.
3. **`RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD`** (старый код) блокировал JS thread при первом render.
4. Metro мог брать **устаревший `lib/index.js`**, если не запускали `npm run build` в корне репо.

**Fix (repo root + example):**

| Файл | Изменение |
| --- | --- |
| [`ios/ReactNativeFlipperKit.mm`](../../ios/ReactNativeFlipperKit.mm) | `constantsToExport`: `flipperEnabled`, `flipperDebugOnly`; `RCT_EXPORT_METHOD(start)` |
| [`src/index.ts`](../../src/index.ts) | `coerceNativeBool()` (0/1/boolean/string); `readLegacyFlipperConstants()` + `getConstants()`; `isSpecModule()` — не использовать TurboModule-stub; `legacyModuleWithSafeDefaults()` если есть только `start()` |
| [`lib/index.js`](../../lib/index.js) | Собирается из `src/` через `npm run build` (package `main` → `lib/`) |
| [`src/App.tsx`](src/App.tsx) | `useEffect` для Flipper; RN `SafeAreaView` вместо `safe-area-context` |
| [`metro.config.js`](metro.config.js) | `react-native-flipper-kit` в `forcedModules` — резолв через symlink example → repo root |

После правок в `src/index.ts`:

```bash
cd /path/to/react-native-flipper-kit   # корень репо
npm run build                          # обновить lib/index.js
cd examples/bare-old-arch
npx react-native start --reset-cache   # Metro
```

Native rebuild **не** нужен для JS-only правок библиотеки.

---

### Слой 5 — Touch events

**Симптом:**

```
[Error: Touch object is missing identifier.]
```

Та же причина, что у `rootTag`: native touch dict (`identifier`, `pageX`, …) приходит в JS пустым/без ключей.

**Fix (patch):**

1. **`RCTTouchEvent.m`** — передаёт touches как массивы `[identifier, target, pageX, pageY, locationX, locationY, timestamp, force]`
2. **`RCTEventEmitter.js`** — `normalizeTouches()` / `touchFromTuple()` восстанавливает объекты перед `receiveTouches`

Native rebuild обязателен (`npx react-native run-ios`).

---

### Слой 6 — Dimensions

**Симптом:**

```
Invariant Violation: No dimension set for key window
  at SafeAreaProvider (react-native-safe-area-context)
```

`NativeDeviceInfo.getConstants().Dimensions` приходит как `{}` (truthy, но без `window`) — та же проблема marshalling.
`Dimensions.set({})` записывал `{window: undefined, screen: undefined}` → `Dimensions.get('window')` падал.

**Fix (patch):**

| Файл | Изменение |
| --- | --- |
| `NativeDeviceInfo.js` | `hasWindowDimensions()` — `{}` не считается валидным; `FALLBACK_DIMENSIONS` **390×844** (не 0×0) |
| `Dimensions.js` | `normalizeDimensionsPayload()` перед `set()`; `FALLBACK_METRICS` 390×844; `get('window'/'screen')` → fallback; **`didUpdateDimensions`**: игнор пустого payload (Paper bridge снова шлёт `{}`) |

Реальные размеры экрана приходят позже через `didUpdateDimensions`, когда native `RCTDeviceInfo` инициализирован
и marshalling события срабатывает. До этого layout опирается на fallback.

Только JS — достаточно `npm install` + Metro `--reset-cache` + reload (`r` / Cmd+R).

---

### Слой 7 — SafeArea (белый экран / `bottom of undefined`)

**Симптом 1:** Metro чистый, `Running "…" with {"rootTag":N,…}`, нет redbox — **белый экран**.

**Симптом 2** (после `initialSafeAreaInsets`):

```
TypeError: Cannot read property 'bottom' of undefined
  at SafeAreaProvider — onInsetsChange
```

**Причина:** `react-native-safe-area-context` v5+:
1. Без `initialSafeAreaInsets` — `insets === null` → children не рендерятся (белый экран).
2. С `initialSafeAreaInsets` — native `onInsetsChange` шлёт `insets: {}` (Paper marshalling) →
   `nextInsets.bottom` падает в `setInsets`.

**Fix (example):** убрать `SafeAreaProvider` / `react-native-safe-area-context`, использовать
**встроенный** [`SafeAreaView`](https://reactnative.dev/docs/safeareaview) из `react-native` —
insets применяются на native стороне, без JS-события `onInsetsChange`.

```tsx
import { SafeAreaView, … } from 'react-native';

<SafeAreaView style={styles.safe}>
  <ScrollView …>
```

`bare-new-arch` по-прежнему использует `react-native-safe-area-context` (New Arch без этой проблемы).

Только JS — Metro `--reset-cache` + reload.

---

### AppDelegate

Шаблон RN 0.81 `RCTReactNativeFactory` заменён на прямой `RCTBridge` + `RCTRootView`:

[`ios/FlipperKitBareOldArch/AppDelegate.swift`](ios/FlipperKitBareOldArch/AppDelegate.swift)

- `moduleName: "FlipperKitBareOldArch"` — совпадает с `app.json`
- `rootTag` fix живёт в **patch** (`RCTRootView.m`), не в AppDelegate

### Поддержка патча

```bash
cd examples/bare-old-arch
npm install              # postinstall → patch-package
npx patch-package        # проверка: react-native@0.81.6 ✔
```

Пересоздать после правок в `node_modules/react-native`:

```bash
npx patch-package react-native   # нужен network + write вне sandbox
```

При апгрейде RN внутри 0.81.x — перенести те же guards вручную или пересоздать патч.

### Ожидаемый результат

- Metro: `Running "FlipperKitBareOldArch" with {"rootTag":1,"initialProps":{}}`
- Фон `#f2f3f5`, заголовок «Flipper Integration — Plugin Demos»
- Карточка Status: `Flipper enabled: true/false`, кнопки нажимаются
- Нет `rootTag` / `isEnabled` / `window` / touch identifier ошибок
- `WARN No connected targets` до подключения симулятора — норма
- `Unbalanced calls start/end for tag 19` — шум RN layout, не блокирует UI
- **Не нажимать `j`** в Metro (Fusebox/CDP не работает на Paper RN 0.81)

### Матрица пересборки

| Изменения в | Действие |
| --- | --- |
| `patches/react-native+0.81.6.patch` — JS (`Dimensions.js`, `AppRegistryImpl.js`, …) | `npm install` + Metro `--reset-cache` + reload |
| `patches/react-native+0.81.6.patch` — native (`RCTRootView.m`, `RCTTouchEvent.m`, …) | + `npx react-native run-ios` (полный rebuild) |
| `react-native-flipper-kit` `src/index.ts` | `npm run build` в корне репо + Metro `--reset-cache` |
| `src/App.tsx` (`SafeAreaView`, `useEffect`) | Metro `--reset-cache` + reload |
| `AppDelegate.swift` | `npx react-native run-ios` |
| `ios/Podfile` | `pod install` + `npx react-native run-ios` |

---

### Изменения вне RN-патча (repo + example)

| Файл | Зачем |
| --- | --- |
| [`ios/FlipperKitBareOldArch/AppDelegate.swift`](ios/FlipperKitBareOldArch/AppDelegate.swift) | `RCTBridge` + `RCTRootView` вместо `RCTReactNativeFactory` |
| [`metro.config.js`](metro.config.js) | `forcedModules`: `react`, `react-native`, `react-native-flipper-kit` |
| [`../../ios/ReactNativeFlipperKit.mm`](../../ios/ReactNativeFlipperKit.mm) | `constantsToExport` на Old Arch iOS |
| [`../../src/index.ts`](../../src/index.ts) | `coerceNativeBool`, безопасный резолв модуля |
| [`../../lib/index.js`](../../lib/index.js) | compiled output; `npm run build` |
| [`src/App.tsx`](src/App.tsx) | RN `SafeAreaView`; Flipper в `useEffect` |

---

## 1. RN 0.81 Old Arch startup crashes (patch-package)

> Детальная хронология и rootTag-fix — см. [История изменений](#история-изменений-2026-06-28) выше.

### Симптомы

На Paper bridge (Old Arch) iOS native modules могут быть **lazy** — `getConstants()` в первые
миллисекунды после загрузки bundle возвращает `{}` или неполные данные, потому что
`RCTInitializing.initialize()` ещё не отработал. RN 0.81 обращается к константам синхронно при
evaluate bundle. Это **upstream RN 0.81**, не `react-native-flipper-kit`. `bare-new-arch` (RN 0.85,
New Arch) эти пути не воспроизводит.

**Слой 1 — DevTools** (`setUpReactDevTools` / `setUpDefaltReactNativeEnvironment`):

```
TypeError: Cannot read property 'match' of undefined
  at getDevServer (…/Libraries/Core/Devtools/getDevServer.js)

TypeError: Cannot convert undefined value to object
  at Settings.get (…/Libraries/Settings/Settings.ios.js)
  at getGlobalHookSettings (…/ReactDevToolsSettingsManager.ios.js)
```

**Слой 2 — InitializeCore / AppRegistry** (после DevTools-патча):

```
TypeError: Cannot read property 'major' of undefined
  at checkVersions (…/Libraries/Core/ReactNativeVersionCheck.js)

TypeError: Cannot read property 'screen' of undefined
  at Dimensions.set (…/Libraries/Utilities/Dimensions.js)

Invariant Violation: Failed to call into JavaScript module method AppRegistry.runApplication().
  Module has not been registered as callable.

Invariant Violation: Failed to call into JavaScript module method RCTEventEmitter.receiveTouches().
  Registered callable JavaScript modules (n = 7): Systrace, JSTimers, RCTLog, …
```

**Слой 3 — rootTag / mount** (после lazy-constants патча):

```
Invariant Violation: Expect to have a valid rootTag, instead got
  at renderApplication (…/Libraries/ReactNative/renderApplication.js)

Running "FlipperKitBareOldArch" with {}
```

**Слой 4 — flipper-kit** (после rootTag):

```
TypeError: getReactNativeFlipperKitModule().isEnabled is not a function (it is undefined)
```

**Слой 5 — touch** (при нажатии на UI):

```
[Error: Touch object is missing identifier.]
```

**Слой 6 — Dimensions** (после mount):

```
Invariant Violation: No dimension set for key window
  at SafeAreaProvider
```

**Слой 7 — SafeArea** (после слоя 6):

```
TypeError: Cannot read property 'bottom' of undefined
  at SafeAreaProvider — onInsetsChange
```

(или белый экран, если `insets === null` без fix)

Native логирует `rootTag = 1`, но JS получает `{}` — на Paper bridge `NSDictionary` с
`rootTag`/`initialProps` не маршалится в JS-объект (приходит пустой `{}`), а не гонка AppDelegate.

**Fix:** native передаёт `(moduleName, rootTag, initialProps)` тремя аргументами вместо одного
`NSDictionary`; JS `AppRegistryImpl.runApplication` принимает оба формата.

**Metro / DevTools** (не блокирует UI, но шумит в терминале):

```
WARN  No connected targets
ERROR Failed to open debugger … HeadersTimeoutError
INFO  Connection closed to DevTools … code='1001'
```

Fusebox / Metro `j` (React Native DevTools) требует C++ CDP bridge (New Arch). На Paper RN 0.81
таймаутит — это ожидаемо; логи смотрите в терминале Metro или Xcode.

### Workaround (example)

[`patch-package`](https://github.com/ds300/patch-package) + [`patches/react-native+0.81.6.patch`](patches/react-native+0.81.6.patch), применяется на `npm install` (`postinstall` в `package.json`).

| Файл в `node_modules/react-native` | Guard |
| --- | --- |
| `Libraries/Core/Devtools/getDevServer.js` | `scriptUrl?.match(...)` — fallback `http://localhost:8081/` |
| `Libraries/Settings/Settings.ios.js` | `_settings` → `{}`, если `SettingsManager` constants не готовы |
| `Libraries/Core/ReactNativeVersionCheck.js` | пропуск проверки, если `reactNativeVersion` ещё `undefined` |
| `Libraries/Utilities/Platform.ios.js` | не кэшировать пустые constants; перечитывать до `reactNativeVersion` |
| `src/private/specs_DEPRECATED/modules/NativeDeviceInfo.js` | `hasWindowDimensions()`; `FALLBACK_DIMENSIONS` 390×844; `{}` не кэшируется |
| `Libraries/Utilities/Dimensions.js` | `normalizeDimensionsPayload()`; fallback 390×844; игнор пустого `didUpdateDimensions`; init через `Dimensions.set(normalize…)` |
| `Libraries/ReactNative/AppRegistry.js` | plain object для `registerCallableModule` (не ES namespace) |
| `Libraries/ReactNative/AppRegistryImpl.js` | `normalizeAppParameters` + `(appKey, rootTag, initialProps)` |
| `React/Base/RCTRootView.m` | `runApplication` args: `moduleName`, `reactTag`, `initialProps` |
| `React/Base/Surface/RCTSurface.mm` | то же для LogBox / Surface mount |
| `React/Base/RCTTouchEvent.m` | touches как tuples `[identifier, target, pageX, …]` |
| `Libraries/EventEmitter/RCTEventEmitter.js` | `normalizeTouches()` перед `receiveTouches` |
| `Libraries/Core/setUpReactDevTools.js` | на Paper Old Arch — не подключать Fusebox/CDP DevTools |
| `src/private/setup/setUpDefaultReactNativeEnvironment.js` | на Paper Old Arch — пропустить `LogBox.install()` |

**Полный список 14 файлов в патче:** `getDevServer.js`, `ReactNativeVersionCheck.js`, `setUpReactDevTools.js`,
`RCTEventEmitter.js`, `AppRegistry.js`, `AppRegistryImpl.js`, `Settings.ios.js`, `Dimensions.js`,
`Platform.ios.js`, `RCTRootView.m`, `RCTTouchEvent.m`, `RCTSurface.mm`,
`setUpDefaultReactNativeEnvironment.js`, `NativeDeviceInfo.js`.

### Metro (`metro.config.js`)

Example форсирует резолв singleton-пакетов из **своего** `node_modules`, а не из корня репо (RN 0.85):

```javascript
const forcedModules = ['react', 'react-native', 'react-native-flipper-kit'];
```

- `watchFolders: [repoRoot]` — следит за linked `react-native-flipper-kit` в корне репо
- `extraNodeModules` — резолв через symlink `examples/bare-old-arch/node_modules/…`
- `blockList` — блокирует дубликаты из `repoRoot/node_modules` (иначе codegen 0.81 падает на спеках 0.85)

После правок в `src/index.ts` библиотеки: `npm run build` в корне репо + Metro `--reset-cache`.

### AppDelegate (native)

Example использует **прямой** `RCTBridge` + `RCTRootView` (не `RCTReactNativeFactory`):

[`ios/FlipperKitBareOldArch/AppDelegate.swift`](ios/FlipperKitBareOldArch/AppDelegate.swift)

`rootTag` fix — в **patch** (`RCTRootView.m` / `RCTSurface.mm`), не в AppDelegate. После смены
native-кода в patch — **полная пересборка** (`npx react-native run-ios`), не только reload Metro.

```bash
npx patch-package
# → react-native@0.81.6 ✔
```

При апгрейде RN внутри линии 0.81.x — пересоздать патч (`npx patch-package react-native`) или
вручную вернуть те же guards.

---

## 2. Белый экран без redbox

> Слои 4 и 7 в [Истории изменений](#история-изменений-2026-06-28). Ниже — краткая справка.

### Симптом

Metro подключён, redbox **может отсутствовать**, **пустой белый экран**. `bare-new-arch` iOS работает.

| Этап | Что видно в логах | Слой |
| --- | --- | --- |
| Mount OK | `Running "…" with {"rootTag":N,…}` | 3 ✓ |
| Crash в useEffect | `isEnabled is not a function` | 4 |
| Crash при тапе | `Touch object is missing identifier` | 5 |
| Crash при layout | `No dimension set for key window` | 6 |
| **Тишина** | только `Unbalanced calls start/end for tag 19` | **7** |

**Не нажимайте `j`** в Metro на Old Arch — DevTools CDP не поддерживается.

### Fix (библиотека + example)

| Слой | Файл | Что сделано |
| --- | --- | --- |
| Native | [`ios/ReactNativeFlipperKit.mm`](../../ios/ReactNativeFlipperKit.mm) | `constantsToExport`: `flipperEnabled`, `flipperDebugOnly` |
| Library JS | [`src/index.ts`](../../src/index.ts) | `coerceNativeBool`; резолв на каждый вызов; legacy constants → TurboModule; safe defaults |
| Library build | [`lib/index.js`](../../lib/index.js) | `npm run build` в корне репо после правок `src/` |
| Metro | [`metro.config.js`](metro.config.js) | `react-native-flipper-kit` в `forcedModules` |
| Example | [`src/App.tsx`](src/App.tsx) | Flipper status в `useEffect`; **RN `SafeAreaView`** вместо `safe-area-context` |

### Пересборка

```bash
cd examples/bare-old-arch/ios && pod install && cd ..
npx react-native start --reset-cache
npx react-native run-ios
```

Ожидаемый UI: фон `#f2f3f5`, заголовок «Flipper Integration — Plugin Demos».

---

## 3. iOS build fixes (RN 0.81 + FlipperKit + Xcode 16)

Compile-time фиксы в [`ios/Podfile`](ios/Podfile) `post_install` — см. таблицу в [README.md](README.md#ios-build-fixes-rn-081--flipperkit--xcode-16). Кратко:

| # | Что | Симптом без фикса |
| --- | --- | --- |
| 1 | `ENABLE_USER_SCRIPT_SANDBOXING = NO` | Sandbox deny при Embed Pods Frameworks |
| 2 | `IPHONEOS_DEPLOYMENT_TARGET = 15.6` (все pods) | deployment-target warnings/errors |
| 3 | Patch Flipper-Folly `CacheLocality.h` | `static_assert … GlobalState … not trivial` |
| 4 | `fmt` → C++17 | `consteval … not a constant expression` |
| 5 | Flipper-Boost первым в `HEADER_SEARCH_PATHS` для `Flipper*` | `exception_array_disposer` not found |

Также в `.xcodeproj`: `SWIFT_ACTIVE_COMPILATION_CONDITIONS = "$(inherited) DEBUG"` для Debug.

---

## 4. Чеклист запуска iOS

```bash
# 1. Корень репо — собрать lib/ библиотеки (если меняли src/index.ts)
cd /path/to/react-native-flipper-kit
npm run build

# 2. Example — патч RN + pods
cd examples/bare-old-arch
npm install                    # postinstall → patch-package (14 файлов)
npx patch-package              # проверка: react-native@0.81.6 ✔
cd ios && pod install && cd ..

# 3. Запуск
npx react-native start --reset-cache   # терминал 1 — не жмите `j`
npx react-native run-ios               # терминал 2 — обязателен после native-патча
```

Если UI частично работает, но ошибки в логах старые — сначала Metro `--reset-cache`, затем reload.
После изменений в `RCTRootView.m` / `RCTTouchEvent.m` — только `run-ios`, reload недостаточен.

---

## 5. Индекс файлов

| Область | Файл |
| --- | --- |
| **Документация (этот файл)** | `CURSOR.IOS.md` |
| RN patch (**14 файлов**) | `patches/react-native+0.81.6.patch` |
| postinstall | `package.json` → `"postinstall": "patch-package"` |
| AppDelegate (RCTBridge) | `ios/FlipperKitBareOldArch/AppDelegate.swift` |
| Library native (Old Arch iOS) | `../../ios/ReactNativeFlipperKit.mm` |
| Library JS | `../../src/index.ts` |
| Library compiled (Metro `main`) | `../../lib/index.js` ← `npm run build` |
| Example UI (Old Arch workarounds) | `src/App.tsx` — RN `SafeAreaView`, `useEffect` |
| App entry / module name | `index.js`, `app.json` |
| Metro (RN 0.81 vs root 0.85 + flipper-kit) | `metro.config.js` |
| Flipper flags | `ios/Podfile` (`FLIPPER_AUTO_INIT`, `FLIPPER_DEBUG_ONLY`) |
| Podfile build hacks | `ios/Podfile` `post_install` |

---

## 6. Что **не** является багом этого example

- Имя RN-модуля `FlipperKitBareOldArch` в AppDelegate — **корректно** (в отличие от legacy `example/` с `FlipperExampleGen`).
- Патчи RN DevTools / InitializeCore — workaround для EOL Old Arch; в `bare-new-arch` не нужны.
- Асимметрия плагинов Flipper на iOS (нет Database/LeakCanary UI) — by design, см. README.
