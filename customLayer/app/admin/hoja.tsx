import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { traducirError } from '../../lib/errores';
import { useEsMovilWeb } from '../../lib/responsive';
import { euros } from '../../lib/formato';
import Toast from 'react-native-toast-message';

const API_URL = `${process.env.EXPO_PUBLIC_API_URL || ''}/api`;

type Fila = {
    id_figura: string; id_pedido: string; cliente: string; fecha: string; figura: string;
    precio: number; coste: number; beneficio: number; pedido_web: string; estado: string; pagado: boolean; user_id: string; pedido_id: string;
};
type Totales = { figuras: number; precio: number; coste: number; beneficio: number; cobrado: number; por_cobrar: number };

const COLS: { t: string; w: number; k: keyof Fila }[] = [
    { t: 'Id Figura', w: 90, k: 'id_figura' }, { t: 'Id Pedido', w: 90, k: 'id_pedido' }, { t: 'Cliente', w: 190, k: 'cliente' },
    { t: 'Fecha', w: 130, k: 'fecha' }, { t: 'Figura', w: 100, k: 'figura' }, { t: 'Precio unitario', w: 120, k: 'precio' },
    { t: 'Coste unitario', w: 120, k: 'coste' }, { t: 'Beneficio estimado', w: 140, k: 'beneficio' },
    { t: 'Pedido web', w: 210, k: 'pedido_web' }, { t: 'Estado', w: 110, k: 'estado' }, { t: 'Pagado', w: 80, k: 'pagado' },
];

/** La fecha viene como dd/mm/aaaa hh:mm. Se pasa a aaaammddhhmm para ordenarla bien. */
const valorFecha = (f: string) => { const m = f.match(/(\d+)\/(\d+)\/(\d+) (\d+):(\d+)/); return m ? `${m[3]}${m[2]}${m[1]}${m[4]}${m[5]}` : f; };
const ANCHO = COLS.reduce((s, c) => s + c.w, 0);

const colorBeneficio = (f: Fila) =>
    f.beneficio < 0 ? { bg: '#fecaca', fg: '#991b1b' }
        : f.beneficio > f.coste ? { bg: '#dcfce7', fg: '#15803d' }
            : { bg: '#fef3c7', fg: '#b45309' };
const colorEstado = (est: string) =>
    est === 'Entregado' ? { bg: '#dcfce7', fg: '#15803d' } : est === 'Completado' ? { bg: '#dbeafe', fg: '#1d4ed8' } : null;

/**
 * Hoja de gastos: lo mismo que el Excel, una fila por figura con coste, beneficio, estado y pagado.
 * Abajo salen los totales. Se refresca sola cada 30 segundos.
 */
