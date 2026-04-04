# CIPSA Devolución de Productos

> Sistema de gestión de devoluciones para CIPSA — SPA construida con SvelteKit 2 + Tailwind 3.

## Descripción

Aplicación web progresiva para registrar devoluciones de productos. Permite buscar productos por SKU, nombre, EAN o línea, agregar cantidades con observaciones y evidencia fotográfica, y exportar el resumen a Excel con imagen por producto.

## Características

- **Búsqueda inteligente** — filtra por código (SKU), nombre, EAN o línea de producto
- **QuickAdd Modal** — al seleccionar un producto se abre un modal para ingresar cantidad, observación y foto antes de agregar
- **Gestión de líneas** — soporta múltiples registros del mismo SKU con distintas observaciones
- **Evidencia fotográfica** — captura de foto/cámara (`capture="environment"`) directamente en el modal de agregar o en edición
- **Resumen por SKU** — página de resumen con dashboard (Líneas, Uds, Cajas, Kg) agrupado por producto
- **Exportación Excel** — genera archivo `.xlsx` con dos hojas:
  - **Detalle**: cada línea con datos completos + foto embebida en columna derecha
  - **Resumen**: agrupado por SKU con totales
- **Persistencia local** — IndexedDB auto-guarda el estado del formulario
- **Modo oscuro** — toggle de tema con persistencia en `localStorage`
- **Badge DNI/RUC** — indicador visual dinámico que cambia de color según el tipo de documento
- **Diseño responsive** — optimizado para pantallas desde 390px
- **Pill flotante draggable** — indicador arrastrable que muestra items/líneas y navega al resumen

## Flujo de Usuario

1. **Ingresar datos del cliente** — RUC/DNI (con badge dinámico), vendedor, campos opcionales
2. **Buscar producto** — por SKU, nombre, EAN o línea
3. **Seleccionar producto** — se abre QuickAdd Modal
4. **Ingresar cantidad + observación + foto (opcional)** — confirmar para agregar
5. **Repetir** — seguir agregando productos
6. **Ir al resumen** — tap en el pill flotante o botón "Continuar"
7. **Editar desde resumen** — al volver pregunta: "¿Seguir agregando o Ir al resumen?"
8. **Exportar a Excel** — descarga archivo `.xlsx` con detalle y resumen

## Stack

| Tecnología | Versión |
|---|---|
| SvelteKit | ^2.0.0 |
| Svelte | ^4.2.0 |
| Tailwind CSS | ^3.4.1 |
| Vite | ^5.0.0 |
| ExcelJS | ^4.4.0 |
| adapter-static | ^3.0.0 |

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

## Build

```bash
npm run build
```

El output se genera en la carpeta `build/` (SPA estática).

## Preview

```bash
npm run preview
```

## Estructura del Proyecto

```
src/
├── routes/
│   ├── +page.svelte          # Página principal — formulario de devolución
│   ├── +layout.svelte        # Layout global
│   ├── +layout.js            # Prerender: false
│   └── resumen/
│       └── +page.svelte      # Página de resumen + exportación
├── lib/
│   ├── components/
│   │   ├── ClientForm.svelte       # Formulario de datos del cliente
│   │   ├── ProductSearch.svelte    # Búsqueda de productos
│   │   ├── QuickAddModal.svelte    # Modal rápido: cantidad + obs + foto
│   │   ├── ManualProductModal.svelte # Agregar producto manual por código
│   │   ├── ReturnCard.svelte       # Tarjeta editable de cada línea
│   │   ├── NotificationPill.svelte # Pill flotante draggable
│   │   ├── ToastContainer.svelte   # Sistema de notificaciones
│   │   ├── ThemeToggle.svelte      # Toggle modo claro/oscuro
│   │   └── G360Signature.svelte    # Sello G360
│   ├── stores/
│   │   ├── app.js              # clientData, returnLines, acciones
│   │   ├── products.js         # productos, filterProducts, loadProductos
│   │   ├── ui.js               # editingLineId, cameFromResumen
│   │   └── toasts.js           # success, error, warning, info
│   ├── db/
│   │   └── indexedDB.js        # Persistencia local (save/load/clear)
│   ├── export/
│   │   └── excelGenerator.js   # Generación de Excel con imágenes
│   └── utils/
│       └── documentValidation.js # Validación DNI/RUC
├── app.css                     # Tailwind + componentes globales
├── app.html                    # HTML base
└── app.d.ts                    # Type definitions
static/
├── catalogo_productos.json     # Catálogo de productos
└── logo-cipsa.svg              # Logo
```

## Formato del Catálogo

El archivo `static/catalogo_productos.json` debe tener la estructura:

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

## Líneas de Producto

ARCHIVO · DIBUJO · DIDÁCTICOS · ESCRITURA · FORROS · MANUALIDADES · MASCOTAS · METÁLICA · PEGAMENTOS · PELOTAS · PINTURA · REPRESENTADAS

## Estandarización de Diseño

| Elemento | Tamaño |
|---|---|
| Micro-etiquetas | 12px (`text-xs`) |
| Texto secundario | 12px (`text-xs`) |
| Cuerpo / labels | 14px (`text-sm`) |
| Inputs / botones | 16px (`text-base`) |
| Títulos sección | 18px (`text-lg`) |
| Números / stats | 20px (`text-xl`) |
| Touch target mín. | 48px |
| Padding card | 12px (`p-3`) |
| Gap estándar | 8px / 12px |

## Seguridad

- Sin datos sensibles en código
- Validación de tipo y tamaño (10MB) en subida de imágenes
- Sin uso de `{@html}` con datos de usuario
- Sanitización de documento (solo dígitos)
- IndexedDB con fallback graceful si no está disponible

## Autor

Carlos Cusi (CCUSI) — G360 Ecosystem

## Licencia

Uso interno — G360 Ecosystem
