# Imágenes de la galería para redes sociales

`scripts/capturar-galeria-social.mts` genera imágenes 4:5 (1080×1350) con **tarjetas
completas** de la galería pública, por tipo de evento, **sin precios ni botones** y en
**tema claro**. Se publican como archivos estáticos y el escenario de Make elige una por día.

## Generarlas

```bash
BASE_URL=https://sobrely.com node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON \
  scripts/capturar-galeria-social.mts            # todas
BASE_URL=https://sobrely.com node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON \
  scripts/capturar-galeria-social.mts boda xv    # solo esos temas
```

Escribe `public/social/<tema>-<n>.jpg`. No necesita sesión. Usa el Chrome del sistema
(`playwright-core` no descarga nada). **Vuelve a ejecutarlo cuando cambie el catálogo**
(plantillas nuevas, nombres o descripciones) y despliega: las imágenes son un archivo, no
se actualizan solas.

## Qué sale

| Archivo | Contenido |
|---|---|
| `boda-1.jpg`, `boda-2.jpg` | 6 plantillas de boda cada una |
| `xv-1.jpg`, `xv-2.jpg` | 6 de XV años |
| `cumpleanos-1.jpg`, `cumpleanos-2.jpg` | 6 de cumpleaños |
| `baby-1.jpg`, `baby-2.jpg` | 6 de baby shower |
| `corporativo-1.jpg` | 6 corporativas (solo hay 11: la segunda tanda no se completa y no se genera) |

URL pública: `https://sobrely.com/social/<archivo>`.

## Cómo elige las plantillas

Primero una lista **curada a mano** de las que se ven mejor (solo nombres que se vieron
con los ojos), y después el **peso de la miniatura** como desempate. El peso es un proxy
imperfecto de «cuánto detalle visual trae»: sube con las fotos pero también con las
texturas. La selección es determinista. Para cambiar las preferidas, edita `TEMAS` en el script.

## Qué comprueba antes de guardar (si algo falla, el script se detiene)

- La galería trae al menos 10 tarjetas (no fotografía una página vacía o un error).
- El filtro del tipo existe y deja exactamente las plantillas de ese tipo.
- El lienzo tiene las 6 tarjetas, todas las miniaturas cargaron y **no contiene `$`,
  «para publicar» ni «Usar esta plantilla»**.
- El contenido cabe en 1350 px (si no, reduce la rejilla lo justo).
- El JPEG resultante mide **1080×1350**, leído de su cabecera.

## Límites conocidos

- Las miniaturas son recortes de la parte de arriba de cada plantilla: algunas salen
  cortadas a media cuenta regresiva. Es de las miniaturas originales, no de este script.
- Los datos de las tarjetas («Ana & Carlos», «30 días») son los de ejemplo de cada plantilla.
- El script muestra un aviso de Node (`MODULE_TYPELESS_PACKAGE_JSON`) porque el proyecto
  no declara `"type": "module"`; se silencia con la bandera de arriba. Declararlo cambiaría
  la semántica de módulos de todo el proyecto.

## En Make

En el módulo «Create a Post with Photos», campo de la URL de la foto:

```
{{switch(formatDate(now; "dddd"); "Monday"; "https://sobrely.com/social/boda-1.jpg"; "Tuesday"; "https://sobrely.com/social/xv-1.jpg"; "Wednesday"; "https://sobrely.com/social/cumpleanos-1.jpg"; "Thursday"; "https://sobrely.com/social/boda-2.jpg"; "Friday"; "https://sobrely.com/social/baby-1.jpg"; "Saturday"; "https://sobrely.com/social/xv-2.jpg"; "Sunday"; "https://sobrely.com/social/cumpleanos-2.jpg")}}
```

Prueba la fórmula con un módulo **Tools → Set variable** (no con el de Facebook, que publica de verdad).
