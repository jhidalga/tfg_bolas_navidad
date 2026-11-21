import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    contenedor: {
        backgroundColor: '#fbf1de',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e3cfa5',
        width: '100%',
        overflow: 'hidden',
    },
    imagenContenedor: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: '#fbf1de',
    },
    imagen: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
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
        color: '#3b1a12',
    },
    textoPersonalizable: {
        color: '#16a34a',
        fontSize: 12,
        marginTop: 4,
    },
    textoDetalles: {
        color: '#7a5a48',
        fontSize: 12,
        marginTop: 4,
    },
    contenedorDeshabilitado: {
        backgroundColor: '#efdfc3',
    }
});