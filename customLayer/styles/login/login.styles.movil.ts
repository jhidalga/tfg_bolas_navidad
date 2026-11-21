import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    scrollFondo: {
        flexGrow: 1,
        backgroundColor: 'transparent',
    },
    contenedorCentral: {
        backgroundColor: 'transparent',
        paddingHorizontal: 20,
        paddingTop: 40,
        paddingBottom: 60,
    },
    tarjetaLogin: {
        backgroundColor: '#fbf1de',
        width: '100%',
        maxWidth: 520,
        alignSelf: 'center',
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
        color: '#3b1a12',
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
        borderColor: '#e3cfa5',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 20,
        fontSize: 14,
        color: '#3b1a12',
        backgroundColor: '#fbf1de',
    },
    botonLogin: {
        backgroundColor: '#a52a2a',
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
        fontSize: 14,
        textDecorationLine: 'underline',
    }
});