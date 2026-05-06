import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#f8f9fa' 
    },
    scrollContent: { 
        paddingVertical: 40,
        paddingHorizontal: 20,
        alignItems: 'center'
    },
    header: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: 1000,
        marginBottom: 25
    },
    btnVolver: { 
        marginBottom: 10,
        alignSelf: 'flex-start',
        cursor: 'pointer' as any
    },
    txtVolver: { 
        color: '#3b82f6', 
        fontWeight: 'bold',
        fontSize: 16
    },
    titulo: { 
        fontSize: 28, 
        fontWeight: 'bold', 
        color: '#1e293b'
    },
    inputBuscar:{ 
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
    toast: { 
        position: 'absolute', 
        top: 20, 
        right: 20, 
        padding: 12, 
        borderRadius: 10, 
        zIndex: 1000, 
        elevation: 5 
    },
    contenedorTabla: { 
        backgroundColor: 'white',
        borderRadius: 15, 
        borderWidth: 1, 
        borderColor: '#e2e8f0', 
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        overflow: 'hidden',
        width: '100%',
        maxWidth: 1000
    },
    tabla: { 
        width: '100%'
    },
    cabecera: { 
        flexDirection: 'row', 
        backgroundColor: '#f8fafc', 
        paddingVertical: 20, 
        paddingHorizontal: 30, 
        borderBottomWidth: 1, 
        borderBottomColor: '#cbd5e1' 
    },
    colCabecera: { 
        fontWeight: '600', 
        fontSize: 15, 
        color: '#64748b',
    },
    fila: { 
        flexDirection: 'row', 
        paddingVertical: 20, 
        paddingHorizontal: 30, 
        alignItems: 'center', 
        borderBottomWidth: 1, 
        borderBottomColor: '#f1f5f9',
        transition: 'background-color 0.2s',
        cursor: 'default',
        '&:hover': {
            backgroundColor: '#f9fafb',
        }
    } as any,
    colNombre: { width: '20%' },
    colEmail: { width: '25%' },
    colCurso: { width: '17%', alignItems: 'center' },
    colProf: { width: '12%', alignItems: 'center' },
    colPedidos: { width: '11%', alignItems: 'center' },
    colRol: { width: '15%', alignItems: 'flex-end' },
    txtNormal: { 
        fontSize: 15, 
        fontWeight: 'bold', 
        color: '#1e293b' 
    },
    txtSecundario: { 
        fontSize: 14, 
        color: '#64748b' 
    },
    badgeAzul: {
        backgroundColor: '#eff6ff',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    txtBadgeAzul: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1d4ed8',
    },
    badgeGris: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    txtBadgeGris: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#475569',
    },
    badgeProf: { 
        paddingVertical: 5, 
        paddingHorizontal: 15, 
        borderRadius: 6, 
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    badgePedidos: { 
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        borderColor: '#bfdbfe',
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center'
    },
    btnRol: { 
        paddingVertical: 8, 
        paddingHorizontal: 15, 
        borderRadius: 6, 
        borderWidth: 1, 
        minWidth: 100,
        alignItems: 'center',
        cursor: 'pointer' as any
    },
    btnAdmin: {
        backgroundColor: '#e2e6fe',
        borderColor: '#a5abfc'
    },
    btnUser: {
        backgroundColor: '#f3f4f6',
        borderColor: '#e5e7eb'
    },
    txtBtnAdmin: { color: '#1c33b9', fontWeight: 'bold', fontSize: 13 },
    txtBtnUser: { color: '#4b5563', fontWeight: 'bold', fontSize: 13 },
});