import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import { supabase } from '../lib/supabase';
import { tc } from '../lib/tema';

/**
 * Aviso para quien se registro antes de que existiera la casilla de comunicaciones.
 * Sale una vez la sesion esta iniciada y la cuenta no ha aceptado todavia.
 * "Acepto" lo guarda en la cuenta con la fecha. "Ahora no" lo cierra hasta la proxima vez que entre.
 */
export default function AvisoComunicaciones({ activo = true }: { activo?: boolean }) {
    const [visible, setVisible] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [cerradoAhora, setCerradoAhora] = useState(false);

    useEffect(() => {
        const revisar = (session: any) => {
            const acepta = session?.user?.user_metadata?.acepta_comunicaciones === true;
            setVisible(!!session && !acepta);
        };
        supabase.auth.getSession().then(({ data }) => revisar(data.session));
        const { data: oyente } = supabase.auth.onAuthStateChange((_evento, session) => revisar(session));
        return () => oyente.subscription.unsubscribe();
    }, []);

    const aceptar = async () => {
        setGuardando(true);
        const { error } = await supabase.auth.updateUser({ data: { acepta_comunicaciones: true, acepta_comunicaciones_fecha: new Date().toISOString() } });
        setGuardando(false);
        if (error) {
            Toast.show({ type: 'error', text1: 'No se pudo guardar', text2: 'Inténtalo de nuevo en un momento.' });
            return;
        }
        setVisible(false);
        Toast.show({ type: 'success', text1: 'Gracias', text2: 'Ya está guardado.' });
    };

    return (
        <Modal visible={activo && visible && !cerradoAhora} transparent animationType="fade" onRequestClose={() => setCerradoAhora(true)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                <View style={{ backgroundColor: tc('#fbf1de'), borderWidth: 1, borderColor: tc('#e3cfa5'), borderRadius: 14, padding: 22, width: '100%', maxWidth: 420 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: tc('#3b1a12'), marginBottom: 10 }}>Avisos sobre tus pedidos</Text>
                    <Text style={{ fontSize: 15, color: tc('#3b1a12'), lineHeight: 22, marginBottom: 20 }}>
                        Si hay alguna incidencia con tus pedidos, por ejemplo para confirmar un pedido o corregir un error, te escribiremos a tu correo. Solo lo usaremos para esto. ¿Aceptas recibir estos correos?
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
                        <Pressable disabled={guardando} onPress={() => setCerradoAhora(true)} style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: tc('#efdfc3') }}>
                            <Text style={{ color: tc('#3b1a12'), fontWeight: '600' }}>Ahora no</Text>
                        </Pressable>
                        <Pressable disabled={guardando} onPress={aceptar} style={{ paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8, backgroundColor: tc('#a52a2a'), minWidth: 90, alignItems: 'center' }}>
                            {guardando ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>Acepto</Text>}
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
