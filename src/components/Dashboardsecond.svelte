<script>
	import { onMount } from 'svelte';
	import Sidebar from './Sidebar.svelte';
	import InventoryTable from './InventoryTable.svelte';
	import Navbar from './Navbar.svelte';
	import Dashboard from './Dashboard.svelte';
	import UserManagement from './UserManagement.svelte';
	import AccountingPages from './AccountingPages.svelte';
	import EditProfile from './EditProfile.svelte';

	let isSidebarOpen = false; // for mobile
	let isSidebarCollapsed = false; // for desktop

	let currentPage = 'Dashboard'; // default

	let user = {
		name: 'Guest'
	};

	function toggleSidebarMobile() {
		isSidebarOpen = !isSidebarOpen;
	}

	function toggleSidebarCollapse() {
		isSidebarCollapsed = !isSidebarCollapsed;
	}

	onMount(() => {
		const userData = localStorage.getItem('user');
		if (userData) {
			try {
				const parsedUser = JSON.parse(userData);
				user.name = parsedUser.username || 'User';
			} catch (err) {
				console.error('Error parsing user from localStorage:', err);
			}
		}
	});
</script>

<div class="flex h-screen bg-gray-100">
	<Sidebar
		isOpen={isSidebarOpen}
		isCollapsed={isSidebarCollapsed}
		on:navigate={(e) => (currentPage = e.detail)}
	/>

	<div class="flex flex-1 flex-col">
		<!-- Header (Mobile) -->
		<header class="flex items-center justify-between bg-white px-4 py-3 shadow md:hidden">
			<button on:click={toggleSidebarMobile}>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 6h16M4 12h16M4 18h16"
					/>
				</svg>
			</button>
			<span class="text-lg font-bold">YnB Frozen Food</span>
		</header>

		<Navbar {user} />

		<!-- <main class="mt-0 flex-1 overflow-auto p-6 md:mt-0">
			<InventoryTable />
		</main> -->
		<main class="mt-0 flex-1 overflow-auto p-6 md:mt-0">
			{#if currentPage === 'Dashboard'}
				<Dashboard />
			{:else if currentPage === 'Inventory'}
				<InventoryTable />
			{:else if currentPage === 'Users'}
				<UserManagement />
			{:else if currentPage === 'Edit Profile'}
				<EditProfile />
			{:else if currentPage === 'Accounting'}
				<AccountingPages />
			{:else if currentPage === 'Settings'}
				<h1 class="text-xl font-bold">Settings Page</h1>
			{/if}
		</main>
	</div>

	<!-- Mobile Overlay -->
	{#if isSidebarOpen}
		<div
			class="fixed inset-0 z-10 bg-black opacity-50 md:hidden"
			on:click={toggleSidebarMobile}
		></div>
	{/if}
</div>
