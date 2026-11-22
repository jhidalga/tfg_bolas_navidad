import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { traducirError } from '../../lib/errores';
import { useEsMovilWeb } from '../../lib/responsive';
import { euros } from '../../lib/formato';
import Toast from 'react-native-toast-message';
import Desplegable from '../../componentes/desplegable';

const API_URL = `${process.env.EXPO_PUBLIC_API_URL || ''}/api`;

type CeldaModelo = { cantidad: number; estados: Record<string, number> };
type Fila = { id: string; nombre: string; email: string; curso: string; num_pedidos: number; bolas: number; total: number; pagado?: boolean; profesor?: boolean; modelos?: Record<string, CeldaModelo> };

const ANCHO_MODELO = 105;

/** Estado de las bolas de un modelo: uno solo si coinciden, o el recuento si hay varios. */
const textoEstados = (c?: CeldaModelo) => {
    if (!c) return '';
    const lista = Object.entries(c.estados);
    return lista.length === 1 ? lista[0][0] : lista.map(([est, n]) => `${n} ${est}`).join(', ');
};
const colorEstado = (est: string) => est === 'Entregado' ? '#15803d' : est === 'Completado' ? '#1d4ed8' : est === 'Cancelado' ? '#b91c1c' : '#b45309';
type Columna = 'curso' | 'nombre' | 'email' | 'num_pedidos' | 'bolas' | 'total' | 'pagado';

const COLUMNAS: { clave: Columna; titulo: string; ancho: number; numero?: boolean }[] = [
    { clave: 'curso', titulo: 'Curso', ancho: 100 },
    { clave: 'nombre', titulo: 'Nombre', ancho: 160 },
    { clave: 'email', titulo: 'Correo', ancho: 210 },
    { clave: 'num_pedidos', titulo: 'Tickets', ancho: 80, numero: true },
    { clave: 'bolas', titulo: 'Bolas', ancho: 80, numero: true },
    { clave: 'total', titulo: 'Total gastado', ancho: 120, numero: true },
    { clave: 'pagado', titulo: 'Pagado', ancho: 80 },
];


/**
 * Resumen en forma de hoja de calculo: una fila por persona con curso, nombre, correo,
 * tickets, bolas y total gastado. Abajo va la suma de todos los tickets.
 * Se puede buscar, filtrar por curso, ordenar por columna y descargar en CSV.
 */
