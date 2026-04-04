<script>
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { returnLines, clientData, removeReturnLine } from '$lib/stores/app';
	import { editingLineId, cameFromResumen } from '$lib/stores/ui';
	import { generateDevolucionExcel } from '$lib/export/excelGenerator';
	import { success, error, warning } from '$lib/stores/toasts.js';
	import { initDB, saveState, loadState } from '$lib/db/indexedDB';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import G360Signature from '$lib/components/G360Signature.svelte';

	let isExporting = false;
	let isLoading = true;

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

	$: if ($returnLines) autoSave();

	$: uniqueSkuCount = [...new Set($returnLines.map(l => l.codigo))].length;
	$: uniqueLineas = [...new Set($returnLines.filter(l => l.linea).map(l => l.linea))].length;
	$: totalUnits = $returnLines.reduce((s, l) => s + (l.cantidad || 0), 0);
	$: totalWeight = $returnLines.reduce((s, l) => s + ((l.cantidad || 0) * (l.peso_kg || 0)), 0);
	$: totalBoxes = $returnLines.reduce((s, l) => {
		const un_bx = l.un_bx || 1;
		return s + Math.ceil((l.cantidad || 0) / un_bx);
	}, 0);

	$: categories = [...new Set($returnLines.filter(l => l.categoria).map(l => l.categoria))];
	$: totalCategories = categories.length;

	$: skuSummary = (() => {
		const map = {};
		$returnLines.forEach(l => {
			if (!map[l.codigo]) {
				map[l.codigo] = {
					codigo: l.codigo,
					nombre: l.nombre_corto || l.nombre,
					linea: l.linea,
					categoria: l.categoria,
					totalCantidad: 0,
					totalPeso: 0,
					un_bx: l.un_bx || 1,
					observaciones: []
				};
			}
			map[l.codigo].totalCantidad += (l.cantidad || 0);
			map[l.codigo].totalPeso += (l.cantidad || 0) * (l.peso_kg || 0);
			if (l.observacion && !map[l.codigo].observaciones.includes(l.observacion)) {
				map[l.codigo].observaciones.push(l.observacion);
			}
		});
		return Object.values(map);
	})();

	async function handleExport() {
		if ($returnLines.length === 0) {
			warning('No hay líneas de devolución');
			return;
		}

		const linesWithoutObs = $returnLines.filter(l => !l.observacion.trim());
		if (linesWithoutObs.length > 0) {
			warning(`${linesWithoutObs.length} línea(s) sin observación`);
			return;
		}

		isExporting = true;

		try {
			await generateDevolucionExcel($clientData, $returnLines);
			success(`Excel exportado: ${$returnLines.length} línea(s), ${uniqueSkuCount} SKU(s)`);
		} catch (err) {
			console.error(err);
			error('Error al generar el Excel');
		} finally {
			isExporting = false;
		}
	}

	function goBack() {
		goto('/');
	}

	function editLine(id) {
		editingLineId.set(id);
		cameFromResumen.set(true);
		goto('/');
	}

	onMount(async () => {
		try {
			await initDB();
			const state = await loadState();
			if (state) {
				if (state.returnLines) returnLines.set(state.returnLines);
				if (state.clientData) clientData.set(state.clientData);
			}
		} catch (err) {
			console.error('Error:', err);
		} finally {
			isLoading = false;
		}
	});

	$: if (!isLoading && $returnLines.length === 0) {
		warning('No hay productos para devolver');
		goto('/');
	}

	onDestroy(() => {
		clearTimeout(autoSaveTimeout);
	});
</script>

<ToastContainer />

