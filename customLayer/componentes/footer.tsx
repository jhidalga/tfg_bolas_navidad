import { View, Text } from 'react-native';
import { styles } from '../styles/footer/footer.styles';

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