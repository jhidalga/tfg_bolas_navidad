import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
    contenedor: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    contenedorHorizontal: {
        flexDirection: 'row',
        padding: 20,
        maxWidth: 1200,
        alignSelf: 'center',
    },
    bloqueImagen: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: '#fff',
    },
    bloqueImagenHorizontal: {
        width: '50%',
        aspectRatio: 1,
        borderRadius: 15,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    imagenPrincipal: {
        width: '100%',
        height: '100%',
    },
    bloqueInfo: {
        padding: 20,
        flex: 1,
    },
    bloqueInfoHorizontal: {
        paddingLeft: 40,
        justifyContent: 'center',
    },
    cabeceraInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 15,
    },
    nombreProducto: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1a1d23',
        flex: 1,
        marginRight: 10,
    },
    contenedorPrecio: {
        backgroundColor: '#e7f0fd',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    precioValor: {
        fontSize: 20,
        fontWeight: '800',
        color: '#3b82f6',
    },
    divisor: {
        height: 1,
        backgroundColor: '#e9ecef',
        marginVertical: 20,
    },
    seccionOpciones: {
        gap: 20,
    },
    opcionContainer: {
        marginBottom: 15,
    },
    tituloOpcion: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6c757d',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    pickerCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#dee2e6',
        overflow: 'hidden',
    },
    picker: {
        height: 50,
        width: '100%',
    },
    inputPersonalizado: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#dee2e6',
        padding: 15,
        fontSize: 16,
        color: '#1a1d23',
    },
    contenedorAcciones: {
        marginTop: 30,
    },
    botonCompra: {
        backgroundColor: '#1a1d23',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    textoBoton: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    notaPago: {
        marginTop: 20,
        backgroundColor: '#fff4e5',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#ff9800',
    },
    textoNota: {
        fontSize: 13,
        color: '#663c00',
        lineHeight: 18,
    },
    pagina: {
        flex: 1,
    },
    contenidoScroll: {
        flexGrow: 1,
    },
    labelCategoria: {
        fontSize: 12,
        color: '#3b82f6',
        fontWeight: '600',
        marginBottom: 4,
        textTransform: 'uppercase',
    }
});