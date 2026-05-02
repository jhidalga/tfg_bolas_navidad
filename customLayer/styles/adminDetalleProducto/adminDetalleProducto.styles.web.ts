import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    contenedorCarga: { flex: 1, justifyContent: "center", alignItems: "center" },
    pantalla: { flex: 1, backgroundColor: "#f8f9fa" },
    scroll: { padding: 30, maxWidth: 1000, width: "100%", alignSelf: "center" },

    btnVolverWrapper: { marginBottom: 20, alignSelf: "flex-start" },
    btnVolver: { color: "#3b82f6", fontWeight: "bold", fontSize: 16 },

    tarjeta: {
        backgroundColor: "white",
        padding: 30,
        borderRadius: 16,
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        marginBottom: 30,
    } as any,

    tituloSeccion: {
        fontSize: 20,
        fontWeight: "800",
        color: "#1e293b",
        marginBottom: 20,
    },

    filaInputs: { flexDirection: "row", gap: 20, marginBottom: 20 },
    inputGroup: { flex: 1 },
    label: { fontSize: 14, fontWeight: "600", color: "#64748b", marginBottom: 8 },
    input: {
        backgroundColor: "#f8fafc",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 10,
        padding: 14,
        fontSize: 16,
        color: "#1e293b",
        outline: "none",
        transition: "border-color 0.2s",
        "&:focus": { borderColor: "#3b82f6" },
    } as any,

    contenedorSwitches: {
        flexDirection: "row",
        gap: 15,
        marginBottom: 30,
        flexWrap: "wrap",
    },
    switchBox: {
        flex: 1,
        minWidth: 150,
        backgroundColor: "#f8fafc",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 10,
        padding: 15,
        alignItems: "center",
    },
    labelSwitch: {
        fontSize: 13,
        color: "#64748b",
        fontWeight: "bold",
        marginBottom: 10,
        textTransform: "uppercase",
    },
    btnToggleSwitch: {
        width: "100%",
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: "center",
        borderWidth: 1,
    },

    btnOn: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" },
    txtOn: { color: "#2563eb" },

    btnOff: { backgroundColor: "#f1f5f9", borderColor: "#e2e8f0" },
    txtOff: { color: "#64748b" },

    btnOffWarning: { backgroundColor: "#fef3c7", borderColor: "#fde68a" },
    txtOffWarning: { color: "#d97706" },

    btnOffDanger: { backgroundColor: "#fee2e2", borderColor: "#fecaca" },
    txtOffDanger: { color: "#dc2626" },

    txtSwitch: { fontWeight: "bold", fontSize: 14 },

    btnGuardarMain: {
        backgroundColor: "#10b981",
        paddingVertical: 16,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 10,
    },
    txtBtnGuardarMain: { color: "white", fontWeight: "bold", fontSize: 16 },

    cabeceraModelos: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    contenedorAcciones: { flexDirection: "row", gap: 10 },
    btnAccion: {
        backgroundColor: "#3b82f6",
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
    },
    txtAccion: { color: "white", fontWeight: "bold", fontSize: 13 },

    tabla: {
        borderRadius: 12,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        backgroundColor: "white",
    },
    cabeceraTabla: {
        flexDirection: "row",
        backgroundColor: "#f8fafc",
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#cbd5e1",
    },
    colCabecera: {
        fontWeight: "bold",
        fontSize: 13,
        color: "#64748b",
        textTransform: "uppercase",
    },

    fila: {
        flexDirection: "row",
        padding: 15,
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
    },
    checkbox: { width: 40, alignItems: "center", justifyContent: "center" },
    checkOuter: {
        width: 22,
        height: 22,
        borderWidth: 2,
        borderColor: "#cbd5e1",
        borderRadius: 6,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "white",
    },

    imgCol: { width: 90, alignItems: "center" },
    imagen: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: "#f1f5f9",
    },
    placeholder: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: "#f1f5f9",
        justifyContent: "center",
        alignItems: "center",
        borderStyle: "dashed",
        borderWidth: 1,
        borderColor: "#cbd5e1",
    },

    inputTabla: {
        flex: 1,
        fontSize: 16,
        color: "#1e293b",
        paddingHorizontal: 15,
        backgroundColor: "#f8fafc",
        height: 45,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        marginHorizontal: 10,
        outline: "none",
    } as any,

    btnFilaCrear: {
        backgroundColor: "#3b82f6",
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        width: 80,
        alignItems: "center",
    },
    btnFilaGuardar: {
        backgroundColor: "#ecfdf5",
        borderWidth: 1,
        borderColor: "#a7f3d0",
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        width: 80,
        alignItems: "center",
    },
});
