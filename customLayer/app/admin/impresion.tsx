import { View, Text, ScrollView, Pressable, ActivityIndicator, Platform } from 'react-native';
import { traducirError } from '../../lib/errores';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import Toast from 'react-native-toast-message';
import { supabase } from '../../lib/supabase';

/**
 * Cola de impresión.
 * Junta las bolas con nombre de los pedidos en un estado (por defecto Pendiente) y las agrupa por color,
 * para imprimir varias a la vez con el mismo filamento. Cada grupo se descarga en un zip con sus 3MF.
 * La descarga solo funciona en la versión web.
 */
export default function ColaImpresion() {
    const router = useRouter();
    const API = process.env.EXPO_PUBLIC_API_URL || '';
    const [estado, setEstado] = useState('Pendiente');
    const [grupos, setGrupos] = useState<any[]>([]);
    const [vista, setVista] = useState<'color' | 'persona'>('color');
    const [orden, setOrden] = useState<'antiguos' | 'persona'>('antiguos');
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const cargar = async () => {
            setCargando(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const res = await fetch(`${API}/api/admin/impresion?estado=${encodeURIComponent(estado)}`, {
                    headers: { 'Authorization': `Bearer ${session?.access_token}` }
                });
                setGrupos(res.ok ? await res.json() : []);
            } catch (e) {
                setGrupos([]);
            } finally {
                setCargando(false);
            }
        };
        cargar();
    }, [estado]);

    const descargar = async (consulta: string, nombreZip: string) => {
        if (Platform.OS !== 'web') {
            Toast.show({ type: 'info', text1: 'La descarga del 3MF solo funciona en la versión web' });
            return;
        }
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${API}/api/admin/impresion/3mf?${consulta}&estado=${encodeURIComponent(estado)}`, {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            if (!res.ok) {
                const e = await res.json().catch(() => ({}));
                Toast.show({ type: 'error', text1: 'No se pudo generar el zip', text2: traducirError(e.detail, '') });
                return;
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cola_${nombreZip.replace(/[^A-Za-z0-9]+/g, '_')}_3mf.zip`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            Toast.show({ type: 'error', text1: 'Error de conexión' });
        }
    };

    const nombreDe = (u: any) => `${u.cliente || 'Sin nombre'} · ${u.modelo} "${u.personalizacion}" · #${u.pedido}`;

    // Misma cola vista por persona: cada cliente con todas sus bolas y el color de cada una
    const personas = useMemo(() => {
        const mapa: Record<string, any> = {};
        grupos.forEach((g) => g.lineas.forEach((l: any) => {
            const k = `${l.cliente || 'Sin nombre'}|${l.curso || ''}`;
            if (!mapa[k]) mapa[k] = { cliente: l.cliente || 'Sin nombre', curso: l.curso, bolas: 0, lineas: [] };
            mapa[k].bolas += l.cantidad || 1;
            mapa[k].lineas.push(l);
        }));
        return Object.values(mapa).sort((a: any, b: any) => a.cliente.localeCompare(b.cliente));
    }, [grupos]);

    const totalBolas = grupos.reduce((n, g) => n + g.bolas, 0);

    return (
        <ScrollView style={{ flex: 1, backgroundColor: '#f8f9fa' }} contentContainerStyle={{ padding: 20, maxWidth: 900, width: '100%', alignSelf: 'center' }}>
            <Pressable onPress={() => router.back()} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name="arrow-back" size={18} color="#475569" /><Text style={{ color: '#475569', fontWeight: 'bold' }}>Volver</Text></View>
            </Pressable>

            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>Cola de impresión</Text>
            <Text style={{ color: '#64748b', marginTop: 4, marginBottom: 14 }}>
                Las bolas con nombre, agrupadas por color. Imprime juntas las del mismo color.
            </Text>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {['Pendiente', 'Completado'].map((e) => (
                    <Pressable
                        key={e}
                        onPress={() => setEstado(e)}
                        style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: estado === e ? '#111827' : '#e5e7eb' }}
                    >
                        <Text style={{ color: estado === e ? '#fff' : '#111827', fontWeight: 'bold' }}>{e}</Text>
                    </Pressable>
                ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, alignItems: 'center' }}>
                <Text style={{ color: '#64748b', fontWeight: 'bold' }}>Agrupar por:</Text>
                {[{ v: 'color', t: 'Color' }, { v: 'persona', t: 'Persona' }].map((o) => (
                    <Pressable
                        key={o.v}
                        onPress={() => setVista(o.v as 'color' | 'persona')}
                        style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: vista === o.v ? '#2563eb' : '#e5e7eb' }}
                    >
                        <Text style={{ color: vista === o.v ? '#fff' : '#111827', fontWeight: 'bold' }}>{o.t}</Text>
                    </Pressable>
                ))}
            </View>

            {cargando ? (
                <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 30 }} />
            ) : grupos.length === 0 ? (
                <Text style={{ color: '#64748b', marginTop: 20 }}>No hay bolas con nombre en pedidos {estado.toLowerCase()}s.</Text>
            ) : (
                <>
                    <Text style={{ color: '#334155', marginBottom: 10 }}>{totalBolas} bolas en {grupos.length} colores</Text>
                    {vista === 'color' ? grupos.map((g) => (
                        <View key={g.color} style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>{g.color} · {g.bolas} {g.bolas === 1 ? 'bola' : 'bolas'}</Text>
                                <Pressable
                                    style={{ backgroundColor: '#2563eb', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 }}
                                    onPress={() => descargar(`color=${encodeURIComponent(g.color)}`, g.color)}
                                >
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Descargar zip de {g.color}</Text>
                                </Pressable>
                            </View>

                            <View style={{ marginTop: 12, padding: 12, borderRadius: 8, backgroundColor: '#f1f5f9' }}>
                                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                                    <Text style={{ color: '#334155', fontWeight: 'bold' }}>Packs de 5 · orden:</Text>
                                    {[{ v: 'antiguos', t: 'Más antiguos primero' }, { v: 'persona', t: 'Por persona' }].map((o) => (
                                        <Pressable key={o.v} onPress={() => setOrden(o.v as 'antiguos' | 'persona')}
                                            style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: orden === o.v ? '#2563eb' : '#e2e8f0' }}>
                                            <Text style={{ color: orden === o.v ? '#fff' : '#111827', fontWeight: 'bold', fontSize: 12 }}>{o.t}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                                {(g.packs?.[orden] || []).map((pk: any[], n: number) => (
                                    <View key={n} style={{ marginBottom: 8 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                            <Text style={{ color: '#111827', fontWeight: 'bold' }}>Pack {n + 1} · {pk.length} {pk.length === 1 ? 'bola' : 'bolas'}</Text>
                                            <Pressable style={{ backgroundColor: '#16a34a', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 }}
                                                onPress={() => descargar(`color=${encodeURIComponent(g.color)}&pack=${n + 1}&orden=${orden}`, `pack${n + 1}_${g.color}`)}>
                                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Descargar pack {n + 1}</Text>
                                            </Pressable>
                                        </View>
                                        {pk.map((u: any, j: number) => <Text key={j} style={{ color: '#475569', fontSize: 13 }}>{nombreDe(u)}</Text>)}
                                    </View>
                                ))}
                            </View>

                            {g.lineas.map((l: any, i: number) => (
                                <View key={`${l.id}-${i}`} style={{ paddingVertical: 8, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: '#f1f5f9', marginTop: i === 0 ? 10 : 0 }}>
                                    <Text style={{ color: '#111827', fontWeight: 'bold' }}>
                                        {l.cliente || 'Sin nombre'}{l.curso ? ` (${l.curso})` : ''}
                                    </Text>
                                    <Pressable onPress={() => router.push(`/admin/pedidos/${l.pedido_id}` as any)}>
                                        <Text style={{ color: '#475569' }}>
                                            {l.modelo} · nombre "{l.personalizacion}"{l.cantidad > 1 ? ` ×${l.cantidad}` : ''} · pedido #{l.pedido}
                                        </Text>
                                    </Pressable>
                                </View>
                            ))}
                        </View>
                    )) : personas.map((p: any) => (
                        <View key={`${p.cliente}|${p.curso}`} style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>
                                    {p.cliente}{p.curso ? ` (${p.curso})` : ''} · {p.bolas} {p.bolas === 1 ? 'bola' : 'bolas'}
                                </Text>
                                <Pressable
                                    style={{ backgroundColor: '#2563eb', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 }}
                                    onPress={() => descargar(`cliente=${encodeURIComponent(p.cliente)}`, p.cliente)}
                                >
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Descargar zip de {p.cliente}</Text>
                                </Pressable>
                            </View>

                            {p.lineas.map((l: any, i: number) => (
                                <View key={`${l.id}-${i}`} style={{ paddingVertical: 8, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: '#f1f5f9', marginTop: i === 0 ? 10 : 0 }}>
                                    <Pressable onPress={() => router.push(`/admin/pedidos/${l.pedido_id}` as any)}>
                                        <Text style={{ color: '#111827' }}>
                                            {l.modelo} · nombre <Text style={{ fontWeight: 'bold' }}>"{l.personalizacion}"</Text>{l.cantidad > 1 ? ` ×${l.cantidad}` : ''}
                                        </Text>
                                        <Text style={{ color: '#475569' }}>Color {l.color} · pedido #{l.pedido}</Text>
                                    </Pressable>
                                </View>
                            ))}
                        </View>
                    ))}
                </>
            )}
        </ScrollView>
    );
}
