import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    contenedorFooter: {
        width: '100%',
        maxWidth: 1200,
        alignSelf: 'center',
        paddingHorizontal: 40,
        paddingVertical: 60,
        backgroundColor: 'transparent',
    },
    seccionEventos: {
        marginBottom: 40,
    },
    tituloEventos: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 30,
        color: '#1a1a1a',
    },
    gridEventos: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        gap: 100,
    },
    tarjetaEvento: {
        flexDirection: 'row',
        maxWidth: 350,
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
        marginBottom: 6,
        color: '#1a1a1a',
    },
    descripcionTarjeta: {
        fontSize: 13,
        color: '#666666',
        lineHeight: 20,
    }
});