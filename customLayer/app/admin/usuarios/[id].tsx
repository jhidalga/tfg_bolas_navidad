import { View, Text, Pressable, ScrollView, ActivityIndicator, Platform, Linking, TextInput, Image, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import Toast from 'react-native-toast-message';
import { supabase } from '../../../lib/supabase';
import { euros, plural } from '../../../lib/formato';
import { useConfirmar } from '../../../componentes/confirmar';
import { traducirError } from '../../../lib/errores';

const API_URL = `${process.env.EXPO_PUBLIC_API_URL || ''}/api`;
const COLOR_ESTADO: Record<string, string> = { Pendiente: '#f59e0b', Completado: '#10b981', Entregado: '#3b82f6', Cancelado: '#ef4444' };

/** Texto de una linea para el correo: Reno marron con el nombre "Laura", 2 unidades. */
const textoLinea = (l: any) => {
    const nombre = l.personalizacion && l.personalizacion !== 'Sin texto' ? ` con el nombre "${l.personalizacion}"` : ' sin nombre';
    const n = l.cantidad || 1;
    return `- ${l.modelo} ${String(l.color || '').toLowerCase()}${nombre}${n > 1 ? `, ${n} unidades` : ''}`;
};

/** Abre el correo ya escrito. En la web abre Gmail, en el movil la app de correo. */
const abrirCorreo = (para: string, asunto: string, cuerpo: string) => {
    if (Platform.OS === 'web') {
        const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(para)}&su=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
        window.open(url, '_blank');
    } else {
        Linking.openURL(`mailto:${para}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`);
    }
};

const FIRMA = '\n\nUn saludo,\nDpto. Informática, 2º DAM\nIES Laguna de Tollón';

/**
 * Perfil de una persona para el administrador: sus datos, todos sus pedidos con el codigo
 * visible y un boton para escribirle un correo ya preparado. Los pedidos Pendientes sin pagar
 * se pueden anular o se les puede quitar una bola. Los pagados quedan protegidos.
 */
