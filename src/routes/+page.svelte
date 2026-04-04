<script>
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		clientData,
		returnLines,
		clearAll,
		addReturnLine,
		updateLineField,
		removeReturnLine
	} from '$lib/stores/app';
	import { editingLineId, cameFromResumen } from '$lib/stores/ui';
	import { loadProductos } from '$lib/stores/products';
	import { initDB, saveState, loadState, clearState } from '$lib/db/indexedDB';
	import { success, error, warning } from '$lib/stores/toasts.js';

	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import ClientForm from '$lib/components/ClientForm.svelte';
	import ProductSearch from '$lib/components/ProductSearch.svelte';
	import ReturnCard from '$lib/components/ReturnCard.svelte';
	import NotificationPill from '$lib/components/NotificationPill.svelte';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import ManualProductModal from '$lib/components/ManualProductModal.svelte';
	import QuickAddModal from '$lib/components/QuickAddModal.svelte';
	import G360Signature from '$lib/components/G360Signature.svelte';

	let showManualModal = false;
	let showConfirmModal = false;
	let showProductsModal = false;
	let showQuickAdd = false;
	let showEditReturnModal = false;
	let quickAddProduct = null;
	let manualModalCodigo = '';
	let isLoading = true;
	let catalogError = false;

	let autoSaveTimeout = null;

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

	$: if ($clientData || $returnLines) {
		autoSave();
	}

	$: editingLine = $editingLineId ? $returnLines.find(l => l.id === $editingLineId) : null;
	$: totalUnits = $returnLines.reduce((s, l) => s + (l.cantidad || 0), 0);

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
		showProductsModal = false;
		goto('/resumen');
	}

	function requestClear() {
		if ($returnLines.length === 0) return;
		showProductsModal = false;
		showConfirmModal = true;
	}

	async function confirmClear() {
		showConfirmModal = false;
		editingLineId.set(null);
		clearAll();
		await clearState();
		success('Formulario limpiado');
	}

	function openManualModal(codigo = '') {
		manualModalCodigo = codigo;
		showManualModal = true;
	}

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

	function startEdit(id) {
		editingLineId.set(id);
		showProductsModal = false;
	}

	function finishEdit() {
		if ($cameFromResumen) {
			showEditReturnModal = true;
		} else {
			editingLineId.set(null);
		}
	}

	function goToResumenFromEdit() {
		editingLineId.set(null);
		cameFromResumen.set(false);
		showEditReturnModal = false;
		goto('/resumen');
	}

	function stayAdding() {
		editingLineId.set(null);
		cameFromResumen.set(false);
		showEditReturnModal = false;
	}

	function openProductsModal() {
		showProductsModal = true;
	}

	function openQuickAdd(product) {
		quickAddProduct = product;
		showQuickAdd = true;
	}

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

	onDestroy(() => {
		clearTimeout(autoSaveTimeout);
	});
</script>

<ToastContainer />

