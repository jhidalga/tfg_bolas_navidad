import { View, Text, StyleProp, TextStyle } from 'react-native';
import { euros } from '../lib/formato';
import { tc, ofertasActivas } from '../lib/tema';

/** Si el producto no tiene precio anterior, el de antes se enseña al doble. */
export const FACTOR_ANTES = 2;

/**
 * Cuantas veces mas costaba antes el producto, o null si no esta en oferta.
 * Sin ofertas globales, o con el producto fuera de oferta, no hay tachado ni etiqueta.
 * Con precio anterior, se usa ese; si no, el doble.
 */
export function factorOferta(producto?: { precio?: number | string; en_oferta?: boolean | null; precio_anterior?: number | string | null } | null): number | null {
    if (!ofertasActivas) return null;
    if (producto?.en_oferta === false) return null;
    const antes = Number(producto?.precio_anterior) || 0;
    const ahora = Number(producto?.precio) || 0;
    return antes > 0 && ahora > 0 ? antes / ahora : FACTOR_ANTES;
}

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
    /** Producto con sus datos de oferta. Sin el, se usa el doble si las ofertas estan activas. */
    producto?: any;
    /** Precio de antes ya calculado (por ejemplo la suma de varios productos). Gana a producto. */
    antes?: number | null;
};

export default function PrecioOferta({ valor, estilo, prefijo, etiqueta = true, colorAntes = '#9ca3af', producto, antes: antesFijo }: Props) {
    const actual = Number(valor) || 0;
    const factor = factorOferta(producto);
    const antes = antesFijo !== undefined ? antesFijo : (factor === null ? null : actual * factor);
    if (antes === null || antes === undefined) {
        return (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                {prefijo ? <Text style={estilo}>{prefijo}</Text> : null}
                <Text style={estilo}>{euros(actual)}</Text>
            </View>
        );
    }
    return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            {prefijo ? <Text style={estilo}>{prefijo}</Text> : null}
            <Text style={{ color: colorAntes, fontSize: 14, fontWeight: '500', textDecorationLine: 'line-through' }}>
                {euros(antes)}
            </Text>
            <Text style={estilo}>{euros(actual)}</Text>
            {etiqueta && actual > 0 && (
                <View style={{ backgroundColor: tc('#dc2626'), borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>OFERTA</Text>
                </View>
            )}
        </View>
    );
}
