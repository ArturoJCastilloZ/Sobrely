# 06 · Análisis del editor

Fecha: 24 oct 2026. Se usó el editor en el entorno local (mismo código que producción) desde una sesión de invitado, en escritorio y en móvil de 375 px. **No es una prueba con personas.** Lo que dice sobre dificultad para quien no sabe de diseño es una hipótesis hasta hacer sesiones con usuarios.

## 1. Cómo es hoy

- **Entrada:** «Usar esta plantilla» abre el editor en 2 clics y sin cuenta; la plantilla llega con contenido de ejemplo.
- **Escritorio:** lista de secciones a la izquierda (10 en una plantilla de XV), lienzo al centro con vista Móvil o Escritorio, panel de propiedades a la derecha.
- **Móvil:** vista previa a pantalla completa y barra inferior (Secciones, Portada, Diseño global, Ajustes); arriba, Volver, Deshacer, Rehacer y Publicar.
- **Guardado:** «Guardado» visible; hay autoguardado.
- **Publicación:** lista previa de 5 puntos; si es invitado, modal para crear cuenta; si falta plan, flujo de pago.
- **Personalización:** textos, fotos, colores, tipografías, módulos (portada, bienvenida, cuenta regresiva, mapa, regalos, galería, itinerario, código de vestimenta, música, confirmación), diseño global y, en planes superiores, arte propio.

## 2. Qué puede dificultar a un principiante [HIPÓTESIS con evidencia parcial]

| Fricción | Evidencia | Gravedad |
|---|---|---|
| Diez secciones y un panel de propiedades desde el primer segundo | Captura del editor móvil; 82 elementos interactivos en pantalla | Media |
| No se sabe qué es lo esencial: la lista previa aparece solo al pulsar Publicar | `getPublishPreflight` en el editor | Media |
| Botones táctiles de 28 px en la barra superior móvil | Medición | Baja a media |
| La verificación de correo interrumpe el flujo al crear la cuenta | Flujo probado | Media |
| Los planes limitan módulos y la persona lo descubre al publicar | `plans.ts`, `setPublished` | Media |
| Sin guía contextual ni recorrido inicial | Revisado en uso | Media |

Lo que **no** es un problema por sí solo: que el editor sea potente. La parte que ya ayuda es el contenido de ejemplo y la vista previa móvil permanente.

## 3. Opciones evaluadas contra el objetivo comercial

| Opción | Ayuda a vender | Costo | Veredicto |
|---|---|---|---|
| Vista previa pública | Sí: ya existe (galería y ficha) | Hecho | Mejorar la ficha (S) |
| Personalización inicial sin registro | Sí: ya existe la edición sin cuenta | Hecho | Mantener; mejorar la ficha con «tus nombres» (M) |
| Editor simplificado para principiantes | Probable | M | **Lista de progreso primero (S)**, modo Fácil después |
| Modo avanzado opcional | Neutro | M | Solo junto al modo Fácil |
| Guardado automático | Ya existe | Hecho | Confirmar el aviso de «Guardado» en móvil |
| Plantillas con contenido de ejemplo | Sí | Hecho | Mantener; revisar que el ejemplo no suene a plantilla ajena |
| Proceso guiado por pasos | Probable | M | Probar con 5 personas antes de construirlo |
| Vista previa móvil permanente | Sí | Hecho (conmutador) | Mantener |
| Tutorial contextual | Posible | S a M | Tres marcas breves la primera vez; descartable |

**Postura:** no convertir el editor en Canva. Cada función nueva debe responder: «¿esto ayuda a que alguien termine y publique su primera invitación?». Lo más barato con mejor relación: lista de progreso visible desde el inicio, área táctil de 44 px en la barra superior y recorrido de tres marcas.

## 4. Riesgos de tocar el editor

- Es el componente de mayor complejidad (guardado, historial, publicación, planes). Cualquier cambio debe pasar las pruebas existentes y una prueba manual de publicar, deshacer, guardar y volver atrás.
- Los cambios de la barra superior o de los botones afectan a todos los planes; hacerlos detrás de una bandera de entorno si se quiere reversión inmediata.

## 5. Pruebas con usuarios (el dato que falta)

5 a 8 sesiones de 20 minutos, con personas que organizan una boda o XV, observando sin ayudar:
1. «Haz una invitación para tu evento.» Medir tiempo hasta el primer cambio, hasta tener nombre, fecha y lugar, y si llegan a Publicar.
2. Anotar dónde dudan, qué preguntan y qué abandonan.
3. Resultados cualitativos: con 5 personas suelen aparecer la mayoría de los problemas de uso graves; no sirven para medir conversión.
