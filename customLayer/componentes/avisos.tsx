import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { temaActual, NombreTema } from '../lib/tema';

/** Colores de los avisos de cada tema: capsula oscura con texto claro y un icono con el color del aviso. */
type Paleta = { fondo: string; borde: string; texto: string; sub: string; ok: string; error: string; info: string; glifo: string };
const PALETAS: Record<NombreTema, Paleta> = {
    navidad: { fondo: '#5a1418', borde: '#e6c27a', texto: '#fff7ea', sub: '#f1cf8a', ok: '#e6c27a', error: '#ff8f85', info: '#f1cf8a', glifo: '#4a0f12' },
    normal: { fondo: '#1e293b', borde: '#334155', texto: '#ffffff', sub: '#cbd5e1', ok: '#60a5fa', error: '#f87171', info: '#94a3b8', glifo: '#0f172a' },
    sanvalentin: { fondo: '#7a1840', borde: '#ff8fab', texto: '#fff0f4', sub: '#ffc2d4', ok: '#ffc2d4', error: '#ff7a8a', info: '#ffc2d4', glifo: '#7a1840' },
};

type Tipo = 'ok' | 'error' | 'info';

const Aviso = ({ tipo, text1, text2 }: { tipo: Tipo; text1?: string; text2?: string }) => {
    const p = PALETAS[temaActual.nombre] || PALETAS.navidad;
    const color = p[tipo];
    const corazon = temaActual.nombre === 'sanvalentin' && tipo === 'ok';
    const icono: any = corazon ? 'heart' : tipo === 'ok' ? 'checkmark' : tipo === 'error' ? 'close' : 'information';
    return (
        <View style={{
            width: '92%', maxWidth: 460, flexDirection: 'row', alignItems: 'center', gap: 12,
            backgroundColor: p.fondo, borderRadius: 20, borderWidth: 1.5, borderColor: tipo === 'error' ? color : p.borde,
            paddingVertical: 11, paddingHorizontal: 14,
            shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8,
        }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={icono} size={14} color={p.glifo} />
            </View>
            <View style={{ flex: 1 }}>
                {!!text1 && <Text style={{ color: p.texto, fontWeight: '700', fontSize: 15 }}>{text1}</Text>}
                {!!text2 && <Text style={{ color: p.sub, fontSize: 13, marginTop: 2 }}>{text2}</Text>}
            </View>
        </View>
    );
};

export const toastConfig = {
    success: ({ text1, text2 }: any) => <Aviso tipo="ok" text1={text1} text2={text2} />,
    error: ({ text1, text2 }: any) => <Aviso tipo="error" text1={text1} text2={text2} />,
    info: ({ text1, text2 }: any) => <Aviso tipo="info" text1={text1} text2={text2} />,
};
