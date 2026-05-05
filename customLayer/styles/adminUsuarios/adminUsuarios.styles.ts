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
        alignSelf: 'flex-start'
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
        fontWeight: '500', 
        fontSize: 15, 
        color: '#64748b' 
    },
    fila: { 
        flexDirection: 'row', 
        height: 100, 
        paddingHorizontal: 30, 
        alignItems: 'center', 
        borderBottomWidth: 1, 
        borderBottomColor: '#f1f5f9' 
    },
    colNombre: { width: '20%' },
    colEmail: { width: '30%' },
    colCurso: { width: '12%', alignItems: 'center' },
    colProf: { width: '12%', alignItems: 'center' },
    colPedidos: { width: '11%', alignItems: 'center' },
    colRol: { width: '15%', alignItems: 'flex-end' },
    txtNormal: { 
        fontSize: 16, 
        fontWeight: 'bold', 
        color: '#1e293b' 
    },
    txtSecundario: { 
        fontSize: 14, 
        color: '#64748b' 
    },
    badgeProf: { 
        paddingVertical: 5, 
        paddingHorizontal: 15, 
        borderRadius: 20, 
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
        paddingVertical: 10, 
        paddingHorizontal: 20, 
        borderRadius: 10, 
        borderWidth: 1, 
        minWidth: 110,
        alignItems: 'center'
    },
    btnAdmin: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6'
    },
    btnUser: {
        backgroundColor: 'white',
        borderColor: '#cbd5e1'
    },
    txtBtnAdmin: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    txtBtnUser: { color: '#64748b', fontWeight: 'bold', fontSize: 14 },

    inputBuscar:{ 
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        marginTop: 10,
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 15,
        fontSize: 17,
        marginBottom: 15
    }
});