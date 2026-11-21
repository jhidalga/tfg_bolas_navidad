import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    contenedorFooter: {
        width: '100%',
        backgroundColor: '#3d0b0f', borderTopWidth: 2, borderTopColor: '#e6c27a', 
        paddingVertical: 40,
        marginTop: 'auto',
        alignItems: 'center',
    },
    columna: {
        maxWidth: 800,
        width: '100%',
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    tituloColumna: {
        color: '#fff7ea',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    textoDescripcion: {
        color: '#f1cf8a',
        fontSize: 16,
        lineHeight: 26,
        textAlign: 'center',
    }
});