const mockTurboModule = {
  isEnabled: jest.fn(() => true),
  isDebugOnly: jest.fn(() => true),
  start: jest.fn()
};

const mockLegacyModule = {
  isEnabled: jest.fn(() => false),
  isDebugOnly: jest.fn(() => false),
  start: jest.fn()
};

const mockGet = jest.fn<unknown | null, []>(() => null);
const mockPlatformSelect = jest.fn(
  (options: { ios?: string; default?: string }) => options.ios ?? options.default ?? ''
);

jest.mock('react-native', () => {
  const nativeModules: Record<string, unknown> = {};
  Object.defineProperty(nativeModules, 'ReactNativeFlipperKit', {
    get: () =>
      (global as typeof globalThis & { __legacyFlipperModule?: typeof mockLegacyModule }).__legacyFlipperModule,
    enumerable: true,
    configurable: true
  });

  return {
    NativeModules: nativeModules,
    Platform: {
      select: (options: { ios?: string; default?: string }) => mockPlatformSelect(options)
    },
    TurboModuleRegistry: {
      get: () => mockGet()
    }
  };
});

function setTurboModule(module: typeof mockTurboModule | null) {
  mockGet.mockReturnValue(module);
}

function setLegacyModule(module: typeof mockLegacyModule | undefined) {
  (global as typeof globalThis & { __legacyFlipperModule?: typeof mockLegacyModule }).__legacyFlipperModule = module;
}

function loadApi() {
  let api: typeof import('../src/index');
  jest.isolateModules(() => {
    api = require('../src/index');
  });
  return api!;
}

describe('react-native-flipper-kit JS API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setTurboModule(null);
    setLegacyModule(undefined);
    mockPlatformSelect.mockImplementation((options) => options.ios ?? options.default ?? '');
  });

  it('uses Turbo Module when available', () => {
    setTurboModule(mockTurboModule);

    const { isFlipperEnabled, isFlipperDebugOnly, initializeFlipper } = loadApi();

    expect(isFlipperEnabled()).toBe(true);
    expect(isFlipperDebugOnly()).toBe(true);
    initializeFlipper();

    expect(mockTurboModule.isEnabled).toHaveBeenCalled();
    expect(mockTurboModule.isDebugOnly).toHaveBeenCalled();
    expect(mockTurboModule.start).toHaveBeenCalled();
    expect(mockLegacyModule.isEnabled).not.toHaveBeenCalled();
  });

  it('falls back to NativeModules when Turbo Module is missing', () => {
    setLegacyModule(mockLegacyModule);

    const { isFlipperEnabled, initializeFlipper } = loadApi();

    expect(isFlipperEnabled()).toBe(false);
    initializeFlipper();

    expect(mockLegacyModule.isEnabled).toHaveBeenCalled();
    expect(mockLegacyModule.start).toHaveBeenCalled();
  });

  it('reads legacy constants on Old Arch iOS without blocking sync bridge calls', () => {
    const legacyConstants = {
      flipperEnabled: true,
      flipperDebugOnly: false,
      start: jest.fn()
    };
    setLegacyModule(legacyConstants);

    const { isFlipperEnabled, isFlipperDebugOnly, initializeFlipper } = loadApi();

    expect(isFlipperEnabled()).toBe(true);
    expect(isFlipperDebugOnly()).toBe(false);
    initializeFlipper();
    expect(legacyConstants.start).toHaveBeenCalled();
  });

  it('coerces NSNumber-style legacy constants (0/1) from constantsToExport', () => {
    const legacyConstants = {
      flipperEnabled: 1,
      flipperDebugOnly: 0,
      start: jest.fn()
    };
    setLegacyModule(legacyConstants);

    const { isFlipperEnabled, isFlipperDebugOnly } = loadApi();

    expect(isFlipperEnabled()).toBe(true);
    expect(isFlipperDebugOnly()).toBe(false);
  });

  it('reads legacy constants from getConstants() when not on the module object', () => {
    const legacyConstants = {
      getConstants: () => ({ flipperEnabled: 1, flipperDebugOnly: 1 }),
      start: jest.fn()
    };
    setLegacyModule(legacyConstants);

    const { isFlipperEnabled, isFlipperDebugOnly } = loadApi();

    expect(isFlipperEnabled()).toBe(true);
    expect(isFlipperDebugOnly()).toBe(true);
  });

  it('does not use a TurboModule stub without callable getters', () => {
    setTurboModule({} as typeof mockTurboModule);
    setLegacyModule({
      flipperEnabled: 1,
      flipperDebugOnly: 0,
      start: jest.fn()
    });

    const { isFlipperEnabled, isFlipperDebugOnly } = loadApi();

    expect(isFlipperEnabled()).toBe(true);
    expect(isFlipperDebugOnly()).toBe(false);
  });

  it('uses safe defaults when only start() is exported on legacy module', () => {
    setLegacyModule({ start: jest.fn() });

    const { isFlipperEnabled, isFlipperDebugOnly } = loadApi();

    expect(isFlipperEnabled()).toBe(false);
    expect(isFlipperDebugOnly()).toBe(true);
  });

  it('prefers Turbo Module over NativeModules', () => {
    setTurboModule(mockTurboModule);
    setLegacyModule(mockLegacyModule);

    const { isFlipperEnabled } = loadApi();

    expect(isFlipperEnabled()).toBe(true);
    expect(mockTurboModule.isEnabled).toHaveBeenCalled();
    expect(mockLegacyModule.isEnabled).not.toHaveBeenCalled();
  });

  it('throws a linking error when no native module is registered', () => {
    const { isFlipperEnabled } = loadApi();

    expect(() => isFlipperEnabled()).toThrow("The package 'react-native-flipper-kit' doesn't seem to be linked");
    expect(mockPlatformSelect).toHaveBeenCalled();
  });
});
