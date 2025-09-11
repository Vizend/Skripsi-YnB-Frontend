<script>
	export let message = '';
	export let type = 'success'; // or 'error'
</script>

{#if message}
	<div
		class="fixed top-4 right-4 z-50 rounded px-4 py-2 text-white shadow
    {type === 'success' ? 'bg-green-600' : 'bg-red-600'}"
	>
		{message}
	</div>
{/if}