export default function ResumenAdmin() {
    const movil = useEsMovilWeb();
    const [cargando, setCargando] = useState(true);
    const [filas, setFilas] = useState<Fila[]>([]);
    const [modelos, setModelos] = useState<string[]>([]);
    const [busqueda, setBusqueda] = useState('');
    const [curso, setCurso] = useState('Todos');
    const [depto, setDepto] = useState('Todos');
    const [abierto, setAbierto] = useState<'curso' | 'depto' | null>(null);
    const [orden, setOrden] = useState<{ col: Columna; asc: boolean }>({ col: 'nombre', asc: true });

    useEffect(() => {
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            try {
                const res = await fetch(`${API_URL}/admin/resumen`, { headers: { Authorization: `Bearer ${session.access_token}` } });
                const datos = await res.json().catch(() => ({}));
                if (res.ok) { setFilas(datos.filas || []); setModelos(datos.modelos || []); }
                else Toast.show({ type: 'error', text1: traducirError(datos.detail, 'No se pudo cargar el resumen') });
            } catch {
                Toast.show({ type: 'error', text1: 'Error de conexión' });
            } finally {
                setCargando(false);
            }
        })();
    }, []);

    const cursos = useMemo(() => ['Todos', ...Array.from(new Set(filas.filter(f => !f.profesor).map(f => f.curso).filter(Boolean))).sort()], [filas]);
    const deptos = useMemo(() => ['Todos', ...Array.from(new Set(filas.filter(f => f.profesor).map(f => f.curso).filter(Boolean))).sort()], [filas]);

    const visibles = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        const lista = filas.filter(f => (curso === 'Todos' || (!f.profesor && f.curso === curso)) && (depto === 'Todos' || (!!f.profesor && f.curso === depto)) &&
            (!q || f.nombre.toLowerCase().includes(q) || f.email.toLowerCase().includes(q)));
        return [...lista].sort((a, b) => {
            const x = orden.col === 'pagado' ? Number(!!a.pagado) : a[orden.col], y = orden.col === 'pagado' ? Number(!!b.pagado) : b[orden.col];
            const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es');
            return orden.asc ? r : -r;
        });
    }, [filas, busqueda, curso, depto, orden]);

    const totales = useMemo(() => ({
        personas: visibles.length,
        tickets: visibles.reduce((s, f) => s + f.num_pedidos, 0),
        bolas: visibles.reduce((s, f) => s + f.bolas, 0),
        total: visibles.reduce((s, f) => s + (f.pagado ? f.total : 0), 0),
        pendiente: visibles.reduce((s, f) => s + (f.pagado ? 0 : f.total), 0),
        porModelo: Object.fromEntries(modelos.map(m => [m, visibles.reduce((s, f) => s + (f.modelos?.[m]?.cantidad || 0), 0)])) as Record<string, number>,
    }), [visibles, modelos]);

    const cambiarPago = async (f: Fila) => {
        const nuevo = !f.pagado;
        setFilas(l => l.map(x => x.id === f.id ? { ...x, pagado: nuevo } : x));
        const volver = () => setFilas(l => l.map(x => x.id === f.id ? { ...x, pagado: !nuevo } : x));
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${API_URL}/admin/resumen/${f.id}/pagado`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify({ pagado: nuevo }),
            });
            if (!res.ok) {
                const datos = await res.json().catch(() => ({}));
                volver();
                Toast.show({ type: 'error', text1: traducirError(datos.detail, 'No se pudo guardar el pago') });
            }
        } catch {
            volver();
            Toast.show({ type: 'error', text1: 'Error de conexión' });
        }
    };

    const ordenarPor = (col: Columna) => setOrden(o => ({ col, asc: o.col === col ? !o.asc : true }));

    const descargar = () => {
        const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
        const lineas = [['Curso', 'Nombre', 'Correo', 'Tickets', 'Bolas', 'Total gastado', 'Pagado', ...modelos].map(esc).join(';')];
        visibles.forEach(f => lineas.push([f.curso, f.nombre, f.email, f.num_pedidos, f.bolas, f.total.toFixed(2).replace('.', ','), f.pagado ? 'Sí' : 'No', ...modelos.map(m => f.modelos?.[m] ? `${f.modelos[m].cantidad} (${textoEstados(f.modelos[m])})` : '')].map(esc).join(';')));
        lineas.push(['TOTAL COBRADO', `${totales.personas} ${totales.personas === 1 ? 'persona' : 'personas'}`, '', totales.tickets, totales.bolas, totales.total.toFixed(2).replace('.', ','), '', ...modelos.map(m => totales.porModelo[m] || 0)].map(esc).join(';'));
        lineas.push(['PENDIENTE DE COBRAR', '', '', '', '', totales.pendiente.toFixed(2).replace('.', ',')].map(esc).join(';'));
        const csv = '﻿' + lineas.join('\n');
        if (Platform.OS === 'web') {
            const enlace = document.createElement('a');
            enlace.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
            enlace.setAttribute('download', 'resumen_pedidos.csv');
            document.body.appendChild(enlace);
            enlace.click();
            document.body.removeChild(enlace);
        } else {
            Toast.show({ type: 'info', text1: 'La descarga solo está en la versión web' });
        }
    };

    const anchoTabla = COLUMNAS.reduce((s, c) => s + c.ancho, 0) + modelos.length * ANCHO_MODELO;

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc', padding: movil ? 14 : 28 }}>
            <Text style={{ fontSize: movil ? 22 : 28, fontWeight: 'bold', color: '#1e293b', marginBottom: 14 }}>Resumen de pedidos</Text>

            <View style={{ flexDirection: movil ? 'column' : 'row', gap: 10, marginBottom: 14, alignItems: movil ? 'stretch' : 'flex-start' }}>
                <TextInput style={[e.input, { flex: movil ? undefined : 1 }]} value={busqueda} onChangeText={setBusqueda}
                    placeholder="Buscar por nombre o correo" />
                <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start', zIndex: 20 }}>
                    <Desplegable titulo="Curso" opciones={cursos} valor={curso} abierto={abierto === 'curso'} ancho={movil ? 150 : 170}
                        alAbrir={() => setAbierto(abierto === 'curso' ? null : 'curso')}
                        alElegir={(v) => { setCurso(v); setDepto('Todos'); setAbierto(null); }} />
                    <Desplegable titulo="Departamento" opciones={deptos} valor={depto} abierto={abierto === 'depto'} ancho={movil ? 170 : 190}
                        alAbrir={() => setAbierto(abierto === 'depto' ? null : 'depto')}
                        alElegir={(v) => { setDepto(v); setCurso('Todos'); setAbierto(null); }} />
                </View>
                <Pressable onPress={descargar} style={[e.botonDescarga, !movil && { height: 44 }]} accessibilityLabel="Descargar CSV">
                    <Ionicons name="download-outline" size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Descargar CSV</Text>
                </Pressable>
            </View>

            {cargando ? <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} /> : (
                <ScrollView horizontal style={e.tarjeta} >
                    <View style={{ width: Math.max(anchoTabla, 0) }}>
                        <View style={[e.fila, e.cabecera]}>
                            {COLUMNAS.map(c => (
                                <Pressable key={c.clave} onPress={() => ordenarPor(c.clave)} style={[e.celda, { width: c.ancho }, c.numero && { alignItems: 'flex-end' }]}>
                                    <Text style={e.cabeceraTexto}>
                                        {c.titulo}{orden.col === c.clave ? (orden.asc ? ' ▲' : ' ▼') : ''}
                                    </Text>
                                </Pressable>
                            ))}
                            {modelos.map(m => (
                                <View key={m} style={[e.celda, { width: ANCHO_MODELO }]}><Text style={e.cabeceraTexto}>{m}</Text></View>
                            ))}
                        </View>
                        <ScrollView style={{ maxHeight: movil ? 420 : 520 }}>
                            {visibles.length === 0 && <Text style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No hay pedidos con estos filtros.</Text>}
                            {visibles.map((f, i) => (
                                <View key={f.id} style={[e.fila, i % 2 === 1 && { backgroundColor: '#f8fafc' }]}>
                                    <View style={[e.celda, { width: COLUMNAS[0].ancho }]}><Text style={e.texto}>{f.curso}</Text></View>
                                    <View style={[e.celda, { width: COLUMNAS[1].ancho }]}><Text style={e.texto}>{f.nombre}</Text></View>
                                    <View style={[e.celda, { width: COLUMNAS[2].ancho }]}><Text style={e.texto}>{f.email}</Text></View>
                                    <View style={[e.celda, { width: COLUMNAS[3].ancho, alignItems: 'flex-end' }]}><Text style={e.texto}>{f.num_pedidos}</Text></View>
                                    <View style={[e.celda, { width: COLUMNAS[4].ancho, alignItems: 'flex-end' }]}><Text style={e.texto}>{f.bolas}</Text></View>
                                    <View style={[e.celda, { width: COLUMNAS[5].ancho, alignItems: 'flex-end' }]}><Text style={e.texto}>{euros(f.total)}</Text></View>
                                    <View style={[e.celda, { width: COLUMNAS[6].ancho, alignItems: 'center' }]}>
                                        <Pressable onPress={() => cambiarPago(f)} accessibilityRole="checkbox" accessibilityState={{ checked: !!f.pagado }} accessibilityLabel={`Pagado ${f.nombre}`} hitSlop={8}>
                                            <Ionicons name={f.pagado ? 'checkbox' : 'square-outline'} size={26} color={f.pagado ? '#15803d' : '#94a3b8'} />
                                        </Pressable>
                                    </View>
                                    {modelos.map(m => {
                                        const c = f.modelos?.[m];
                                        return (
                                            <View key={m} style={[e.celda, { width: ANCHO_MODELO }]}>
                                                {c ? (<>
                                                    <Text style={[e.texto, { fontWeight: '700' }]}>{c.cantidad}</Text>
                                                    <Text style={{ fontSize: 12, fontWeight: '600', color: colorEstado(Object.keys(c.estados)[0]) }}>{textoEstados(c)}</Text>
                                                </>) : <Text style={{ color: '#cbd5e1' }}>-</Text>}
                                            </View>
                                        );
                                    })}
                                </View>
                            ))}
                        </ScrollView>
                        <View style={[e.fila, e.pie]}>
                            <View style={[e.celda, { width: COLUMNAS[0].ancho + COLUMNAS[1].ancho + COLUMNAS[2].ancho }]}>
                                <Text style={e.pieTexto}>TOTAL COBRADO ({totales.personas} {totales.personas === 1 ? 'persona' : 'personas'})</Text>
                            </View>
                            <View style={[e.celda, { width: COLUMNAS[3].ancho, alignItems: 'flex-end' }]}><Text style={e.pieTexto}>{totales.tickets}</Text></View>
                            <View style={[e.celda, { width: COLUMNAS[4].ancho, alignItems: 'flex-end' }]}><Text style={e.pieTexto}>{totales.bolas}</Text></View>
                            <View style={[e.celda, { width: COLUMNAS[5].ancho, alignItems: 'flex-end' }]}><Text style={e.pieTexto}>{euros(totales.total)}</Text></View>
                            <View style={[e.celda, { width: COLUMNAS[6].ancho }]} />
                            {modelos.map(m => (
                                <View key={m} style={[e.celda, { width: ANCHO_MODELO }]}><Text style={e.pieTexto}>{totales.porModelo[m] || 0}</Text></View>
                            ))}
                        </View>
                        <View style={[e.fila, e.pie, { borderTopWidth: 0, backgroundColor: '#fff7ed' }]}>
                            <View style={[e.celda, { width: COLUMNAS[0].ancho + COLUMNAS[1].ancho + COLUMNAS[2].ancho + COLUMNAS[3].ancho + COLUMNAS[4].ancho }]}>
                                <Text style={[e.pieTexto, { color: '#9a3412' }]}>PENDIENTE DE COBRAR</Text>
                            </View>
                            <View style={[e.celda, { width: COLUMNAS[5].ancho, alignItems: 'flex-end' }]}><Text style={[e.pieTexto, { color: '#9a3412' }]}>{euros(totales.pendiente)}</Text></View>
                        </View>
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

const e = StyleSheet.create({
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
    botonDescarga: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10b981', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, justifyContent: 'center' },
    tarjeta: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', flexGrow: 0, alignSelf: 'flex-start', maxWidth: '100%' },
    fila: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    cabecera: { backgroundColor: '#f1f5f9', borderBottomColor: '#e2e8f0' },
    cabeceraTexto: { fontWeight: 'bold', color: '#334155', fontSize: 13 },
    celda: { paddingHorizontal: 12, paddingVertical: 11, justifyContent: 'center' },
    texto: { color: '#1e293b', fontSize: 14 },
    pie: { backgroundColor: '#eff6ff', borderTopWidth: 2, borderTopColor: '#bfdbfe', borderBottomWidth: 0 },
    pieTexto: { fontWeight: 'bold', color: '#1e3a8a', fontSize: 14 },
});
