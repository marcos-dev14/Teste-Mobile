import { useState } from "react"
import { View, Text, SafeAreaView, Alert, ImageBackground, Image } from "react-native"
import { Canvas, Path, Skia  } from "@shopify/react-native-skia"

import ImgDrawing from "@/assets/images/drawing.png"

import { Header } from "@/components/header"
import { Button } from "@/components/button"

import { colors } from "@/styles/theme/colors"
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs"

export default function Drawing() {
  const [paths, setPaths] = useState<Skia.Path[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("")
  const [currentColor, setCurrentColor] = useState<string>(colors.darker)

  const tabBarHeight = useBottomTabBarHeight()


  function handleStart(x: number, y: number) {
    const newPath = Skia.Path.Make();
    newPath.moveTo(x, y);
    setPaths(prevPaths => [...prevPaths, newPath]);
  };

  function handleMove(x: number, y: number) {
    const updatedPaths = [...paths];
    const currentPath = updatedPaths[updatedPaths.length - 1];
    if (currentPath) {
      currentPath.lineTo(x, y);
      setPaths(updatedPaths);
    }
  };

  function onTouchEnd() {
    if (currentPath) {
      setPaths([...paths, { path: currentPath, color: currentColor }]);
      setCurrentPath("");
    }
  };

  function clearCanvas() {
    setPaths([]);
  };

  return (
    <SafeAreaView style={{ flex: 1, paddingTop: 40, backgroundColor: colors.white, paddingBottom: tabBarHeight }}>
      <Header />

      <View className="flex-1 px-4 mt-6">
        <Text className="font-bold text-2xl text-darker">
          Desenho
        </Text> 

        <View className="flex-1 rounded-lg overflow-hidden relative mt-6 border border-lightBlue">
          <Image 
            source={ImgDrawing}
            resizeMode="cover"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              zIndex: -1,
            }}
          />

          <Canvas
            style={{ flex: 1, zIndex: 1 }}
            onTouchStart={(e) => handleStart(e.nativeEvent.locationX, e.nativeEvent.locationY)}
            onTouchMove={(e) => handleMove(e.nativeEvent.locationX, e.nativeEvent.locationY)}
            onTouchEnd={onTouchEnd}
          >
            {paths.map((path, index) => (
              <Path key={index} path={path} color="black" strokeWidth={2} style="stroke" />
            ))}
          </Canvas>
        </View>

        <View className="w-full mt-6 mb-6 flex-row items-center justify-center gap-6">
          <View className="flex-1">
            <Button
              title="Limpar"
              type="secondary"
              onPress={clearCanvas}
            />
          </View>

          <View className="flex-1">
            <Button
              title="Salvar"
              type="primary"
              onPress={() => Alert.alert("Desenho salvo!")}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}