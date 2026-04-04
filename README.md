# CIPSA Devolución de Productos

> Sistema de gestión de devoluciones para CIPSA — SPA construida con SvelteKit 2 + Tailwind 3.

## Descripción

Aplicación web progresiva (PWA) para registrar devoluciones de productos en campo. Permite buscar productos por SKU, nombre, EAN o línea, ingresar cantidades con observaciones obligatorias y evidencia fotográfica, y exportar el resumen a Excel con imágenes embebidas.

## Características

### Búsqueda y Selección
- **Búsqueda inteligente** — filtra por código (SKU), nombre, EAN o línea de producto con debounce de 250ms
- **QuickAdd Modal** — al seleccionar un producto se abre un modal para ingresar cantidad, observación y foto antes de agregar a la lista
- **Producto manual** — si el código no existe en el catálogo, permite agregarlo manualmente con datos personalizados
- **Badge DNI/RUC** — indicador visual dinámico en el campo de documento: verde (DNI, 8 dígitos) o rojo (RUC, 11 dígitos)

### Gestión de Líneas
- **Múltiples registros por SKU** — el mismo producto puede agregarse varias veces con distintas observaciones (ej: "mal empaque", "cajas abiertas")
- **Edición individual** — cada línea se edita por separado con cantidad, observación y foto
- **Validación obligatoria** — no se puede avanzar al resumen sin observación y cantidad en cada línea

### Resumen
- **Dashboard** — 4 métricas en línea horizontal: Líneas (categorías únicas), Uds (unidades totales), Cajas (aproximadas), Kg (peso total)
- **Categorías** — badges que muestran las categorías presentes en la devolución (VINIBALL, VINIFAN, REPRESENTADAS)
- **Resumen por SKU** — productos agrupados con totales de unidades, cajas y peso
- **Registros individuales** — cada línea con indicador de foto (📷 con color), botones de editar y eliminar
- **Validación de cliente** — requiere RUC/DNI y vendedor antes de acceder al resumen

### Exportación Excel
- **Hoja 1 — Detalle**: datos del cliente + cada línea con SKU, EAN, nombre, cantidad, peso, cajas, observación y foto embebida como imagen
- **Hoja 2 — Resumen**: SKU consolidados con totales agrupados
- **Formato**: encabezado verde, bandas alternas, columnas auto-ajustadas, filas con altura proporcional a la imagen, formato numérico 2 decimales

### Persistencia y UX
- **Auto-guardado** — IndexedDB guarda automáticamente el estado (cliente + líneas) al cambiar
- **Restauración** — al volver a la app, recupera el estado anterior
- **Modo oscuro** — toggle con persistencia en localStorage, detección automática del tema del sistema
- **Pill flotante draggable** — indicador arrastrable en esquina inferior izquierda que muestra productos y unidades, lleva al resumen al tocarlo
- **Confirmaciones** — tanto "Cerrar Registro" como "Limpiar todo" requieren confirmación explícita

## Flujo de Usuario

```
┌─────────────────────────────────────────────────────────┐
│  PÁGINA 1 — Formulario de Devolución                    │
│                                                         │
│  1. Ingresar RUC/DNI + Vendedor (obligatorios)          │
│  2. Buscar producto (SKU, nombre, EAN, línea)           │
│  3. Seleccionar → QuickAdd Modal                        │
│  4. Ingresar cantidad + observación + foto (opcional)   │
│  5. Confirmar → se agrega a la lista                    │
│  6. Repetir desde paso 2 para más productos             │
│                                                         │
│  Accesos:                                               │
│  • Pill flotante → ir al resumen                        │
│  • Botón "Continuar" → ir al resumen (valida todo)      │
│  • Botón limpiar → confirmación → borra todo            │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  PÁGINA 2 — Resumen                                     │
│                                                         │
│  • Dashboard: Líneas · Uds · Cajas · Kg                 │
│  • Categorías: badges de categorías presentes           │
│  • Resumen por SKU: agrupado con totales                │
│  • Registros individuales: editar / eliminar            │
│                                                         │
│  Acciones:                                              │
│  • Exportar Excel → descarga .xlsx                      │
│  • Cerrar Registro → confirmación → limpia y vuelve     │
│  • Volver → página 1 (búsqueda normal)                  │
│  • Editar línea → página 1 en modo edición              │
└─────────────────────────────────────────────────────────┘
```

