import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    contenedor: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    scrollContent: {
        padding: 30,
        maxWidth: 1300,
        width: '100%',
        alignSelf: 'center',
    },
    btnVolver: {
        marginBottom: 15,
        alignSelf: 'flex-start',
        cursor: 'pointer' as any,
    },
    txtVolver: {
        color: '#3b82f6',
        fontWeight: 'bold',
        fontSize: 16,
    },
    cabeceraContenedor: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    cabeceraAcciones: {
        flexDirection: 'row',
        gap: 15,
        alignItems: 'center',
    },
    titulo: {
        fontSize: 30,
        fontWeight: '800',
        color: '#111827',
    },
    inputBuscar: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 15,
        fontSize: 15,
        width: 300,
        outlineStyle: 'none' as any,
    },
    btnNuevoHeader: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 10,
        cursor: 'pointer' as any,
    },
    txtNuevoHeader: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    btnNuevoFlotante: {
        display: 'none',
    },
    txtNuevoFlotante: {
        display: 'none',
    },
    tabla: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    } as any,
    filaCabecera: {
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        padding: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    colFotoHeader: { flex: 0.5, fontSize: 16, color: '#374151', fontWeight: '500' },
    colDetallesCabecera: { flex: 4.5, flexDirection: 'row' },
    colInfoCabecera: { flex: 2, fontSize: 16, color: '#374151', fontWeight: '500' },
    colPrecioCabecera: { flex: 1, fontSize: 16, color: '#374151', fontWeight: '500' },
    colBadgeCabecera: { flex: 1, fontSize: 16, color: '#374151', fontWeight: '500' },
    fila: {
        flexDirection: 'row',
        padding: 18,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        transition: 'background-color 0.2s',
        cursor: 'pointer',
        '&:hover': {
            backgroundColor: '#f9fafb',
        }
    } as any,
    colFoto: {
        flex: 0.5,
    },
    colDetalles: {
        flex: 4.5,
        flexDirection: 'row',
        alignItems: 'center',
    },
    colInfo: {
        flex: 2,
    },
    colPrecio: {
        flex: 1,
        fontSize: 16,
        color: '#374151',
        fontWeight: 'bold',
    },
    contenedorBadges: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
    },
    colVisibilidad: {
        flex: 1,
    },
    colEstado: {
        flex: 1,
    },
    miniImg: {
        width: 70,
        height: 70,
        borderRadius: 8,
        backgroundColor: '#eee',
    },
    txtNombre: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    txtSub: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 2,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 99,
        alignSelf: 'flex-start',
    },
    txtBadge: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    estadoVacio: {
        padding: 50,
        alignItems: "center",
        justifyContent: "center",
    },
    txtEstadoVacio: { 
        fontSize: 16, 
        color: "#64748b", 
        textAlign: "center" 
    },
});