import { Text, View, Image, Pressable } from "react-native";
import { styles as estilosEscritorio } from '../styles/landing/Index.styles';
import { styles as estilosMovil } from '../styles/landing/Index.styles.movil';
import { useEstilos } from '../lib/responsive';
import { useRouter } from "expo-router";
import { temaActual } from "../lib/tema";
import Footer from "../componentes/footer";
import Tutorial from "../componentes/tutorial";
import { AdornosColgantes, GuirnaldaLuces } from "../componentes/adornos";

/**
 * Pantalla de inicio de bienvenida (Landing Page).
 * Es la primera vista que encuentra un usuario al abrir la aplicación sin estar autenticado.
 * Muestra el logotipo, el nombre de la marca, imágenes promocionales y 
 * proporciona accesos directos para ir a las pantallas de Inicio de Sesión o Registro.
 * * @returns Componente visual que renderiza la portada de la aplicación.
 */
export default function Index() {
    const styles = useEstilos(estilosEscritorio, estilosMovil);
  const router = useRouter();
  
  return (
    <View style={styles.contenedorPantalla}>
      <GuirnaldaLuces />
      <AdornosColgantes />
      <View style={styles.contenedorCentral}>
        <View style={[styles.heroSection, { marginTop: temaActual.nombre === 'normal' ? 0 : 150 }]}>
          <Image source={require('../assets/images/logo_ies.png')} style={{ width: 260, height: 94, marginBottom: 12 }} resizeMode="contain" />
          <Text style={styles.titulo}>{temaActual.marca}</Text>
          <Text style={styles.descripcion}>Dpto. Informática | 2º DAM</Text>

          <View style={styles.botones}>
            <Pressable style={styles.botonLogin} onPress={() => router.push('/login')}>
              <Text style={styles.textoBotonLogin}>Inicio de sesión</Text>
            </Pressable>

            <Pressable style={styles.botonRegistro} onPress={() => router.push('/registro')}>
              <Text style={styles.textoBotonRegistro}>Registro</Text>
            </Pressable>
          </View>
          <Tutorial />
        </View>

      </View>
      
      <Footer />
    </View>
  );
}