import { createElement, useState } from 'react';
import { Modal, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tc } from '../lib/tema';

/**
 * Botón "Cómo pedir" que abre el vídeo tutorial a pantalla completa.
 * Hay un vídeo vertical para el móvil y otro horizontal para el ordenador
 * (public/tutorial_movil.mp4 y public/tutorial_pc.mp4, o con otro prefijo como tutorial_admin). Los vídeos ya llevan
 * subtítulos, voz y música de fondo. Solo se enseña en la web.
 */
export default function Tutorial({ prefijo = 'tutorial', texto = '¿Cómo pedir? Ver tutorial', admin = false }: { prefijo?: string; texto?: string; admin?: boolean }) {
    const [abierto, setAbierto] = useState(false);
    const { width } = useWindowDimensions();
    const tipo = width < 700 ? 'movil' : 'pc';

    if (Platform.OS !== 'web') return null;

    return (
        <View style={{ alignItems: admin ? 'flex-start' : 'center', marginTop: admin ? 14 : 14, marginBottom: admin ? 4 : 6, marginLeft: admin ? (width < 700 ? 20 : 30) : 0 }}>
            <Pressable
                onPress={() => setAbierto(true)}
                style={admin
                    ? { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#3b82f6' }
                    : { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, paddingHorizontal: 18, borderRadius: 24, borderWidth: 1.5, borderColor: tc('#e6c27a'), backgroundColor: 'rgba(255,255,255,0.08)' }}
            >
                <Ionicons name="play-circle" size={20} color={admin ? '#ffffff' : tc('#f1cf8a')} />
                <Text style={{ color: admin ? '#ffffff' : tc('#f1cf8a'), fontWeight: '700', fontSize: 15 }}>{texto}</Text>
            </Pressable>

            <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
                    {createElement('video', {
                        key: tipo,
                        src: `/${prefijo}_${tipo}.mp4`,
                        controls: true,
                        autoPlay: true,
                        playsInline: true,
                        style: { width: '100%', height: '100%', objectFit: 'contain', background: '#000' },
                    })}
                    <View style={{ position: 'absolute', top: 14, right: 14 }}>
                        <Pressable onPress={() => setAbierto(false)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 }}>
                            <Ionicons name="close" size={20} color="#ffffff" />
                            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 }}>Cerrar</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
