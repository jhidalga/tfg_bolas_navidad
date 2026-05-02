import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    contenedor: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    scrollContent: {
        padding: 30,
        /* Punto medio: ni muy estrecho ni pantalla completa */
        maxWidth: 1300, 
        width: '100%',
        alignSelf: 'center',
    },
    cabecera: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    titulo: {
        fontSize: 30,
        fontWeight: '800',
        color: '#111827',
    },
    btnNuevo: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 10,
        cursor: 'pointer',
    } as any,
    txtNuevo: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
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
    col: {
        fontSize: 16, /* Estándar profesional */
        color: '#374151',
    },
    miniImg: {
        width: 70, /* Tamaño equilibrado */
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
    btnEditar: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 8,
    },
    txtEditar: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
    }
});