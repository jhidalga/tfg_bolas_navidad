import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    contenedor: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingVertical: 15,
        backgroundColor: '#4a0f12',
        borderBottomWidth: 1,
        borderBottomColor: '#e3cfa5',
        width: '100%',
    },
    logo: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#f1cf8a',
    },
    enlaces: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    boton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    textoBoton: {
        fontSize: 14,
        color: '#3b1a12',
        fontWeight: '500',
    },
    botonAdmin: {
        backgroundColor: '#a52a2a',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
    },
    textoAdmin: {
        fontSize: 14,
        color: '#ffffff',
        fontWeight: '600',
    },
    botonSalir: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    textoSalir: {
        fontSize: 14,
        color: '#d93131',
        fontWeight: '500',
    }
});