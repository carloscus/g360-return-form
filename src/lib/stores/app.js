import { writable, derived } from 'svelte/store';

function getTodayDate() {
	return typeof window !== 'undefined'
		? new Date().toISOString().split('T')[0]
		: '';
}

export const clientData = writable({
	ruc: '',
	nombre: '',
	codigoCliente: '',
	fecha: getTodayDate(),
	vendedor: ''
});

export const returnLines = writable([]);
export const codigoAlmacenDefault = 'VES';
export const capturedImage = writable(null);

export function updateClientField(field, value) {
	clientData.update(data => ({ ...data, [field]: value }));
}

export function addReturnLine(product) {
	returnLines.update(lines => [...lines, {
		id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
		codigoAlmacen: codigoAlmacenDefault,
		codigo: product.codigo,
		ean: product.ean || '',
		nombre: product.nombre || '',
		nombre_corto: product.nombre_corto || '',
		linea: product.linea || '',
		categoria: product.categoria || '',
		cantidad: product.cantidad || 0,
		peso_kg: product.can_kg_um || 0,
		un_bx: product.un_bx || 1,
		observacion: product.observacion || '',
		foto: product.foto || null,
		precio: product.precio || 0,
		esManual: product.esManual || false
	}]);
}

export function removeReturnLine(id) {
	returnLines.update(lines => lines.filter(l => l.id !== id));
}

export function updateLineField(id, field, value) {
	returnLines.update(lines => {
		const idx = lines.findIndex(l => l.id === id);
		if (idx === -1) return lines;
		const updated = [...lines];
		updated[idx] = { ...updated[idx], [field]: value };
		return updated;
	});
}

export function clearAll() {
	clientData.set({
		ruc: '',
		nombre: '',
		codigoCliente: '',
		fecha: getTodayDate(),
		vendedor: ''
	});
	returnLines.set([]);
	capturedImage.set(null);
}

export const dashboard = derived(returnLines, lines => {
	const uniqueLines = lines.length;
	const totalUnits = lines.reduce((sum, l) => sum + (l.cantidad || 0), 0);
	const categories = new Set(lines.filter(l => l.categoria).map(l => l.categoria));
	const totalCategories = categories.size;
	const totalWeight = lines.reduce((sum, l) => sum + ((l.cantidad || 0) * (l.peso_kg || 0)), 0);
	const uniqueSkus = new Set(lines.map(l => l.codigo)).size;

	return { uniqueLines, totalUnits, totalCategories, totalWeight, uniqueSkus };
});
