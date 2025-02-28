import { useState, useEffect } from "react"
import { View, Text, Linking, Alert, SafeAreaView, ScrollView } from "react-native"
import { CameraView, useCameraPermissions } from "expo-camera"

import { colors } from "@/styles/theme/colors"
import { Header } from "@/components/header"
import { Button } from "@/components/button"
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs"

export default function QrCode() {
  const [facing, setFacing] = useState<'back' | 'front'>('back')
  const [scanned, setScanned] = useState(false)
  const [scannerData, setScannerData] = useState<string | null>(null)
  const [permission, requestPermission] = useCameraPermissions()
  
  const tabBarHeight = useBottomTabBarHeight()

  useEffect(() => {
    (async () => {
      if (!permission?.granted) {
        await requestPermission();
      }
    })();
  }, [permission])

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    setScannerData(data);
    Alert.alert("QR Code Detected", `URL: ${data}`, [
      { text: "Abrir", onPress: () => Linking.openURL(data) },
      { text: "Cancelar", onPress: () => setScanned(false), style: "cancel" }
    ]);
  };

  if (!permission) {
    return <Text>Requesting for camera permission...</Text>;
  }

  if (!permission.granted) {
    return <Text>No access to camera</Text>;
  }

  return (
    <SafeAreaView style={{ flex: 1, paddingTop: 40, backgroundColor: colors.white, paddingBottom: tabBarHeight }}>
      <Header />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flex: 1, paddingBottom: 40 }}
      >
        <View className="flex-1 px-4 mt-6">
          <View>
            <Text className="font-bold text-2xl text-darker">
              QR Code Scanner
            </Text>

            <Text className="font-sans text-base text-darker mt-4">
              Digitalize um código QR que contenha um URL. Ele será aberto no navegador padrão.
            </Text>
          </View>

          <View className="flex-1 items-center justify-center mt-4 bg-darker rounded-lg">
            <CameraView
              style={{ width: 260, height: 260 }}
              facing={facing}
              barcodeScannerSettings={{
                barcodeTypes: ["qr"]
              }}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />
          </View>

          <View className="w-full mt-6 flex-row items-center justify-center gap-6">
            <View className="flex-1">
              <Button
                title="Limpar"
                type="secondary"
                onPress={() => setScanned(false)}
              />
            </View>

            <View className="flex-1">
              <Button
                title="Salvar"
                type="primary"
                onPress={() => Alert.alert("Salvo com sucesso!")}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}