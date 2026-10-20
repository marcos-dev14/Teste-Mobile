module.exports = function (api) {
  api.cache(true)
  return {
    // O babel-preset-expo (SDK 54+) já adiciona o plugin do react-native-worklets (Reanimated 4).
    presets: ['babel-preset-expo'],
  }
}
