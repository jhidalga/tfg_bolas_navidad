import { View, Image, useWindowDimensions } from 'react-native';
import { useEffect } from 'react';
import { temaActual } from '../lib/tema';

// Dibujos de Navidad hechos en SVG (sin emojis). Se usan como imagen embebida.
const aUri = (svg: string) => 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);

const lucesA = (c1: string, c2: string, hilo: string) => aUri(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="40" viewBox="0 0 160 40"><path d="M0 4 Q40 22 80 4 T160 4" stroke="${hilo}" stroke-width="2.5" fill="none"/>
<g><rect x="36" y="15" width="5" height="5" fill="#2a1a14"/><ellipse cx="38.5" cy="26" rx="5" ry="7" fill="${c1}"/><rect x="116" y="15" width="5" height="5" fill="#2a1a14"/><ellipse cx="118.5" cy="26" rx="5" ry="7" fill="${c2}"/></g></svg>`);
const lucesB = (c1: string, c2: string) => aUri(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="40" viewBox="0 0 160 40">
<g><rect x="2" y="3" width="5" height="5" fill="#2a1a14"/><ellipse cx="4.5" cy="14" rx="5" ry="7" fill="${c1}"/><rect x="77" y="3" width="5" height="5" fill="#2a1a14"/><ellipse cx="79.5" cy="14" rx="5" ry="7" fill="${c2}"/></g></svg>`);
const LUCES = {
    navidad: [lucesA('#ffd36e', '#7be0a0', '#8a6a3a'), lucesB('#ff6b6b', '#5ec2ff')],
    sanvalentin: [lucesA('#ffc2d4', '#fff0f4', '#b86a86'), lucesB('#ff4d6d', '#ff8fab')],
};

const CSS = `
@keyframes ad-parpadeo-a{0%,100%{opacity:1}50%{opacity:.25}}
@keyframes ad-parpadeo-b{0%,100%{opacity:.25}50%{opacity:1}}
@keyframes ad-corazon-a{0%,100%{opacity:1;transform:translateY(0)}50%{opacity:.35;transform:translateY(2px)}}
@keyframes ad-corazon-b{0%,100%{opacity:.35;transform:translateY(2px)}50%{opacity:1;transform:translateY(0)}}
@keyframes ad-balanceo{0%{transform:rotate(-7deg)}100%{transform:rotate(7deg)}}
@keyframes ad-flota{0%,100%{transform:translate3d(0,0,0) rotate(-1.5deg)}50%{transform:translate3d(0,-5px,0) rotate(1.5deg)}}
`;
function inyectarCSS() {
    if (typeof document === 'undefined' || document.getElementById('ad-css')) return;
    const st = document.createElement('style'); st.id = 'ad-css'; st.textContent = CSS; document.head.appendChild(st);
}

