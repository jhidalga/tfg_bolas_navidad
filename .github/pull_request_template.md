## 📝 Descripción
Este Pull Request incluye la creación y los ajustes enfocados exclusivamente en las pantallas y funcionalidades de **Inicio**:

**1. Frontend (Inicio):**
* **Separación de estilos Web/Móvil:** Creación y ajuste del sistema de estilos (`StyleSheet`) para la pantalla de **Inicio**. Se han creado archivos `.ts` dedicados para móvil (adaptando display del grid y cards y tamaños) y `.web.ts` para escritorio.

**2. Backend y Base de Datos:**
* **Api:** Se ha implementado la funcionalidad para obtener los datos de los productos de la base de datos y mostrarlos en la pantalla.
* **Supabase:** Se ha creado las tablas correspondientes para almacenar los datos necesarios de los productos

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
| --- |![alt text](inicioPC.png)  |
| --- |![alt text](inicioMovil.png)  |

## ✅ Checklist de calidad antes de fusionar
- [x] He revisado mi propio código línea por línea antes de abrir esta PR.
- [x] He probado estos cambios en el emulador (Android/iOS) o en mi móvil físico con Expo Go y todo funciona correctamente.
- [x] El código compila sin errores ni advertencias (warnings) graves.
- [x] He eliminado los `console.log()` innecesarios o de depuración.
- [x] Mi código sigue la arquitectura y el estilo definido en el proyecto.
- [ ] He añadido o actualizado los comentarios en funciones complejas.

## 💡 Notas adicionales para el revisor / Tutor
* Para la separación de estilos web y móvil en la pantalla de Registro, se ha utilizado la convención de Expo/React Native usando extensiones `.web.ts` y `.ts`, permitiendo al empaquetador resolver la versión correcta automáticamente.