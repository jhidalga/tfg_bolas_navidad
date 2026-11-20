import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    contenedorCarga: { flex: 1, justifyContent: "center", alignItems: "center" },
    pantalla: { flex: 1, backgroundColor: "#f8f9fa" },
    scroll: { padding: 20 },

    btnVolverWrapper: { marginBottom: 20, alignSelf: "flex-start" },
    btnVolver: { color: "#3b82f6", fontWeight: "bold", fontSize: 16 },

    tarjeta: {
        backgroundColor: "white",
        padding: 20,
        borderRadius: 16,
        elevation: 3,
        marginBottom: 25,
    },

    tituloSeccion: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#1e293b",
        marginBottom: 15,
    },

    filaInputs: { flexDirection: "column", gap: 15, marginBottom: 20 },
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
    },
    inputMultiline: {
        height: 100,
        textAlignVertical: "top",
    },

    contenedorSwitches: { flexDirection: "column", gap: 10, marginBottom: 25 },
    switchBox: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#f8fafc",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 10,
        padding: 15,
    },
    labelSwitch: { fontSize: 14, color: "#1e293b", fontWeight: "bold" },
    btnToggleSwitch: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 8,
        borderWidth: 1,
        minWidth: 100,
        alignItems: "center",
    },

    btnOn: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" },
    txtOn: { color: "#2563eb" },

    btnOff: { backgroundColor: "#f1f5f9", borderColor: "#e2e8f0" },
    txtOff: { color: "#64748b" },

    btnOffWarning: { backgroundColor: "#fef3c7", borderColor: "#fde68a" },
    txtOffWarning: { color: "#d97706" },

    btnOffDanger: { backgroundColor: "#fee2e2", borderColor: "#fecaca" },
    txtOffDanger: { color: "#dc2626" },

    txtSwitch: { fontWeight: "bold", fontSize: 13 },

    btnGuardarMain: {
        backgroundColor: "#10b981",
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: "center",
    },
    txtBtnGuardarMain: { color: "white", fontWeight: "bold", fontSize: 16 },

    cabeceraModelos: { flexDirection: "column", gap: 15, marginBottom: 20 },
    contenedorAcciones: {
        flexDirection: "row",
        gap: 10,
        justifyContent: "space-between",
    },
    btnAccion: {
        flex: 1,
        backgroundColor: "#3b82f6",
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    txtAccion: { color: "white", fontWeight: "bold", fontSize: 13 },

    tabla: {
        borderRadius: 12,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        backgroundColor: "white",
    },
    cabeceraTabla: { display: "none" },

    fila: {
        flexDirection: "row",
        padding: 15,
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
        flexWrap: "wrap",
        gap: 10,
    },
    checkbox: { width: 30, alignItems: "center", justifyContent: "center" },
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

    imgCol: { width: 60, alignItems: "center" },
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
        minWidth: 120,
        fontSize: 15,
        color: "#1e293b",
        paddingHorizontal: 15,
        backgroundColor: "#f8fafc",
        height: 45,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },

    btnFilaCrear: {
        backgroundColor: "#3b82f6",
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        alignItems: "center",
    },
    btnFilaGuardar: {
        backgroundColor: "#ecfdf5",
        borderWidth: 1,
        borderColor: "#a7f3d0",
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        alignItems: "center",
    },
});