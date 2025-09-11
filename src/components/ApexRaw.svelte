<script>
	import { onMount, onDestroy, tick } from 'svelte';

	// props
	export let type = 'line';
	export let height = 280; // number atau string
	export let width; // optional
	export let options = {}; // opsi ApexCharts selain "chart" & "series"
	export let series = []; // [{ name, data }]

	let container; // tempat chart ditanam
	let chart = null;

	// IMPORTANT: CSS ApexCharts (aman di-SSR karena hanya CSS)
	import 'apexcharts/dist/apexcharts.css';

	onMount(async () => {
		// load library hanya di client
		const ApexCharts = (await import('apexcharts')).default;
		await tick();
		chart = new ApexCharts(container, {
			// "chart" minimal: type, height, width
			chart: { type, height, ...(width ? { width } : {}) },
			...options,
			series
		});
		chart.render();
	});

	// reaktif: update ketika props berubah
	$: if (chart) {
		// update options (tanpa series)
		chart.updateOptions(
			{
				chart: { type, height, ...(width ? { width } : {}) },
				...options
			},
			true, // redraw
			true // animate
		);
		// update series terpisah biar lebih aman
		chart.updateSeries(series, true);
	}

	onDestroy(() => {
		chart?.destroy();
		chart = null;
	});
</script>

<!-- container chart -->
<div class="w-full" bind:this={container} style="height:{height}px"></div>