### Flujo de Edición desde Resumen

```
Resumen → Editar línea → Página 1 (modo edición)
    ↓
Editar cantidad/observación/foto → "Volver"
    ↓
Modal: "¿A dónde desea ir?"
    ├─ Seguir agregando → Página 1 (búsqueda normal)
    └─ Ir al resumen → Resumen
```

## Stack

| Tecnología | Versión | Propósito |
|---|---|---|
| SvelteKit | ^2.0.0 | Framework SPA |
| Svelte | ^4.2.0 | Componentes reactivos |
| Tailwind CSS | ^3.4.1 | Estilos utilitarios |
| Vite | ^5.0.0 | Bundler y dev server |
| ExcelJS | ^4.4.0 | Generación de archivos Excel |
| adapter-static | ^3.0.0 | Build como SPA estática |

## Requisitos

- Node.js 18+
- `catalogo_productos.json` en la carpeta `static/`

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

> En desarrollo la app corre en la raíz (`/`). En producción (GitHub Pages) corre en `/g360-return-form/`.

## Build

```bash
npm run build
```

El output se genera en la carpeta `build/` (SPA estática lista para deploy).

## Preview

```bash
npm run preview
```

## Estructura del Proyecto

```
src/
├── routes/
│   ├── +page.svelte          # Página principal — formulario de devolución
│   ├── +layout.svelte        # Layout global con slot
│   ├── +layout.js            # Prerender: false (SPA)
│   └── resumen/
│       └── +page.svelte      # Página de resumen + exportación Excel
├── lib/
│   ├── components/
│   │   ├── ClientForm.svelte       # Formulario: RUC/DNI, vendedor, fecha, código
│   │   ├── ProductSearch.svelte    # Búsqueda con debounce y resultados
│   │   ├── QuickAddModal.svelte    # Modal: cantidad + observación + foto
│   │   ├── ManualProductModal.svelte # Producto manual por código
│   │   ├── ReturnCard.svelte       # Tarjeta editable (edición de línea)
│   │   ├── NotificationPill.svelte # Pill flotante draggable
│   │   ├── ToastContainer.svelte   # Notificaciones toast
│   │   ├── ThemeToggle.svelte      # Toggle modo claro/oscuro
│   │   └── G360Signature.svelte    # Sello G360 (ambas páginas)
│   ├── stores/
│   │   ├── app.js              # clientData, returnLines, acciones CRUD
│   │   ├── products.js         # productos, filterProducts, loadProductos
│   │   ├── ui.js               # editingLineId, cameFromResumen
│   │   └── toasts.js           # success, error, warning
│   ├── db/
│   │   └── indexedDB.js        # Persistencia local (save/load/clear)
│   ├── export/
│   │   └── excelGenerator.js   # Generación de Excel con imágenes embebidas
│   └── utils/
│       └── documentValidation.js # Validación DNI (8) / RUC (11)
├── app.css                     # Tailwind + componentes globales
├── app.html                    # HTML base con script de tema
└── app.d.ts                    # Type definitions
static/
├── catalogo_productos.json     # Catálogo de productos
├── logo-cipsa.svg              # Logo CIPSA
├── manifest.json               # PWA manifest
├── icon-192.png                # Icono PWA 192x192
├── icon-512.png                # Icono PWA 512x512
├── apple-touch-icon.png        # Icono iOS
├── favicon.svg                 # Favicon principal
├── favicon-16x16.png           # Favicon 16px
├── favicon-32x32.png           # Favicon 32px
└── favicon.ico                 # Favicon legacy
```

## Formato del Catálogo

El archivo `static/catalogo_productos.json` debe tener esta estructura:

