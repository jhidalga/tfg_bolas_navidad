import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#f8f9fa'
    },
    headerMovil: {
        display: 'none'
    },
    tituloMovil: {
        display: 'none'
    },
    fondoOscuro: {
        display: 'none'
    },
    sidebar: {
        width: 250,
        backgroundColor: '#1e293b',
        padding: 20,
        height: '100%'
    },
    sidebarOculto: {},
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
        marginBottom: 8,
        cursor: 'pointer' as any
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
        borderTopColor: '#334155',
        cursor: 'pointer' as any
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