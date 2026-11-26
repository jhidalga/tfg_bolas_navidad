import { etiquetaPedido } from '../../../lib/etiquetaPedido';
import { View, Text, ScrollView, Pressable, Image, Platform, TextInput } from 'react-native';
import { traducirError } from '../../../lib/errores';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { styles as estilosEscritorio } from '../../../styles/adminDetallePedido/adminDetallePedido.styles';
import { styles as estilosMovil } from '../../../styles/adminDetallePedido/adminDetallePedido.styles.movil';
import { useEstilos } from '../../../lib/responsive';
import { euros } from '../../../lib/formato';
import { useConfirmar } from '../../../componentes/confirmar';

/** Igual que la tienda: si el modelo se llama Base o Único, la figura es el nombre del producto. */
const figuraDe = (modelo?: string, producto?: string) =>
    !modelo || /^(base|unico|único)$/i.test(modelo.trim()) ? (producto || modelo || '') : modelo;
const boton = (color: string) => ({ backgroundColor: color, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 8 });

/**
 * Pantalla de administración para ver los detalles de un pedido específico.
 * Recupera la información completa de la transacción a través de la API usando 
 * el identificador (ID) de la URL. Muestra el importe total y una lista con 
 * el desglose de los productos comprados (modelo, color, cantidad, precio unitario y personalización).
 * * @returns Componente que renderiza la vista detallada del pedido para el administrador.
 */
