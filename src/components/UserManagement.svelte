<script>
	import { onMount } from 'svelte';
	import { API_BASE_URL } from '../api/apiconfigs';
	import { fade, scale } from 'svelte/transition';

	let searchQuery = '';
	let users = [];
	let roles = [];
	let errors = {};
	let touched = {};

	let showModal = false;
	let editingUserId = null;

	// UX states
	let isLoading = false;
	let isSaving = false;
	let deletingId = null;

	let newUser = {
		full_name: '',
		username: '',
		email: '',
		phone: '',
		address: '',
		role_id: '',
		tanggal_lahir: ''
	};
	let usernameTaken = false;
	let emailTaken = false;
	let debounceTimer;

	$: filtered = users
		.filter(
			(user) =>
				user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				user.role?.toLowerCase().includes(searchQuery.toLowerCase())
		)
		.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

	onMount(() => {
		loadUsers();
		loadRoles();
	});

	async function loadUsers() {
		try {
			isLoading = true;
			const res = await fetch(`${API_BASE_URL}/api/users`);
			const data = await res.json();
			users = [...data];
		} catch (e) {
			console.error(e);
		} finally {
			isLoading = false;
		}
	}

	async function loadRoles() {
		try {
			const res = await fetch(`${API_BASE_URL}/api/roles`);
			const data = await res.json();
			roles = data;
		} catch (err) {
			console.error('Gagal mengambil role:', err);
		}
	}

	function openCreateModal() {
		resetForm();
		showModal = true;
	}

	function handleEdit(user) {
		newUser = {
			full_name: user.full_name,
			username: user.username,
			email: user.email,
			phone: user.phone,
			address: user.address,
			role_id: user.role_id?.toString() || '',
			tanggal_lahir: user.tanggal_lahir?.slice(0, 10) || ''
		};
		editingUserId = user.id;
		errors = {};
		touched = {};
		showModal = true;
	}

	async function handleDelete(user) {
		if (!confirm(`Yakin ingin menghapus user ${user.full_name}?`)) return;
		try {
			deletingId = user.id;
			const res = await fetch(`${API_BASE_URL}/api/users/${user.id}`, {
				method: 'DELETE'
			});
			const result = await res.json();
			if (res.ok) {
				await loadUsers();
			} else {
				alert(result.error || 'Gagal menghapus user.');
			}
		} catch (err) {
			console.error(err);
			alert('Terjadi kesalahan saat menghapus user.');
		} finally {
			deletingId = null;
		}
	}

	async function saveUser() {
		touched = {
			full_name: true,
			username: true,
			email: true,
			phone: true,
			address: true,
			role_id: true,
			tanggal_lahir: true
		};
		if (!validate()) {
			alert('Mohon lengkapi semua field.');
			return;
		}

		const url = editingUserId
			? `${API_BASE_URL}/api/users/${editingUserId}`
			: `${API_BASE_URL}/api/users`;
		const method = editingUserId ? 'PUT' : 'POST';

		try {
			isSaving = true;
			const res = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(newUser)
			});
			const result = await res.json();

			if (res.ok) {
				showModal = false;
				resetForm();
				await loadUsers();
			} else if (res.status === 409) {
				// backend kirim { error: "...", fields: { username?: "...", email?: "..." } }
				errors = { ...errors, ...(result.fields || {}) };
				// tandai field-nya supaya pesan tampil
				if (result.fields?.username) touched.username = true;
				if (result.fields?.email) touched.email = true;
			} else {
				alert(result.error || 'Gagal menyimpan user.');
			}
		} catch (error) {
			console.error(error);
			alert('Terjadi kesalahan saat menyimpan user.');
		} finally {
			isSaving = false;
		}
	}

	function resetForm() {
		newUser = {
			full_name: '',
			username: '',
			email: '',
			phone: '',
			address: '',
			role_id: '',
			tanggal_lahir: ''
		};
		errors = {};
		touched = {};
		editingUserId = null;
	}

	function validate() {
		errors = {};
		if (!newUser.full_name.trim()) errors.full_name = 'Nama lengkap wajib diisi';
		if (!newUser.username.trim()) errors.username = 'Username wajib diisi';
		if (!newUser.email.trim()) errors.email = 'Email wajib diisi';
		if (!newUser.phone.trim()) errors.phone = 'No. telepon wajib diisi';
		if (!newUser.address.trim()) errors.address = 'Alamat wajib diisi';
		if (!newUser.tanggal_lahir) errors.tanggal_lahir = 'Tanggal lahir wajib diisi';
		if (!newUser.role_id) errors.role_id = 'Role wajib dipilih';
		return Object.keys(errors).length === 0;
	}

	function formatDate(dateStr) {
		if (!dateStr) return '-';
		const date = new Date(dateStr);
		const day = date.getDate().toString().padStart(2, '0');
		const month = date.toLocaleString('id-ID', { month: 'long' });
		const year = date.getFullYear();
		const hour = date.getHours().toString().padStart(2, '0');
		const minute = date.getMinutes().toString().padStart(2, '0');
		return `${day} ${month} ${year} pukul ${hour}.${minute}`;
	}

	function rolePillClasses(roleName = '') {
		const r = roleName.toLowerCase();
		if (r.includes('admin')) return 'bg-red-50 text-red-700 ring-1 ring-red-200';
		if (r.includes('manager')) return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
		if (r.includes('staff') || r.includes('user'))
			return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
		return 'bg-gray-50 text-gray-700 ring-1 ring-gray-200';
	}

	function debounce(fn, wait = 300) {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(fn, wait);
	}

	async function checkAvailability() {
		const qs = new URLSearchParams();
		if (newUser.username) qs.set('username', newUser.username.trim());
		if (newUser.email) qs.set('email', newUser.email.trim());
		if (editingUserId) qs.set('excludeId', editingUserId);

		const res = await fetch(`${API_BASE_URL}/api/users/check?` + qs.toString());
		const data = await res.json();
		usernameTaken = !!data.username_taken;
		emailTaken = !!data.email_taken;

		if (usernameTaken) errors.username = 'Username sudah digunakan';
		else if (touched.username && !newUser.username.trim()) errors.username = 'Username wajib diisi';
		else delete errors.username;

		if (emailTaken) errors.email = 'Email sudah digunakan';
		else if (touched.email && !newUser.email.trim()) errors.email = 'Email wajib diisi';
		else delete errors.email;
	}
