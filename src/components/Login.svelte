<script>
	import { login } from '../api/auth';
	import { goto } from '$app/navigation';

	let username = '';
	let password = '';
	let error = '';
	let loading = false;
	let showPassword = false;
	let cooldown = 0;
	let cooldownTimer;

	function startCooldown(sec) {
		clearInterval(cooldownTimer);
		cooldown = Math.max(1, Math.floor(sec || 60)); // fallback 60s
		cooldownTimer = setInterval(() => {
			cooldown -= 1;
			if (cooldown <= 0) clearInterval(cooldownTimer);
		}, 1000);
	}

	async function handleLogin() {
		if (cooldown > 0) return;
		error = '';
		loading = true;
		try {
			const data = await login(username.trim(), password);
			localStorage.setItem('token', data.token); // hapus jika pindah ke HttpOnly cookie
			localStorage.setItem('user', JSON.stringify(data.user));
			goto('/dashboard');
		} catch (e) {
			error = e?.message || 'Login gagal. Periksa kredensial Anda.';
			if (e?.code === 429) startCooldown(e?.retryAfter || 60);
		} finally {
			loading = false;
		}
	}
</script>

<!-- Latar abu-abu lembut -->
<div class="flex min-h-screen items-center justify-center bg-slate-100 p-6">
	<div class="w-full max-w-md">
		<!-- Kartu minimalis -->
		<div class="rounded-2xl border border-slate-200 bg-white shadow-lg">
			<div class="p-8 md:p-10">
				<h1 class="text-center text-2xl font-semibold text-slate-900">Welcome</h1>
				<p class="mt-2 text-center text-sm text-slate-600">Masuk untuk melanjutkan ke dashboard</p>

				{#if error}
					<div
						class="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
					>
						{error}
					</div>
				{/if}

				<form class="mt-8 space-y-6" on:submit|preventDefault={handleLogin}>
					<div class="space-y-5">
						<!-- USERNAME -->
						<div class="relative">
							<input
								id="username"
								type="text"
								bind:value={username}
								required
								placeholder="Username"
								autocomplete="username"
								class="peer block w-full rounded-xl border border-slate-300 bg-white px-4 pt-5 pb-2 text-slate-900 placeholder-transparent shadow-sm transition outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
								aria-invalid={!!error}
							/>
							<label
								for="username"
								class="pointer-events-none absolute top-2 left-4 text-sm text-slate-500 transition-all
									peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base
									peer-focus:top-2 peer-focus:-translate-y-0 peer-focus:text-sm">Username</label
							>
						</div>

						<!-- PASSWORD -->
						<div class="relative">
							<input
								id="password"
								type={showPassword ? 'text' : 'password'}
								bind:value={password}
								required
								placeholder="Password"
								autocomplete="current-password"
								class="peer block w-full rounded-xl border border-slate-300 bg-white px-4 pt-5 pb-2 text-slate-900 placeholder-transparent shadow-sm transition outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
								aria-invalid={!!error}
							/>
							<label
								for="password"
								class="pointer-events-none absolute top-2 left-4 text-sm text-slate-500 transition-all
									peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base
									peer-focus:top-2 peer-focus:-translate-y-0 peer-focus:text-sm">Password</label
							>

							<!-- Toggle teks (tanpa ikon) -->
							<button
								type="button"
								class="absolute inset-y-0 right-3 my-auto text-xs font-medium text-indigo-600 hover:underline"
								on:click={() => (showPassword = !showPassword)}
								aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
							>
								{showPassword ? 'Hide' : 'Show'}
							</button>
						</div>
					</div>

					<button
						type="submit"
						disabled={loading || !username || !password || cooldown > 0}
						class="w-full rounded-xl bg-indigo-600 px-4 py-3 font-medium text-white shadow-sm transition
							hover:bg-indigo-700 focus-visible:ring-4 focus-visible:ring-indigo-200 focus-visible:outline-none
							disabled:cursor-not-allowed disabled:opacity-60"
					>
						{#if loading}Memproses…{:else if cooldown > 0}Coba lagi dalam {cooldown}s{:else}Log In{/if}
					</button>

				</form>
			</div>
		</div>
	</div>
</div>
