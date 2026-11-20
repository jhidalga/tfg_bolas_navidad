import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    contenedor: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    scrollContent: {
        padding: 15,
        paddingBottom: 90,
    },
    btnVolver: {
        marginBottom: 15,
        alignSelf: 'flex-start',
    },
    txtVolver: {
        color: '#3b82f6',
        fontWeight: 'bold',
        fontSize: 16,
    },
    cabeceraContenedor: {
        flexDirection: 'column',
        marginBottom: 20,
        marginTop: 5,
    },
    cabeceraAcciones: {
        width: '100%',
        marginTop: 15,
    },
    titulo: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a1d23',
    },
    inputBuscar: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 15,
        fontSize: 16,
        width: '100%',
    },
    btnNuevoHeader: {
        display: 'none',
    },
    txtNuevoHeader: {
        display: 'none',
    },
    btnNuevoFlotante: {
        position: 'absolute',
        bottom: 25,
        right: 25,
        backgroundColor: '#3b82f6',
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        zIndex: 1000,
    },
    txtNuevoFlotante: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 32,
        marginTop: -4,
    },
    tabla: {
        width: '100%',
    },
    filaCabecera: {
        display: 'none',
    },
    colFotoHeader: { display: 'none' },
    colDetallesCabecera: { display: 'none' },
    colInfoCabecera: { display: 'none' },
    colPrecioCabecera: { display: 'none' },
    colBadgeCabecera: { display: 'none' },
    fila: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    colFoto: {
        width: 80,
        marginRight: 12,
    },
    colDetalles: {
        flex: 1,
        flexDirection: 'column',
    },
    colInfo: {
        marginBottom: 8,
    },
    colPrecio: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1a1d23',
        marginBottom: 8,
    },
    contenedorBadges: {
        flexDirection: 'row',
        gap: 10,
    },
    colVisibilidad: { width: 'auto' },
    colEstado: { width: 'auto' },
    miniImg: {
        width: 75,
        height: 75,
        borderRadius: 10,
        backgroundColor: '#f1f3f5',
    },
    txtNombre: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1d23',
        marginBottom: 4,
    },
    txtSub: {
        fontSize: 14,
        color: '#6c757d',
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    txtBadge: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    estadoVacio: {
        padding: 30,
        alignItems: "center",
        justifyContent: "center",
    },
    txtEstadoVacio: { 
        fontSize: 15, 
        color: "#64748b", 
        textAlign: "center" 
    },
});