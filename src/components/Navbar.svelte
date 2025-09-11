<!-- Navbar.svelte -->
<script>
	export let user;
</script>

<nav class="hidden w-full items-center justify-end bg-white px-4 py-3 shadow md:flex">
	<div class="flex items-center space-x-2">
		<span class="hidden font-medium text-gray-700 md:inline-block">{user.name}</span>
	</div>
</nav>