// Ramas de abeto (borde de arriba) y bolas colgando (borde de abajo) para el letrero de oferta
const RAMAS = aUri(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="16" viewBox="0 0 48 16"><path d="M0 0h48v3c-3 5-6 8-9 13-2-5-5-8-8-10-3 3-5 6-7 10-2-4-5-8-8-10-3 2-6 5-8 10-3-4-5-8-8-13z" fill="#2f7a46"/><path d="M0 0h48v2c-4 3-7 6-10 9-2-3-5-5-7-6-3 2-5 5-7 8-2-3-4-6-7-8-3 1-6 4-8 7-3-3-6-6-9-9z" fill="#3f9a5c"/></svg>`);
const CORAZONES = aUri(`<svg xmlns="http://www.w3.org/2000/svg" width="90" height="30" viewBox="0 0 90 30"><g stroke="#ffc2d4" stroke-width="1" opacity=".8"><path d="M14 0v10M45 0v16M74 0v8"/></g>
<path d="M14 25c-9-6-10-11-6-14 3-2 6 0 6 3 0-3 3-5 6-3 4 3 3 8-6 14z" fill="#ff4d6d"/><path d="M45 29c-6-4-7-8-4-10 2-1.5 4 0 4 2 0-2 2-3.5 4-2 3 2 2 6-4 10z" fill="#ffc2d4"/><path d="M74 21c-7-5-8-9-5-11 2-1.5 5 0 5 2.5 0-2.500 3-4 5-2.500 3 2 2 6-5 11z" fill="#ff8fab"/></svg>`);

/** Fondo decorado del letrero de oferta segun el tema: abeto, corazones colgando o nada. */
export function FondoLetrero() {
    useEffect(() => { inyectarCSS(); }, []);
    const tipo = temaActual.letrero;
    if (tipo === 'plano') return null;
    const capa = (uri: string, extra: any) => ({ position: 'absolute', left: 0, right: 0, backgroundImage: `url("${uri}")`, backgroundRepeat: 'repeat-x', ...extra } as any);
    return (
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
            {tipo === 'abeto'
                ? <View style={capa(RAMAS, { top: 0, height: 27, backgroundSize: '72px 27px' })} />
                : (<>
                    {/* Dos tiras desplazadas que se encienden y apagan por turnos, como luces de corazones */}
                    <View style={capa(CORAZONES, { top: 0, height: 36, backgroundSize: '90px 30px', animationName: 'ad-corazon-a', animationDuration: '1.8s', animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out' })} />
                    <View style={capa(CORAZONES, { top: 0, height: 36, backgroundSize: '90px 30px', backgroundPosition: '45px 6px', animationName: 'ad-corazon-b', animationDuration: '1.8s', animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out' })} />
                </>)}
        </View>
    );
}

const fondo = (uri: string) => ({
    width: '100%', height: '100%', backgroundImage: `url("${uri}")`, backgroundRepeat: 'no-repeat',
    backgroundSize: 'contain', backgroundPosition: 'center bottom',
} as any);

/** Tira de lucecitas que parpadean, de lado a lado de la pantalla. */
export function GuirnaldaLuces({ alto = 40, fija = false }: { alto?: number; fija?: boolean }) {
    useEffect(() => { inyectarCSS(); }, []);
    const juego = temaActual.nombre === 'sanvalentin' ? LUCES.sanvalentin : LUCES.navidad;
    if (!temaActual.luces) return null;
    const capa = (uri: string, anim: string) => ({
        position: 'absolute', top: 0, left: 0, right: 0, height: alto,
        backgroundImage: `url("${uri}")`, backgroundRepeat: 'repeat-x', backgroundSize: `160px ${alto}px`,
        ...(fija ? {} : { animationName: anim, animationDuration: '1.6s', animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out' }),
    } as any);
    return (
        <View pointerEvents="none" style={{ height: alto, width: '100%', overflow: 'hidden' }}>
            <View style={capa(juego[0], 'ad-parpadeo-a')} />
            <View style={capa(juego[1], 'ad-parpadeo-b')} />
        </View>
    );
}

const PIEZAS = [
    require('../assets/images/bienvenida/galleta.png'), require('../assets/images/bienvenida/reno.png'),
    require('../assets/images/bienvenida/oso.png'), require('../assets/images/bienvenida/arbol.png'),
    require('../assets/images/bienvenida/estrella.png'),
];
const corazon = (c: string) => aUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 92"><path d="M50 90C8 58 0 34 14 16c12-14 32-8 36 8 4-16 24-22 36-8 14 18 6 42-36 74z" fill="${c}"/><path d="M50 80C20 56 12 38 22 24c8-10 22-6 28 6" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".55"/></svg>`);
const CORAZONES_COLGANTES = ['#ff4d6d', '#ff8fab', '#d6336c', '#ffc2d4', '#c2255c'].map(corazon);
const HILOS = [30, 62, 40, 70, 34];

/** Adornos que cuelgan del borde de arriba y se balancean. Sustituyen a las fotos de la portada. */
export function AdornosColgantes() {
    useEffect(() => { inyectarCSS(); }, []);
    const { width } = useWindowDimensions();
    if (temaActual.nombre === 'normal') return null;
    const movil = width < 700;
    const n = movil ? 4 : 5;
    const tam = movil ? 54 : 78;
    const sv = temaActual.nombre === 'sanvalentin';
    return (
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 220, overflow: 'hidden' }}>
            {Array.from({ length: n }).map((_, i) => (
                <View key={i} style={{
                    position: 'absolute', top: 0, left: `${((i + 0.5) / n) * 100}%`, marginLeft: -tam / 2, width: tam, alignItems: 'center',
                    transformOrigin: 'top center', animationName: 'ad-balanceo', animationDuration: `${2.6 + i * 0.35}s`,
                    animationDelay: `${-i * 0.7}s`, animationIterationCount: 'infinite', animationDirection: 'alternate', animationTimingFunction: 'ease-in-out',
                } as any}>
                    <View style={{ width: 2, height: HILOS[i] * (movil ? 0.8 : 1), backgroundColor: sv ? '#ff8fab' : '#e6c27a' }} />
                    {sv
                        ? <View style={{ width: tam, height: tam * 0.92, backgroundImage: `url("${CORAZONES_COLGANTES[i % 5]}")`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat' } as any} />
                        : <Image source={PIEZAS[i % 5]} style={{ width: tam, height: tam * 1.2 }} resizeMode="contain" />}
                </View>
            ))}
        </View>
    );
}
