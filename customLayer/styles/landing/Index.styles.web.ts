import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    scrollFondo: {
        backgroundColor: '#ffffff',
    },
    contenedorCentral: {
        maxWidth: 1000,
        marginHorizontal: 'auto',
        paddingVertical: 80,
        paddingHorizontal: 20,
    },

    heroSection: {
        alignItems: 'center',
        marginBottom: 80,
    },
    titulo: {
        fontSize: 56,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 10,
    },
    descripcion: {
        fontSize: 24,
        color: '#4B5563',
    },

    botones: {
        flexDirection: 'row',
        marginTop: 30,
        gap: 15,
    },
    botonLogin: {
        backgroundColor: '#E5E7EB',
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    textoBotonLogin: {
        color: '#374151',
        fontSize: 16,
        fontWeight: '500',
    },
    botonRegistro: {
        backgroundColor: '#4338CA',
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    textoBotonRegistro: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '500',
    },

    imagenes: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 40,
        marginBottom: 80,
    },
    imagenGaleria: {
        width: 400,
        height: 250,
        backgroundColor: '#f0f0f0',
    },
});