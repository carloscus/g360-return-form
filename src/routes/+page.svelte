<!-- ============================================================
     Página principal — Formulario de devolución de productos
     Maneja dos pasos: formulario (cliente + productos) y resumen
     ============================================================ -->
<script>
	// Ciclo de vida de Svelte
	import { onMount, onDestroy } from 'svelte';
	import { base } from '$app/paths';

	// Stores: estado global de la aplicación
	import {
		clientData,
		returnLines,
		clearAll,
		addReturnLine,
		updateLineField
	} from '$lib/stores/app';

	// Catálogo de productos desde JSON estático
	import { loadProductos } from '$lib/stores/products';

	// Persistencia local con IndexedDB
	import { initDB, saveState, loadState, clearState } from '$lib/db/indexedDB';

	// Notificaciones tipo toast
	import { success, error, warning } from '$lib/stores/toasts.js';

	// Componentes reutilizables
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import ClientForm from '$lib/components/ClientForm.svelte';
	import ProductSearch from '$lib/components/ProductSearch.svelte';
	import NotificationPill from '$lib/components/NotificationPill.svelte';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import ManualProductModal from '$lib/components/ManualProductModal.svelte';
	import QuickAddModal from '$lib/components/QuickAddModal.svelte';
	import G360Signature from '$lib/components/G360Signature.svelte';
	import SummaryView from '$lib/components/SummaryView.svelte';

	// ---- Estado de modales ----
	let showManualModal = false;
	let showConfirmModal = false;
	let showQuickAdd = false;
	let quickAddProduct = null;
	let quickEditLine = null;
	let manualModalCodigo = '';

	// ---- Estado de carga y errores ----
	let isLoading = true;
	let catalogError = false;

	// ---- Navegación entre pasos: 'form' | 'summary' ----
	let step = 'form';

	// ---- Auto-guardado en IndexedDB ----
	let autoSaveTimeout = null;

	/**
	 * Guarda el estado actual en IndexedDB con debounce de 500ms
	 * para evitar escrituras excesivas en cada cambio.
	 */
	function autoSave() {
		clearTimeout(autoSaveTimeout);
		autoSaveTimeout = setTimeout(async () => {
			try {
				await saveState({
					clientData: $clientData,
					returnLines: $returnLines
				});
			} catch (e) {
				console.error('Auto-save error:', e);
			}
		}, 500);
	}

	// Reacciona a cambios en los stores para disparar auto-guardado
	$: if ($clientData || $returnLines) {
		autoSave();
	}

	// ---- Validación antes de ir al resumen ----
	function goToSummary() {
		if ($returnLines.length === 0) {
			warning('Agregue al menos un producto');
			return;
		}
		if (!$clientData.ruc.trim()) {
			error('Ingrese el RUC/DNI');
			return;
		}
		if (!$clientData.vendedor.trim()) {
			error('Ingrese el vendedor/responsable');
			return;
		}
		const linesWithoutObs = $returnLines.filter(l => !l.observacion.trim());
		if (linesWithoutObs.length > 0) {
			warning(`${linesWithoutObs.length} línea(s) sin observación`);
			return;
		}
		const linesWithoutQty = $returnLines.filter(l => (l.cantidad || 0) <= 0);
		if (linesWithoutQty.length > 0) {
			warning(`${linesWithoutQty.length} línea(s) sin cantidad`);
			return;
		}
		step = 'summary';
	}

	// ---- Volver del resumen al formulario ----
	function goBack() {
		step = 'form';
	}

	// ---- Abrir modal de edición desde el resumen ----
	function handleEditLine(line) {
		quickEditLine = line;
		showQuickAdd = true;
	}

	// ---- Solicitar confirmación para limpiar todo ----
	function requestClear() {
		if ($returnLines.length === 0) return;
		showConfirmModal = true;
	}

	// ---- Confirmar limpieza de datos ----
	async function confirmClear() {
		showConfirmModal = false;
		clearAll();
		await clearState();
		success('Formulario limpiado');
	}

	// ---- Abrir modal de producto manual ----
	function openManualModal(codigo = '') {
		manualModalCodigo = codigo;
		showManualModal = true;
	}

	// ---- Agregar producto manual al listado ----
	function handleAddManualProduct(e) {
		const { codigo, nombre, ean, precio } = e.detail;
		addReturnLine({
			codigo,
			nombre,
			nombre_corto: nombre,
			ean,
			precio,
			observacion: '',
			esManual: true
		});
		showManualModal = false;
		success(`${nombre} agregado`);
	}

	// ---- Limpiar referencias al cerrar el modal de agregar/editar ----
	function handleQuickAddClose() {
		quickAddProduct = null;
		quickEditLine = null;
	}

	// ---- Abrir modal para agregar nuevo producto ----
	function openQuickAdd(product) {
		quickAddProduct = product;
		showQuickAdd = true;
	}

	// ---- Confirmar agregado de nuevo producto ----
	function handleQuickAddConfirm(e) {
		const { product, cantidad, observacion, foto } = e.detail;
		addReturnLine({
			...product,
			cantidad,
			observacion,
			foto
		});
		success(`${cantidad}x ${product.nombre_corto || product.nombre} agregado`);
		quickAddProduct = null;
		showQuickAdd = false;
	}

	// ---- Confirmar edición de línea existente ----
	function handleQuickEditConfirm(e) {
		const { lineId, cantidad, observacion, foto } = e.detail;
		updateLineField(lineId, 'cantidad', cantidad);
		updateLineField(lineId, 'observacion', observacion);
		updateLineField(lineId, 'foto', foto);
		success('Línea actualizada');
		quickEditLine = null;
		showQuickAdd = false;
	}

	// ---- Inicialización: DB, catálogo y estado persistente ----
	onMount(async () => {
		try {
			await initDB();
			const loaded = await loadProductos();
			if (loaded.length === 0) {
				catalogError = true;
				error('No se pudo cargar el catálogo');
			}

			const state = await loadState();
			if (state) {
				if (state.returnLines) returnLines.set(state.returnLines);
				if (state.clientData) clientData.set(state.clientData);
			}
		} catch (err) {
			console.error('Error en inicialización:', err);
			catalogError = true;
		} finally {
			isLoading = false;
		}
	});

	// ---- Limpieza al destruir el componente ----
	onDestroy(() => {
		clearTimeout(autoSaveTimeout);
	});
