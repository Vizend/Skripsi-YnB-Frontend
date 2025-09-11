<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	// props yang sama seperti svelte-apexcharts
	export let type = 'line';
	export let height = 280;
	export let width; // optional
	export let options = {};
	export let series = [];

	let ChartComp = null; // akan diisi setelah di-load di browser

	onMount(async () => {
		if (!browser) return;
		const mod = await import('svelte-apexcharts'); // <-- hanya di client
		ChartComp = mod.default;
	});

	// opsi default agar ada teks kalau data kosong
	$: mergedOptions = {
		noData: { text: 'Tidak ada data' },
		...options
	};
</script>

{#if ChartComp}
	<svelte:component this={ChartComp} {type} {height} {width} options={mergedOptions} {series} />
{:else}
	<!-- placeholder saat SSR/awal hydration -->
	<div style="height:{height}px" class="w-full animate-pulse rounded bg-gray-100" />
{/if}
