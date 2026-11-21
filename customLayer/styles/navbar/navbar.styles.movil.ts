import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
    contenedor: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        justifyContent: 'center',
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 25 : 15, 
        backgroundColor: '#4a0f12',
        width: '100%',
        
        borderTopWidth: 1,
        borderTopColor: '#e6c27a',
        elevation: 15, 
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 }, 
        shadowOpacity: 0.05,
        shadowRadius: 5,
        zIndex: 1000,
        position: 'absolute',
        bottom: 0,
    },
    logo: {
        display: 'none', 
    },
    enlaces: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        flex: 1,
        maxWidth: 520,
    },
    boton: {
        paddingVertical: 10,
        paddingHorizontal: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    botonAdmin: {
        backgroundColor: '#a52a2a',
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    botonSalir: {
        paddingVertical: 10,
        paddingHorizontal: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    
    textoBoton: { display: 'none' },
    textoAdmin: { display: 'none' },
    textoSalir: { display: 'none' }
});