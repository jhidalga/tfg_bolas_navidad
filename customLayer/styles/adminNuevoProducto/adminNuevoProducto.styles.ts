import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: 'white', borderRadius: 12 },
    scrollContent: { paddingBottom: 40 },
    btnVolver: { marginBottom: 20, padding: 10, backgroundColor: '#e5e7eb', alignSelf: 'flex-start', borderRadius: 5 },
    txtVolver: { fontWeight: 'bold' },
    titulo: { fontSize: 26, fontWeight: 'bold', marginBottom: 20 },
    label: { fontSize: 14, color: '#4b5563', marginBottom: 5, fontWeight: '600' },
    input: { borderWidth: 1, borderColor: '#d1d5db', padding: 12, borderRadius: 8, marginBottom: 20, fontSize: 16, backgroundColor: '#f9fafb' },
    inputDescripcion: { height: 100, textAlignVertical: 'top' },
    btnOpcion: { padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
    txtBtnOpcion: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    contenedorImagen: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 30 },
    btnSubirImagen: { backgroundColor: '#3b82f6', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center' },
    previewImagen: { width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db' },
    btnCrear: { backgroundColor: '#10b981', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    txtBtnCrear: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});