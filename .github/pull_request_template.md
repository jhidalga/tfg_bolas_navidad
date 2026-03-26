## 📝 Descripción
Este Pull Request incluye ajustes y refactorización enfocados en la API, la base de datos y las vistas principales (Landing, Inicio y Login):

**1. Frontend (Landing, Inicio y Login):**
* **Separación de estilos Web/Móvil:** Refactorización del sistema de estilos (`StyleSheet`) para la Landing, el Grid de productos, las Cards y la pantalla de **Login**. Se han creado archivos `.ts` dedicados para móvil (adaptando márgenes y tamaños) y `.web.ts` para escritorio (limitando anchos máximos y mejorando la distribución).


**2. Backend (API) y Base de Datos:**
* **Ajustes en API (`main.py`):** Configuración general para la gestión de datos y endpoints de la aplicación.
* **Supabase (Auth):** Se ha añadido login usando supabase y corregido un error de restricción de clave foránea añadiendo `ON DELETE CASCADE` a la tabla `usuarios`. Ahora se pueden borrar usuarios directamente desde el panel de Auth sin que la base de datos bloquee la acción.

## 🔗 Issue relacionado
Closes #

## 🚀 Tipo de cambio
- [x] ✨ Nueva funcionalidad (feature)
- [ ] 🐛 Corrección de error (bugfix)
- [ ] ♻️ Refactorización (mejora de código sin añadir nueva funcionalidad)
- [ ] 🎨 Mejoras de UI/UX o estilos (Tailwind / NativeWind / StyleSheet)
- [ ] 🔧 Configuración del proyecto / Dependencias

## 📱 Cambios en la Interfaz (Si aplica)
| Antes | Después |
| --- | ![alt text](loginPC.png) |
| --- | ![alt text](loginM.png) |
| *(Añadir captura de Login/Inicio antiguos)* | *(Añadir captura de la versión móvil/web adaptada)* |

## ✅ Checklist de calidad antes de fusionar
- [x] He revisado mi propio código línea por línea antes de abrir esta PR.
- [x] He probado estos cambios en el emulador (Android/iOS) o en mi móvil físico con Expo Go y todo funciona correctamente.
- [x] El código compila sin errores ni advertencias (warnings) graves.
- [x] He eliminado los `console.log()` innecesarios o de depuración.
- [x] Mi código sigue la arquitectura y el estilo definido en el proyecto.
- [ ] He añadido o actualizado los comentarios en funciones complejas.

## 💡 Notas adicionales para el revisor / Tutor
* Para la separación de estilos web y móvil en todas las pantallas refactorizadas (Landing, Inicio, Login), se ha utilizado la convención de Expo/React Native usando extensiones `.web.ts` y `.ts`, permitiendo al empaquetador resolver la versión correcta automáticamente.
