import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { traducirError } from '../../lib/errores';
import { useEsMovilWeb } from '../../lib/responsive';
import { euros } from '../../lib/formato';
import Toast from 'react-native-toast-message';

const API_URL = `${process.env.EXPO_PUBLIC_API_URL || ''}/api`;

type Fila = { id: string; nombre: string; email: string; curso: string; num_pedidos: number; bolas: number; total: number };
type Columna = 'curso' | 'nombre' | 'email' | 'num_pedidos' | 'bolas' | 'total';

const COLUMNAS: { clave: Columna; titulo: string; ancho: number; numero?: boolean }[] = [
    { clave: 'curso', titulo: 'Curso', ancho: 110 },
    { clave: 'nombre', titulo: 'Nombre', ancho: 190 },
    { clave: 'email', titulo: 'Correo', ancho: 230 },
    { clave: 'num_pedidos', titulo: 'Tickets', ancho: 80, numero: true },
    { clave: 'bolas', titulo: 'Bolas', ancho: 80, numero: true },
    { clave: 'total', titulo: 'Total gastado', ancho: 130, numero: true },
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
    const [busqueda, setBusqueda] = useState('');
    const [curso, setCurso] = useState('Todos');
    const [orden, setOrden] = useState<{ col: Columna; asc: boolean }>({ col: 'nombre', asc: true });

    useEffect(() => {
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            try {
                const res = await fetch(`${API_URL}/admin/resumen`, { headers: { Authorization: `Bearer ${session.access_token}` } });
                const datos = await res.json().catch(() => ({}));
                if (res.ok) setFilas(datos.filas || []);
                else Toast.show({ type: 'error', text1: traducirError(datos.detail, 'No se pudo cargar el resumen') });
            } catch {
                Toast.show({ type: 'error', text1: 'Error de conexión' });
            } finally {
                setCargando(false);
            }
        })();
    }, []);

    const cursos = useMemo(() => ['Todos', ...Array.from(new Set(filas.map(f => f.curso).filter(Boolean))).sort()], [filas]);

    const visibles = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        const lista = filas.filter(f => (curso === 'Todos' || f.curso === curso) &&
            (!q || f.nombre.toLowerCase().includes(q) || f.email.toLowerCase().includes(q)));
        return [...lista].sort((a, b) => {
            const x = a[orden.col], y = b[orden.col];
            const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es');
            return orden.asc ? r : -r;
        });
    }, [filas, busqueda, curso, orden]);

    const totales = useMemo(() => ({
        personas: visibles.length,
        tickets: visibles.reduce((s, f) => s + f.num_pedidos, 0),
        bolas: visibles.reduce((s, f) => s + f.bolas, 0),
        total: visibles.reduce((s, f) => s + f.total, 0),
    }), [visibles]);

    const ordenarPor = (col: Columna) => setOrden(o => ({ col, asc: o.col === col ? !o.asc : true }));

    const descargar = () => {
        const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
        const lineas = [['Curso', 'Nombre', 'Correo', 'Tickets', 'Bolas', 'Total gastado'].map(esc).join(';')];
        visibles.forEach(f => lineas.push([f.curso, f.nombre, f.email, f.num_pedidos, f.bolas, f.total.toFixed(2).replace('.', ',')].map(esc).join(';')));
        lineas.push(['TOTAL', `${totales.personas} ${totales.personas === 1 ? 'persona' : 'personas'}`, '', totales.tickets, totales.bolas, totales.total.toFixed(2).replace('.', ',')].map(esc).join(';'));
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

    const anchoTabla = COLUMNAS.reduce((s, c) => s + c.ancho, 0);

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc', padding: movil ? 14 : 28 }}>
            <Text style={{ fontSize: movil ? 22 : 28, fontWeight: 'bold', color: '#1e293b', marginBottom: 14 }}>Resumen de pedidos</Text>

            <View style={{ flexDirection: movil ? 'column' : 'row', gap: 10, marginBottom: 14 }}>
                <TextInput style={[e.input, { flex: movil ? undefined : 1 }]} value={busqueda} onChangeText={setBusqueda}
                    placeholder="Buscar por nombre o correo" />
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    {cursos.map(c => (
                        <Pressable key={c} onPress={() => setCurso(c)} style={[e.chip, curso === c && e.chipActivo]}>
                            <Text style={[e.chipTexto, curso === c && e.chipTextoActivo]}>{c}</Text>
                        </Pressable>
                    ))}
                </View>
                <Pressable onPress={descargar} style={e.botonDescarga} accessibilityLabel="Descargar CSV">
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
                                </View>
                            ))}
                        </ScrollView>
                        <View style={[e.fila, e.pie]}>
                            <View style={[e.celda, { width: COLUMNAS[0].ancho + COLUMNAS[1].ancho + COLUMNAS[2].ancho }]}>
                                <Text style={e.pieTexto}>TOTAL ({totales.personas} {totales.personas === 1 ? 'persona' : 'personas'})</Text>
                            </View>
                            <View style={[e.celda, { width: COLUMNAS[3].ancho, alignItems: 'flex-end' }]}><Text style={e.pieTexto}>{totales.tickets}</Text></View>
                            <View style={[e.celda, { width: COLUMNAS[4].ancho, alignItems: 'flex-end' }]}><Text style={e.pieTexto}>{totales.bolas}</Text></View>
                            <View style={[e.celda, { width: COLUMNAS[5].ancho, alignItems: 'flex-end' }]}><Text style={e.pieTexto}>{euros(totales.total)}</Text></View>
                        </View>
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

const e = StyleSheet.create({
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
    chipActivo: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
    chipTexto: { color: '#475569', fontWeight: '600', fontSize: 13 },
    chipTextoActivo: { color: '#fff' },
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
