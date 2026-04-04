<script>
	import '../app.css';

	export let data;
</script>

<svelte:head>
	<title>{data.title}</title>
</svelte:head>

<div class="min-h-screen">
	<slot />
</div>