export default function DetallesPedidoAdmin() {
    const styles = useEstilos(estilosEscritorio, estilosMovil);
    const { id } = useLocalSearchParams(); 
    const router = useRouter();
    const [datos, setDatos] = useState<any>(null);
    const [cargando, setCargando] = useState(true);
    const { confirmar, dialogo } = useConfirmar();
    const [catalogo, setCatalogo] = useState<any[]>([]);
    const [edit, setEdit] = useState<any>(null);
    const [guardando, setGuardando] = useState(false);
    const cargarDetalleRef = useRef<() => Promise<void>>(async () => {});

    useEffect(() => {
        /**
         * Realiza una petición a la API para obtener los datos asociados al pedido actual.
         * Requiere que el usuario administrador tenga una sesión activa en Supabase.
         * Si la respuesta es exitosa, guarda los datos (información del pedido y productos) en el estado local.
         */
        cargarDetalleRef.current = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            
            try {
                const respuesta = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/admin/pedidos/${id}`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                });
                
                if (respuesta.ok) {
                    const json = await respuesta.json();
                    setDatos(json);
                }
            } catch (error) {
            } finally {
                setCargando(false);
            }
        };

        cargarDetalleRef.current();
        fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/productos`).then(r => r.json()).then(d => Array.isArray(d) && setCatalogo(d.filter((x: any) => !x.deshabilitado))).catch(() => {});
    }, [id]);

    const API = process.env.EXPO_PUBLIC_API_URL || '';

    // Cuantas bolas de una linea ya estan impresas. Con la ultima del pedido, el pedido pasa a Completado.
    const cambiarHechas = async (prod: any, nuevas: number) => {
        const max = prod.cantidad || 1;
        const n = Math.max(0, Math.min(nuevas, max));
        const antes = prod.hechas || 0;
        const poner = (v: number, estado?: string) => setDatos((d: any) => ({
            ...d,
            pedido: estado ? { ...d.pedido, estado } : d.pedido,
            productos: d.productos.map((x: any) => x.id === prod.id ? { ...x, hechas: v } : x),
        }));
        poner(n);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${API}/api/admin/lineas/${prod.id}/hechas`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                body: JSON.stringify({ hechas: n }),
            });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) {
                poner(antes);
                Toast.show({ type: 'error', text1: traducirError(d.detail, 'No se pudo guardar') });
                return;
            }
            if (d.estado_pedido === 'Completado' && datos.pedido.estado !== 'Completado') {
                poner(n, 'Completado');
                Toast.show({ type: 'success', text1: 'Pedido completado', text2: 'Ya están hechas todas las bolas' });
            }
        } catch {
            poner(antes);
            Toast.show({ type: 'error', text1: 'Error de conexión' });
        }
    };

    /**
     * Descarga un 3MF (una bola) o el zip de todo el pedido. Solo en la version web.
     * El archivo se genera al vuelo con el nombre que puso el cliente.
     */
    const descargar3mf = async (detalleId: string | null, nombreArchivo: string) => {
        if (Platform.OS !== 'web') {
            Toast.show({ type: 'info', text1: 'La descarga del 3MF solo funciona en la versión web' });
            return;
        }
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const consulta = detalleId ? `?detalle=${encodeURIComponent(detalleId)}` : '';
            const res = await fetch(`${API}/api/admin/pedidos/${id}/3mf${consulta}`, {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            if (!res.ok) {
                const e = await res.json().catch(() => ({}));
                Toast.show({ type: 'error', text1: 'No se pudo generar el 3MF', text2: traducirError(e.detail, '') });
                return;
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = nombreArchivo; a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            Toast.show({ type: 'error', text1: 'Error de conexión' });
        }
    };


    // ---- Cambiar, quitar o anadir bolas: lo mismo que en el perfil de la persona ----
    const pedidoId = String(id);
    const editarLinea = (l: any) => {
        const prod = catalogo.find(x => x.id === l.producto_id) || catalogo.find(x => (x.modelos || []).some((m: any) => figuraDe(m.nombre, x.nombre) === l.modelo));
        setEdit({ linea: l.id, producto: prod?.id || l.producto_id, modelo: l.modelo, color: l.color,
                  nombre: l.personalizacion && l.personalizacion !== 'Sin texto' ? l.personalizacion : '', cantidad: l.cantidad || 1 });
    };
    const elegirModelo = (prod: any, m: any) => {
        const colores: string[] = prod.colores || [];
        setEdit((e: any) => ({ ...e, producto: prod.id, modelo: figuraDe(m.nombre, prod.nombre), color: colores.length && !colores.includes(e.color) ? colores[0] : e.color }));
    };
    const nuevaBola = () => {
        const prod = catalogo[0];
        if (!prod) { Toast.show({ type: 'error', text1: 'Todavía no se ha cargado el catálogo' }); return; }
        const m = (prod.modelos || [])[0];
        setEdit({ linea: 'nueva', producto: prod.id, modelo: m ? figuraDe(m.nombre, prod.nombre) : '', color: (prod.colores || [])[0] || '', nombre: '', cantidad: 1 });
    };
    const avisarSiPagado = async () => {
        if (!datos?.pedido?.pagado) return true;
        return await confirmar('Este pedido ya está pagado. Si cambias bolas cambia el total y la hoja de gastos, pero sigue marcado como pagado. ¿Seguir?', 'Seguir');
    };
    const guardarEdicion = async () => {
        if (!edit) return;
        const palabras = edit.nombre.trim().split(/\s+/).filter(Boolean).length;
        if (!palabras) { Toast.show({ type: 'error', text1: 'Escribe el nombre de la bola' }); return; }
        if (palabras > 3) { Toast.show({ type: 'error', text1: 'El nombre puede tener como máximo 3 palabras' }); return; }
        if (!(await avisarSiPagado())) return;
        const { data: { session } } = await supabase.auth.getSession();
        setGuardando(true);
        const nueva = edit.linea === 'nueva';
        try {
            const res = await fetch(nueva ? `${API}/api/admin/pedidos/${pedidoId}/bolas` : `${API}/api/admin/pedidos/${pedidoId}/detalles/${edit.linea}`, {
                method: nueva ? 'POST' : 'PATCH',
                headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ producto_id: edit.producto, modelo: edit.modelo, color: edit.color, personalizacion: edit.nombre.trim(), cantidad: edit.cantidad }),
            });
            if (res.ok) { Toast.show({ type: 'success', text1: nueva ? 'Bola añadida' : 'Bola cambiada' }); setEdit(null); await cargarDetalleRef.current(); }
            else { const e = await res.json().catch(() => ({})); Toast.show({ type: 'error', text1: traducirError(e.detail, nueva ? 'No se pudo añadir la bola' : 'No se pudo cambiar la bola') }); }
        } catch {
            Toast.show({ type: 'error', text1: 'Error de conexión' });
        } finally {
            setGuardando(false);
        }
    };
    const cambiarPedido = async (ruta: string, ok: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        try {
            const res = await fetch(`${API}${ruta}`, { method: 'PATCH', headers: { Authorization: `Bearer ${session?.access_token}` } });
            if (res.ok) { Toast.show({ type: 'success', text1: ok }); await cargarDetalleRef.current(); return; }
            const e = await res.json().catch(() => ({}));
            Toast.show({ type: 'error', text1: traducirError(e.detail, 'No se pudo hacer el cambio') });
        } catch {
            Toast.show({ type: 'error', text1: 'Error de conexión' });
        }
    };
    const quitarLinea = async (l: any) => {
        const n = l.cantidad || 1;
        const aviso = ((datos.productos || []).length === 1 && n === 1) ? ' Era la única bola, así que el pedido se anula.' : '';
        const pagado = datos.pedido.pagado ? ' El pedido está pagado: cambia el total y la hoja de gastos, pero sigue marcado como pagado.' : '';
        if (await confirmar(`¿Quitar una bola ${l.modelo}?${aviso}${pagado}`, 'Quitar bola', true))
            cambiarPedido(`/api/admin/pedidos/${pedidoId}/detalles/${l.id}/quitar`, 'Bola quitada');
    };
    const anularPedido = async () => {
        if (await confirmar('¿Anular este pedido? Se queda como Cancelado.', 'Anular pedido', true))
            cambiarPedido(`/api/admin/pedidos/${pedidoId}/anular`, 'Pedido anulado');
    };

    const panelBola = () => {
        const prodActual = catalogo.find(x => x.id === edit.producto);
        const chip = (activo: boolean) => ({ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: activo ? '#2563eb' : '#e2e8f0' });
        return (
            <View style={{ backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, marginTop: 8, borderWidth: 1, borderColor: '#e2e8f0', width: '100%' }}>
                <Text style={{ fontWeight: 'bold', color: '#334155', marginBottom: 6 }}>Figura</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {catalogo.flatMap(prod => (prod.modelos || []).map((m: any) => (
                        <Pressable key={`${prod.id}-${m.nombre}`} style={chip(edit.producto === prod.id && edit.modelo === figuraDe(m.nombre, prod.nombre))} onPress={() => elegirModelo(prod, m)}>
                            <Text style={{ color: edit.producto === prod.id && edit.modelo === figuraDe(m.nombre, prod.nombre) ? '#fff' : '#111827', fontWeight: 'bold', fontSize: 12 }}>{figuraDe(m.nombre, prod.nombre)}</Text>
                        </Pressable>
                    )))}
                </View>
                {(prodActual?.colores || []).length > 1 ? (
                    <>
                        <Text style={{ fontWeight: 'bold', color: '#334155', marginTop: 10, marginBottom: 6 }}>Color</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                            {prodActual.colores.map((c: string) => (
                                <Pressable key={c} style={chip(edit.color === c)} onPress={() => setEdit({ ...edit, color: c })}>
                                    <Text style={{ color: edit.color === c ? '#fff' : '#111827', fontWeight: 'bold', fontSize: 12 }}>{c}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </>
                ) : null}
                <Text style={{ fontWeight: 'bold', color: '#334155', marginTop: 10, marginBottom: 6 }}>Nombre de la bola</Text>
                <TextInput value={edit.nombre} onChangeText={(v) => setEdit({ ...edit, nombre: v })} maxLength={60} placeholder="Máximo 3 palabras"
                    style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, color: '#111827' }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
                    <Text style={{ fontWeight: 'bold', color: '#334155' }}>Cantidad</Text>
                    <Pressable style={chip(false)} onPress={() => setEdit({ ...edit, cantidad: Math.max(1, edit.cantidad - 1) })}><Text style={{ fontWeight: 'bold' }}>−</Text></Pressable>
                    <Text style={{ fontWeight: 'bold', color: '#111827' }}>{edit.cantidad}</Text>
                    <Pressable style={chip(false)} onPress={() => setEdit({ ...edit, cantidad: Math.min(50, edit.cantidad + 1) })}><Text style={{ fontWeight: 'bold' }}>+</Text></Pressable>
                </View>
                {edit.nombre.trim() ? (
                    <Image source={{ uri: `${API}/api/preview?modelo=${encodeURIComponent(edit.modelo)}&nombre=${encodeURIComponent(edit.nombre.trim())}` }}
                        style={{ width: 160, height: 160, backgroundColor: '#fff', borderRadius: 8, marginTop: 10 }} resizeMode="contain" />
                ) : null}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    <Pressable disabled={guardando} style={boton('#16a34a')} onPress={guardarEdicion}><Text style={{ color: '#fff', fontWeight: 'bold' }}>{guardando ? 'Guardando...' : edit.linea === 'nueva' ? 'Añadir bola' : 'Guardar cambios'}</Text></Pressable>
                    <Pressable style={boton('#64748b')} onPress={() => setEdit(null)}><Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancelar</Text></Pressable>
                </View>
            </View>
        );
    };

    const editable = datos?.pedido?.estado !== 'Cancelado';
    const anulable = datos?.pedido?.estado === 'Pendiente' && !datos?.pedido?.pagado;

    if (cargando) return <Text style={styles.mensajeEstado}>Cargando pedido...</Text>;
    if (!datos) return <Text style={styles.mensajeEstado}>Error al cargar el pedido (o no existe)</Text>;

    return (
        <ScrollView style={styles.contenedor}>
            <Pressable onPress={() => router.back()} style={styles.btnVolver}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name="arrow-back" size={18} color="#475569" /><Text style={styles.txtVolver}>Volver</Text></View>
            </Pressable>

            <Text style={styles.titulo}>Pedido de {etiquetaPedido(datos.usuario || datos.pedido.usuarios, datos.pedido.id, datos.numero)}</Text>
            <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: -8, marginBottom: 12 }}>#{datos.pedido.id.slice(0,8).toUpperCase()}</Text>
            {datos.pedido.user_id ? (
                <Pressable
                    style={{ backgroundColor: '#eff6ff', borderColor: '#2563eb', borderWidth: 1, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 10 }}
                    onPress={() => router.push(`/admin/usuarios/${datos.pedido.user_id}` as any)}
                >
                    <Text style={{ color: '#1d4ed8', fontWeight: 'bold' }}>Ver perfil de {(datos.usuario || datos.pedido.usuarios)?.nombre || 'usuario'}</Text>
                </Pressable>
            ) : null}
            <Text style={styles.totalInfo}>Importe Total: {euros(datos.pedido.total)}</Text>

            {datos.pedido.nota ? (
                <View style={{ backgroundColor: '#fef3c7', borderColor: '#f59e0b', borderWidth: 1, borderRadius: 10, padding: 12, marginVertical: 8 }}>
                    <Text style={{ fontWeight: 'bold', color: '#92400e', marginBottom: 4 }}>Nota del cliente</Text>
                    <Text style={{ color: '#78350f' }}>{datos.pedido.nota}</Text>
                </View>
            ) : null}

            <Pressable
                style={{ backgroundColor: '#111827', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignSelf: 'flex-start', marginVertical: 10 }}
                onPress={() => descargar3mf(null, `pedido_${String(datos.pedido.id).slice(0, 8)}_3mf.zip`)}
            >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Descargar todos los 3MF (zip)</Text>
            </Pressable>

            <Text style={styles.subtitulo}>Productos:</Text>
            
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {datos.productos && datos.productos.map((prod: any, index: number) => {
                const nombrada = !!prod.personalizacion && prod.personalizacion !== 'Sin texto';
                const hecha = (prod.hechas || 0) >= (prod.cantidad || 1);

                return (
                    <View key={index} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, width: edit?.linea === prod.id ? '100%' : 380, maxWidth: '100%' }}>
                        {nombrada ? (
                            <Image
                                source={{ uri: `${API}/api/preview?modelo=${encodeURIComponent(prod.modelo)}&nombre=${encodeURIComponent(prod.personalizacion)}` }}
                                style={{ width: 110, height: 110, backgroundColor: '#fff', borderRadius: 8 }}
                                resizeMode="contain"
                            />
                        ) : null}

                        <View style={{ flex: 1, gap: 2 }}>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }}>{prod.productos.nombre}</Text>
                            <Text style={styles.txtNormalSecundario}>{prod.modelo} · <Text style={styles.txtBold}>{prod.color}</Text></Text>
                            <Text style={styles.txtNormalSecundario}>Cantidad <Text style={styles.txtBold}>{prod.cantidad || 1}</Text> · <Text style={styles.txtBold}>{euros(prod.precio_unitario)}</Text></Text>

                            {nombrada ? (
                                <View style={styles.badgePersonalizado}>
                                    <Text style={styles.txtBadge}>"{prod.personalizacion}"</Text>
                                </View>
                            ) : (
                                <Text style={styles.txtNormal}>Sin personalizar</Text>
                            )}

                            {nombrada ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                                    <Pressable
                                        onPress={() => cambiarHechas(prod, hecha ? 0 : (prod.cantidad || 1))}
                                        accessibilityRole="checkbox"
                                        accessibilityState={{ checked: hecha }}
                                        accessibilityLabel="Bola hecha"
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                                    >
                                        <Ionicons name={hecha ? 'checkbox' : 'square-outline'} size={22} color={hecha ? '#15803d' : '#94a3b8'} />
                                        <Text style={styles.txtNormalSecundario}>Hecha</Text>
                                    </Pressable>
                                    {(prod.hechas || 0) > 0 && !hecha ? (
                                        <Text style={styles.txtNormalSecundario}>{prod.hechas} de {prod.cantidad}</Text>
                                    ) : null}
                                    <Pressable
                                        style={{ backgroundColor: '#2563eb', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 }}
                                        onPress={() => descargar3mf(prod.id, `${String(prod.modelo).replace(/[^A-Za-z0-9]+/g, '_')}_${String(prod.personalizacion).replace(/[^A-Za-z0-9]+/g, '_')}.3mf`)}
                                    >
                                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>3MF</Text>
                                    </Pressable>
                                </View>
                            ) : null}

                            {editable ? (
                                <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                                    <Pressable onPress={() => (edit?.linea === prod.id ? setEdit(null) : editarLinea(prod))} style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#dbeafe' }}>
                                        <Text style={{ color: '#1d4ed8', fontWeight: 'bold', fontSize: 12 }}>{edit?.linea === prod.id ? 'Cerrar' : 'Modificar'}</Text>
                                    </Pressable>
                                    <Pressable onPress={() => quitarLinea(prod)} style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#fee2e2' }}>
                                        <Text style={{ color: '#991b1b', fontWeight: 'bold', fontSize: 12 }}>Quitar una</Text>
                                    </Pressable>
                                </View>
                            ) : null}
                        </View>
                        {edit?.linea === prod.id ? <View style={{ width: '100%' }}>{panelBola()}</View> : null}
                    </View>
                );
            })}
            </View>

            {editable ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                    <Pressable style={boton('#16a34a')} onPress={() => (edit?.linea === 'nueva' ? setEdit(null) : nuevaBola())}><Text style={{ color: '#fff', fontWeight: 'bold' }}>{edit?.linea === 'nueva' ? 'Cerrar' : 'Añadir bola'}</Text></Pressable>
                    {anulable ? <Pressable style={boton('#dc2626')} onPress={anularPedido}><Text style={{ color: '#fff', fontWeight: 'bold' }}>Anular pedido</Text></Pressable> : null}
                </View>
            ) : null}
            {edit?.linea === 'nueva' ? panelBola() : null}
            {editable && !anulable ? (
                <Text style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>{datos.pedido.pagado ? 'Está pagado: puedes cambiar bolas, pero para anularlo entero no tiene que estar pagado.' : 'Puedes cambiar bolas. Para anularlo entero tiene que estar Pendiente.'}</Text>
            ) : null}
            {dialogo}
        </ScrollView>
    );
}