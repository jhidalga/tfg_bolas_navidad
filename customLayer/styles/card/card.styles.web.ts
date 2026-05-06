import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    contenedor: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#eaeaea',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
    },
    imagenContenedor: {
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: '#1a1a1a',
    },
    imagen: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    placeholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#333333',
    },
    info: {
        padding: 15,
    },
    titulo: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 5,
    },
    precio: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    textoPersonalizable: {
        color: '#16a34a',
        fontSize: 12,
        marginTop: 4,
    },
    textoDetalles: {
        color: '#999999',
        fontSize: 12,
        marginTop: 4,
    },
    contenedorDeshabilitado: {
        backgroundColor: '#f0f0f0',
    }
});