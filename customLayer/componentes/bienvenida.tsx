import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, Text, View, useWindowDimensions } from 'react-native';

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

// Las animaciones son CSS: las hace la tarjeta grafica y van fluidas aunque la pagina este cargando
const CSS = `
@keyframes bv-caida{0%{transform:translate3d(0,-130%,0)}55%{transform:translate3d(0,4%,0)}75%{transform:translate3d(0,-2%,0)}100%{transform:translate3d(0,0,0)}}
@keyframes bv-balanceo{0%{transform:rotate(-8deg)}100%{transform:rotate(8deg)}}
@keyframes bv-nieve-a{0%{transform:translate3d(0,-24px,0)}50%{transform:translate3d(18px,50vh,0)}100%{transform:translate3d(-6px,108vh,0)}}
@keyframes bv-nieve-b{0%{transform:translate3d(0,-24px,0)}50%{transform:translate3d(-18px,50vh,0)}100%{transform:translate3d(6px,108vh,0)}}
@keyframes bv-sube{0%{opacity:0;transform:translate3d(0,26px,0)}100%{opacity:1;transform:translate3d(0,0,0)}}
@keyframes bv-pulso{0%,100%{opacity:.35}50%{opacity:1}}
`;
function inyectarCSS() {
    if (typeof document === 'undefined' || document.getElementById('bv-css')) return;
    const st = document.createElement('style');
    st.id = 'bv-css';
    st.textContent = CSS;
    document.head.appendChild(st);
}

function Copo({ ancho, i }: { ancho: number; i: number }) {
    const d = useMemo(() => ({
        x: Math.random() * ancho,
        tam: 3 + Math.random() * 5,
        dur: 5 + Math.random() * 5,
        op: 0.4 + Math.random() * 0.5,
        espera: -Math.random() * 8,
    }), [ancho]);
    return (
        <View pointerEvents="none" style={{
            position: 'absolute', left: d.x, top: 0, width: d.tam, height: d.tam, borderRadius: d.tam, backgroundColor: '#fff', opacity: d.op,
            animationName: i % 2 ? 'bv-nieve-a' : 'bv-nieve-b', animationDuration: `${d.dur}s`, animationDelay: `${d.espera}s`,
            animationIterationCount: 'infinite', animationTimingFunction: 'linear', willChange: 'transform',
        } as any} />
    );
}

function Adorno({ fuente, cx, largo, ancho, i }: { fuente: any; cx: number; largo: number; ancho: number; i: number }) {
    return (
        // Capa 1: cae desde arriba. Capa 2: se balancea hacia delante y hacia atras sujeto del hilo
        <View pointerEvents="none" style={{
            position: 'absolute', top: 0, left: cx - ancho / 2, width: ancho,
            animationName: 'bv-caida', animationDuration: '1.1s', animationDelay: `${i * 0.14}s`, animationFillMode: 'both', animationTimingFunction: 'cubic-bezier(.3,.7,.4,1)',
        } as any}>
            <View style={{
                alignItems: 'center', transformOrigin: 'top center',
                animationName: 'bv-balanceo', animationDuration: `${2.4 + i * 0.25}s`, animationDelay: `${1.0 + i * 0.14}s`, animationFillMode: 'both',
                animationIterationCount: 'infinite', animationDirection: 'alternate', animationTimingFunction: 'ease-in-out',
            } as any}>
                <View style={{ width: 2, height: largo, backgroundColor: '#e6c27a' }} />
                <Image source={fuente} style={{ width: ancho, height: ancho * 1.2 }} resizeMode="contain" />
            </View>
        </View>
    );
}

export default function Bienvenida({ onTerminar }: { onTerminar: () => void }) {
    const { width, height } = useWindowDimensions();
    const [saliendo, setSaliendo] = useState(false);
    const cerrado = useRef(false);

    const cerrar = () => {
        if (cerrado.current) return;
        cerrado.current = true;
        marcarVista();
        setSaliendo(true);
        setTimeout(onTerminar, 380);
    };

    useEffect(() => {
        inyectarCSS();
        const tecla = () => cerrar();
        if (typeof window !== 'undefined') window.addEventListener('keydown', tecla);
        return () => { if (typeof window !== 'undefined') window.removeEventListener('keydown', tecla); };
    }, []);

    const movil = width < 600;
    const tactil = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
    const ancho = Math.min(130, width / (movil ? 4.1 : 5.6));

    return (
        <View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, backgroundColor: '#6b1a1d', overflow: 'hidden',
            opacity: saliendo ? 0 : 1, transitionProperty: 'opacity', transitionDuration: '350ms',
        } as any}>
            <Pressable style={{ flex: 1 }} onPress={cerrar} accessibilityLabel="Cerrar la bienvenida">
                {Array.from({ length: movil ? 22 : 40 }).map((_, i) => <Copo key={i} i={i} ancho={width} />)}
                {ADORNOS.map((f, i) => (
                    <Adorno key={i} i={i} fuente={f} ancho={ancho} largo={LARGO_HILO[i] * height} cx={((i + 0.5) / ADORNOS.length) * width} />
                ))}
                <View pointerEvents="none" style={{
                    position: 'absolute', left: 0, right: 0, top: height * 0.5, alignItems: 'center', paddingHorizontal: 20,
                    animationName: 'bv-sube', animationDuration: '0.8s', animationDelay: '0.9s', animationFillMode: 'both', animationTimingFunction: 'ease-out',
                } as any}>
                    <Text style={{ color: '#e6c27a', letterSpacing: 5, fontSize: movil ? 12 : 14, fontWeight: '700' }}>IES LAGUNA DE TOLLÓN · 2º DAM</Text>
                    <Text style={{ color: '#fff7ea', fontSize: movil ? 44 : 68, fontWeight: '900', marginTop: 8, textAlign: 'center' }}>¡Bienvenido!</Text>
                    <Text style={{ color: '#f1cf8a', fontSize: movil ? 22 : 30, fontStyle: 'italic', marginTop: 2, textAlign: 'center' }}>a los adornos navideños con tu nombre</Text>
                    <View style={{ backgroundColor: '#fff', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 14, marginTop: 22 }}>
                        <Image source={require('../assets/images/logo_ies.png')} style={{ width: movil ? 150 : 190, height: movil ? 54 : 69 }} resizeMode="contain" />
                    </View>
                </View>
                <View pointerEvents="none" style={{
                    position: 'absolute', left: 0, right: 0, bottom: movil ? 48 : 40, alignItems: 'center',
                    animationName: 'bv-pulso', animationDuration: '1.8s', animationDelay: '2s', animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out', animationFillMode: 'backwards',
                } as any}>
                    <Text style={{ color: '#fff7ea', fontSize: movil ? 17 : 20, fontWeight: '700', letterSpacing: 1 }}>
                        {tactil ? 'Toca la pantalla para entrar' : 'Haz clic para entrar'}
                    </Text>
                </View>
            </Pressable>
        </View>
    );
}
