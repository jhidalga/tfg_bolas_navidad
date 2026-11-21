import { View, Text, StyleProp, TextStyle } from 'react-native';

/** La web esta en oferta: antes todo costaba el doble. Se enseña el precio de antes tachado. */
export const FACTOR_ANTES = 2;

type Props = {
    /** Precio que se paga de verdad. */
    valor: number | string;
    /** Estilo del precio actual. El de antes se pinta mas pequeño y en gris. */
    estilo?: StyleProp<TextStyle>;
    /** Texto delante del precio, por ejemplo "Total:". */
    prefijo?: string;
    etiqueta?: boolean;
    /** Color del precio de antes. Por defecto gris. */
    colorAntes?: string;
};

export default function PrecioOferta({ valor, estilo, prefijo, etiqueta = true, colorAntes = '#9ca3af' }: Props) {
    const actual = Number(valor) || 0;
    const antes = actual * FACTOR_ANTES;
    return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            {prefijo ? <Text style={estilo}>{prefijo}</Text> : null}
            <Text style={{ color: colorAntes, fontSize: 14, fontWeight: '500', textDecorationLine: 'line-through' }}>
                {antes.toFixed(2)} €
            </Text>
            <Text style={estilo}>{actual.toFixed(2)} €</Text>
            {etiqueta && actual > 0 && (
                <View style={{ backgroundColor: '#dc2626', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>OFERTA</Text>
                </View>
            )}
        </View>
    );
}