<div id="app" class="min-h-screen pb-24 bg-g360-bg dark:bg-g360-bgDark">
	<header class="bg-white/90 dark:bg-g360-surfaceDark/90 backdrop-blur-xl border-b border-g360-surface/50 dark:border-white/5 sticky top-0 z-30">
		<div class="max-w-4xl mx-auto px-4 py-3">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<button
						on:click={goBack}
						class="p-2 rounded-xl hover:bg-g360-bg dark:hover:bg-white/10 transition-colors touch-target"
						aria-label="Volver"
					>
						<svg class="w-5 h-5 text-g360-text dark:text-g360-textDark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
						</svg>
					</button>
					<div>
						<h1 class="text-base font-bold text-g360-text dark:text-g360-textDark">
							CIPSA Devolución de Productos
						</h1>
						<p class="text-xs text-g360-muted dark:text-g360-mutedDark truncate max-w-[200px]">
							Resumen de devolución
						</p>
					</div>
				</div>
				<ThemeToggle />
			</div>
		</div>
	</header>

	{#if isLoading}
		<div class="max-w-4xl mx-auto px-4 py-8 space-y-4">
			<div class="skeleton h-32 rounded-2xl"></div>
			<div class="skeleton h-48 rounded-2xl"></div>
		</div>
	{:else}
		<main class="max-w-4xl mx-auto px-4 py-4">
			<!-- Totals Dashboard -->
			<div class="glass-card p-3 mb-4 animate-fadeIn">
				<div class="flex items-center justify-around divide-x divide-g360-surface/50 dark:divide-white/5">
					<div class="text-center px-3">
						<p class="text-xl font-bold text-primary-600 dark:text-primary-400">{uniqueLineas}</p>
						<p class="text-xs uppercase tracking-wider text-g360-muted dark:text-g360-mutedDark font-semibold mt-0.5">Líneas</p>
					</div>
					<div class="text-center px-3">
						<p class="text-xl font-bold text-g360-text dark:text-g360-textDark">{totalUnits}</p>
						<p class="text-xs uppercase tracking-wider text-g360-muted dark:text-g360-mutedDark font-semibold mt-0.5">Uds</p>
					</div>
					<div class="text-center px-3">
						<p class="text-xl font-bold text-g360-text dark:text-g360-textDark">{totalBoxes}~</p>
						<p class="text-xs uppercase tracking-wider text-g360-muted dark:text-g360-mutedDark font-semibold mt-0.5">Cajas</p>
					</div>
					<div class="text-center px-3">
						<p class="text-xl font-bold text-g360-text dark:text-g360-textDark">{totalWeight.toFixed(0)}</p>
						<p class="text-xs uppercase tracking-wider text-g360-muted dark:text-g360-mutedDark font-semibold mt-0.5">Kg</p>
					</div>
				</div>
			</div>

			<!-- Categories -->
			{#if categories.length > 0}
				<div class="flex flex-wrap gap-1.5 mb-4 animate-fadeIn">
					{#each categories as cat}
						<span class="badge badge-warning text-xs">{cat}</span>
					{/each}
				</div>
			{/if}

			<!-- SKU Summary -->
			<div class="space-y-1.5 mb-4 animate-fadeIn">
				<h2 class="text-sm font-semibold text-g360-text dark:text-g360-textDark">Resumen por SKU</h2>
				{#each skuSummary as sku}
					<div class="glass-card p-2">
						<div class="flex items-center gap-2 mb-1.5">
							<span class="font-mono text-xs font-bold text-primary-600 dark:text-primary-400">{sku.codigo}</span>
							{#if sku.linea}
								<span class="badge badge-primary text-xs">{sku.linea}</span>
							{/if}
							<span class="text-xs text-g360-text dark:text-g360-textDark truncate flex-1">{sku.nombre}</span>
						</div>
						<div class="flex items-center gap-3">
							<div class="flex items-center gap-1 text-xs">
								<span class="font-bold text-g360-text dark:text-g360-textDark">{sku.totalCantidad}</span>
								<span class="text-g360-muted dark:text-g360-mutedDark">uds</span>
							</div>
							<span class="text-g360-muted dark:text-g360-mutedDark">·</span>
							<div class="flex items-center gap-1 text-xs">
								<span class="font-bold text-g360-text dark:text-g360-textDark">
									{#if sku.un_bx > 0}
										{Math.floor(sku.totalCantidad / sku.un_bx)}
										{#if sku.totalCantidad % sku.un_bx > 0}
											<span class="text-warning-500">+{sku.totalCantidad % sku.un_bx}</span>
										{/if}
									{:else}
										-
									{/if}
								</span>
								<span class="text-g360-muted dark:text-g360-mutedDark">cajas</span>
							</div>
							<span class="text-g360-muted dark:text-g360-mutedDark">·</span>
							<div class="flex items-center gap-1 text-xs">
								<span class="font-bold text-g360-text dark:text-g360-textDark">{sku.totalPeso.toFixed(0)}</span>
								<span class="text-g360-muted dark:text-g360-mutedDark">kg</span>
							</div>
						</div>
						{#if sku.observaciones.length > 0}
							<div class="mt-1.5 pt-1.5 border-t border-g360-surface/30 dark:border-white/5">
								{#each sku.observaciones as obs, i}
									<p class="text-xs text-g360-muted dark:text-g360-mutedDark truncate">
										<span class="text-primary-500 font-bold">{i + 1}.</span> {obs}
									</p>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Lines list with edit buttons -->
			<div class="space-y-2 mb-4 animate-fadeIn">
				<h2 class="text-sm font-semibold text-g360-text dark:text-g360-textDark">
					{uniqueSkuCount} SKU · {$returnLines.length} registro{$returnLines.length !== 1 ? 's' : ''}
				</h2>
				{#each $returnLines as line (line.id)}
					<div class="glass-card p-3 flex items-center gap-3">
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2">
								<span class="font-mono text-xs font-bold text-primary-600 dark:text-primary-400">{line.codigo}</span>
								<span class="text-sm text-g360-text dark:text-g360-textDark truncate">{line.nombre_corto || line.nombre}</span>
							</div>
							<div class="flex items-center gap-3 mt-1 text-xs text-g360-muted dark:text-g360-mutedDark">
								<span>Cant: <strong class="text-g360-text dark:text-g360-textDark">{line.cantidad || 0}</strong></span>
								{#if line.peso_kg}
									<span>{((line.cantidad || 0) * line.peso_kg).toFixed(1)} kg</span>
								{/if}
								{#if line.foto}
									<span>📷</span>
								{/if}
							</div>
							{#if line.observacion}
								<p class="text-xs text-g360-muted dark:text-g360-mutedDark truncate mt-0.5 italic">"{line.observacion}"</p>
							{/if}
						</div>
						<div class="flex items-center gap-1 flex-shrink-0">
							<button
								on:click={() => removeReturnLine(line.id)}
								class="p-2 text-g360-muted hover:text-danger-500 active:text-danger-600 active:bg-danger-50 dark:active:bg-danger-900/20 rounded-xl transition-all touch-target"
								aria-label="Quitar"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
								</svg>
							</button>
							<button
								on:click={() => editLine(line.id)}
								class="p-2 text-g360-muted hover:text-primary-500 active:text-primary-600 active:bg-primary-50 dark:active:bg-primary-900/20 rounded-xl transition-all touch-target"
								aria-label="Editar"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
								</svg>
							</button>
						</div>
					</div>
				{/each}
			</div>

			<!-- Actions -->
			<div class="flex gap-3 mt-4">
				<button
					on:click={goBack}
					class="btn-secondary"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
					</svg>
					Volver
				</button>
				<button
					on:click={handleExport}
					disabled={$returnLines.length === 0 || isExporting}
					class="btn-success flex-1"
				>
					{#if isExporting}
						<svg class="loading-spinner" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
						</svg>
						Generando...
					{:else}
						<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
						</svg>
						Exportar Excel
					{/if}
				</button>
			</div>
		</main>
	{/if}

	<G360Signature cliente="CIPSA" />
</div>