export default function PerfilUsuarioAdmin() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { confirmar, dialogo } = useConfirmar();
    const [datos, setDatos] = useState<any>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [catalogo, setCatalogo] = useState<any[]>([]);
    const [edit, setEdit] = useState<any>(null);
    const [correo, setCorreo] = useState<{ asunto: string; mensaje: string; responde_a?: string } | null>(null);
    const scrollHilo = useRef<ScrollView>(null);
    const [hilo, setHilo] = useState<{ cargando: boolean; error: string; correos: any[] }>({ cargando: false, error: '', correos: [] });
    const [envio, setEnvio] = useState<{ configurado: boolean; remitente: string | null } | null>(null);
    const [enviando, setEnviando] = useState(false);
    const [guardando, setGuardando] = useState(false);

    const cargar = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        try {
            const res = await fetch(`${API_URL}/admin/usuarios/${id}/perfil`, { headers: { Authorization: `Bearer ${session.access_token}` } });
            if (res.ok) setDatos(await res.json());
            else setError(res.status === 404 ? 'Esta persona no existe.' : 'No se pudo cargar el perfil.');
        } catch {
            setError('Error de conexión.');
        } finally {
            setCargando(false);
        }
    };
    useEffect(() => { cargar(); }, [id]);
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) return;
            fetch(`${API_URL}/admin/correo/estado`, { headers: { Authorization: `Bearer ${session.access_token}` } })
                .then(r => r.json()).then(setEnvio).catch(() => setEnvio({ configurado: false, remitente: null }));
        });
    }, []);
    /** Lee la conversacion por correo con esta persona (lo que se le envio y lo que ha contestado). */
    const cargarCorreos = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        setHilo(h => ({ ...h, cargando: true, error: '' }));
        try {
            const res = await fetch(`${API_URL}/admin/usuarios/${id}/correos`, { headers: { Authorization: `Bearer ${session.access_token}` } });
            const d = await res.json().catch(() => ({}));
            if (res.ok) setHilo({ cargando: false, error: '', correos: [...(d.correos || [])].sort((a: any, b: any) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()) });
            else setHilo({ cargando: false, error: typeof d.detail === 'string' ? d.detail : 'No se pudieron leer los correos.', correos: [] });
        } catch {
            setHilo({ cargando: false, error: 'Error de conexión.', correos: [] });
        }
    };
    useEffect(() => { if (envio?.configurado) cargarCorreos(); }, [id, envio?.configurado]);
    useEffect(() => {
        fetch(`${API_URL}/productos`).then(r => r.json()).then(d => Array.isArray(d) && setCatalogo(d.filter((x: any) => !x.deshabilitado))).catch(() => {});
    }, []);

    /** Empieza a editar una linea con sus valores actuales. */
    const editar = (p: any, l: any) => {
        const prod = catalogo.find(x => x.id === l.producto_id) || catalogo.find(x => (x.modelos || []).some((m: any) => m.nombre === l.modelo));
        setEdit({ pedido: p.id, linea: l.id, producto: prod?.id || l.producto_id, modelo: l.modelo, color: l.color,
                  nombre: l.personalizacion && l.personalizacion !== 'Sin texto' ? l.personalizacion : '', cantidad: l.cantidad || 1 });
    };
    /** Elegir una figura cambia tambien el producto y, si hace falta, el color. */
    const elegirModelo = (prod: any, m: any) => {
        const colores: string[] = prod.colores || [];
        setEdit((e: any) => ({ ...e, producto: prod.id, modelo: m.nombre, color: colores.length && !colores.includes(e.color) ? colores[0] : e.color }));
    };
    const guardarEdicion = async () => {
        if (!edit) return;
        const palabras = edit.nombre.trim().split(/\s+/).filter(Boolean).length;
        if (!palabras) { Toast.show({ type: 'error', text1: 'Escribe el nombre de la bola' }); return; }
        if (palabras > 3) { Toast.show({ type: 'error', text1: 'El nombre puede tener como máximo 3 palabras' }); return; }
        const { data: { session } } = await supabase.auth.getSession();
        setGuardando(true);
        try {
            const res = await fetch(`${API_URL}/admin/pedidos/${edit.pedido}/detalles/${edit.linea}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ producto_id: edit.producto, modelo: edit.modelo, color: edit.color, personalizacion: edit.nombre.trim(), cantidad: edit.cantidad }),
            });
            if (res.ok) { Toast.show({ type: 'success', text1: 'Bola cambiada' }); setEdit(null); await cargar(); }
            else { const e = await res.json().catch(() => ({})); Toast.show({ type: 'error', text1: traducirError(e.detail, 'No se pudo cambiar la bola') }); }
        } catch {
            Toast.show({ type: 'error', text1: 'Error de conexión' });
        } finally {
            setGuardando(false);
        }
    };

    /** Llama a un PATCH del admin y recarga el perfil. */
    const cambiar = async (ruta: string, ok: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        try {
            const res = await fetch(`${API_URL}${ruta}`, { method: 'PATCH', headers: { Authorization: `Bearer ${session?.access_token}` } });
            if (res.ok) { Toast.show({ type: 'success', text1: ok }); await cargar(); return; }
            const e = await res.json().catch(() => ({}));
            Toast.show({ type: 'error', text1: traducirError(e.detail, 'No se pudo hacer el cambio') });
        } catch {
            Toast.show({ type: 'error', text1: 'Error de conexión' });
        }
    };

    const anular = async (p: any) => {
        if (await confirmar(`¿Anular el pedido ${p.codigo}? Se queda como Cancelado.`, 'Anular pedido', true))
            cambiar(`/admin/pedidos/${p.id}/anular`, 'Pedido anulado');
    };
    const quitar = async (p: any, l: any) => {
        const n = l.cantidad || 1;
        const aviso = (p.lineas.length === 1 && n === 1) ? ' Era la única bola, así que el pedido se anula.' : '';
        if (await confirmar(`¿Quitar una bola ${l.modelo} de ${p.codigo}?${aviso}`, 'Quitar bola', true))
            cambiar(`/admin/pedidos/${p.id}/detalles/${l.id}/quitar`, 'Bola quitada');
    };

    const nombrePila = () => String(datos.usuario.nombre || '').split(' ')[0] || '';
    /** Abre la ventana de redactar con el texto ya escrito. La firma la pone el servidor al enviar. */
    const correoGeneral = () => setCorreo({
        asunto: 'Tus pedidos de adornos navideños',
        mensaje: `Hola ${nombrePila()}:\n\nTe escribo por tus pedidos de adornos navideños. Quería comprobar contigo que todo está bien.`,
    });
    const correoPedido = (p: any) => setCorreo({
        asunto: `Tu pedido ${p.codigo} de adornos navideños`,
        mensaje: `Hola ${nombrePila()}:\n\nHemos visto que has hecho el pedido ${p.codigo} con estos adornos:\n${p.lineas.map(textoLinea).join('\n')}\n\nTotal: ${euros(p.total)}.\n\n¿Es correcto o te has equivocado? Si hay que cambiar algo, respóndeme a este correo y lo arreglamos.`,
    });
    /** Contesta a lo ultimo que escribio la persona, dentro del mismo hilo. */
    const responder = () => {
        const ultimoSuyo = [...hilo.correos].reverse().find(c => !c.mio) || hilo.correos[hilo.correos.length - 1];
        const asunto = String(ultimoSuyo?.asunto || 'Tus pedidos de adornos navideños').replace(/^(re:\s*)+/i, '');
        setCorreo({ asunto: `Re: ${asunto}`, mensaje: `Hola ${nombrePila()}:\n\n`, responde_a: ultimoSuyo?.id || undefined });
    };
    const horaCorreo = (iso: string) => { try { return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
    const diaCorreo = (iso: string) => {
        try {
            const d = new Date(iso), hoy = new Date(), ayer = new Date(); ayer.setDate(hoy.getDate() - 1);
            if (d.toDateString() === hoy.toDateString()) return 'Hoy';
            if (d.toDateString() === ayer.toDateString()) return 'Ayer';
            return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
        } catch { return ''; }
    };
    /** En las burbujas propias se quita la firma, que ya la ve quien recibe el correo. */
    const textoBurbuja = (c: any) => { const t = String(c.texto || ''); return (c.mio ? t.split(/\n\s*Atentamente,/)[0] : t).trim() || '(sin texto)'; };
    const enviarCorreo = async () => {
        if (!correo) return;
        const { data: { session } } = await supabase.auth.getSession();
        setEnviando(true);
        try {
            const res = await fetch(`${API_URL}/admin/usuarios/${id}/correo`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ asunto: correo.asunto.trim(), mensaje: correo.mensaje.trim(), responde_a: correo.responde_a || null }),
            });
            if (res.ok) { Toast.show({ type: 'success', text1: 'Correo enviado', text2: datos.usuario.email }); setCorreo(null); setTimeout(cargarCorreos, 2500); return; }
            const e = await res.json().catch(() => ({}));
            Toast.show({ type: 'error', text1: 'No se pudo enviar', text2: typeof e.detail === 'string' ? e.detail : 'Revisa el asunto y el mensaje.' });
        } catch {
            Toast.show({ type: 'error', text1: 'Error de conexión' });
        } finally {
            setEnviando(false);
        }
    };

    if (cargando) return <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 50 }} />;
    if (!datos) return <Text style={{ margin: 30, color: '#475569' }}>{error || 'No se pudo cargar el perfil.'}</Text>;

    const u = datos.usuario;
    const activos = datos.pedidos.filter((p: any) => p.estado !== 'Cancelado');
    const boton = (color: string) => ({ backgroundColor: color, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 8 });

    return (
        <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }} contentContainerStyle={{ padding: 20, alignItems: 'center' }}>
            {dialogo}
            <Modal visible={!!correo} transparent animationType="fade" onRequestClose={() => !enviando && setCorreo(null)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
                    <ScrollView style={{ width: '100%', maxWidth: 560, maxHeight: '95%' }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
                        <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 18 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 }}>Enviar un correo</Text>
                            <Text style={{ fontWeight: 'bold', color: '#334155', marginBottom: 4 }}>Para</Text>
                            <Text style={{ color: '#1e293b', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 10 }}>{datos.usuario.nombre} · {datos.usuario.email}</Text>
                            <Text style={{ fontWeight: 'bold', color: '#334155', marginTop: 12, marginBottom: 4 }}>Asunto</Text>
                            <TextInput value={correo?.asunto || ''} onChangeText={(v) => setCorreo({ ...(correo as any), asunto: v })} maxLength={120}
                                style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, color: '#111827' }} />
                            <Text style={{ fontWeight: 'bold', color: '#334155', marginTop: 12, marginBottom: 4 }}>Mensaje</Text>
                            <TextInput value={correo?.mensaje || ''} onChangeText={(v) => setCorreo({ ...(correo as any), mensaje: v })} multiline maxLength={3000}
                                style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, color: '#111827', minHeight: 220, textAlignVertical: 'top' }} />
                            <Text style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>
                                {envio?.configurado
                                    ? `Sale desde ${envio.remitente} con el diseño de la web y la firma del departamento. Si responde, te llega a ese correo.`
                                    : 'El envío desde la web aún no está configurado en Railway. Mientras tanto puedes abrir el correo en Gmail.'}
                            </Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                                {envio?.configurado ? (
                                    <Pressable disabled={enviando} style={[boton('#16a34a'), enviando && { opacity: 0.6 }]} onPress={enviarCorreo}>
                                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>{enviando ? 'Enviando...' : 'Enviar'}</Text>
                                    </Pressable>
                                ) : (
                                    <Pressable style={boton('#2563eb')} onPress={() => correo && abrirCorreo(datos.usuario.email, correo.asunto, correo.mensaje + FIRMA)}>
                                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Abrir en Gmail</Text>
                                    </Pressable>
                                )}
                                <Pressable disabled={enviando} style={boton('#64748b')} onPress={() => setCorreo(null)}><Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancelar</Text></Pressable>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </Modal>
            <View style={{ width: '100%', maxWidth: 900 }}>
                <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                    <Ionicons name="arrow-back" size={18} color="#475569" /><Text style={{ color: '#475569', fontWeight: '600' }}>Volver</Text>
                </Pressable>

                <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#e2e8f0' }}>
                    <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#0f172a' }}>{u.nombre || 'Sin nombre'}</Text>
                    <Text style={{ color: '#475569', marginTop: 4 }}>{u.email}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                        <Text style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, fontWeight: 'bold', fontSize: 12 }}>{u.curso || 'Sin curso'}</Text>
                        <Text style={{ backgroundColor: '#f1f5f9', color: '#475569', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, fontWeight: 'bold', fontSize: 12 }}>{u.profesor ? 'Profesor' : 'Alumno'}</Text>
                        {u.administrador ? <Text style={{ backgroundColor: '#ede9fe', color: '#6d28d9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, fontWeight: 'bold', fontSize: 12 }}>Admin</Text> : null}
                        <Text style={{ backgroundColor: '#f1f5f9', color: '#475569', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, fontWeight: 'bold', fontSize: 12 }}>{plural(activos.length, 'pedido', 'pedidos')}</Text>
                    </View>
                    <Pressable style={[boton('#2563eb'), { alignSelf: 'flex-start', marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }]} onPress={correoGeneral}>
                        <Ionicons name="mail" size={16} color="#fff" /><Text style={{ color: '#fff', fontWeight: 'bold' }}>Enviar un correo</Text>
                    </Pressable>
                </View>

                {envio?.configurado ? (
                    <View style={{ marginTop: 22 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0f172a' }}>Correos</Text>
                            <Pressable onPress={cargarCorreos} disabled={hilo.cargando} accessibilityLabel="Actualizar correos" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: hilo.cargando ? 0.5 : 1 }}>
                                <Ionicons name="refresh" size={16} color="#475569" /><Text style={{ color: '#475569', fontWeight: '600' }}>{hilo.cargando ? 'Leyendo...' : 'Actualizar'}</Text>
                            </Pressable>
                        </View>
                        {hilo.error ? <Text style={{ color: '#b91c1c', marginBottom: 8 }}>{hilo.error}</Text> : null}
                        {!hilo.error && !hilo.cargando && hilo.correos.length === 0 ? <Text style={{ color: '#64748b' }}>Todavía no habéis intercambiado correos.</Text> : null}
                        {hilo.correos.length > 0 ? (
                            <View style={{ backgroundColor: '#eae6df', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' }}>
                                <ScrollView ref={scrollHilo} style={{ maxHeight: 480 }} contentContainerStyle={{ padding: 12 }} nestedScrollEnabled
                                    onContentSizeChange={() => scrollHilo.current?.scrollToEnd({ animated: false })}>
                                    {hilo.correos.map((c: any, i: number) => {
                                        const anterior = hilo.correos[i - 1];
                                        const nuevoDia = !anterior || diaCorreo(anterior.fecha) !== diaCorreo(c.fecha) || new Date(c.fecha).toDateString() !== new Date(anterior.fecha).toDateString();
                                        const nuevoAsunto = !anterior || String(anterior.asunto).replace(/^(re:\s*)+/i, '') !== String(c.asunto).replace(/^(re:\s*)+/i, '');
                                        return (
                                            <View key={c.id || i}>
                                                {nuevoDia ? (
                                                    <Text style={{ alignSelf: 'center', backgroundColor: '#fff', color: '#475569', fontSize: 12, fontWeight: '600', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginVertical: 8 }}>{diaCorreo(c.fecha)}</Text>
                                                ) : null}
                                                {nuevoAsunto ? (
                                                    <Text style={{ alignSelf: 'center', color: '#64748b', fontSize: 11, marginBottom: 6, textAlign: 'center' }}>{String(c.asunto).replace(/^(re:\s*)+/i, '')}</Text>
                                                ) : null}
                                                <View style={{ alignSelf: c.mio ? 'flex-end' : 'flex-start', maxWidth: '82%', backgroundColor: c.mio ? '#d9fdd3' : '#fff', borderRadius: 12, borderTopRightRadius: c.mio ? 2 : 12, borderTopLeftRadius: c.mio ? 12 : 2, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 6 }}>
                                                    <Text style={{ color: '#111b21' }}>{textoBurbuja(c)}</Text>
                                                    <Text style={{ alignSelf: 'flex-end', fontSize: 11, color: '#667781', marginTop: 4 }}>{horaCorreo(c.fecha)}</Text>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        ) : null}
                        {hilo.correos.length > 0 ? (
                            <Pressable style={[boton('#2563eb'), { alignSelf: 'flex-start', marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }]} onPress={responder}>
                                <Ionicons name="return-down-back" size={16} color="#fff" /><Text style={{ color: '#fff', fontWeight: 'bold' }}>Responder</Text>
                            </Pressable>
                        ) : null}
                    </View>
                ) : null}

                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginTop: 22, marginBottom: 10 }}>Pedidos</Text>
                {datos.pedidos.length === 0 ? <Text style={{ color: '#64748b' }}>Todavía no ha hecho ningún pedido.</Text> : null}

                {datos.pedidos.map((p: any) => {
                    const editable = p.estado === 'Pendiente' && !p.pagado;
                    return (
                        <View key={p.id} style={{ backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12, opacity: p.estado === 'Cancelado' ? 0.65 : 1 }}>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                                <Text style={{ fontWeight: 'bold', color: '#0f172a', fontSize: 16 }}>{p.codigo}</Text>
                                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                    <Text style={{ backgroundColor: COLOR_ESTADO[p.estado] || '#64748b', color: '#fff', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, fontWeight: 'bold', fontSize: 12 }}>{p.estado}</Text>
                                    <Text style={{ backgroundColor: p.pagado ? '#dcfce7' : '#fee2e2', color: p.pagado ? '#166534' : '#991b1b', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, fontWeight: 'bold', fontSize: 12 }}>{p.pagado ? 'Pagado' : 'Sin pagar'}</Text>
                                </View>
                            </View>
                            <Text style={{ color: '#64748b', marginTop: 4, fontSize: 13 }}>
                                {p.creado ? new Date(p.creado).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''} · {euros(p.total)}
                            </Text>
                            {p.nota ? <Text style={{ color: '#78350f', backgroundColor: '#fef3c7', borderRadius: 8, padding: 8, marginTop: 8 }}>Nota: {p.nota}</Text> : null}

                            <View style={{ marginTop: 10 }}>
                                {p.lineas.map((l: any) => (
                                    <View key={l.id} style={{ paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                                            <Text style={{ color: '#1e293b', flex: 1 }}>
                                                {l.modelo} · {l.color}{l.personalizacion && l.personalizacion !== 'Sin texto' ? ` · "${l.personalizacion}"` : ''}{(l.cantidad || 1) > 1 ? ` · x${l.cantidad}` : ''}
                                            </Text>
                                            {editable ? (
                                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                                    <Pressable onPress={() => (edit?.linea === l.id ? setEdit(null) : editar(p, l))} style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#dbeafe' }}>
                                                        <Text style={{ color: '#1d4ed8', fontWeight: 'bold', fontSize: 12 }}>{edit?.linea === l.id ? 'Cerrar' : 'Modificar'}</Text>
                                                    </Pressable>
                                                    <Pressable onPress={() => quitar(p, l)} style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#fee2e2' }}>
                                                        <Text style={{ color: '#991b1b', fontWeight: 'bold', fontSize: 12 }}>Quitar una</Text>
                                                    </Pressable>
                                                </View>
                                            ) : null}
                                        </View>
                                        {edit?.linea === l.id ? (() => {
                                            const prodActual = catalogo.find(x => x.id === edit.producto);
                                            const chip = (activo: boolean) => ({ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: activo ? '#2563eb' : '#e2e8f0' });
                                            return (
                                                <View style={{ backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, marginTop: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
                                                    <Text style={{ fontWeight: 'bold', color: '#334155', marginBottom: 6 }}>Figura</Text>
                                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                                        {catalogo.flatMap(prod => (prod.modelos || []).map((m: any) => (
                                                            <Pressable key={`${prod.id}-${m.nombre}`} style={chip(edit.producto === prod.id && edit.modelo === m.nombre)} onPress={() => elegirModelo(prod, m)}>
                                                                <Text style={{ color: edit.producto === prod.id && edit.modelo === m.nombre ? '#fff' : '#111827', fontWeight: 'bold', fontSize: 12 }}>{m.nombre}</Text>
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
                                                        <Image source={{ uri: `${process.env.EXPO_PUBLIC_API_URL || ''}/api/preview?modelo=${encodeURIComponent(edit.modelo)}&nombre=${encodeURIComponent(edit.nombre.trim())}` }}
                                                            style={{ width: 160, height: 160, backgroundColor: '#fff', borderRadius: 8, marginTop: 10 }} resizeMode="contain" />
                                                    ) : null}
                                                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                                                        <Pressable disabled={guardando} style={boton('#16a34a')} onPress={guardarEdicion}><Text style={{ color: '#fff', fontWeight: 'bold' }}>{guardando ? 'Guardando...' : 'Guardar cambios'}</Text></Pressable>
                                                        <Pressable style={boton('#64748b')} onPress={() => setEdit(null)}><Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancelar</Text></Pressable>
                                                    </View>
                                                </View>
                                            );
                                        })() : null}
                                    </View>
                                ))}
                            </View>

                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                                <Pressable style={boton('#111827')} onPress={() => router.push(`/admin/pedidos/${p.id}` as any)}><Text style={{ color: '#fff', fontWeight: 'bold' }}>Ver pedido</Text></Pressable>
                                <Pressable style={boton('#2563eb')} onPress={() => correoPedido(p)}><Text style={{ color: '#fff', fontWeight: 'bold' }}>Preguntar por este pedido</Text></Pressable>
                                {editable ? <Pressable style={boton('#dc2626')} onPress={() => anular(p)}><Text style={{ color: '#fff', fontWeight: 'bold' }}>Anular pedido</Text></Pressable> : null}
                            </View>
                            {!editable && p.estado !== 'Cancelado' ? (
                                <Text style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>{p.pagado ? 'Está pagado, no se puede cambiar.' : 'Ya no está Pendiente, no se puede cambiar.'}</Text>
                            ) : null}
                        </View>
                    );
                })}
            </View>
        </ScrollView>
    );
}
