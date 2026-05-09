import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    contenedor: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    contenedorHorizontal: {
        flexDirection: 'row',
        padding: 40,
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
        gap: 40,
    },
    bloqueImagen: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: '#fff',
    },
    bloqueImagenHorizontal: {
        width: '50%',
        maxHeight: 600,
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
    },
    imagenPrincipal: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    bloqueInfo: {
        padding: 20,
        flex: 1,
        maxWidth: 500,
    },
    bloqueInfoHorizontal: {
        justifyContent: 'flex-start',
    },
    cabeceraInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    nombreProducto: {
        fontSize: 32,
        fontWeight: '800',
        color: '#1a1d23',
        letterSpacing: -0.5,
    },
    contenedorPrecio: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
    },
    precioValor: {
        fontSize: 24,
        fontWeight: '700',
        color: '#ffffff',
    },
    descripcion: {
        fontSize: 18,
        color: '#4b5563',
        lineHeight: 28,
        marginTop: 15,
    },
    divisor: {
        height: 1,
        backgroundColor: '#e9ecef',
        marginVertical: 30,
    },
    seccionOpciones: {
        gap: 25,
    },
    opcionContainer: {
        marginBottom: 5,
    },
    tituloOpcion: {
        fontSize: 13,
        fontWeight: '700',
        color: '#adb5bd',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    pickerCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e9ecef',
        overflow: 'hidden', 
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        '&:hover': {
            borderColor: '#3b82f6',
            boxShadow: '0 4px 12px rgba(59,130,246,0.05)',
        }
    } as any,
    picker: {
        height: 55,
        width: '100%',
        paddingHorizontal: 10,
        fontSize: 16,
        border: 'none',
        outline: 'none',
        backgroundColor: 'transparent',
        borderRadius: 12,
    } as any,
    inputPersonalizado: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e9ecef',
        padding: 18,
        fontSize: 16,
        transition: 'border-color 0.2s ease',
        '&:focus': {
            borderColor: '#3b82f6',
            outline: 'none',
        }
    } as any,
    contenedorAcciones: {
        marginTop: 40,
    },
    botonCompra: {
        backgroundColor: '#1a1d23',
        paddingVertical: 20,
        borderRadius: 15,
        alignItems: 'center',
        cursor: 'pointer',
        transition: 'transform 0.1s active, background-color 0.2s',
        '&:hover': {
            backgroundColor: '#2d333b',
        }
    } as any,
    textoBoton: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
    },
    notaPago: {
        marginTop: 25,
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    textoNota: {
        fontSize: 14,
        color: '#6c757d',
        textAlign: 'center',
    },
    pagina: {
        flex: 1,
    },
    contenidoScroll: {
        flexGrow: 1,
    },
    labelCategoria: {
        fontSize: 14,
        color: '#3b82f6',
        fontWeight: '700',
        marginBottom: 8,
        textTransform: 'uppercase',
    }
});