</script>

<ToastContainer />

<div id="app" class="min-h-screen pb-24 bg-g360-bg dark:bg-g360-bgDark">
	<!-- Indicador flotante: acceso rápido al resumen (solo en paso form) -->
	{#if step === 'form'}
		<NotificationPill on:goToSummary={goToSummary} />
	{/if}

	<!-- Cabecera fija con logo, título y acciones -->
	<header class="bg-white/90 dark:bg-g360-surfaceDark/90 backdrop-blur-xl border-b border-g360-surface/50 dark:border-white/5 sticky top-0 z-30">
		<div class="max-w-4xl mx-auto px-4 py-3">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					{#if step === 'summary'}
						<button
							on:click={goBack}
							class="p-2 rounded-xl hover:bg-g360-bg dark:hover:bg-white/10 transition-colors touch-target"
							aria-label="Volver"
						>
							<svg class="w-5 h-5 text-g360-text dark:text-g360-textDark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
							</svg>
						</button>
					{/if}
					<img src="{base}/logo-cipsa.svg" alt="CIPSA" class="h-8 sm:h-10 w-auto" />
					<div>
						<h1 class="text-base sm:text-lg font-bold text-g360-text dark:text-g360-textDark">
							{#if step === 'summary'}
								Resumen de Devolución
							{:else}
								CIPSA Devolución de Productos
							{/if}
						</h1>
						<p class="text-xs text-g360-muted dark:text-g360-mutedDark">
							{#if step === 'summary'}
								{$returnLines.length} producto{$returnLines.length !== 1 ? 's' : ''} • {$returnLines.reduce((s, l) => s + (l.cantidad || 0), 0)} unidades
							{:else}
								Gestión de devoluciones
							{/if}
						</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					{#if $returnLines.length > 0}
						<button
							on:click={requestClear}
							class="p-2 rounded-xl hover:bg-danger-50 dark:hover:bg-danger-900/20 text-g360-muted hover:text-danger-500 transition-colors touch-target"
							aria-label="Limpiar todo"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
							</svg>
						</button>
					{/if}
					<ThemeToggle />
				</div>
			</div>
		</div>
	</header>

	<!-- Estado de carga -->
	{#if isLoading}
		<div class="max-w-4xl mx-auto px-4 py-8 space-y-4" aria-label="Cargando" aria-busy="true">
			<div class="skeleton h-32 rounded-2xl"></div>
			<div class="skeleton h-48 rounded-2xl"></div>
		</div>
	{:else}
		<main class="max-w-4xl mx-auto px-4 py-4 sm:py-6">
			{#if step === 'summary'}
				<SummaryView onEditLine={handleEditLine} on:finalize={() => (step = 'form')} />
			{:else}
				<section aria-label="Datos del cliente">
					<ClientForm />
				</section>

				<section aria-label="Búsqueda de productos" class="mt-4">
					<ProductSearch onAddManual={() => openManualModal()} on:select={(e) => openQuickAdd(e.detail)} />
				</section>
			{/if}
		</main>
	{/if}

	<!-- Modal: agregar producto manual por código -->
	<ManualProductModal
		bind:isOpen={showManualModal}
		initialCodigo={manualModalCodigo}
		on:add={handleAddManualProduct}
	/>

	<!-- Modal: agregar o editar producto (cantidad, observación, foto) -->
	<QuickAddModal
		bind:product={quickAddProduct}
		bind:editLine={quickEditLine}
		bind:isOpen={showQuickAdd}
		on:confirm={handleQuickAddConfirm}
		on:update={handleQuickEditConfirm}
		on:close={handleQuickAddClose}
	/>

	<!-- Modal: confirmar limpieza de datos -->
	{#if showConfirmModal}
		<div
			class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
			on:click={(e) => e.target === e.currentTarget && (showConfirmModal = false)}
			on:keydown={(e) => e.key === 'Escape' && (showConfirmModal = false)}
			role="alertdialog"
			aria-modal="true"
			tabindex="-1"
		>
			<div class="bg-white dark:bg-g360-surfaceDark rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scaleIn">
				<h3 class="text-base font-bold text-g360-text dark:text-g360-textDark mb-2">¿Limpiar todo?</h3>
				<p class="text-sm text-g360-muted dark:text-g360-mutedDark mb-6">
					Se eliminarán {$returnLines.length} producto(s) y los datos del cliente.
				</p>
				<div class="flex gap-3">
					<button
						on:click={() => showConfirmModal = false}
						class="btn-secondary flex-1"
					>
						Cancelar
					</button>
					<button
						on:click={confirmClear}
						class="btn-danger flex-1"
					>
						Sí, limpiar
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Sello de marca G360 -->
	<G360Signature cliente="CIPSA" />
</div>