</script>

<!-- Container -->
<div
	class="flex h-full flex-col rounded-xl bg-white/60 p-5 shadow ring-1 ring-gray-100"
>
	<!-- Header -->
	<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div>
			<h2 class="text-2xl font-semibold tracking-tight text-gray-900">User Management</h2>
			<p class="mt-1 text-sm text-gray-500">Kelola akun, peran, dan akses pengguna.</p>
		</div>

		<div class="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-auto">
			<div class="relative flex-1 sm:flex-none">
				<input
					type="text"
					placeholder="Cari nama, email, atau role…"
					bind:value={searchQuery}
					class="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 pl-10 text-sm text-gray-700 shadow-sm transition outline-none placeholder:text-gray-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
				/>
				<svg
					class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
					viewBox="0 0 24 24"
					fill="none"
				>
					<path
						d="M21 21l-4.3-4.3M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/>
				</svg>
			</div>

			<button
				class="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 focus:outline-none active:scale-[.98]"
				on:click={openCreateModal}
			>
				<span>Tambah User</span>
			</button>
		</div>
	</div>

	<!-- Table / Content -->
	<div class="mt-6 overflow-hidden rounded-xl border border-gray-100">
		<div class="relative">
			{#if isLoading}
				<!-- Skeleton loading -->
				<div class="space-y-3 p-4">
					{#each Array(6) as _, i}
						<div class="h-12 animate-pulse rounded-lg bg-gray-100"></div>
					{/each}
				</div>
			{:else}
				<div class="overflow-auto">
					<table class="w-full border-separate [border-spacing:0] text-sm">
						<thead class="sticky top-0 z-10 bg-white/80 backdrop-blur">
							<tr class="text-left text-gray-600">
								<th class="border-b border-gray-100 px-4 py-3 font-semibold">No</th>
								<th class="border-b border-gray-100 px-4 py-3 font-semibold">Full Name</th>
								<th class="border-b border-gray-100 px-4 py-3 font-semibold">Email</th>
								<th class="border-b border-gray-100 px-4 py-3 font-semibold">Role</th>
								<th class="border-b border-gray-100 px-4 py-3 font-semibold">Last Login</th>
								<th class="border-b border-gray-100 px-4 py-3 font-semibold">Action</th>
							</tr>
						</thead>
						<tbody>
							{#each filtered as user, index}
								<tr class="group transition hover:bg-gray-50/80">
									<td class="border-b border-gray-100 px-4 py-3 text-gray-500">{index + 1}</td>
									<td class="border-b border-gray-100 px-4 py-3">
										<div class="flex items-center gap-3">
											<div class="min-w-0">
												<div class="truncate font-medium text-gray-900">{user.full_name}</div>
												<div class="truncate text-xs text-gray-500">@{user.username}</div>
											</div>
										</div>
									</td>
									<td class="border-b border-gray-100 px-4 py-3 text-gray-700">{user.email}</td>
									<td class="border-b border-gray-100 px-4 py-3">
										<span
											class={'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ' +
												rolePillClasses(user.role)}
										>
											{user.role || '-'}
										</span>
									</td>
									<td class="border-b border-gray-100 px-4 py-3 text-gray-700"
										>{formatDate(user.last_login)}</td
									>
									<td class="border-b border-gray-100 px-4 py-3">
										<div class="flex flex-wrap gap-2">
											<button
												on:click={() => handleEdit(user)}
												class="inline-flex items-center justify-center rounded-md border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm transition hover:bg-blue-50 focus:ring-4 focus:ring-blue-100 focus:outline-none"
											>
												Edit
											</button>
											<button
												on:click={() => handleDelete(user)}
												class="inline-flex items-center justify-center rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm transition hover:bg-red-50 focus:ring-4 focus:ring-red-100 focus:outline-none disabled:opacity-50"
												disabled={deletingId === user.id}
											>
												{deletingId === user.id ? 'Deleting…' : 'Delete'}
											</button>
										</div>
									</td>
								</tr>
							{:else}
								<tr>
									<td colspan="6" class="px-4 py-10">
										<div class="flex flex-col items-center justify-center gap-2 text-center">
											<div class="rounded-full bg-gray-100 p-3 text-gray-400">🙈</div>
											<p class="text-sm font-medium text-gray-700">Tidak ada user yang cocok</p>
											<p class="text-xs text-gray-500">
												Coba ganti kata kunci pencarian atau tambahkan user baru.
											</p>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>

	<!-- Modal -->
	{#if showModal}
		<div
			class="fixed inset-0 z-[60] grid place-items-center bg-black/30 backdrop-blur-sm"
			transition:fade
		>
			<div
				class="w-full max-w-xl origin-center rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-gray-100"
				transition:scale={{ duration: 150 }}
			>
				<div class="flex items-start justify-between">
					<div>
						<h3 class="text-lg font-semibold text-gray-900">
							{editingUserId ? 'Edit User' : 'Tambah User Baru'}
						</h3>
						<p class="mt-1 text-xs text-gray-500">Pastikan seluruh data terisi dengan benar.</p>
					</div>
					<button
						class="rounded-md p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
						on:click={() => (showModal = false)}
						aria-label="Tutup"
						title="Tutup"
					>
						x
					</button>
				</div>

				<div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
					<!-- Full Name -->
					<div class="md:col-span-2">
						<label class="mb-1 block text-xs font-medium text-gray-700">Nama Lengkap</label>
						<input
							type="text"
							placeholder="Nama Lengkap"
							class="w-full rounded-lg border px-3 py-2 transition outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 {errors.full_name &&
							touched.full_name
								? 'border-red-500'
								: 'border-gray-300'}"
							bind:value={newUser.full_name}
							on:blur={() => (touched.full_name = true)}
						/>
						{#if errors.full_name && touched.full_name}
							<p class="mt-1 text-xs text-red-600">{errors.full_name}</p>
						{/if}
					</div>

					<!-- Username -->
					<div>
						<label class="mb-1 block text-xs font-medium text-gray-700">Username</label>
						<input
							type="text"
							placeholder="Username"
							class="w-full rounded-lg border px-3 py-2 transition outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 {errors.username &&
							touched.username
								? 'border-red-500'
								: 'border-gray-300'}"
							bind:value={newUser.username}
							on:blur={() => {
								touched.username = true;
								debounce(checkAvailability);
							}}
						/>
						{#if errors.username && touched.username}
							<p class="mt-1 text-xs text-red-600">{errors.username}</p>
						{/if}
					</div>

					<!-- Email -->
					<div>
						<label class="mb-1 block text-xs font-medium text-gray-700">Email</label>
						<input
							type="email"
							placeholder="email@domain.com"
							class="w-full rounded-lg border px-3 py-2 transition outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 {errors.email &&
							touched.email
								? 'border-red-500'
								: 'border-gray-300'}"
							bind:value={newUser.email}
							on:blur={() => {
								touched.email = true;
								debounce(checkAvailability);
							}}
						/>
						{#if errors.email && touched.email}
							<p class="mt-1 text-xs text-red-600">{errors.email}</p>
						{/if}
					</div>

					<!-- Phone -->
					<div>
						<label class="mb-1 block text-xs font-medium text-gray-700">Telepon</label>
						<input
							type="text"
							placeholder="08xxxxxxxxxx"
							class="w-full rounded-lg border px-3 py-2 transition outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 {errors.phone &&
							touched.phone
								? 'border-red-500'
								: 'border-gray-300'}"
							bind:value={newUser.phone}
							on:blur={() => (touched.phone = true)}
						/>
						{#if errors.phone && touched.phone}
							<p class="mt-1 text-xs text-red-600">{errors.phone}</p>
						{/if}
					</div>

					<!-- Address -->
					<div class="md:col-span-2">
						<label class="mb-1 block text-xs font-medium text-gray-700">Alamat</label>
						<input
							type="text"
							placeholder="Alamat"
							class="w-full rounded-lg border px-3 py-2 transition outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 {errors.address &&
							touched.address
								? 'border-red-500'
								: 'border-gray-300'}"
							bind:value={newUser.address}
							on:blur={() => (touched.address = true)}
						/>
						{#if errors.address && touched.address}
							<p class="mt-1 text-xs text-red-600">{errors.address}</p>
						{/if}
					</div>

					<!-- Tanggal Lahir -->
					<div>
						<label class="mb-1 block text-xs font-medium text-gray-700">Tanggal Lahir</label>
						<input
							type="date"
							class="w-full rounded-lg border px-3 py-2 transition outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 {errors.tanggal_lahir &&
							touched.tanggal_lahir
								? 'border-red-500'
								: 'border-gray-300'}"
							bind:value={newUser.tanggal_lahir}
							on:blur={() => (touched.tanggal_lahir = true)}
						/>
						{#if errors.tanggal_lahir && touched.tanggal_lahir}
							<p class="mt-1 text-xs text-red-600">{errors.tanggal_lahir}</p>
						{/if}
					</div>

					<!-- Role -->
					<div>
						<label class="mb-1 block text-xs font-medium text-gray-700">Role</label>
						<select
							class="w-full rounded-lg border px-3 py-2 transition outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 {errors.role_id &&
							touched.role_id
								? 'border-red-500'
								: 'border-gray-300'}"
							bind:value={newUser.role_id}
							on:blur={() => (touched.role_id = true)}
						>
							<option value="" disabled selected>Pilih Role</option>
							{#each roles as role}
								<option value={role.role_id}>{role.nama_role}</option>
							{/each}
						</select>
						{#if errors.role_id && touched.role_id}
							<p class="mt-1 text-xs text-red-600">{errors.role_id}</p>
						{/if}
					</div>
				</div>

				<div class="mt-6 flex items-center justify-end gap-2">
					<button
						class="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:ring-4 focus:ring-gray-200 focus:outline-none"
						on:click={() => (showModal = false)}
						disabled={isSaving}
					>
						Batal
					</button>
					<button
						class="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 focus:outline-none disabled:opacity-60"
						on:click={saveUser}
						disabled={isSaving || usernameTaken || emailTaken}
					>
						{isSaving ? 'Menyimpan…' : editingUserId ? 'Update' : 'Create'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	/* opsional: haluskan scroll di dalam table */
	:global(html) {
		scroll-behavior: smooth;
	}
</style>