export default function HojaGastos() {
    const movil = useEsMovilWeb();
    const [cargando, setCargando] = useState(true);
    const [filas, setFilas] = useState<Fila[]>([]);
    const [totales, setTotales] = useState<Totales | null>(null);
    const [orden, setOrden] = useState<{ k: keyof Fila | null; asc: boolean }>({ k: null, asc: true });

    const ordenadas = useMemo(() => {
        if (!orden.k) return filas;
        const k = orden.k;
        const val = (f: Fila) => k === 'fecha' ? valorFecha(f.fecha) : k === 'pagado' ? Number(f.pagado) : f[k];
        return [...filas].sort((a, b) => {
            const x: any = val(a), y: any = val(b);
            const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es', { numeric: true });
            return orden.asc ? r : -r;
        });
    }, [filas, orden]);

    const ordenarPor = (k: keyof Fila) => setOrden(o => ({ k, asc: o.k === k ? !o.asc : true }));

    const cargar = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        try {
            const res = await fetch(`${API_URL}/admin/hoja`, { headers: { Authorization: `Bearer ${session.access_token}` } });
            const datos = await res.json().catch(() => ({}));
            if (res.ok) { setFilas(datos.filas || []); setTotales(datos.totales || null); }
            else Toast.show({ type: 'error', text1: traducirError(datos.detail, 'No se pudo cargar la hoja de gastos') });
        } catch {
            Toast.show({ type: 'error', text1: 'Error de conexión' });
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargar();
        const t = setInterval(() => { if (typeof document === 'undefined' || !document.hidden) cargar(); }, 30000);
        return () => clearInterval(t);
    }, [cargar]);

    const cambiarPago = async (f: Fila) => {
        const nuevo = !f.pagado;
        setFilas(l => l.map(x => x.pedido_id === f.pedido_id ? { ...x, pagado: nuevo } : x));
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${API_URL}/admin/pedidos/${f.pedido_id}/pagado`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify({ pagado: nuevo }),
            });
            if (!res.ok) {
                const datos = await res.json().catch(() => ({}));
                Toast.show({ type: 'error', text1: traducirError(datos.detail, 'No se pudo guardar el pago') });
            }
        } catch {
            Toast.show({ type: 'error', text1: 'Error de conexión' });
        }
        cargar();
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc', padding: movil ? 14 : 28 }}>
            <Text style={{ fontSize: movil ? 22 : 28, fontWeight: 'bold', color: '#1e293b', marginBottom: 14 }}>Hoja de gastos</Text>
            {cargando ? <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} /> : (
                <ScrollView horizontal style={e.tarjeta}>
                    <View style={{ width: ANCHO }}>
                        <View style={[e.fila, e.cabecera]}>
                            {COLS.map(c => (
                                <Pressable key={c.t} onPress={() => ordenarPor(c.k)} style={[e.celda, { width: c.w }]} accessibilityLabel={`Ordenar por ${c.t}`}>
                                    <Text style={e.cabTexto}>{c.t}{orden.k === c.k ? (orden.asc ? ' ▲' : ' ▼') : ''}</Text>
                                </Pressable>
                            ))}
                        </View>
                        <ScrollView style={{ maxHeight: movil ? 420 : 520 }}>
                            {filas.length === 0 && <Text style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>Todavía no hay pedidos.</Text>}
                            {ordenadas.map((f, i) => {
                                const cb = colorBeneficio(f);
                                const ce = colorEstado(f.estado);
                                return (
                                    <View key={`${f.id_figura}-${i}`} style={[e.fila, i % 2 === 1 && { backgroundColor: '#f8fafc' }]}>
                                        <View style={[e.celda, { width: COLS[0].w, alignItems: 'center' }]}><Text style={e.texto}>{f.id_figura}</Text></View>
                                        <View style={[e.celda, { width: COLS[1].w, alignItems: 'center' }]}><Text style={e.texto}>{f.id_pedido}</Text></View>
                                        <View style={[e.celda, { width: COLS[2].w }]}><Text style={e.texto}>{f.cliente}</Text></View>
                                        <View style={[e.celda, { width: COLS[3].w }]}><Text style={e.texto}>{f.fecha}</Text></View>
                                        <View style={[e.celda, { width: COLS[4].w, alignItems: 'center' }]}><Text style={e.texto}>{f.figura}</Text></View>
                                        <View style={[e.celda, { width: COLS[5].w, alignItems: 'flex-end' }]}><Text style={e.texto}>{euros(f.precio)}</Text></View>
                                        <View style={[e.celda, { width: COLS[6].w, alignItems: 'flex-end', backgroundColor: '#fee2e2' }]}><Text style={[e.texto, { color: '#b91c1c', fontWeight: 'bold' }]}>{euros(f.coste)}</Text></View>
                                        <View style={[e.celda, { width: COLS[7].w, alignItems: 'flex-end', backgroundColor: cb.bg }]}><Text style={[e.texto, { color: cb.fg, fontWeight: 'bold' }]}>{euros(f.beneficio)}</Text></View>
                                        <View style={[e.celda, { width: COLS[8].w }]}><Text style={[e.texto, { fontSize: 12 }]}>{f.pedido_web}</Text></View>
                                        <View style={[e.celda, { width: COLS[9].w, alignItems: 'center', backgroundColor: ce?.bg }]}><Text style={[e.texto, ce && { color: ce.fg }]}>{f.estado}</Text></View>
                                        <View style={[e.celda, { width: COLS[10].w, alignItems: 'center' }]}>
                                            <Pressable onPress={() => cambiarPago(f)} accessibilityRole="checkbox" accessibilityState={{ checked: f.pagado }} accessibilityLabel={`Pagado ${f.cliente}`} hitSlop={8}>
                                                <Ionicons name={f.pagado ? 'checkbox' : 'square-outline'} size={24} color={f.pagado ? '#15803d' : '#94a3b8'} />
                                            </Pressable>
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>
                        {totales && (<>
                            <View style={[e.fila, e.pie]}>
                                <View style={[e.celda, { width: COLS[0].w + COLS[1].w + COLS[2].w + COLS[3].w }]}><Text style={e.pieTexto}>TOTAL</Text></View>
                                <View style={[e.celda, { width: COLS[4].w, alignItems: 'center' }]}><Text style={e.pieTexto}>{totales.figuras} figuras</Text></View>
                                <View style={[e.celda, { width: COLS[5].w, alignItems: 'flex-end' }]}><Text style={e.pieTexto}>{euros(totales.precio)}</Text></View>
                                <View style={[e.celda, { width: COLS[6].w, alignItems: 'flex-end' }]}><Text style={e.pieTexto}>{euros(totales.coste)}</Text></View>
                                <View style={[e.celda, { width: COLS[7].w, alignItems: 'flex-end' }]}><Text style={e.pieTexto}>{euros(totales.beneficio)}</Text></View>
                            </View>
                            <View style={[e.fila, e.pie, { borderTopWidth: 0 }]}>
                                <View style={[e.celda, { width: COLS[0].w + COLS[1].w + COLS[2].w + COLS[3].w + COLS[4].w }]}><Text style={e.pieTexto}>COBRADO</Text></View>
                                <View style={[e.celda, { width: COLS[5].w, alignItems: 'flex-end' }]}><Text style={e.pieTexto}>{euros(totales.cobrado)}</Text></View>
                            </View>
                            <View style={[e.fila, e.pie, { borderTopWidth: 0 }]}>
                                <View style={[e.celda, { width: COLS[0].w + COLS[1].w + COLS[2].w + COLS[3].w + COLS[4].w }]}><Text style={e.pieTexto}>POR COBRAR</Text></View>
                                <View style={[e.celda, { width: COLS[5].w, alignItems: 'flex-end' }]}><Text style={e.pieTexto}>{euros(totales.por_cobrar)}</Text></View>
                            </View>
                        </>)}
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

const e = StyleSheet.create({
    tarjeta: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', flexGrow: 0, alignSelf: 'flex-start', maxWidth: '100%' },
    fila: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    cabecera: { backgroundColor: '#1f2937', borderBottomColor: '#1f2937' },
    cabTexto: { fontWeight: 'bold', color: '#fff', fontSize: 13 },
    celda: { paddingHorizontal: 10, paddingVertical: 10, justifyContent: 'center' },
    texto: { color: '#1f2937', fontSize: 13 },
    pie: { backgroundColor: '#e5e7eb', borderTopWidth: 2, borderTopColor: '#1f2937', borderBottomWidth: 0 },
    pieTexto: { fontWeight: 'bold', color: '#1f2937', fontSize: 13 },
});
