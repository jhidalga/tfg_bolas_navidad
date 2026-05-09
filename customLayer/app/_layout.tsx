import { Stack } from "expo-router";
import Toast from 'react-native-toast-message';

/**
 * Componente raíz del enrutamiento de la aplicación (Expo Router).
 * Define la estructura principal de navegación usando un Stack navigator 
 * donde se oculta la cabecera nativa (`headerShown: false`) para usar un Navbar personalizado.
 * También integra el proveedor global de notificaciones (Toast) para mostrar
 * mensajes emergentes en cualquier pantalla.
 * * @returns Componente de layout raíz.
 */
export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <Toast position='top' topOffset={40} />
    </>
  );
}