import { View, Text } from 'react-native';
import { temaActual } from '../lib/tema';
import { styles as estilosEscritorio } from '../styles/footer/footer.styles';
import { styles as estilosMovil } from '../styles/footer/footer.styles.movil';
import { useEstilos } from '../lib/responsive';

/**
 * Componente visual estático que representa el pie de página (Footer) de la aplicación.
 * Muestra información de la marca, incluyendo el nombre del proyecto ("Custom Layers") 
 * y un breve eslogan descriptivo orientado a los usuarios del centro.
 * * @returns Componente View que contiene la estructura de texto del pie de página.
 */
export default function Footer() {
    const styles = useEstilos(estilosEscritorio, estilosMovil);
    return (
        <View style={styles.contenedorFooter}>
            <View style={styles.columna}>
                <Text style={styles.tituloColumna}>{temaActual.marca}</Text>
                <Text style={styles.textoDescripcion}>
                    Dpto. Informática | 2º DAM
                </Text>
            </View>
        </View>
    );
}