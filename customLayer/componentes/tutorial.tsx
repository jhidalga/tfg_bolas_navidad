import { createElement, useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tc } from '../lib/tema';

type Cue = { t: number; texto: string };

/**
 * Botón "Cómo pedir" que abre el vídeo tutorial a pantalla completa.
 * Hay un vídeo vertical para el móvil y otro horizontal para el ordenador
 * (public/tutorial_movil.mp4 y public/tutorial_pc.mp4). La voz la pone el
 * navegador: lee en voz alta los textos del vídeo con la voz en español del aparato.
 * Solo se enseña en la web.
 */
export default function Tutorial() {
    const [abierto, setAbierto] = useState(false);
    const [voz, setVoz] = useState(true);
    const [cues, setCues] = useState<Cue[]>([]);
    const { width } = useWindowDimensions();
    const tipo = width < 700 ? 'movil' : 'pc';
    const ultimo = useRef(-1);
    const vozRef = useRef(true);
    vozRef.current = voz;

    const parar = () => {
        try { (window as any).speechSynthesis?.cancel(); } catch {}
    };

    useEffect(() => {
        if (!abierto) { parar(); return; }
        ultimo.current = -1;
        fetch(`/tutorial_${tipo}.json`).then((r) => r.json()).then(setCues).catch(() => setCues([]));
        return parar;
    }, [abierto, tipo]);

    if (Platform.OS !== 'web') return null;

    const hablar = (texto: string) => {
        const s = (window as any).speechSynthesis;
        if (!s || !vozRef.current) return;
        s.cancel();
        const u = new (window as any).SpeechSynthesisUtterance(texto);
        u.lang = 'es-ES';
        const v = (s.getVoices() as any[]).find((x) => String(x.lang).toLowerCase().startsWith('es'));
        if (v) u.voice = v;
        u.rate = 1;
        s.speak(u);
    };

    const alAvanzar = (e: any) => {
        const t = e.target.currentTime;
        let idx = -1;
        for (let i = 0; i < cues.length; i++) if (cues[i].t <= t) idx = i;
        if (idx !== ultimo.current) {
            ultimo.current = idx;
            if (idx >= 0) hablar(cues[idx].texto); else parar();
        }
    };

    const cerrar = () => { parar(); setAbierto(false); };

    return (
        <View style={{ alignItems: 'center', marginTop: 14, marginBottom: 6 }}>
            <Pressable
                onPress={() => setAbierto(true)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, paddingHorizontal: 18, borderRadius: 24, borderWidth: 1.5, borderColor: tc('#e6c27a'), backgroundColor: 'rgba(255,255,255,0.08)' }}
            >
                <Ionicons name="play-circle" size={20} color={tc('#f1cf8a')} />
                <Text style={{ color: tc('#f1cf8a'), fontWeight: '700', fontSize: 15 }}>¿Cómo pedir? Ver tutorial</Text>
            </Pressable>

            <Modal visible={abierto} transparent animationType="fade" onRequestClose={cerrar}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
                    {createElement('video', {
                        key: tipo,
                        src: `/tutorial_${tipo}.mp4`,
                        controls: true,
                        autoPlay: true,
                        playsInline: true,
                        onTimeUpdate: alAvanzar,
                        onPause: parar,
                        onSeeking: () => { ultimo.current = -1; parar(); },
                        onEnded: parar,
                        style: { width: '100%', height: '100%', objectFit: 'contain', background: '#000' },
                    })}
                    <View style={{ position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Pressable onPress={() => { setVoz(!voz); if (voz) parar(); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 }}>
                            <Ionicons name={voz ? 'volume-high' : 'volume-mute'} size={18} color="#ffffff" />
                            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 }}>{voz ? 'Voz activada' : 'Voz apagada'}</Text>
                        </Pressable>
                        <Pressable onPress={cerrar} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 }}>
                            <Ionicons name="close" size={20} color="#ffffff" />
                            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 }}>Cerrar</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
