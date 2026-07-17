// react-native-default-preference ships no type declarations; minimal ambient module.
declare module 'react-native-default-preference' {
  const DefaultPreference: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    setName(name: string): Promise<void>;
    getName(): Promise<string>;
    clear(key: string): Promise<void>;
    clearAll(): Promise<void>;
  };
  export default DefaultPreference;
}
