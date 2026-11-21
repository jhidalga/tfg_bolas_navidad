import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import Toast from 'react-native-toast-message';
import { supabase } from '../../lib/supabase';
import { traducirError } from '../../lib/errores';
import { useEsMovilWeb } from '../../lib/responsive';
import { TEMAS, ORDEN_TEMAS, NombreTema, aplicarTemaLocal } from '../../lib/tema';

const API_URL = `${process.env.EXPO_PUBLIC_API_URL || ''}/api`;

/** Dibujo pequeño de como queda cada tema: barra de arriba, tarjetas y boton. */
function Muestra({ n }: { n: NombreTema }) {
    const m = TEMAS[n].muestra;
    return (
        <View style={{ height: 120, borderRadius: 10, backgroundColor: m.fondo, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' }}>
            <View style={{ height: 18, backgroundColor: n === 'normal' ? '#fff' : m.acento, opacity: n === 'normal' ? 1 : 0.55, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.08)' }} />
            <View style={{ flexDirection: 'row', gap: 8, padding: 10 }}>
                {[0, 1].map(i => (
                    <View key={i} style={{ flex: 1, height: 70, borderRadius: 8, backgroundColor: m.tarjeta, padding: 7, justifyContent: 'space-between' }}>
                        <View style={{ height: 6, width: '70%', borderRadius: 3, backgroundColor: m.texto, opacity: 0.7 }} />
                        <View style={{ height: 14, borderRadius: 5, backgroundColor: m.acento }} />
                    </View>
                ))}
            </View>
        </View>
    );
}

/** Elegir el tema de la web: lo ve todo el mundo al entrar. */
export default function TemaAdmin() {
    const movil = useEsMovilWeb();
    const [activo, setActivo] = useState<NombreTema | null>(null);
    const [guardando, setGuardando] = useState<NombreTema | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_URL}/tema`);
                const d = await res.json();
                setActivo(TEMAS[d.tema as NombreTema] ? d.tema : 'navidad');
            } catch { setActivo('navidad'); }
        })();
    }, []);

    const elegir = async (n: NombreTema) => {
        if (n === activo || guardando) return;
        setGuardando(n);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${API_URL}/admin/tema`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify({ tema: n }),
            });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) { Toast.show({ type: 'error', text1: traducirError(d.detail, 'No se pudo cambiar el tema') }); setGuardando(null); return; }
            setActivo(n);
            Toast.show({ type: 'success', text1: `Tema ${TEMAS[n].etiqueta} activado` });
            setTimeout(() => aplicarTemaLocal(n), 700);
        } catch {
            Toast.show({ type: 'error', text1: 'Error de conexión' });
            setGuardando(null);
        }
    };

    return (
        <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }} contentContainerStyle={{ padding: movil ? 14 : 28 }}>
            <Text style={{ fontSize: movil ? 22 : 28, fontWeight: 'bold', color: '#1e293b' }}>Tema de la web</Text>
            <Text style={{ color: '#64748b', marginTop: 4, marginBottom: 18, maxWidth: 640 }}>
                Elige cómo se ve la tienda para todos los usuarios. El cambio se nota al volver a entrar o recargar la página. El panel de administración no cambia.
            </Text>
            {activo === null ? <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 30 }} /> : (
                <View style={{ flexDirection: movil ? 'column' : 'row', flexWrap: 'wrap', gap: 16 }}>
                    {ORDEN_TEMAS.map(n => {
                        const t = TEMAS[n]; const es = n === activo;
                        return (
                            <View key={n} style={{ width: movil ? '100%' : 280, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 2, borderColor: es ? '#3b82f6' : '#e2e8f0', gap: 10 }}>
                                <Muestra n={n} />
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#1e293b' }}>{t.etiqueta}</Text>
                                    {es && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Ionicons name="checkmark-circle" size={18} color="#16a34a" /><Text style={{ color: '#16a34a', fontWeight: '700', fontSize: 13 }}>Activo</Text></View>}
                                </View>
                                <Text style={{ color: '#64748b', fontSize: 13, minHeight: 36 }}>{t.descripcion}</Text>
                                <Pressable onPress={() => elegir(n)} disabled={es || !!guardando}
                                    style={{ backgroundColor: es ? '#e2e8f0' : '#3b82f6', paddingVertical: 11, borderRadius: 10, alignItems: 'center', opacity: guardando && guardando !== n ? 0.5 : 1 }}>
                                    <Text style={{ color: es ? '#64748b' : '#fff', fontWeight: '700' }}>{guardando === n ? 'Guardando...' : es ? 'Tema actual' : 'Activar este tema'}</Text>
                                </Pressable>
                            </View>
                        );
                    })}
                </View>
            )}
        </ScrollView>
    );
}
