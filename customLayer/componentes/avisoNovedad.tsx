import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { tc } from '../lib/tema';

const API_URL = `${process.env.EXPO_PUBLIC_API_URL || ''}/api`;
const CLAVE = 'aviso_visto';

function yaVisto(id: string): boolean {
    try { return typeof localStorage !== 'undefined' && localStorage.getItem(CLAVE) === id; } catch { return false; }
}

function marcarVisto(id: string) {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(CLAVE, id); } catch { /* sin almacenamiento: saldra otra vez */ }
}

/**
 * Aviso que publica un administrador desde el panel. Sale una sola vez en cada navegador:
 * al cerrarlo se guarda su id y no vuelve a salir hasta que haya otro aviso distinto.
 * `activo` lo apaga mientras haya otra ventana abierta (bienvenida, consentimiento).
 */
export default function AvisoNovedad({ activo = true }: { activo?: boolean }) {
    const [aviso, setAviso] = useState<{ id: string; titulo: string; texto: string } | null>(null);
    const [cerrado, setCerrado] = useState(false);

    useEffect(() => {
        let vivo = true;
        fetch(`${API_URL}/avisos/activo`)
            .then(r => r.json())
            .then(d => { if (vivo && d?.aviso && !yaVisto(String(d.aviso.id))) setAviso(d.aviso); })
            .catch(() => { /* sin aviso */ });
        return () => { vivo = false; };
    }, []);

    const cerrar = () => {
        if (aviso) marcarVisto(String(aviso.id));
        setCerrado(true);
    };

    return (
        <Modal visible={activo && !!aviso && !cerrado} transparent animationType="fade" onRequestClose={cerrar}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                <View style={{ backgroundColor: tc('#fbf1de'), borderWidth: 1, borderColor: tc('#e3cfa5'), borderRadius: 14, padding: 22, width: '100%', maxWidth: 420 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: tc('#3b1a12'), marginBottom: 10 }}>{aviso?.titulo}</Text>
                    <Text style={{ fontSize: 15, color: tc('#3b1a12'), lineHeight: 22, marginBottom: 20 }}>{aviso?.texto}</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                        <Pressable onPress={cerrar} style={{ paddingVertical: 10, paddingHorizontal: 22, borderRadius: 8, backgroundColor: tc('#a52a2a') }}>
                            <Text style={{ color: '#fff', fontWeight: '600' }}>Entendido</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
