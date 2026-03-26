import { Text, View, Image, Pressable, ScrollView } from "react-native";
import { styles } from "../styles/landing/Index.styles";
import { useRouter } from "expo-router";
import Footer from "../componentes/footer";

export default function Index() {
  const router = useRouter();
  
  return (
    <ScrollView style={styles.scrollFondo} contentContainerStyle={styles.contenedorCentral}>
      <View style={styles.heroSection}>
        <Text style={styles.titulo}>Custom Layers</Text>
        <Text style={styles.descripcion}>Tus impresiones 3D aquí y ahora</Text>

        <View style={styles.botones}>
          <Pressable style={styles.botonLogin} onPress={() => router.push('/login')}>
            <Text style={styles.textoBotonLogin}>Inicio de Sesion</Text>
          </Pressable>

          <Pressable style={styles.botonRegistro} onPress={() => router.push('/registro')}>
            <Text style={styles.textoBotonRegistro}>Registro</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.imagenes}>
        <Image source={require('../assets/images/landing1.png')} style={styles.imagenGaleria} resizeMode="cover" />
        <Image source={require('../assets/images/landing2.png')} style={styles.imagenGaleria} resizeMode="cover" />
      </View>
      
      <Footer />
    </ScrollView>
  );
}