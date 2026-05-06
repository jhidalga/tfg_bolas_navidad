import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    contenedorPantalla: {
        flex: 1,
        backgroundColor: '#ffffff',
        height: '100vh' as any,
    },
    contenedorCentral: {
        flex: 1,
        maxWidth: 1000,
        width: '100%',
        marginHorizontal: 'auto',
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: 60,
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
        cursor: 'pointer' as any,
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
        cursor: 'pointer' as any,
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
        marginBottom: 20,
    },
    imagenGaleria: {
        width: 300,
        height: 150,
        borderRadius: 12,
        backgroundColor: '#f0f0f0',
    },
});