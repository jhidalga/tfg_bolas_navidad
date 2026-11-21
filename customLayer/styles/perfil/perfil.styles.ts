import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    contenedorPantalla: { 
        flex: 1, 
        backgroundColor: 'transparent' 
    },
    scrollCentral: { 
        flexGrow: 1, 
        paddingHorizontal: 20,
        paddingTop: 40,
        paddingBottom: 60,
    },
    tarjetaPerfil: {
        backgroundColor: "#fbf1de",
        width: "100%",
        paddingHorizontal: 25,
        paddingVertical: 35,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 3,
    },
    titulo: {
        fontSize: 32,
        fontWeight: "500",
        color: "#3b1a12",
        marginBottom: 35,
        textAlign: "center",
    },
    campoContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 12,
        fontWeight: "600",
        color: "#666666",
        marginBottom: 8,
        textTransform: "uppercase",
    },
    valorBloqueado: {
        fontSize: 14,
        color: "#666666",
        backgroundColor: "#efdfc3",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e3cfa5",
    },
    valorNormal: {
        fontSize: 14,
        color: "#3b1a12",
        backgroundColor: "#fbf1de",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e3cfa5",
    },
    inputEditable: {
        fontSize: 14,
        color: "#3b1a12",
        backgroundColor: "#fbf1de",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#a52a2a",
    },
    contenedorCentral: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contenedorBotones: {
        marginTop: 15,
        gap: 15,
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
        backgroundColor: "transparent",
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#ef4444",
    },
    txtBtn: {
        color: "#ffffff",
        fontWeight: "500",
        fontSize: 14,
    },
    txtBtnCancelar: {
        color: "#ef4444",
        fontWeight: "500",
        fontSize: 14,
    }
});