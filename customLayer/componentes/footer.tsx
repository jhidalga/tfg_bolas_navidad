import { View, Text } from 'react-native';
import { styles } from '../styles/footer/footer.styles';

/**
 * Componente visual estático que representa el pie de página (Footer) de la aplicación.
 * Muestra información de la marca, incluyendo el nombre del proyecto ("Custom Layers") 
 * y un breve eslogan descriptivo orientado a los usuarios del centro.
 * * @returns Componente View que contiene la estructura de texto del pie de página.
 */
export default function Footer() {
    return (
        <View style={styles.contenedorFooter}>
            <View style={styles.columna}>
                <Text style={styles.tituloColumna}>Custom Layers</Text>
                <Text style={styles.textoDescripcion}>
                    Tus pedidos personalizados desde la comodidad de tu centro
                </Text>
            </View>
        </View>
    );
}