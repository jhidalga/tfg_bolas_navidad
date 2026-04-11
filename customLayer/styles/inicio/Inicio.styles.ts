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
        width: '100%',
        maxWidth: 1200,
        alignSelf: 'center',
        paddingHorizontal: esMovil ? 15 : 20,
        paddingTop: esMovil ? 20 : 40,
        paddingBottom: 60,
    }
});