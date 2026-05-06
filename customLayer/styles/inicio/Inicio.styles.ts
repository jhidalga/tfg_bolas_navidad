import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    contenedorPrincipal: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    contenidoScroll: {
        flexGrow: 1,
        paddingBottom: 70,
    },
    contenedorGrid: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 40,
        paddingBottom: 60,
    },
    modalFondo: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContenido: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 25,
        maxHeight: '85%',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    modalTitulo: {
        fontSize: 22,
        fontWeight: '900',
        color: '#1e293b',
    },
    btnAplicarFiltros: {
        backgroundColor: '#3b82f6',
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    txtBtnAplicar: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    btnFlotante: {
        position: 'absolute',
        bottom: 95,
        right: 20,
        backgroundColor: '#3b82f6',
        width: 55,
        height: 55,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        zIndex: 2000,
    }
});