import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    contenedor: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    scrollContent: {
        padding: 15,
    },
    cabecera: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 5,
    },
    titulo: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a1d23',
    },
    btnNuevo: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 8,
    },
    txtNuevo: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    tabla: {
        width: '100%',
    },
    filaCabecera: {
        display: 'none', 
    },
    fila: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    miniImg: {
        width: 65, /* Tamaño intermedio */
        height: 65,
        borderRadius: 10,
        backgroundColor: '#f1f3f5',
    },
    col: {
        paddingLeft: 12,
        flex: 1,
    },
    txtNombre: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1a1d23',
        marginBottom: 2,
    },
    txtSub: {
        fontSize: 14,
        color: '#6c757d',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        marginTop: 5,
        alignSelf: 'flex-start',
    },
    txtBadge: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    btnEditar: {
        display: 'none', 
    },
    txtEditar: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
    }
});