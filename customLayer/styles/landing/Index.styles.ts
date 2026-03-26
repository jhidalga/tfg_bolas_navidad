import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    scrollFondo: {
        backgroundColor: '#ffffff',
    },
    contenedorCentral: {
        paddingTop: 80,
        paddingHorizontal: 20,
        paddingBottom: 40,
    },

    heroSection: {
        alignItems: 'center',
        marginBottom: 60,
    },
    titulo: {
        fontSize: 50,
        fontWeight: '900',
        color: '#111827',
        textAlign: 'center',
        lineHeight: 55,
        marginBottom: 15,
    },
    descripcion: {
        fontSize: 20,
        color: '#4B5563',
        textAlign: 'center',
        paddingHorizontal: 10,
    },
    botones: {
        flexDirection: 'column',
        width: '100%',
        marginTop: 40,
        gap: 15,
    },
    botonLogin: {
        backgroundColor: '#E5E7EB',
        paddingVertical: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        alignItems: 'center',
    },
    textoBotonLogin: {
        color: '#374151',
        fontSize: 16,
        fontWeight: '500',
    },
    botonRegistro: {
        backgroundColor: '#4338CA',
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