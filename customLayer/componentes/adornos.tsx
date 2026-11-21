import { View } from 'react-native';
import { useEffect } from 'react';

// Dibujos de Navidad hechos en SVG (sin emojis). Se usan como imagen embebida.
const aUri = (svg: string) => 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);

const ARBOL = aUri(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="300" viewBox="0 0 120 150">
<polygon points="60,6 66,22 84,22 70,32 76,48 60,38 44,48 50,32 36,22 54,22" fill="#f4c542" stroke="#d99a1e" stroke-width="2"/>
<polygon points="60,26 92,70 28,70" fill="#2f8f4e"/><polygon points="60,52 100,100 20,100" fill="#287d44"/><polygon points="60,80 108,128 12,128" fill="#216b39"/>
<rect x="52" y="126" width="16" height="20" rx="2" fill="#7a4a2a"/>
<path d="M36 60 Q60 72 84 56" stroke="#f1cf8a" stroke-width="3" fill="none"/><path d="M26 92 Q60 108 94 88" stroke="#f1cf8a" stroke-width="3" fill="none"/><path d="M18 120 Q60 140 102 116" stroke="#f1cf8a" stroke-width="3" fill="none"/>
<circle cx="52" cy="52" r="5" fill="#c1272d"/><circle cx="72" cy="64" r="5" fill="#f4c542"/><circle cx="40" cy="88" r="5.5" fill="#f4c542"/><circle cx="66" cy="94" r="5.5" fill="#c1272d"/><circle cx="86" cy="106" r="5.5" fill="#5ec2ff"/><circle cx="32" cy="116" r="6" fill="#c1272d"/><circle cx="58" cy="118" r="6" fill="#f4c542"/><circle cx="80" cy="124" r="5" fill="#ffffff"/>
</svg>`);
const REGALO = aUri(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 80 80">
<path d="M40 30 C28 8 12 14 22 28 Z" fill="none" stroke="#f1cf8a" stroke-width="5"/><path d="M40 30 C52 8 68 14 58 28 Z" fill="none" stroke="#f1cf8a" stroke-width="5"/>
<rect x="8" y="28" width="64" height="14" rx="3" fill="#c1272d"/><rect x="12" y="42" width="56" height="34" rx="3" fill="#a52a2a"/>
<rect x="35" y="28" width="10" height="48" fill="#f1cf8a"/><circle cx="40" cy="28" r="6" fill="#f1cf8a"/>
</svg>`);
const LUCES_A = aUri(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="40" viewBox="0 0 160 40"><path d="M0 4 Q40 22 80 4 T160 4" stroke="#8a6a3a" stroke-width="2.5" fill="none"/>
<g><rect x="36" y="15" width="5" height="5" fill="#2a1a14"/><ellipse cx="38.5" cy="26" rx="5" ry="7" fill="#ffd36e"/><rect x="116" y="15" width="5" height="5" fill="#2a1a14"/><ellipse cx="118.5" cy="26" rx="5" ry="7" fill="#7be0a0"/></g></svg>`);
const LUCES_B = aUri(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="40" viewBox="0 0 160 40">
<g><rect x="2" y="3" width="5" height="5" fill="#2a1a14"/><ellipse cx="4.5" cy="14" rx="5" ry="7" fill="#ff6b6b"/><rect x="77" y="3" width="5" height="5" fill="#2a1a14"/><ellipse cx="79.5" cy="14" rx="5" ry="7" fill="#5ec2ff"/></g></svg>`);

const CSS = `
@keyframes ad-parpadeo-a{0%,100%{opacity:1}50%{opacity:.25}}
@keyframes ad-parpadeo-b{0%,100%{opacity:.25}50%{opacity:1}}
@keyframes ad-flota{0%,100%{transform:translate3d(0,0,0) rotate(-1.5deg)}50%{transform:translate3d(0,-5px,0) rotate(1.5deg)}}
`;
function inyectarCSS() {
    if (typeof document === 'undefined' || document.getElementById('ad-css')) return;
    const st = document.createElement('style'); st.id = 'ad-css'; st.textContent = CSS; document.head.appendChild(st);
}

const fondo = (uri: string) => ({
    width: '100%', height: '100%', backgroundImage: `url("${uri}")`, backgroundRepeat: 'no-repeat',
    backgroundSize: 'contain', backgroundPosition: 'center bottom',
} as any);

/** Tira de lucecitas que parpadean, de lado a lado de la pantalla. */
export function GuirnaldaLuces({ alto = 40 }: { alto?: number }) {
    useEffect(() => { inyectarCSS(); }, []);
    const capa = (uri: string, anim: string) => ({
        position: 'absolute', top: 0, left: 0, right: 0, height: alto,
        backgroundImage: `url("${uri}")`, backgroundRepeat: 'repeat-x', backgroundSize: `160px ${alto}px`,
        animationName: anim, animationDuration: '1.6s', animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out',
    } as any);
    return (
        <View pointerEvents="none" style={{ height: alto, width: '100%', overflow: 'hidden' }}>
            <View style={capa(LUCES_A, 'ad-parpadeo-a')} />
            <View style={capa(LUCES_B, 'ad-parpadeo-b')} />
        </View>
    );
}

/** Arbolito de Navidad que se mece despacio. */
export function MiniArbol({ tam = 120, retraso = 0 }: { tam?: number; retraso?: number }) {
    useEffect(() => { inyectarCSS(); }, []);
    return (
        <View pointerEvents="none" style={{ width: tam, height: tam * 1.25, transformOrigin: 'bottom center', animationName: 'ad-flota', animationDuration: '4s', animationDelay: `${retraso}s`, animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out' } as any}>
            <View style={fondo(ARBOL)} />
        </View>
    );
}

export function MiniRegalo({ tam = 50 }: { tam?: number }) {
    return <View pointerEvents="none" style={[fondo(REGALO), { width: tam, height: tam }]} />;
}

/** Escena pequeña con arboles y regalos para poner al final de una pagina. */
export function EscenaNavidad({ movil = false }: { movil?: boolean }) {
    const t = movil ? 54 : 100;
    return (
        <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: movil ? 8 : 18, paddingTop: 30, paddingBottom: 10 }}>
            <MiniRegalo tam={t * 0.42} />
            <MiniArbol tam={t} />
            <MiniRegalo tam={t * 0.55} />
            <MiniArbol tam={t * 1.25} retraso={1.2} />
            <MiniRegalo tam={t * 0.5} />
            <MiniArbol tam={t} retraso={2.1} />
            <MiniRegalo tam={t * 0.42} />
        </View>
    );
}
