<script>
	import { createEventDispatcher, onMount } from 'svelte';

	const dispatch = createEventDispatcher();

	let role = '';

	let active = 'Dashboard';
	export let isOpen = true; // untuk mobile
	export let isCollapsed = false; // untuk desktop collapse

	const fullMenu = [
		{ icon: '/icon/dashboard.svg', name: 'Dashboard' },
		{ icon: '/icon/accounting.svg', name: 'Accounting' },
		{ icon: '/icon/inventory.svg', name: 'Inventory' },
		{ icon: '/icon/users.svg', name: 'Users' },
		{ icon: '/icon/users.svg', name: 'Edit Profile' },
		{ icon: '/icon/settings.svg', name: 'Settings' }
	];

	onMount(() => {
		const userData = localStorage.getItem('user');
		if (userData) {
			const user = JSON.parse(userData);
			role = user.role.toLowerCase(); // pastikan lowercase
		}

		const storedActive = localStorage.getItem('activeMenu');
		if (storedActive) {
			active = storedActive;
			dispatch('navigate', active); // kirim saat load
		}
	});

	// Fungsi untuk filter menu berdasarkan role
	function getMenuItemsByRole(role) {
		switch (role) {
			case 'admin':
			case 'owner':
				return fullMenu;
			case 'inventory':
				return fullMenu.filter((item) => ['Dashboard', 'Inventory'].includes(item.name));
			case 'finance':
				return fullMenu.filter((item) => ['Dashboard', 'Accounting'].includes(item.name));
			default:
				return [{ icon: '/icon/dashboard.svg', name: 'Dashboard' }];
		}
	}

	// Fungsi logout
	function logout() {
		localStorage.clear(); // Atau: localStorage.removeItem('your-key') jika spesifik
		window.location.href = '/login'; // Ganti sesuai path login kamu
	}
</script>

<aside
	class={`fixed top-0 left-0 h-full md:static ${isCollapsed ? 'w-20' : 'w-64'} z-20 transform bg-gray-800 text-white transition-all duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
>
	<div>
		<div class="flex items-center justify-between border-b border-gray-700 px-4 py-3.5">
			{#if !isCollapsed}
				<div class="text-xl font-bold">YnB</div>
			{/if}
			<button class="hidden md:block" on:click={() => (isCollapsed = !isCollapsed)}>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</button>
		</div>
		<nav class="mt-4">
			<ul>
				{#each getMenuItemsByRole(role) as item}
					<li
						class={`flex cursor-pointer items-center space-x-2 px-4 py-2 hover:bg-gray-700 ${item.name === active ? 'border-l-4 border-blue-500 bg-gray-700 font-semibold' : ''}`}
						on:click={() => {
							active = item.name;
							localStorage.setItem('activeMenu', active);
							dispatch('navigate', active);
						}}
					>
						<!-- <span>{item.icon}</span> -->
						<img src={item.icon} alt={item.name} class="h-5 w-5" />
						{#if !isCollapsed}
							<span>{item.name}</span>
						{/if}
					</li>
				{/each}
			</ul>
		</nav>
	</div>
	<div class="p-4">
		<button
			on:click={logout}
			class="justify-flex-start flex w-full items-center gap-2 rounded bg-gray-700 px-4 py-2 hover:bg-gray-600"
		>
			<img src="/icon/logout.svg" alt="Logout" class="h-8 w-8" />
			{#if !isCollapsed}
				<span>Logout</span>
			{/if}
		</button>
	</div>
</aside>
