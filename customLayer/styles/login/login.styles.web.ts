import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    scrollFondo: {
        flexGrow: 1,
        backgroundColor: 'transparent',
    },
    contenedorCentral: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
    },
    tarjetaLogin: {
        backgroundColor: '#fbf1de',
        width: 360,
        padding: 40,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.04,
        shadowRadius: 24,
        elevation: 5,
    },
    titulo: {
        fontSize: 28,
        color: '#3b1a12',
        marginBottom: 35,
        textAlign: 'center',
        fontWeight: '400',
    },
    etiqueta: {
        fontSize: 11,
        color: '#3b1a12',
        marginBottom: 8,
        fontWeight: '600',
    },
    input: {
        borderWidth: 1,
        borderColor: '#e3cfa5',
        borderRadius: 6,
        paddingHorizontal: 15,
        paddingVertical: 12,
        marginBottom: 20,
        fontSize: 12,
        color: '#3b1a12',
        backgroundColor: '#fbf1de',
    },
    botonLogin: {
        backgroundColor: '#a52a2a',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 6,
        marginTop: 10,
        alignSelf: 'center',
    },
    textoBoton: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '500',
    },
    avisoRecuperacion: {
        marginTop: 20,
        textAlign: 'center',
        color: '#555555',
        fontSize: 13,
    },
    botonVolver: {
        marginTop: 20,
        alignSelf: 'center',
    },
    textoBotonVolver: {
        color: '#7a5a48',
        fontSize: 12,
        textDecorationLine: 'underline',
    }
});