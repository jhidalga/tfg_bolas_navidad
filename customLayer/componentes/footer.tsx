import { View, Text, Image } from 'react-native';
import { styles } from '../styles/footer/Footer.styles';

export default function Footer() {
    return (
        <View style={styles.contenedorFooter}>
            <View style={styles.seccionEventos}>
                <Text style={styles.tituloEventos}>Venta de impresiones 3D para eventos</Text>
                <View style={styles.gridEventos}>
                    <View style={styles.tarjetaEvento}>
                        <Image source={require('../assets/images/icon1.png')} style={styles.iconoEvento} />
                        <View style={styles.textosEvento}>
                            <Text style={styles.tituloTarjeta}>Navidad</Text>
                            <Text style={styles.descripcionTarjeta}>Bolas de Navidad con nombre personalizado y diseño a eleccion</Text>
                        </View>
                    </View>
                    <View style={styles.tarjetaEvento}>
                        <Image source={require('../assets/images/icon1.png')} style={styles.iconoEvento} />
                        <View style={styles.textosEvento}>
                            <Text style={styles.tituloTarjeta}>San Valentín</Text>
                            <Text style={styles.descripcionTarjeta}>Corazones en diversos diseños y con posibilidad de personalizacion</Text>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
}