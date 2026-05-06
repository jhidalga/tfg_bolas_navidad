import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
    contenedor: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 25 : 15, 
        backgroundColor: '#ffffff',
        width: '100%',
        
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
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
    },
    boton: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    botonAdmin: {
        backgroundColor: '#4338ca',
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    botonSalir: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    
    textoBoton: { display: 'none' },
    textoAdmin: { display: 'none' },
    textoSalir: { display: 'none' }
});