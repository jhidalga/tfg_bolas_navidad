import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
    pagina: {
        flex: 1,
        backgroundColor: '#f9f9f9',
    },
    contenedorPrincipal: {
        flex: 1,
        width: '100%',
        alignSelf: 'center',
        padding: 20,
        maxWidth: Platform.OS === 'web' ? 800 : '100%',
    },
    tituloCentral: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 20,
    },
    cargandoContenedor: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textoVacio: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginTop: 50,
    },
    tarjetaProducto: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#eaeaea',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    imagenProducto: {
        width: 90,
        height: 90,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
        resizeMode: 'cover',
    },
    infoContenedor: {
        flex: 1,
        marginLeft: 15,
        justifyContent: 'center',
    },
    nombreProducto: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    textoDetalle: {
        fontSize: 13,
        color: '#666',
        marginBottom: 2,
    },
    textoNegrita: {
        fontWeight: '600',
        color: '#1a1a1a',
    },
    textoPersonalizacion: {
        fontSize: 13,
        color: '#16a34a',
        marginTop: 4,
        fontStyle: 'italic',
    },
    accionesContenedor: {
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingLeft: 10,
    },
    precioProducto: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    botonEliminar: {
        paddingVertical: 5,
        paddingHorizontal: 10,
    },
    textoEliminar: {
        color: '#ef4444',
        fontSize: 14,
        fontWeight: '600',
    },
    footerResumen: {
        marginTop: 30,
        paddingTop: 20,
        borderTopWidth: 1,
        borderColor: '#ddd',
        alignItems: 'flex-end',
    },
    textoTotal: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 15,
    },
    botonPagar: {
        backgroundColor: '#3f37c9',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 10,
        width: Platform.OS === 'web' ? 'auto' : '100%',
        alignItems: 'center',
    },
    textoBotonPagar: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    }
});