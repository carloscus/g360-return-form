<script>
	import { onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { returnLines } from '$lib/stores/app';
	import { warning } from '$lib/stores/toasts.js';

	let totalUnits = 0;
	const unsubReturnLines = returnLines.subscribe(lines => {
		totalUnits = lines.reduce((s, l) => s + (l.cantidad || 0), 0);
	});

	onDestroy(unsubReturnLines);

	let x = typeof window !== 'undefined' ? Math.max(0, window.innerWidth / 2 - 60) : 0;
	let y = typeof window !== 'undefined' ? Math.max(0, window.innerHeight - 120) : 0;
	let startX = 0;
	let startY = 0;
	let isDragging = false;
	let pillEl;

	function onPointerDown(e) {
		isDragging = false;
		startX = e.clientX - x;
		startY = e.clientY - y;
		document.addEventListener('pointermove', onPointerMove);
		document.addEventListener('pointerup', onPointerUp);
		e.preventDefault();
	}

	function onPointerMove(e) {
		isDragging = true;
		x = e.clientX - startX;
		y = e.clientY - startY;
		if (pillEl) {
			pillEl.style.left = `${x}px`;
			pillEl.style.top = `${y}px`;
			pillEl.style.transform = 'none';
		}
	}

	function onPointerUp(e) {
		document.removeEventListener('pointermove', onPointerMove);
		document.removeEventListener('pointerup', onPointerUp);
		if (!isDragging && $returnLines.length > 0) {
			goto('/resumen');
		} else if (!isDragging) {
			warning('Agregue al menos un producto');
		}
	}


</script>

{#if $returnLines.length > 0}
	<div
		bind:this={pillEl}
		class="fixed z-40 cursor-grab active:cursor-grabbing select-none touch-none"
		style="left: {x}px; top: {y}px;"
		on:pointerdown={onPointerDown}
	>
		<div class="flex items-center px-5 py-3 rounded-2xl bg-emerald-50/95 dark:bg-black/50 backdrop-blur-md border-2 border-emerald-600/35 dark:border-white/10 shadow-lg transition-all">
			<div class="flex items-center gap-1.5">
				<div class="text-xl font-bold text-emerald-600 dark:text-emerald-400 min-w-[28px] text-center">{$returnLines.length}</div>
				<div class="w-px h-6 bg-black/10 dark:bg-white/10"></div>
				<div class="text-sm font-medium text-gray-400 dark:text-gray-500">{totalUnits} uds</div>
			</div>
		</div>
	</div>
{/if}
