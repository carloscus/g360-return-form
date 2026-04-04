<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import {
		clientData,
		returnLines,
		clearAll
	} from '$lib/stores/app';
	import { editingLineId, cameFromResumen } from '$lib/stores/ui';
	import { success, error, warning } from '$lib/stores/toasts.js';
	import { saveState, clearState } from '$lib/db/indexedDB';

	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import G360Signature from '$lib/components/G360Signature.svelte';

	let isExporting = false;

	$: uniqueSkuCount = [...new Set($returnLines.map(l => l.codigo))].length;
	$: uniqueLineas = [...new Set($returnLines.filter(l => l.linea).map(l => l.linea))].length;
	$: totalUnits = $returnLines.reduce((s, l) => s + (l.cantidad || 0), 0);
	$: totalWeight = $returnLines.reduce((s, l) => s + ((l.cantidad || 0) * (l.peso_kg || 0)), 0);
	$: totalBoxes = $returnLines.reduce((s, l) => {
		const un_bx = l.un_bx || 1;
		return s + Math.ceil((l.cantidad || 0) / un_bx);
	}, 0);
	$: categories = [...new Set($returnLines.filter(l => l.categoria).map(l => l.categoria))];

	$: skuSummary = (() => {
		const groups = {};
		$returnLines.forEach(line => {
			const key = line.codigo;
			if (!groups[key]) {
				groups[key] = {
					codigoAlmacen: line.codigoAlmacen || 'VES',
					codigo: line.codigo,
					ean: line.ean || '',
					nombre: line.nombre_corto || line.nombre || '',
					linea: line.linea || '',
					categoria: line.categoria || '',
					totalCantidad: 0,
					totalPeso: 0,
					un_bx: line.un_bx || 1,
					observaciones: []
				};
			}
			groups[key].totalCantidad += line.cantidad || 0;
			groups[key].totalPeso += (line.cantidad || 0) * (line.peso_kg || 0);
			if (line.observacion) {
				groups[key].observaciones.push(line.observacion);
			}
		});
		return Object.values(groups);
	})();

	function editLine(id) {
		editingLineId.set(id);
		cameFromResumen.set(true);
		goto('/');
	}

	function removeLine(id) {
		returnLines.update(lines => lines.filter(l => l.id !== id));
	}

	function goBack() {
		goto('/');
	}

	async function exportToExcel() {
		if ($returnLines.length === 0) return;

		isExporting = true;
		try {
			const { exportToExcel } = await import('$lib/export/excelGenerator.js');
			await exportToExcel($returnLines, $clientData);
			success('Archivo Excel generado');
		} catch (err) {
			console.error('Error exportando:', err);
			error('Error al generar el archivo Excel');
		} finally {
			isExporting = false;
		}
	}

	async function finalizeReturn() {
		if ($returnLines.length === 0) {
			error('No hay productos para devolver');
			return;
		}

		try {
			await clearState();
			clearAll();
			success('Devolución finalizada correctamente');
			goto('/');
		} catch (err) {
			console.error('Error finalizando:', err);
			error('Error al finalizar la devolución');
		}
	}

	onMount(async () => {
		if ($returnLines.length === 0) {
			warning('No hay productos para devolver');
			goto('/');
		}
	});
</script>

<svelte:head>
	<title>Resumen - Devolución de Productos</title>
</svelte:head>

