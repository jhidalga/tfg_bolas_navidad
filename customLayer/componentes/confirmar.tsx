import { useRef, useState } from 'react';
import { Modal, View, Text, Pressable } from 'react-native';

/**
 * Cuadro de confirmacion propio. Funciona igual en web y en movil.
 * Evita window.confirm, que algunos navegadores del movil bloquean sin avisar.
 * Uso: const { confirmar, dialogo } = useConfirmar();
 *      if (!(await confirmar('Mensaje', 'Eliminar'))) return;
 *      y poner {dialogo} dentro del JSX de la pantalla.
 */
export function useConfirmar() {
    const [estado, setEstado] = useState<{ mensaje: string; boton: string; peligro: boolean } | null>(null);
    const resolver = useRef<((ok: boolean) => void) | null>(null);

    const confirmar = (mensaje: string, boton: string = 'Eliminar', peligro: boolean = true): Promise<boolean> =>
        new Promise((resolve) => {
            resolver.current = resolve;
            setEstado({ mensaje, boton, peligro });
        });

    const cerrar = (ok: boolean) => {
        setEstado(null);
        resolver.current?.(ok);
        resolver.current = null;
    };

    const dialogo = (
        <Modal visible={!!estado} transparent animationType="fade" onRequestClose={() => cerrar(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                <View style={{ backgroundColor: '#fbf1de', borderWidth: 1, borderColor: '#e3cfa5', borderRadius: 14, padding: 20, width: '100%', maxWidth: 380 }}>
                    <Text style={{ fontSize: 16, color: '#3b1a12', marginBottom: 20, lineHeight: 22 }}>{estado?.mensaje}</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                        <Pressable onPress={() => cerrar(false)} style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#efdfc3' }}>
                            <Text style={{ color: '#3b1a12', fontWeight: '600' }}>Cancelar</Text>
                        </Pressable>
                        <Pressable onPress={() => cerrar(true)} style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: estado?.peligro === false ? '#a52a2a' : '#dc2626' }}>
                            <Text style={{ color: '#fff', fontWeight: '600' }}>{estado?.boton}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );

    return { confirmar, dialogo };
}
