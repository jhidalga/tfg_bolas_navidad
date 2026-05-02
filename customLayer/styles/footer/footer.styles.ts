import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    contenedorFooter: {
        width: '100%',
        paddingHorizontal: 25,
        paddingVertical: 40,
        backgroundColor: 'transparent',
    },
    seccionEventos: {
        marginBottom: 30,
    },
    tituloEventos: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 25,
        color: '#1a1a1a',
    },
    gridEventos: {
        flexDirection: 'column',
        gap: 30,
    },
    tarjetaEvento: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    iconoEvento: {
        width: 24,
        height: 24,
        marginRight: 15,
        resizeMode: 'contain',
    },
    textosEvento: {
        flex: 1,
    },
    tituloTarjeta: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#1a1a1a',
    },
    descripcionTarjeta: {
        fontSize: 12,
        color: '#666666',
        lineHeight: 18,
    }
});