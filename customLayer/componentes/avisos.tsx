import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tc } from '../lib/tema';

/** Aviso con el estilo navideño: tarjeta crema, franja de color y un icono. */
const Aviso = ({ color, icono, text1, text2 }: { color: string; icono: any; text1?: string; text2?: string }) => (
    <View style={{
        width: '92%', maxWidth: 480, flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: tc('#fbf1de'), borderRadius: 14, borderWidth: 1, borderColor: tc('#e3cfa5'),
        borderLeftWidth: 6, borderLeftColor: color, paddingVertical: 12, paddingHorizontal: 14,
        shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
    }}>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={icono} size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
            {!!text1 && <Text style={{ color: tc('#3b1a12'), fontWeight: '700', fontSize: 15 }}>{text1}</Text>}
            {!!text2 && <Text style={{ color: tc('#7a5a48'), fontSize: 13, marginTop: 2 }}>{text2}</Text>}
        </View>
    </View>
);

export const toastConfig = {
    success: ({ text1, text2 }: any) => <Aviso color={tc("#2f7a46")} icono="checkmark" text1={text1} text2={text2} />,
    error: ({ text1, text2 }: any) => <Aviso color={tc("#a52a2a")} icono="close" text1={text1} text2={text2} />,
    info: ({ text1, text2 }: any) => <Aviso color={tc("#b8862b")} icono="information" text1={text1} text2={text2} />,
};
