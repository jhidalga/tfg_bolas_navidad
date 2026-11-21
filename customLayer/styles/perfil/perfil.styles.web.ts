import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    contenedorPantalla: { 
        flex: 1, 
        backgroundColor: 'transparent' 
    },
    scrollCentral: { 
        flexGrow: 1, 
        justifyContent: "center", 
        alignItems: "center", 
        padding: 20 
    },
    tarjetaPerfil: {
        backgroundColor: "#fbf1de",
        width: "100%",
        maxWidth: 450,
        padding: 30,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#e3cfa5",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    titulo: {
        fontSize: 26,
        fontWeight: "800",
        color: "#3b1a12",
        marginBottom: 25,
        textAlign: "center",
    },
    campoContainer: {
        marginBottom: 18,
    },
    label: {
        fontSize: 13,
        fontWeight: "700",
        color: "#a52a2a",
        marginBottom: 8,
        textTransform: "uppercase",
    },
    valorBloqueado: {
        fontSize: 16,
        color: "#a52a2a",
        backgroundColor: "#efdfc3",
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e3cfa5",
    },
    valorNormal: {
        fontSize: 16,
        color: "#3b1a12",
        backgroundColor: "#fbf1de",
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e3cfa5",
    },
    inputEditable: {
        fontSize: 16,
        color: "#3b1a12",
        backgroundColor: "#fbf1de",
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: "#a52a2a",
    },
    contenedorCentral: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contenedorBotones: {
        marginTop: 15,
        gap: 10,
    },
    btnModificar: {
        backgroundColor: "#a52a2a",
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: "center",
    },
    btnGuardar: {
        backgroundColor: "#10b981",
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: "center",
    },
    btnCancelar: {
        backgroundColor: "#fbf1de",
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#ef4444",
    },
    txtBtn: {
        color: "white",
        fontWeight: "bold",
        fontSize: 15,
    },
    txtBtnCancelar: {
        color: "#ef4444",
        fontWeight: "bold",
        fontSize: 15,
    }
});