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
        flexDirection: 'column',
        width: '100%',
        marginBottom: 20
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
        fontSize: 26, 
        fontWeight: 'bold', 
        color: '#1e293b',
        marginBottom: 15
    },
    inputBuscar:{ 
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 15,
        fontSize: 16,
        width: '100%'
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
        width: '100%',
    },
    tabla: { 
        width: '100%'
    },
    cabecera: { 
        display: 'none'
    },
    colCabecera: { 
        display: 'none'
    },
    fila: { 
        flexDirection: 'row', 
        flexWrap: 'wrap',
        backgroundColor: 'white',
        padding: 18, 
        borderRadius: 12,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    colNombre: { width: '100%', marginBottom: 4 },
    colEmail: { width: '100%', marginBottom: 15 },
    colCurso: { width: 'auto', marginRight: 8, marginBottom: 15 },
    colProf: { width: 'auto', marginRight: 8, marginBottom: 15 },
    colPedidos: { width: 'auto', marginRight: 8, marginBottom: 15 },
    colRol: { width: '100%' },
    txtNormal: { 
        fontSize: 18, 
        fontWeight: '700', 
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
    badgeProf: { display: 'none' },
    badgePedidos: { display: 'none' },
    btnRol: { 
        width: '100%',
        paddingVertical: 12, 
        borderRadius: 8, 
        borderWidth: 1, 
        alignItems: 'center'
    },
    btnAdmin: {
        backgroundColor: '#fef2f2',
        borderColor: '#fecaca'
    },
    btnUser: {
        backgroundColor: '#fff',
        borderColor: '#e2e8f0'
    },
    txtBtnAdmin: { color: '#dc2626', fontWeight: 'bold', fontSize: 14 },
    txtBtnUser: { color: '#64748b', fontWeight: 'bold', fontSize: 14 },
});