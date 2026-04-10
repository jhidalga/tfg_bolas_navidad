import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    contenedor: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingVertical: 15,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#eaeaea',
        width: '100%',
    },
    logo: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a1a1a',
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
        color: '#1a1a1a',
        fontWeight: '500',
    },
    botonAdmin: {
        backgroundColor: '#4731d9',
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