<div class="min-h-screen pb-24 bg-g360-bg dark:bg-g360-bgDark">
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
					<img src="{base}/logo-cipsa.svg" alt="CIPSA" class="h-8 sm:h-10 w-auto" />
					<div>
						<h1 class="text-base sm:text-lg font-bold text-g360-text dark:text-g360-textDark">
							Resumen de Devolución
						</h1>
						<p class="text-xs text-g360-muted dark:text-g360-mutedDark">
							{$returnLines.length} producto{$returnLines.length !== 1 ? 's' : ''} • {$returnLines.reduce((s, l) => s + (l.cantidad || 0), 0)} unidades
						</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<ThemeToggle />
				</div>
			</div>
		</div>
	</header>

	<main class="max-w-4xl mx-auto px-4 py-4 sm:py-6">
		<!-- Totals Dashboard -->
		<div class="glass-card p-3 mb-4 animate-fadeIn">
			<div class="flex items-center justify-around divide-x divide-g360-surface/50 dark:divide-white/5">
				<div class="text-center px-3">
					<p class="text-xl font-bold text-primary-600 dark:text-primary-400">{uniqueLineas}</p>
					<p class="text-xs uppercase tracking-wider text-g360-muted dark:text-g360-mutedDark font-semibold mt-0.5">Líneas</p>
				</div>
				<div class="text-center px-3">
					<p class="text-xl font-bold text-success-600 dark:text-success-400">{totalUnits}</p>
					<p class="text-xs uppercase tracking-wider text-g360-muted dark:text-g360-mutedDark font-semibold mt-0.5">Uds</p>
				</div>
				<div class="text-center px-3">
					<p class="text-xl font-bold text-warning-600 dark:text-warning-400">{totalBoxes}~</p>
					<p class="text-xs uppercase tracking-wider text-g360-muted dark:text-g360-mutedDark font-semibold mt-0.5">Cajas</p>
				</div>
				<div class="text-center px-3">
					<p class="text-xl font-bold text-g360-accent dark:text-g360-accentDark">{totalWeight.toFixed(0)}</p>
					<p class="text-xs uppercase tracking-wider text-g360-muted dark:text-g360-mutedDark font-semibold mt-0.5">Kg</p>
				</div>
			</div>
		</div>

		<!-- Categories -->
		{#if categories.length > 0}
			<div class="flex items-center gap-2 mb-4 animate-fadeIn" style="animation-delay: 0.1s">
				<span class="text-xs font-semibold text-g360-muted dark:text-g360-mutedDark">Categorías:</span>
				{#each categories as cat}
					<span class="badge bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 text-[10px]">{cat}</span>
				{/each}
			</div>
		{/if}

		<!-- SKU Summary -->
		<div class="space-y-1.5 mb-4 animate-fadeIn" style="animation-delay: 0.2s">
			<h2 class="text-sm font-semibold text-g360-text dark:text-g360-textDark">Resumen por SKU</h2>
			{#each skuSummary as sku, i}
				<div class="glass-card p-2 animate-slideUp" style="animation-delay: {0.05 * i}s; animation-fill-mode: both;">
					<div class="flex items-center gap-2 mb-1.5">
						<span class="font-mono text-xs font-bold text-primary-600 dark:text-primary-400">{sku.codigo}</span>
						{#if sku.linea}
							<span class="badge badge-primary text-[10px]">{sku.linea}</span>
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
								<p class="text-[10px] text-g360-muted dark:text-g360-mutedDark truncate">
									<span class="text-primary-500 font-bold">{i + 1}.</span> {obs}
								</p>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Individual Lines -->
		<div class="space-y-2 mb-4 animate-fadeIn" style="animation-delay: 0.3s">
			<h2 class="text-sm font-semibold text-g360-text dark:text-g360-textDark">SKU — Registros</h2>
			{#each $returnLines as line, i (line.id)}
				<div class="glass-card p-3 animate-slideUp" style="animation-delay: {0.05 * i}s; animation-fill-mode: both;">
					<div class="flex items-start justify-between mb-2">
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 flex-wrap">
								<span class="font-mono text-xs font-bold text-primary-600 dark:text-primary-400">{line.codigo}</span>
								{#if line.linea}
									<span class="badge badge-primary text-[10px]">{line.linea}</span>
								{/if}
							</div>
							<p class="text-xs text-g360-text dark:text-g360-textDark truncate mt-0.5">{line.nombre_corto || line.nombre}</p>
						</div>
						<div class="flex items-center gap-1 flex-shrink-0 ml-2">
							<button
								on:click={() => editLine(line.id)}
								class="p-1.5 text-g360-muted hover:text-primary-500 active:bg-primary-50 dark:active:bg-primary-900/20 rounded-lg transition-all"
								aria-label="Editar"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
								</svg>
							</button>
							<button
								on:click={() => removeLine(line.id)}
								class="p-1.5 text-g360-muted hover:text-danger-500 active:bg-danger-50 dark:active:bg-danger-900/20 rounded-lg transition-all"
								aria-label="Eliminar"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
								</svg>
							</button>
						</div>
					</div>
					<div class="flex items-center gap-3 text-xs text-g360-muted dark:text-g360-mutedDark">
						<span class="font-bold text-g360-text dark:text-g360-textDark">{line.cantidad} uds</span>
						{#if line.observacion}
							<span>·</span>
							<span class="truncate">{line.observacion}</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<!-- Actions -->
		<div class="flex flex-col sm:flex-row gap-3">
			<button
				on:click={exportToExcel}
				disabled={isExporting || $returnLines.length === 0}
				class="btn-success flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{#if isExporting}
					<svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
					</svg>
				{:else}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
					</svg>
				{/if}
				Exportar Excel
			</button>
			<button
				on:click={finalizeReturn}
				class="btn-primary flex-1"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
				</svg>
				Finalizar Devolución
			</button>
		</div>
	</main>
	<G360Signature cliente="CIPSA" />
</div>
