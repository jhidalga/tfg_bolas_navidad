import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, Pressable, Text, View, useWindowDimensions } from 'react-native';

const ADORNOS = [
    require('../assets/images/bienvenida/galleta.png'),
    require('../assets/images/bienvenida/reno.png'),
    require('../assets/images/bienvenida/oso.png'),
    require('../assets/images/bienvenida/arbol.png'),
    require('../assets/images/bienvenida/estrella.png'),
];
const LARGO_HILO = [0.10, 0.22, 0.07, 0.19, 0.13]; // fraccion del alto de pantalla

let yaMostrada = false;

/** Solo la primera vez por sesion del navegador. */
export function debeMostrarBienvenida(): boolean {
    if (yaMostrada) return false;
    try {
        if (typeof window !== 'undefined') {
            if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
            if (window.sessionStorage.getItem('bienvenida_vista')) return false;
        }
    } catch { /* sin sessionStorage */ }
    return true;
}

function marcarVista() {
    yaMostrada = true;
    try { window.sessionStorage.setItem('bienvenida_vista', '1'); } catch { /* nada */ }
}

function Copo({ ancho, alto, i }: { ancho: number; alto: number; i: number }) {
    const y = useRef(new Animated.Value(0)).current;
    const datos = useMemo(() => ({
        x: Math.random() * ancho,
        tam: 3 + Math.random() * 5,
        dur: 3200 + Math.random() * 3000,
        op: 0.4 + Math.random() * 0.5,
        espera: Math.random() * 1500,
    }), [ancho]);
    useEffect(() => {
        const anim = Animated.loop(Animated.timing(y, { toValue: 1, duration: datos.dur, delay: datos.espera, easing: Easing.linear, useNativeDriver: false }));
        anim.start();
        return () => anim.stop();
    }, []);
    return (
        <Animated.View pointerEvents="none" style={{
            position: 'absolute', left: datos.x, top: 0, width: datos.tam, height: datos.tam, borderRadius: datos.tam, backgroundColor: '#fff', opacity: datos.op,
            transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [-20, alto + 20] }) }, { translateX: y.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, i % 2 ? 14 : -14, 0] }) }],
        }} />
    );
}

function Adorno({ fuente, cx, largo, ancho, i }: { fuente: any; cx: number; largo: number; ancho: number; i: number }) {
    const caida = useRef(new Animated.Value(0)).current;
    const giro = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.sequence([
            Animated.delay(i * 140),
            Animated.spring(caida, { toValue: 1, friction: 6, tension: 40, useNativeDriver: false }),
        ]).start();
        const balanceo = Animated.loop(Animated.sequence([
            Animated.timing(giro, { toValue: 1, duration: 1100 + i * 90, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
            Animated.timing(giro, { toValue: -1, duration: 1100 + i * 90, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        ]));
        const t = setTimeout(() => balanceo.start(), 500 + i * 140);
        return () => { clearTimeout(t); balanceo.stop(); };
    }, []);
    return (
        <Animated.View pointerEvents="none" style={[{
            position: 'absolute', top: 0, left: cx - ancho / 2, width: ancho, alignItems: 'center',
            transform: [
                { translateY: caida.interpolate({ inputRange: [0, 1], outputRange: [-(largo + ancho * 1.6), 0] }) },
                { rotate: giro.interpolate({ inputRange: [-1, 1], outputRange: ['-5deg', '5deg'] }) },
            ],
        }, { transformOrigin: 'top center' } as any]}>
            <View style={{ width: 2, height: largo, backgroundColor: '#e6c27a' }} />
            <Image source={fuente} style={{ width: ancho, height: ancho * 1.2 }} resizeMode="contain" />
        </Animated.View>
    );
}

export default function Bienvenida({ onTerminar }: { onTerminar: () => void }) {
    const { width, height } = useWindowDimensions();
    const aparece = useRef(new Animated.Value(0)).current;
    const texto = useRef(new Animated.Value(0)).current;
    const aviso = useRef(new Animated.Value(0)).current;
    const cerrado = useRef(false);

    const cerrar = () => {
        if (cerrado.current) return;
        cerrado.current = true;
        marcarVista();
        Animated.timing(aparece, { toValue: 0, duration: 350, useNativeDriver: false }).start(() => onTerminar());
    };

    useEffect(() => {
        Animated.timing(aparece, { toValue: 1, duration: 250, useNativeDriver: false }).start();
        Animated.sequence([Animated.delay(900), Animated.timing(texto, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false })]).start();
        Animated.sequence([Animated.delay(1900), Animated.timing(aviso, { toValue: 1, duration: 500, useNativeDriver: false })]).start(() => {
            Animated.loop(Animated.sequence([
                Animated.timing(aviso, { toValue: 0.35, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
                Animated.timing(aviso, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
            ])).start();
        });
        // En ordenador tambien vale cualquier tecla
        const tecla = () => cerrar();
        if (typeof window !== 'undefined') window.addEventListener('keydown', tecla);
        return () => { if (typeof window !== 'undefined') window.removeEventListener('keydown', tecla); };
    }, []);

    const movil = width < 600;
    const tactil = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
    const ancho = Math.min(130, width / (movil ? 4.1 : 5.6));

    return (
        <Animated.View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, opacity: aparece,
            backgroundColor: '#6b1a1d', overflow: 'hidden',
        }}>
            <Pressable style={{ flex: 1 }} onPress={cerrar} accessibilityLabel="Cerrar la bienvenida">
                {Array.from({ length: movil ? 22 : 38 }).map((_, i) => <Copo key={i} i={i} ancho={width} alto={height} />)}
                {ADORNOS.map((f, i) => (
                    <Adorno key={i} i={i} fuente={f} ancho={ancho} largo={LARGO_HILO[i] * height} cx={((i + 0.5) / ADORNOS.length) * width} />
                ))}
                <Animated.View pointerEvents="none" style={{
                    position: 'absolute', left: 0, right: 0, top: height * 0.5, alignItems: 'center', paddingHorizontal: 20, opacity: texto,
                    transform: [{ translateY: texto.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
                }}>
                    <Text style={{ color: '#e6c27a', letterSpacing: 5, fontSize: movil ? 12 : 14, fontWeight: '700' }}>IES LAGUNA DE TOLLÓN · 2º DAM</Text>
                    <Text style={{ color: '#fff7ea', fontSize: movil ? 44 : 68, fontWeight: '900', marginTop: 8, textAlign: 'center' }}>¡Bienvenido!</Text>
                    <Text style={{ color: '#f1cf8a', fontSize: movil ? 22 : 30, fontStyle: 'italic', marginTop: 2, textAlign: 'center' }}>a los adornos navideños con tu nombre</Text>
                    <View style={{ backgroundColor: '#fff', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 14, marginTop: 22 }}>
                        <Image source={require('../assets/images/logo_ies.png')} style={{ width: movil ? 150 : 190, height: movil ? 54 : 69 }} resizeMode="contain" />
                    </View>
                </Animated.View>
                <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: movil ? 48 : 40, alignItems: 'center', opacity: aviso }}>
                    <Text style={{ color: '#fff7ea', fontSize: movil ? 17 : 20, fontWeight: '700', letterSpacing: 1 }}>
                        {tactil ? 'Toca la pantalla para entrar' : 'Haz clic para entrar'}
                    </Text>
                </Animated.View>
            </Pressable>
        </Animated.View>
    );
}
