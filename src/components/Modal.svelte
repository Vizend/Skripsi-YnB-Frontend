<script>
	import { onMount, onDestroy } from 'svelte';
	export let show = false;
	export let onClose = () => {};
</script>

{#if show}
	<div class="fixed inset-0 z-40 flex items-center justify-center bg-black/20 ">
		<div class="relative z-50 w-[90%] max-w-4xl rounded-lg bg-white p-6 shadow-lg">
			<button
				on:click={onClose}
				class="absolute top-2 right-2 rounded bg-gray-700 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
			>
				Tutup
			</button>
			<slot />
		</div>
	</div>
{/if}
