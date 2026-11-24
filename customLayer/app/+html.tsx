import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const WEB = 'https://laguna-tollon-pedidos-navidad.up.railway.app';
const TITULO = 'Adornos navideños | IES Laguna de Tollón';
const DESCRIPCION = 'Adornos navideños del IES Laguna de Tollón. Bolas de Navidad personalizadas con tu nombre, impresas en 3D. Haz tu pedido online.';

/** Página base de la web. Aquí van el título, la descripción y los datos para los buscadores. */
export default function Root({ children }: PropsWithChildren) {
    const datos = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Adornos navideños IES Laguna de Tollón',
        alternateName: ['Laguna de Tollón Navidad', 'Laguna de Tollón adornos'],
        url: WEB + '/',
        description: DESCRIPCION,
        inLanguage: 'es',
        publisher: { '@type': 'EducationalOrganization', name: 'IES Laguna de Tollón', url: WEB + '/' },
    };
    return (
        <html lang="es">
            <head>
                <meta charSet="utf-8" />
                <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
                <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
                <title>{TITULO}</title>
                <meta name="description" content={DESCRIPCION} />
                <meta name="robots" content="index, follow" />
                <link rel="canonical" href={WEB + '/'} />
                <meta property="og:type" content="website" />
                <meta property="og:locale" content="es_ES" />
                <meta property="og:site_name" content="Adornos navideños IES Laguna de Tollón" />
                <meta property="og:title" content={TITULO} />
                <meta property="og:description" content={DESCRIPCION} />
                <meta property="og:url" content={WEB + '/'} />
                <meta property="og:image" content={WEB + '/logo_ies.png'} />
                <meta name="twitter:card" content="summary" />
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datos) }} />
                <ScrollViewStyleReset />
            </head>
            <body>{children}</body>
        </html>
    );
}
