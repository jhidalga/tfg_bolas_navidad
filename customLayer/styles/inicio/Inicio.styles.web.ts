import { StyleSheet } from 'react-native';

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
        paddingHorizontal: 20,
        paddingTop: 40,
        paddingBottom: 60,
    }
});