<div id="app" class="min-h-screen pb-24 bg-g360-bg dark:bg-g360-bgDark">
	<NotificationPill />

	<header class="bg-white/90 dark:bg-g360-surfaceDark/90 backdrop-blur-xl border-b border-g360-surface/50 dark:border-white/5 sticky top-0 z-30">
		<div class="max-w-4xl mx-auto px-4 py-3">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					{#if editingLine}
						<button
							on:click={finishEdit}
							class="p-2 rounded-xl hover:bg-g360-bg dark:hover:bg-white/10 transition-colors touch-target"
							aria-label="Volver"
						>
							<svg class="w-5 h-5 text-g360-text dark:text-g360-textDark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
							</svg>
						</button>
					{/if}
					<img src="/logo-cipsa.svg" alt="CIPSA" class="h-8 sm:h-10 w-auto" />
					<div>
						<h1 class="text-base sm:text-lg font-bold text-g360-text dark:text-g360-textDark">
							{editingLine ? 'Editar Línea' : 'CIPSA Devolución de Productos'}
						</h1>
						<p class="text-xs text-g360-muted dark:text-g360-mutedDark">
							{editingLine ? editingLine.nombre_corto || editingLine.nombre : 'Gestión de devoluciones'}
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

	{#if isLoading}
		<div class="max-w-4xl mx-auto px-4 py-8 space-y-4">
			<div class="skeleton h-32 rounded-2xl"></div>
			<div class="skeleton h-48 rounded-2xl"></div>
		</div>
	{:else}
		<main class="max-w-4xl mx-auto px-4 py-4 sm:py-6">
			{#if editingLine}
				<section class="mb-4 animate-fadeIn">
					<ReturnCard line={editingLine} />
				</section>

				<div class="flex gap-3 mt-4">
					<button
						on:click={finishEdit}
						class="btn-secondary"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
						</svg>
						Volver
					</button>
					<button
						on:click={goToSummary}
						class="btn-success flex-1"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
						</svg>
						Continuar a Resumen
					</button>
				</div>
			{:else}
				<ClientForm />

				<ProductSearch onAddManual={() => openManualModal()} on:select={(e) => openQuickAdd(e.detail)} />
			{/if}
		</main>
	{/if}

	<!-- Products modal -->
	{#if showProductsModal}
		<div
			class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
			on:click={(e) => e.target === e.currentTarget && (showProductsModal = false)}
			on:keydown={(e) => e.key === 'Escape' && (showProductsModal = false)}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<div class="bg-white dark:bg-g360-surfaceDark w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl animate-slideUp max-h-[80vh] overflow-y-auto">
				<div class="p-4 sm:p-5">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-base font-bold text-g360-text dark:text-g360-textDark">
							Productos en gestión
						</h3>
						<button
							on:click={() => showProductsModal = false}
							class="p-2 text-g360-muted hover:text-g360-text dark:hover:text-g360-textDark rounded-xl hover:bg-g360-bg dark:hover:bg-white/10 transition-all"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
							</svg>
						</button>
					</div>

					<div class="flex items-center gap-3 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl mb-3">
						<div class="flex-1 text-center">
							<p class="text-xl font-bold text-primary-600 dark:text-primary-400">{$returnLines.length}</p>
							<p class="text-[10px] uppercase tracking-wider text-g360-muted dark:text-g360-mutedDark font-semibold">Líneas</p>
						</div>
						<div class="w-px h-8 bg-primary-200 dark:bg-primary-800"></div>
						<div class="flex-1 text-center">
							<p class="text-xl font-bold text-g360-text dark:text-g360-textDark">{totalUnits}</p>
							<p class="text-[10px] uppercase tracking-wider text-g360-muted dark:text-g360-mutedDark font-semibold">Unidades</p>
						</div>
					</div>

					<div class="space-y-2 mb-4">
						{#each $returnLines as line (line.id)}
							<button
								on:click={() => startEdit(line.id)}
								class="w-full flex items-center gap-3 p-3 bg-g360-bg dark:bg-white/5 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/10 active:scale-[0.98] transition-all text-left"
							>
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2">
										<span class="font-mono text-xs font-bold text-primary-600 dark:text-primary-400">{line.codigo}</span>
										<span class="text-sm text-g360-text dark:text-g360-textDark truncate">{line.nombre_corto || line.nombre}</span>
									</div>
									<div class="flex items-center gap-2 mt-0.5 text-xs text-g360-muted dark:text-g360-mutedDark">
										<span>Cant: {line.cantidad || 0}</span>
										{#if line.foto}<span>📷</span>{/if}
									</div>
								</div>
								<svg class="w-4 h-4 text-g360-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
								</svg>
							</button>
						{/each}
					</div>

					<div class="flex gap-3">
						<button
							on:click={requestClear}
							class="btn-danger"
						>
							<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
							</svg>
							Limpiar
						</button>
						<button
							on:click={goToSummary}
							class="btn-success flex-1"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
							</svg>
							Continuar
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if showManualModal}
		<div
			class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
			on:click={(e) => e.target === e.currentTarget && (showManualModal = false)}
			on:keydown={(e) => e.key === 'Escape' && (showManualModal = false)}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<ManualProductModal
				initialCodigo={manualModalCodigo}
				on:add={handleAddManualProduct}
			/>
		</div>
	{/if}

	<QuickAddModal
		bind:product={quickAddProduct}
		bind:isOpen={showQuickAdd}
		on:confirm={handleQuickAddConfirm}
	/>

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

	{#if showEditReturnModal}
		<div
			class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
			on:click={(e) => e.target === e.currentTarget && (showEditReturnModal = false)}
			on:keydown={(e) => e.key === 'Escape' && (showEditReturnModal = false)}
			role="alertdialog"
			aria-modal="true"
			tabindex="-1"
		>
			<div class="bg-white dark:bg-g360-surfaceDark rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scaleIn">
				<h3 class="text-base font-bold text-g360-text dark:text-g360-textDark mb-2">¿A dónde desea ir?</h3>
				<p class="text-sm text-g360-muted dark:text-g360-mutedDark mb-6">
					Puede volver al resumen o seguir agregando productos.
				</p>
				<div class="flex gap-3">
					<button
						on:click={stayAdding}
						class="btn-secondary flex-1"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
						</svg>
						Seguir agregando
					</button>
					<button
						on:click={goToResumenFromEdit}
						class="btn-success flex-1"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
						</svg>
						Ir al resumen
					</button>
				</div>
			</div>
		</div>
	{/if}

	<G360Signature cliente="CIPSA" />
</div>
