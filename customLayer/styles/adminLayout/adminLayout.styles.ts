import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa'
    },
    headerMovil: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        zIndex: 10
    },
    tituloMovil: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
        marginLeft: 15
    },
    fondoOscuro: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 20
    },
    sidebar: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: 260,
        backgroundColor: '#1e293b',
        padding: 20,
        zIndex: 30,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 10
    },
    sidebarOculto: {
        display: 'none'
    },
    logo: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 40,
        textAlign: 'center'
    },
    menu: {
        flex: 1
    },
    opcion: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 10,
        marginBottom: 8
    },
    activa: {
        backgroundColor: '#3b82f6'
    },
    texto: {
        color: '#94a3b8',
        fontSize: 16,
        fontWeight: '600'
    },
    textoActivo: {
        color: '#ffffff'
    },
    btnVolver: {
        marginTop: 'auto',
        paddingVertical: 15,
        borderTopWidth: 1,
        borderTopColor: '#334155'
    },
    textoVolver: {
        color: '#ffffff',
        textAlign: 'center',
        fontWeight: 'bold'
    },
    contenido: {
        flex: 1
    }
});