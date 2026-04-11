import { View, ScrollView } from 'react-native';
import Footer from '../componentes/footer';
import Navbar from '@/componentes/navbar';
import Grid from '@/componentes/gridProductos';
import { styles } from '../styles/inicio/Inicio.styles';

export default function Inicio() {
    return (
        <View style={styles.contenedorPrincipal}>
            <Navbar />

            <ScrollView
                contentContainerStyle={styles.contenidoScroll}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.contenedorGrid}>
                    <Grid />
                </View>

                <Footer />
            </ScrollView>
        </View>
    );
}