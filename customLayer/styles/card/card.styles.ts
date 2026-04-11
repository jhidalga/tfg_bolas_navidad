import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
    contenedor: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#eaeaea',
        margin: 10,
        width: Platform.OS === 'web' ? '22%' : '45%',
        minWidth: 250,
        flexGrow: 1,
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
    }
});