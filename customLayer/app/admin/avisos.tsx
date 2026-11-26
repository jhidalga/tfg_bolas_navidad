import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import Toast from 'react-native-toast-message';
import { supabase } from '../../lib/supabase';
import { traducirError } from '../../lib/errores';
import { useEsMovilWeb } from '../../lib/responsive';

const API_URL = `${process.env.EXPO_PUBLIC_API_URL || ''}/api`;

type Aviso = { id: string; titulo: string; texto: string; activo: boolean; creado: string };

/** Avisos emergentes: se publican aqui y a cada persona le salen una sola vez al entrar en la web. */
export default function AvisosAdmin() {
    const movil = useEsMovilWeb();
    const [avisos, setAvisos] = useState<Aviso[]>([]);
    const [cargando, setCargando] = useState(true);
    const [titulo, setTitulo] = useState('');
    const [texto, setTexto] = useState('');
    const [enviando, setEnviando] = useState(false);

    const llamar = async (ruta: string, metodo: string, cuerpo?: any) => {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${API_URL}${ruta}`, {
            method: metodo,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
            body: cuerpo ? JSON.stringify(cuerpo) : undefined,
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(traducirError(d.detail, 'No se pudo completar'));
        return d;
    };

    const cargar = async () => {
        try { setAvisos(await llamar('/admin/avisos', 'GET')); }
        catch (e: any) { Toast.show({ type: 'error', text1: e.message }); }
        setCargando(false);
    };
    useEffect(() => { cargar(); }, []);

    const publicar = async () => {
        if (!titulo.trim() || !texto.trim() || enviando) return;
        setEnviando(true);
        try {
            await llamar('/admin/avisos', 'POST', { titulo, texto });
            setTitulo(''); setTexto('');
            Toast.show({ type: 'success', text1: 'Aviso publicado', text2: 'Le saldrá una vez a cada persona al entrar.' });
            await cargar();
        } catch (e: any) { Toast.show({ type: 'error', text1: e.message }); }
        setEnviando(false);
    };

    const cambiar = async (a: Aviso, activo: boolean) => {
        try {
            await llamar(`/admin/avisos/${a.id}`, 'PATCH', { activo });
            Toast.show({ type: 'success', text1: activo ? 'Aviso activado' : 'Aviso desactivado' });
            await cargar();
        } catch (e: any) { Toast.show({ type: 'error', text1: e.message }); }
    };

    const borrar = async (a: Aviso) => {
        try { await llamar(`/admin/avisos/${a.id}`, 'DELETE'); await cargar(); }
        catch (e: any) { Toast.show({ type: 'error', text1: e.message }); }
    };

    const campo = { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 15, color: '#0f172a' } as const;

    return (
        <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }} contentContainerStyle={{ padding: movil ? 14 : 28 }}>
            <Text style={{ fontSize: movil ? 22 : 28, fontWeight: 'bold', color: '#1e293b' }}>Avisos de la web</Text>
            <Text style={{ color: '#64748b', marginTop: 4, marginBottom: 18, maxWidth: 640 }}>
                Escribe un aviso y se mostrará como ventana a cada persona la próxima vez que entre. Le sale una sola vez. Solo hay un aviso activo a la vez.
            </Text>

            <View style={{ backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, maxWidth: 640, gap: 8 }}>
                <Text style={{ fontWeight: 'bold', color: '#1e293b' }}>Nuevo aviso</Text>
                <TextInput value={titulo} onChangeText={setTitulo} maxLength={80} placeholder="Título" placeholderTextColor="#94a3b8" style={campo} />
                <TextInput value={texto} onChangeText={setTexto} maxLength={600} multiline numberOfLines={4} placeholder="Texto del aviso" placeholderTextColor="#94a3b8" style={[campo, { minHeight: 90, textAlignVertical: 'top' }]} />
                <Text style={{ color: '#94a3b8', fontSize: 12 }}>{texto.length}/600</Text>
                <Pressable onPress={publicar} disabled={!titulo.trim() || !texto.trim() || enviando}
                    style={{ alignSelf: 'flex-start', backgroundColor: !titulo.trim() || !texto.trim() ? '#94a3b8' : '#2563eb', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 }}>
                    {enviando ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Publicar aviso</Text>}
                </Pressable>
            </View>

            <Text style={{ fontWeight: 'bold', color: '#1e293b', marginTop: 24, marginBottom: 8 }}>Avisos anteriores</Text>
            {cargando ? <ActivityIndicator color="#3b82f6" /> : avisos.length === 0 ? <Text style={{ color: '#64748b' }}>Todavía no hay avisos.</Text> : (
                <View style={{ gap: 10, maxWidth: 640 }}>
                    {avisos.map(a => (
                        <View key={a.id} style={{ backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: a.activo ? '#86efac' : '#e2e8f0', padding: 14, gap: 4 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <Text style={{ fontWeight: 'bold', color: '#0f172a', fontSize: 16, flexShrink: 1 }}>{a.titulo}</Text>
                                {a.activo ? <View style={{ backgroundColor: '#dcfce7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}><Text style={{ color: '#15803d', fontWeight: 'bold', fontSize: 12 }}>Activo</Text></View> : null}
                            </View>
                            <Text style={{ color: '#475569' }}>{a.texto}</Text>
                            <Text style={{ color: '#94a3b8', fontSize: 12 }}>{new Date(a.creado).toLocaleString('es-ES')}</Text>
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                                <Pressable onPress={() => cambiar(a, !a.activo)} style={{ backgroundColor: a.activo ? '#64748b' : '#16a34a', paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8 }}>
                                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>{a.activo ? 'Desactivar' : 'Volver a mostrar a todos'}</Text>
                                </Pressable>
                                <Pressable onPress={() => borrar(a)} style={{ backgroundColor: '#fee2e2', paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8 }}>
                                    <Text style={{ color: '#b91c1c', fontWeight: 'bold', fontSize: 13 }}>Borrar</Text>
                                </Pressable>
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </ScrollView>
    );
}
