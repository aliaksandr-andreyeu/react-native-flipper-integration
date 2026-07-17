const mockWithGradleProperties = jest.fn((config, modifier) => {
  const gradleProperties = [
    { type: 'property', key: 'FLIPPER_DEBUG_ONLY', value: 'stale' },
    { type: 'property', key: 'NO_FLIPPER', value: '1' },
    { type: 'property', key: 'FLIPPER_VERSION', value: '0.999.0' },
    { type: 'property', key: 'OTHER_PROP', value: 'keep' },
    { type: 'comment', key: null, value: '# comment' }
  ];
  const configWithProps = { ...config, modResults: gradleProperties };
  modifier(configWithProps);
  return { ...config, gradleProperties: configWithProps.modResults };
});

const mockWithPodfileProperties = jest.fn((config, modifier) => {
  const configWithProps = { ...config, modResults: {} };
  modifier(configWithProps);
  return { ...config, podfileProperties: configWithProps.modResults };
});

jest.mock('@expo/config-plugins', () => ({
  withGradleProperties: (...args) => mockWithGradleProperties(...args),
  withPodfileProperties: (...args) => mockWithPodfileProperties(...args)
}));

const withRNFlipperKit = require('../app.plugin');

function gradleResult() {
  return mockWithGradleProperties.mock.results.at(-1).value.gradleProperties;
}

function podfileResult() {
  return mockWithPodfileProperties.mock.results.at(-1).value.podfileProperties;
}

describe('withRNFlipperKit expo plugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets FLIPPER_DEBUG_ONLY=true by default and strips only managed keys', () => {
    withRNFlipperKit({ name: 'test-app' });

    expect(mockWithGradleProperties).toHaveBeenCalled();

    const gradleProperties = gradleResult();
    const propertyKeys = gradleProperties.filter((item) => item.type === 'property').map((item) => item.key);

    expect(propertyKeys).toContain('FLIPPER_DEBUG_ONLY');
    expect(propertyKeys).toContain('OTHER_PROP');
    expect(propertyKeys.filter((key) => key === 'NO_FLIPPER')).toHaveLength(0);

    const flipperDebugOnly = gradleProperties.find((item) => item.key === 'FLIPPER_DEBUG_ONLY');
    expect(flipperDebugOnly).toEqual({ type: 'property', key: 'FLIPPER_DEBUG_ONLY', value: 'true' });
  });

  it("preserves a user-set FLIPPER_VERSION when flipperVersion option isn't provided", () => {
    withRNFlipperKit({ name: 'test-app' });

    const gradleProperties = gradleResult();
    const flipperVersion = gradleProperties.filter((item) => item.key === 'FLIPPER_VERSION');

    expect(flipperVersion).toHaveLength(1);
    expect(flipperVersion[0].value).toBe('0.999.0');
  });

  it('overrides FLIPPER_VERSION when the flipperVersion option is provided', () => {
    withRNFlipperKit({ name: 'test-app' }, { flipperVersion: '0.273.0' });

    const gradleProperties = gradleResult();
    const flipperVersion = gradleProperties.filter((item) => item.key === 'FLIPPER_VERSION');

    expect(flipperVersion).toHaveLength(1);
    expect(flipperVersion[0].value).toBe('0.273.0');
  });

  it('sets FLIPPER_DEBUG_ONLY=false when flipperDebugOnly option is false', () => {
    withRNFlipperKit({}, { flipperDebugOnly: false });

    const gradleProperties = gradleResult();
    expect(gradleProperties.find((item) => item.key === 'FLIPPER_DEBUG_ONLY')).toEqual({
      type: 'property',
      key: 'FLIPPER_DEBUG_ONLY',
      value: 'false'
    });
  });

  it('adds NO_FLIPPER when noFlipper option is true', () => {
    withRNFlipperKit({}, { noFlipper: true });

    const gradleProperties = gradleResult();
    expect(gradleProperties.find((item) => item.key === 'NO_FLIPPER')).toEqual({
      type: 'property',
      key: 'NO_FLIPPER',
      value: '1'
    });
  });

  it('sets FLIPPER_AUTO_INIT=true by default', () => {
    withRNFlipperKit({ name: 'test-app' });

    expect(gradleResult().find((item) => item.key === 'FLIPPER_AUTO_INIT')).toEqual({
      type: 'property',
      key: 'FLIPPER_AUTO_INIT',
      value: 'true'
    });
  });

  it('sets FLIPPER_AUTO_INIT=false when flipperAutoInit option is false', () => {
    withRNFlipperKit({}, { flipperAutoInit: false });

    expect(gradleResult().find((item) => item.key === 'FLIPPER_AUTO_INIT')?.value).toBe('false');
  });

  it('throws when withGradleProperties passes an unexpected argument', () => {
    mockWithGradleProperties.mockImplementationOnce((config, modifier) => {
      // Neither a modResults array nor a bare array — the shape the plugin rejects.
      modifier({ name: 'bad-app' });
      return config;
    });

    expect(() => withRNFlipperKit({ name: 'bad-app' })).toThrow('received an unexpected argument');
  });

  it('supports legacy modifier that receives the array directly', () => {
    mockWithGradleProperties.mockImplementationOnce((config, modifier) => {
      const gradleProperties = [{ type: 'property', key: 'OTHER_PROP', value: 'keep' }];
      modifier(gradleProperties);
      return { ...config, gradleProperties };
    });

    withRNFlipperKit({ name: 'legacy-app' });

    const gradleProperties = gradleResult();
    expect(gradleProperties.find((item) => item.key === 'FLIPPER_DEBUG_ONLY')?.value).toBe('true');
  });

  describe('iOS Podfile.properties.json', () => {
    it('writes FLIPPER_DEBUG_ONLY by default and no NO_FLIPPER', () => {
      withRNFlipperKit({ name: 'test-app' });

      expect(mockWithPodfileProperties).toHaveBeenCalled();
      const properties = podfileResult();

      expect(properties.FLIPPER_DEBUG_ONLY).toBe('true');
      expect(properties.NO_FLIPPER).toBeUndefined();
    });

    it('writes FLIPPER_DEBUG_ONLY=false when the option is false', () => {
      withRNFlipperKit({}, { flipperDebugOnly: false });

      expect(podfileResult().FLIPPER_DEBUG_ONLY).toBe('false');
    });

    it('writes NO_FLIPPER=1 when noFlipper is true', () => {
      withRNFlipperKit({}, { noFlipper: true });

      expect(podfileResult().NO_FLIPPER).toBe('1');
    });

    it('writes FLIPPER_AUTO_INIT (true by default, false when opted out)', () => {
      withRNFlipperKit({ name: 'test-app' });
      expect(podfileResult().FLIPPER_AUTO_INIT).toBe('true');

      withRNFlipperKit({}, { flipperAutoInit: false });
      expect(podfileResult().FLIPPER_AUTO_INIT).toBe('false');
    });
  });
});