```json
{
  "productos": [
    {
      "sku": "ABC123",
      "nombre": "Producto Ejemplo",
      "nombre_corto": "Prod. Ej.",
      "ean13": "1234567890123",
      "precio_lista": 10.50,
      "linea": "PINTURA",
      "categoria": "VINIBALL",
      "peso_kg": 0.150,
      "un_bx": 24,
      "keywords": ["pintura", "vinil", "escolar"]
    }
  ]
}
```

### Campos del Catálogo

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `sku` | string | Sí | Código único del producto |
| `nombre` | string | Sí | Nombre completo |
| `nombre_corto` | string | No | Nombre abreviado (se muestra en listas) |
| `ean13` | string | No | Código de barras EAN-13 |
| `precio_lista` | number | No | Precio de lista |
| `linea` | string | No | Línea de producto (ARCHIVO, PINTURA, etc.) |
| `categoria` | string | No | Subcategoría (VINIBALL, VINIFAN, REPRESENTADAS) |
| `peso_kg` | number | No | Peso unitario en kilogramos |
| `un_bx` | number | No | Unidades por caja |
| `keywords` | string[] | No | Palabras clave para búsqueda |

## Líneas de Producto

ARCHIVO · DIBUJO · DIDÁCTICOS · ESCRITURA · FORROS · MANUALIDADES · MASCOTAS · METÁLICA · PEGAMENTOS · PELOTAS · PINTURA · REPRESENTADAS

## Estandarización de Diseño

### Tipografía

| Elemento | Tamaño | Clase Tailwind |
|---|---|---|
| Micro-etiquetas | 12px | `text-xs` |
| Texto secundario | 12px | `text-xs` |
| Cuerpo / labels | 14px | `text-sm` |
| Inputs / botones | 16px | `text-base` |
| Títulos sección | 18px | `text-lg` |
| Números / stats | 20px | `text-xl` |

### Espaciado

| Elemento | Valor | Clase |
|---|---|---|
| Touch target mín. | 48px | `touch-target` |
| Padding card | 12px | `p-3` |
| Gap estándar | 8px / 12px | `gap-2` / `gap-3` |
| Padding input | 12px horizontal, 12px vertical | `px-4 py-3` |

### Colores

| Token | Light | Dark | Uso |
|---|---|---|---|
| `primary-500/600` | `#008f5d` | `#00d084` | Color principal, badges DNI |
| `success-600` | `#16a34a` | `#4ade80` | Acciones positivas |
| `danger-600` | `#dc2626` | `#f87171` | Acciones destructivas, badges RUC |
| `warning-600` | `#d97706` | `#fbbf24` | Advertencias |
| `g360-bg` | `#f8fafc` | `#0b1220` | Fondo de página |
| `g360-text` | `#1f2937` | `#f0f4f8` | Texto principal |
| `g360-muted` | `#6b7280` | `#94a3b8` | Texto secundario |

## Seguridad

- Sin datos sensibles en código
- Validación de tipo (solo imágenes) y tamaño (máx 10MB) en subida de fotos
- Sin uso de `{@html}` con datos de usuario (sin XSS)
- Sanitización de documento: solo se permiten dígitos
- IndexedDB con fallback graceful si no está disponible en el navegador
- Dynamic import de ExcelJS para evitar crash en SSR

## Deployment

### GitHub Pages

El proyecto se deploya automáticamente a GitHub Pages mediante GitHub Actions:

1. Push a `main` → workflow `.github/workflows/deploy.yml`
2. Build con `npm run build`
3. Deploy a rama `gh-pages` con `peaceiris/actions-gh-pages`
4. GitHub Pages sirve desde la rama `gh-pages`

URL: `https://carloscus.github.io/g360-return-form/`

### Configuración de GitHub Pages

En el repo, ir a **Settings > Pages**:
- **Source**: Deploy from a branch
- **Branch**: `gh-pages` > `/ (root)`

### Variables de entorno

El `paths.base` en `svelte.config.js` es dinámico:
- Desarrollo: `''` (raíz)
- Producción: `'/g360-return-form'`

## Autor

Carlos Cusi (CCUSI) — G360 Ecosystem

## Licencia

Uso interno — G360 Ecosystem
