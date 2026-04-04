<script>
	import { removeReturnLine, updateLineField } from '$lib/stores/app';
	import { success, error } from '$lib/stores/toasts.js';

	export let line;

	function handlePhotoCapture(e) {
		const file = e.target.files[0];
		if (!file) return;

		if (!file.type.startsWith('image/')) {
			error('El archivo no es una imagen');
			return;
		}

		if (file.size > 10 * 1024 * 1024) {
			error('La imagen supera los 10MB');
			return;
		}

		const reader = new FileReader();
		reader.onload = (event) => {
			updateLineField(line.id, 'foto', event.target.result);
			success('Foto adjuntada');
		};
		reader.onerror = () => error('Error al leer la imagen');
		reader.readAsDataURL(file);
		e.target.value = '';
	}

	function removePhoto() {
		updateLineField(line.id, 'foto', null);
	}

	function adjustQty(delta) {
		const current = line.cantidad || 0;
		const newVal = Math.max(0, parseFloat((current + delta).toFixed(2)));
		updateLineField(line.id, 'cantidad', newVal);
	}

	function handleQtyChange(e) {
		const val = parseFloat(e.target.value) || 0;
		updateLineField(line.id, 'cantidad', Math.max(0, val));
	}

	function handleObsChange(e) {
		updateLineField(line.id, 'observacion', e.target.value);
	}

	$: pesoTotal = (line.cantidad || 0) * (line.peso_kg || 0);
	$: cajasNecesarias = line.un_bx > 0 ? Math.ceil((line.cantidad || 0) / line.un_bx) : 0;
	$: hasObs = line.observacion && line.observacion.trim().length > 0;
</script>

<div class="glass-card p-3 animate-fadeIn">
	<!-- Header: SKU + Name + Remove -->
	<div class="flex items-start justify-between mb-4">
		<div class="flex-1 min-w-0 mr-2">
			<div class="flex items-center gap-2 flex-wrap">
				<span class="font-mono text-sm font-bold text-primary-600 dark:text-primary-400">{line.codigo}</span>
				{#if line.linea}
					<span class="badge badge-primary text-[10px]">{line.linea}</span>
				{/if}
			</div>
			<p class="text-sm text-g360-text dark:text-g360-textDark mt-0.5">{line.nombre_corto || line.nombre}</p>
		</div>
		<button
			on:click={() => removeReturnLine(line.id)}
			class="p-2 text-g360-muted dark:text-g360-mutedDark hover:text-danger-500 active:text-danger-600 active:bg-danger-50 dark:active:bg-danger-900/20 rounded-xl transition-all flex-shrink-0 touch-target"
			aria-label="Quitar producto"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
			</svg>
		</button>
	</div>

	<!-- Cantidad: required -->
	<div class="input-group mb-3">
		<label for="cantidad-{line.id}" class="input-label">Cantidad <span class="text-danger-500">*</span></label>
		<div class="flex items-center gap-2">
			<button
				type="button"
				on:click={() => adjustQty(-1)}
				class="w-12 h-12 flex items-center justify-center rounded-xl bg-g360-bg dark:bg-white/10 text-g360-text dark:text-g360-textDark active:bg-g360-bg/80 dark:active:bg-white/15 active:scale-95 transition-all font-bold text-xl touch-target"
				aria-label="Reducir"
			>
				−
			</button>
			<input
				id="cantidad-{line.id}"
				type="number"
				value={line.cantidad || 0}
				on:change={handleQtyChange}
				class="flex-1 h-12 px-3 text-center border border-g360-surface/50 dark:border-white/10 rounded-xl bg-white/60 dark:bg-white/5 text-g360-text dark:text-g360-textDark text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/50"
				min="0"
				step="0.01"
				inputmode="decimal"
			/>
			<button
				type="button"
				on:click={() => adjustQty(1)}
				class="w-12 h-12 flex items-center justify-center rounded-xl bg-g360-bg dark:bg-white/10 text-g360-text dark:text-g360-textDark active:bg-g360-bg/80 dark:active:bg-white/15 active:scale-95 transition-all font-bold text-xl touch-target"
				aria-label="Aumentar"
			>
				+
			</button>
		</div>
	</div>

	<!-- Info row -->
	<div class="flex items-center gap-3 mb-3 text-xs text-g360-muted dark:text-g360-mutedDark">
		{#if line.peso_kg}
			<span>{pesoTotal > 0 ? pesoTotal.toFixed(2) + ' kg' : line.peso_kg.toFixed(3) + ' kg/ud'}</span>
		{/if}
		{#if line.un_bx}
			<span>{cajasNecesarias} caja{cajasNecesarias !== 1 ? 's' : ''}</span>
		{/if}
	</div>

	<!-- Observación: required -->
	<div class="input-group mb-3">
		<label for="obs-{line.id}" class="input-label">Observación <span class="text-danger-500">*</span></label>
		<textarea
			id="obs-{line.id}"
			value={line.observacion}
			on:input={handleObsChange}
			class="glass-input resize-none {hasObs ? 'glass-input-valid' : ''}"
			rows="2"
			placeholder="Motivo de devolución..."
		></textarea>
	</div>

	<!-- Photo: optional -->
	<div class="flex items-center gap-2">
		{#if line.foto}
			<div class="relative flex-shrink-0">
				<img src={line.foto} alt="Evidencia" class="w-14 h-14 object-cover rounded-xl border border-g360-surface/50 dark:border-white/10" />
				<button
					on:click={removePhoto}
					class="absolute -top-1.5 -right-1.5 w-5 h-5 bg-danger-500 text-white rounded-full flex items-center justify-center text-xs shadow-md"
					aria-label="Quitar foto"
				>
					✕
				</button>
			</div>
		{/if}
		<label class="btn-ghost cursor-pointer text-xs flex-shrink-0">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
			</svg>
			{line.foto ? 'Cambiar' : 'Foto (opcional)'}
			<input
				type="file"
				accept="image/*"
				capture="environment"
				on:change={handlePhotoCapture}
				class="hidden"
			/>
		</label>
	</div>
</div>
