import { useState, useEffect } from "react"
import { View, Text, Linking, Alert, SafeAreaView, ScrollView } from "react-native"
import { BarCodeScanner } from "expo-barcode-scanner"

import { colors } from "@/styles/theme/colors"
import { Header } from "@/components/header"
import { Button } from "@/components/button"

export default function QrCode() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [scanned, setScanned] = useState(false)
  const [scannerData, setScannerData] = useState<string | null>(null)

  function handleBarCodeScanned({ type, data }: { type: string; data: string }) {
    setScanned(true);
    setScannerData(data);
    Linking.openURL(data).catch(error => console.log("Erro ao Scanned", error));
  }

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  if (hasPermission === null) {
    return <Text>Requesting for camera permission</Text>
  }
  if (hasPermission === false) {
    return Alert.alert("Permissão da câmera negada");
  }

  return (
    <SafeAreaView style={{ flex: 1, paddingTop: 40, backgroundColor: colors.white }}>
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
            <BarCodeScanner
              onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
              style={{ width: 260, height: 260 }}
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