import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    scrollFondo: {
        flexGrow: 1,
        backgroundColor: '#ffffff',
    },
    contenedorCentral: {
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 20,
        paddingTop: 40,
        paddingBottom: 60,
    },
    tarjetaLogin: {
        backgroundColor: '#ffffff',
        width: '100%',
        paddingHorizontal: 25,
        paddingVertical: 35,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 3,
    },
    titulo: {
        fontSize: 32,
        color: '#1a1a1a',
        marginBottom: 35,
        fontWeight: '500',
    },
    etiqueta: {
        fontSize: 12,
        color: '#666666',
        marginBottom: 8,
        fontWeight: '600',
    },
    input: {
        borderWidth: 1,
        borderColor: '#eaeaea',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 20,
        fontSize: 14,
        color: '#1a1a1a',
        backgroundColor: '#ffffff',
    },
    botonLogin: {
        backgroundColor: '#4338ca',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 6,
        marginTop: 15,
        alignSelf: 'center',
    },
    textoBoton: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '500',
    },
    botonVolver: {
        marginTop: 20,
        alignSelf: 'center',
    },
    textoBotonVolver: {
        color: '#888888',
        fontSize: 14,
        textDecorationLine: 'underline',
    }
});