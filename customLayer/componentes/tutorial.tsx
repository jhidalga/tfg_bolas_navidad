import { createElement, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tc } from '../lib/tema';

/**
 * Botón "Cómo pedir" que despliega el vídeo tutorial y lo reproduce.
 * El vídeo está en public/tutorial.mp4. Solo se enseña en la web.
 */
export default function Tutorial() {
    const [abierto, setAbierto] = useState(false);
    if (Platform.OS !== 'web') return null;

    return (
        <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center', alignItems: 'center', marginTop: 14, marginBottom: 6 }}>
            <Pressable
                onPress={() => setAbierto(!abierto)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, paddingHorizontal: 18, borderRadius: 24, borderWidth: 1.5, borderColor: tc('#e6c27a'), backgroundColor: 'rgba(255,255,255,0.08)' }}
            >
                <Ionicons name={abierto ? 'chevron-up' : 'play-circle'} size={20} color={tc('#f1cf8a')} />
                <Text style={{ color: tc('#f1cf8a'), fontWeight: '700', fontSize: 15 }}>
                    {abierto ? 'Ocultar tutorial' : '¿Cómo pedir? Ver tutorial'}
                </Text>
            </Pressable>

            {abierto && (
                <View style={{ width: '100%', marginTop: 12, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: tc('#e6c27a'), backgroundColor: '#000', alignItems: 'center' }}>
                    {createElement('video', {
                        src: '/tutorial.mp4',
                        controls: true,
                        autoPlay: true,
                        playsInline: true,
                        preload: 'metadata',
                        style: { width: '100%', maxHeight: 560, display: 'block', background: '#000' },
                    })}
                </View>
            )}
        </View>
    );
}
