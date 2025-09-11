<script>
	import { onMount } from 'svelte';

	let user = {
		id: '',
		full_name: '',
		username: '',
		email: '',
		phone: '',
		address: '',
		tanggal_lahir: ''
	};

	let password = {
		lama: '',
		baru: ''
	};

	let loading = false;
	let errors = {};
	let touched = {};

	onMount(() => {
		const stored = localStorage.getItem('user');
		if (stored) {
			const parsed = JSON.parse(stored);
			if (parsed.tanggal_lahir?.includes('T')) {
				parsed.tanggal_lahir = parsed.tanggal_lahir.split('T')[0]; // Potong bagian jam
			}

			user = { ...user, ...parsed };
		}
	});

	async function updateProfile() {
		touched = {
			full_name: true,
			username: true,
			email: true,
			phone: true,
			address: true,
			tanggal_lahir: true
		};

		if (!validateProfile()) {
			alert('Mohon lengkapi semua field dengan benar.');
			return;
		}

		loading = true;
		try {
			const res = await fetch(`http://localhost:8080/api/users/${user.id}/profile`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(user)
			});
			const result = await res.json();

			if (res.ok) {
				alert('Profil berhasil diperbarui!');
				localStorage.setItem('user', JSON.stringify(result.user)); // update local cache
			} else {
				alert(result.error || 'Gagal update profil.');
			}
		} catch (err) {
			console.error(err);
			alert('Terjadi kesalahan saat menyimpan.');
		}
		loading = false;
	}

	async function changePassword() {
		touched.password_lama = true;
		touched.password_baru = true;

		if (!validatePassword()) {
			alert('Mohon lengkapi form password.');
			return;
		}

		loading = true;
		try {
			const res = await fetch(`http://localhost:8080/api/users/${user.id}/change-password`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					password_lama: password.lama,
					password_baru: password.baru
				})
			});
			const result = await res.json();

			if (res.ok) {
				alert('Password berhasil diperbarui!');
				password = { lama: '', baru: '' };
				errors = {};
				touched = {};
			} else {
				alert(result.error || 'Gagal ubah password.');
			}
		} catch (err) {
			console.error(err);
			alert('Terjadi kesalahan saat update password.');
		}
		loading = false;
	}

	function validateProfile() {
		errors = {};

		if (!user.full_name.trim()) errors.full_name = 'Nama lengkap wajib diisi';
		if (!user.username.trim()) errors.username = 'Username wajib diisi';
		if (!user.email.trim()) errors.email = 'Email wajib diisi';
		else {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(user.email)) errors.email = 'Format email tidak valid';
		}

		if (!user.phone.trim()) errors.phone = 'No. telepon wajib diisi';
		else if (user.phone.replace(/\D/g, '').length < 8) errors.phone = 'No. telepon tidak valid';

		if (!user.address.trim()) errors.address = 'Alamat wajib diisi';
		if (!user.tanggal_lahir) errors.tanggal_lahir = 'Tanggal lahir wajib diisi';

		// if (!user.password_lama) errors.password_lama = 'Password lama wajib diisi';
		// if (!user.password_baru) errors.password_baru = 'Password baru wajib diisi';
		// else if (user.password_baru.length < 6) errors.password_baru = 'Password minimal 6 karakter';

		return Object.keys(errors).length === 0;
	}

	function validatePassword() {
		errors = {};

		if (!password.lama) errors.password_lama = 'Password lama wajib diisi';
		if (!password.baru) errors.password_baru = 'Password baru wajib diisi';
		else if (password.baru.length < 6) errors.password_baru = 'Password minimal 6 karakter';

		return Object.keys(errors).length === 0;
	}
</script>

<div class="mx-auto mt-8 w-full max-w-2xl rounded-lg bg-white p-6 shadow-md">
	<h2 class="mb-6 text-2xl font-bold text-gray-800">Edit Profil Saya</h2>

	<div class="grid gap-4 md:grid-cols-2">
		{#each [['Nama Lengkap', 'full_name', 'text'], ['Username', 'username', 'text'], ['Email', 'email', 'email'], ['No. Telepon', 'phone', 'text'], ['Alamat', 'address', 'text'], ['Tanggal Lahir', 'tanggal_lahir', 'date']] as [label, field, type]}
			<div class="col-span-2 sm:col-span-1">
				<label class="mb-1 block text-sm font-medium text-gray-600">
					{label}<span class="text-red-500">*</span>
				</label>
				<input
					{type}
					bind:value={user[field]}
					on:blur={() => (touched[field] = true)}
					class="w-full rounded border px-4 py-2 focus:border-blue-500 focus:outline-none {errors[
						field
					] && touched[field]
						? 'border-red-500'
						: 'border-gray-300'}"
				/>
				{#if errors[field] && touched[field]}
					<p class="text-sm text-red-500">{errors[field]}</p>
				{/if}
			</div>
		{/each}
	</div>

	<button
		on:click={updateProfile}
		class="mt-6 w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
		disabled={loading}
	>
		{loading ? 'Menyimpan...' : 'Simpan Perubahan'}
	</button>

	<hr class="my-6" />

	<h3 class="mb-4 text-xl font-semibold text-gray-800">Ubah Password</h3>
	<div class="grid gap-4 md:grid-cols-2">
		<div>
			<label class="mb-1 block text-sm font-medium text-gray-600"
				>Password Lama<span class="text-red-500">*</span></label
			>
			<input
				type="password"
				bind:value={password.lama}
				on:blur={() => (touched.password_lama = true)}
				class="w-full rounded border px-4 py-2 focus:border-blue-500 focus:outline-none {errors.password_lama &&
				touched.password_lama
					? 'border-red-500'
					: 'border-gray-300'}"
			/>
			{#if errors.password_lama && touched.password_lama}
				<p class="text-sm text-red-500">{errors.password_lama}</p>
			{/if}
		</div>
		<div>
			<label class="mb-1 block text-sm font-medium text-gray-600"
				>Password Baru<span class="text-red-500">*</span></label
			>
			<input
				type="password"
				bind:value={password.baru}
				on:blur={() => (touched.password_baru = true)}
				class="w-full rounded border px-4 py-2 focus:border-blue-500 focus:outline-none {errors.password_baru &&
				touched.password_baru
					? 'border-red-500'
					: 'border-gray-300'}"
			/>
			{#if errors.password_baru && touched.password_baru}
				<p class="text-sm text-red-500">{errors.password_baru}</p>
			{/if}
		</div>
	</div>

	<button
		on:click={changePassword}
		class="mt-6 w-full rounded bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700 disabled:opacity-50"
		disabled={loading}
	>
		{loading ? 'Menyimpan...' : 'Ubah Password'}
	</button>
</div>
