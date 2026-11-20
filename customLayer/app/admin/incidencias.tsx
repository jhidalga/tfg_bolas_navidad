import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import Toast from 'react-native-toast-message';
import { supabase } from '../../lib/supabase';

/**
 * Incidencias de registro.
 * Aquí llegan los avisos de quien no consigue registrarse porque su correo no cumple la regla.
 * Al permitir un correo, esa dirección puede registrarse saltando la regla. Solo vale para ese correo.
 */
export default function Incidencias() {
    const router = useRouter();
    const API = process.env.EXPO_PUBLIC_API_URL || '';
    const [filtro, setFiltro] = useState<'Pendiente' | 'Aprobada' | 'Rechazada' | 'Todas'>('Pendiente');
    const [lista, setLista] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);

    const cargar = async () => {
        setCargando(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${API}/api/admin/incidencias`, {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            setLista(res.ok ? await res.json() : []);
            if (!res.ok) Toast.show({ type: 'error', text1: 'No se pudieron cargar las incidencias' });
        } catch (e) {
            setLista([]);
            Toast.show({ type: 'error', text1: 'Error de conexión' });
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => { cargar(); }, []);

    const cambiar = async (id: string, estado: 'Aprobada' | 'Rechazada' | 'Pendiente') => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${API}/api/admin/incidencias/${id}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado })
            });
            if (!res.ok) {
                Toast.show({ type: 'error', text1: 'No se pudo cambiar el estado' });
                return;
            }
            setLista((prev) => prev.map((i) => (i.id === id ? { ...i, estado } : i)));
            Toast.show({ type: 'success', text1: estado === 'Aprobada' ? 'Correo permitido' : estado === 'Rechazada' ? 'Incidencia rechazada' : 'Incidencia reabierta' });
        } catch (e) {
            Toast.show({ type: 'error', text1: 'Error de conexión' });
        }
    };

    const visibles = lista.filter((i) => filtro === 'Todas' || i.estado === filtro);
    const color = (e: string) => (e === 'Aprobada' ? '#16a34a' : e === 'Rechazada' ? '#dc2626' : '#d97706');

    return (
        <ScrollView style={{ flex: 1, backgroundColor: '#f8f9fa' }} contentContainerStyle={{ padding: 20, maxWidth: 900, width: '100%', alignSelf: 'center' }}>
            <Pressable onPress={() => router.back()} style={{ marginBottom: 12 }}>
                <Text style={{ color: '#475569', fontWeight: 'bold' }}>⬅ Volver</Text>
            </Pressable>

            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>Incidencias de registro</Text>
            <Text style={{ color: '#64748b', marginTop: 4, marginBottom: 14 }}>
                Personas que no pueden registrarse. Si permites su correo, podrá registrarse sin cumplir la regla de las letras. Solo vale para ese correo.
            </Text>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {(['Pendiente', 'Aprobada', 'Rechazada', 'Todas'] as const).map((f) => (
                    <Pressable
                        key={f}
                        onPress={() => setFiltro(f)}
                        style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: filtro === f ? '#111827' : '#e5e7eb' }}
                    >
                        <Text style={{ color: filtro === f ? '#fff' : '#111827', fontWeight: 'bold' }}>{f}</Text>
                    </Pressable>
                ))}
            </View>

            {cargando ? (
                <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
            ) : visibles.length === 0 ? (
                <Text style={{ color: '#64748b', textAlign: 'center', marginTop: 40 }}>No hay incidencias.</Text>
            ) : (
                visibles.map((i) => (
                    <View key={i.id} style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#e5e7eb' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#111827', flexShrink: 1 }}>
                                {i.nombre} {i.apellido1} {i.apellido2}
                            </Text>
                            <Text style={{ color: color(i.estado), fontWeight: 'bold' }}>{i.estado.toUpperCase()}</Text>
                        </View>
                        <Text style={{ color: '#475569', marginTop: 6 }}>Curso: {i.curso}</Text>
                        <Text style={{ color: '#111827', marginTop: 2, fontWeight: '600' }}>{i.correo}</Text>
                        <Text style={{ color: '#94a3b8', marginTop: 2, fontSize: 12 }}>{String(i.created_at || '').slice(0, 10)}</Text>

                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                            {i.estado !== 'Aprobada' && (
                                <Pressable onPress={() => cambiar(i.id, 'Aprobada')} style={{ backgroundColor: '#16a34a', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 }}>
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Permitir este correo</Text>
                                </Pressable>
                            )}
                            {i.estado !== 'Rechazada' && (
                                <Pressable onPress={() => cambiar(i.id, 'Rechazada')} style={{ backgroundColor: '#dc2626', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 }}>
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Rechazar</Text>
                                </Pressable>
                            )}
                            {i.estado !== 'Pendiente' && (
                                <Pressable onPress={() => cambiar(i.id, 'Pendiente')} style={{ backgroundColor: '#e5e7eb', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 }}>
                                    <Text style={{ color: '#111827', fontWeight: 'bold' }}>Reabrir</Text>
                                </Pressable>
                            )}
                        </View>
                    </View>
                ))
            )}
        </ScrollView>
    );
}
