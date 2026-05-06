import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    contenedor: { flex: 1, padding: 20 },
    mensajeEstado: { padding: 20, fontSize: 16 },
    btnVolver: { marginBottom: 20, padding: 10, backgroundColor: '#e5e7eb', alignSelf: 'flex-start', borderRadius: 5, cursor: 'pointer' as any },
    txtVolver: { fontWeight: 'bold' },
    titulo: { fontSize: 26, fontWeight: 'bold', marginBottom: 5 },
    totalInfo: { fontSize: 18, color: '#4b5563', marginBottom: 20 },
    subtitulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
    tarjetaProducto: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, boxShadow: '0px 2px 4px rgba(0,0,0,0.1)' },
    infoProducto: { flex: 1 },
    nombre: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
    badgePersonalizado: { backgroundColor: '#fef3c7', padding: 5, borderRadius: 5, alignSelf: 'flex-start', marginTop: 8 },
    txtBadge: { color: '#d97706', fontWeight: 'bold', fontSize: 12 },
    txtNormal: { color: '#6b7280', marginTop: 8, fontStyle: 'italic' }
});