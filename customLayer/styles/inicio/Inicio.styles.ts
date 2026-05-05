import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const esMovil = width < 768;

export const styles = StyleSheet.create({
contenedorPrincipal: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    contenidoScroll: {
        flexGrow: 1,
    },
    contenedorGrid: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 40,
        paddingBottom: 60,
    }
});