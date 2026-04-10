import { View, Text, Image } from 'react-native';
import { styles } from '../styles/card/card.styles';

interface CardProps {
    titulo: string;
    imagenUrl?: string;
    precio?: string; 
    personalizable?: boolean;
    cantidadModelos?: number;
    cantidadColores?: number;
}

export default function Card({ titulo, precio, imagenUrl, personalizable, cantidadModelos, cantidadColores }: CardProps) {
    return (
        <View style={styles.contenedor}>
            <View style={styles.imagenContenedor}>
                {imagenUrl ? (
                    <Image source={{ uri: imagenUrl }} style={styles.imagen} />
                ) : (
                    <View style={styles.placeholder} />
                )}
            </View>
            <View style={styles.info}>
                <Text style={styles.titulo}>{titulo}</Text>
                
                {precio && <Text style={styles.precio}>{precio}€</Text>}
                
                {personalizable && (
                    <Text style={{ color: '#16a34a', fontSize: 12, marginTop: 4 }}>
                        ✓ Personalizable
                    </Text>
                )}
                
                <Text style={{ color: 'gray', fontSize: 12, marginTop: 2 }}>
                    {cantidadModelos || 0} modelos | {cantidadColores || 0} colores
                </Text>
            </View>
        </View>
    );
}