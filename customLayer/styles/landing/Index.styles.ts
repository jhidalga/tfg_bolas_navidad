import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    contenedorPantalla: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    contenedorCentral: {
        flex: 1,
        paddingHorizontal: 20,
        justifyContent: 'center',
        paddingTop: 20,
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    titulo: {
        fontSize: 30,
        fontWeight: '900',
        color: '#fff7ea',
        textAlign: 'center',
        lineHeight: 30,
        marginBottom: 5,
    },
    descripcion: {
        fontSize: 18,
        color: '#f1cf8a',
        textAlign: 'center',
        paddingHorizontal: 10,
    },
    botones: {
        flexDirection: 'column',
        width: '100%',
        marginTop: 30,
        gap: 15,
    },
    botonLogin: {
        backgroundColor: '#fbf1de',
        paddingVertical: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e3cfa5',
        alignItems: 'center',
    },
    textoBotonLogin: {
        color: '#374151',
        fontSize: 16,
        fontWeight: '500',
    },
    botonRegistro: {
        backgroundColor: '#a52a2a',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    textoBotonRegistro: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '500',
    },
    imagenes: {
        display: 'none',
    },
    imagenGaleria: {
        display: 'none',
    }
});