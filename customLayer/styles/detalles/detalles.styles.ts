import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    pagina: {
        flex: 1,
        backgroundColor: '#fff',
    },
    contenidoScroll: {
        flexGrow: 1,
    },
    contenedor: {
        padding: 20,
    },
    contenedorHorizontal: {
        flexDirection: 'row',
    },
    bloqueImagen: {
        width: '100%',
        height: 350,
        backgroundColor: '#1a1a1a',
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bloqueImagenHorizontal: {
        width: '50%',
        height: 500,
        marginRight: 20,
    },
    imagenPrincipal: {
        width: '90%',
        height: '90%',
        resizeMode: 'contain',
    },
    bloqueInfo: {
        marginTop: 20,
        flex: 1,
    },
    bloqueInfoHorizontal: {
        marginTop: 0,
    },
    labelCategoria: {
        fontSize: 18,
        fontWeight: '700',
    },
    nombreProducto: {
        fontSize: 18,
        color: '#666',
        marginBottom: 15,
    },
    filaPrecio: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 25,
    },
    moneda: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 6,
    },
    precioValor: {
        fontSize: 55,
        fontWeight: 'bold',
        lineHeight: 60,
    },
    selectorContainer: {
        marginBottom: 15,
    },
    labelSelector: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#333',
    },
    pickerWrapper: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#f9f9f9',
    },
    picker: {
        height: 50,
        width: '100%',
    },
    inputPersonalizado: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#333',
        backgroundColor: '#f9f9f9',
    },
    botonCompra: {
        backgroundColor: '#3f37c9',
        padding: 16,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
    },
    textoBoton: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    }
});