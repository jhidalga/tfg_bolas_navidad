## 📝 Descripción
Este Pull Request incluye la creacion de un componente filtro que afecta a la pantalla de **Inicio** y a **gridProductos**:

**1. Frontend:**
* **Pantalla de Inicio:** Bloque de filtros en el lateral izquierdo del grid y ahora tambien se encarga de la llamada a la api
* **Pantalla de gridProductos:** Ya no se encarga de la llamada a la api.
* **Componente de foltros:** Encargado de filtrar los productos que venga de la api, el precio minimo y maximo son dinamicos, se obtienen mirando los precios
de los productos que trae la api


**2. Backend y Base de Datos:**


## 🔗 Issue relacionado
Closes #

## 🚀 Tipo de cambio
- [X] ✨ Nueva funcionalidad (feature)
- [ ] 🐛 Corrección de error (bugfix)
- [ ] ♻️ Refactorización (mejora de código sin añadir nueva funcionalidad)
- [ ] 🎨 Mejoras de UI/UX o estilos (Tailwind / NativeWind / StyleSheet)
- [ ] 🔧 Configuración del proyecto / Dependencias

## 📱 Cambios en la Interfaz (Si aplica)
| Antes | Después |
| --- |![alt text](image.png)  |
| --- | |

## ✅ Checklist de calidad antes de fusionar
- [x] He revisado mi propio código línea por línea antes de abrir esta PR.
- [x] He probado estos cambios en el emulador (Android/iOS) o en mi móvil físico con Expo Go y todo funciona correctamente.
- [x] El código compila sin errores ni advertencias (warnings) graves.
- [x] He eliminado los `console.log()` innecesarios o de depuración.
- [x] Mi código sigue la arquitectura y el estilo definido en el proyecto.

## 💡 Notas adicionales para el revisor / Tutor
