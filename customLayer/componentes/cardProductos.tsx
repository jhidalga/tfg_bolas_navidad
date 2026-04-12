import { View, Text, Image, TouchableOpacity } from 'react-native';
import { styles } from '../styles/card/card.styles';

interface CardProps {
    titulo: string;
    imagenUrl?: string;
    precio?: string;
    personalizable?: boolean;
    cantidadModelos?: number;
    cantidadColores?: number;
    onPress: () => void;
}

export default function Card({ titulo, precio, imagenUrl, personalizable, cantidadModelos, cantidadColores, onPress }: CardProps) {
    return (
        <TouchableOpacity style={styles.contenedor} onPress={onPress} activeOpacity={0.8}>
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
                    <Text style={styles.textoPersonalizable}>✓ Personalizable</Text>
                )}
                
                <Text style={styles.textoDetalles}>
                    {cantidadModelos || 0} modelos | {cantidadColores || 0} colores
                </Text>
            </View>
        </TouchableOpacity>
    );
}