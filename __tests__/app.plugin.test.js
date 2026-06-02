const mockCreateGradlePropertiesItem = jest.fn((key, value) => ({
  type: 'property',
  key,
  value
}));

const mockWithGradleProperties = jest.fn((config, modifier) => {
  const gradleProperties = [
    { type: 'property', key: 'FLIPPER_DEBUG_ONLY', value: 'stale' },
    { type: 'property', key: 'NO_FLIPPER', value: '1' },
    { type: 'property', key: 'OTHER_PROP', value: 'keep' },
    { type: 'comment', key: null, value: '# comment' }
  ];
  const configWithProps = { name: 'test-app', modResults: gradleProperties };
  modifier(configWithProps);
  return { ...config, gradleProperties: configWithProps.modResults };
});

jest.mock('@expo/config-plugins', () => ({
  withGradleProperties: (...args) => mockWithGradleProperties(...args),
  createGradlePropertiesItem: (...args) => mockCreateGradlePropertiesItem(...args)
}));

const withFlipperIntegration = require('../app.plugin');

describe('withFlipperIntegration expo plugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets FLIPPER_DEBUG_ONLY=true by default and strips old flipper keys', () => {
    withFlipperIntegration({ name: 'test-app' });

    expect(mockWithGradleProperties).toHaveBeenCalled();

    const gradleProperties = mockWithGradleProperties.mock.results[0].value.gradleProperties;

    expect(mockCreateGradlePropertiesItem).toHaveBeenCalledWith('FLIPPER_DEBUG_ONLY', 'true');
    expect(mockCreateGradlePropertiesItem).not.toHaveBeenCalledWith('NO_FLIPPER', '1');

    const propertyKeys = gradleProperties.filter((item) => item.type === 'property').map((item) => item.key);

    expect(propertyKeys).toContain('FLIPPER_DEBUG_ONLY');
    expect(propertyKeys).toContain('OTHER_PROP');
    expect(propertyKeys.filter((key) => key === 'NO_FLIPPER')).toHaveLength(0);

    const flipperDebugOnly = gradleProperties.find((item) => item.key === 'FLIPPER_DEBUG_ONLY');
    expect(flipperDebugOnly?.value).toBe('true');
  });

  it('sets FLIPPER_DEBUG_ONLY=false when flipperDebugOnly option is false', () => {
    withFlipperIntegration({}, { flipperDebugOnly: false });

    expect(mockCreateGradlePropertiesItem).toHaveBeenCalledWith('FLIPPER_DEBUG_ONLY', 'false');
  });

  it('adds NO_FLIPPER when noFlipper option is true', () => {
    withFlipperIntegration({}, { noFlipper: true });

    expect(mockCreateGradlePropertiesItem).toHaveBeenCalledWith('NO_FLIPPER', '1');
  });

  it('supports legacy modifier that receives the array directly', () => {
    mockWithGradleProperties.mockImplementationOnce((config, modifier) => {
      const gradleProperties = [{ type: 'property', key: 'OTHER_PROP', value: 'keep' }];
      modifier(gradleProperties);
      return { ...config, gradleProperties };
    });

    withFlipperIntegration({ name: 'legacy-app' });

    const gradleProperties = mockWithGradleProperties.mock.results.at(-1).value.gradleProperties;
    expect(gradleProperties.find((item) => item.key === 'FLIPPER_DEBUG_ONLY')?.value).toBe('true');
  });
});
