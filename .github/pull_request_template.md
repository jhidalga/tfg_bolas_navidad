## 📝 Descripción
Este Pull Request incluye la creación y los ajustes enfocados exclusivamente en las pantallas y funcionalidades de **Pedidos del Usuario**:

**1. Frontend (Pedidos):**
* **Pantalla de Mis Pedidos:** Implementación de la vista `app/pedidos/index.tsx` que permite a los usuarios visualizar su historial personal de pedidos.
* **Pantalla de Mis Pedidos:** Implementación de la vista `app/pedidos/[id].tsx` que permite a los usuarios visualizar los detalles de sus pedidos.
* **Resumen de Pedido:** Se ha integrado la visualización de la fecha, el importe total y la cantidad de productos solicitados por pedido.


**2. Backend y Base de Datos:**
* **Endpoint de Consulta:** Se ha creado el endpoint `GET /api/pedidos/usuario` en `main.py` para recuperar los pedidos del usuario autenticado mediante la decodificación del token JWT
* **Relaciones en Supabase:** Optimización de las consultas para incluir el conteo de `detalles_pedido` vinculados a cada registro de la tabla `pedidos`.

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

## 💡 Notas adicionales para el revisor / Tutor
* Se ha implementado una validación de seguridad en el backend que compara el `user_id` extraído del token JWT con el campo `user_id` del pedido antes de permitir cualquier modificación de estado.