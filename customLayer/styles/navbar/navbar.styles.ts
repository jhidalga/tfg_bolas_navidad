import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    contenedor: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#eaeaea',
        width: '100%',
    },
    logo: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    enlaces: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    boton: {
        paddingVertical: 8,
    },
    textoBoton: {
        fontSize: 14,
        color: '#1a1a1a',
        fontWeight: '500',
    },
    botonAdmin: {
        backgroundColor: '#4338ca',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
    },
    textoAdmin: {
        fontSize: 12,
        color: '#ffffff',
        fontWeight: '600',
    },
    botonSalir: {
        paddingVertical: 8,
    },
    textoSalir: {
        fontSize: 14,
        color: '#dc2626',
        fontWeight: '500',
    }
});