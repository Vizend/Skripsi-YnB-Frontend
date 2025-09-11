<script>
	import { createEventDispatcher } from 'svelte';

	// ── State form
	let tanggal = new Date().toISOString().split('T')[0];
	let kode_barang = '';
	let nama_barang = '';
	let jumlah = 0;

	// Input harga
	let calcMode = 'unit'; // NEW: 'unit' | 'total'
	let harga_satuan_input = 0; // NEW: harga satuan yg diketik user
	let harga_total_input = 0; // NEW: harga total yg diketik user
	let biaya_pengiriman = 0; // NEW: ongkir (opsional)

	// UI/UX
	let useFIFO = false;
	let isLoading = false;
	let isSubmitting = false;
	let errorMsg = '';

	// Autocomplete
	let suggestions = [];
	let showDropdown = false;
	let activeIndex = -1;

	const dispatch = createEventDispatcher();

	// Debounce helper
	let timer;
	function debounce(fn, ms = 250) {
		return (...args) => {
			clearTimeout(timer);
			timer = setTimeout(() => fn(...args), ms);
		};
	}

	// Format Rupiah
	const formatIDR = (n) =>
		(Number(n) || 0).toLocaleString('id-ID', { style: 'currency', currency: 'IDR' });

	function onNamaInput(e) {
		nama_barang = e.target.value;
		searchBarang(nama_barang);
	}

	// Prefill dari kode / pencarian
	async function prefillByKode() {
		errorMsg = '';
		if (!kode_barang) return;

		isLoading = true;
		try {
			const url = new URL('http://localhost:8080/api/barang/prefill');
			url.searchParams.set('kode', kode_barang);
			if (useFIFO) url.searchParams.set('prefer', 'fifo');

			const res = await fetch(url.toString());
			if (!res.ok) {
				showDropdown = false;
				return;
			}
			const d = await res.json();
			nama_barang = d.nama_barang || nama_barang;

			// sarankan harga beli => isi ke input satuan
			if ((d.saran_harga_pembelian ?? 0) > 0) {
				harga_satuan_input = d.saran_harga_pembelian;
				calcMode = 'unit';
			}
		} catch (e) {
			errorMsg = 'Gagal mengambil data barang.';
		} finally {
			isLoading = false;
		}
	}

	const searchBarang = debounce(async (text) => {
		const q = (text || '').trim();
		if (!q) {
			suggestions = [];
			showDropdown = false;
			activeIndex = -1;
			return;
		}
		try {
			const res = await fetch(`http://localhost:8080/api/barang/search?q=${encodeURIComponent(q)}`);
			if (!res.ok) return;
			suggestions = await res.json();
			showDropdown = suggestions.length > 0;
			activeIndex = suggestions.length ? 0 : -1;
		} catch {}
	}, 250);

	async function chooseSuggestion(item) {
		showDropdown = false;
		kode_barang = item.kode_barang;
		nama_barang = item.nama_barang;
		await prefillByKode();
	}

	function onNamaKeyDown(e) {
		if (!showDropdown || suggestions.length === 0) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			activeIndex = (activeIndex + 1) % suggestions.length;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			activeIndex = (activeIndex - 1 + suggestions.length) % suggestions.length;
		} else if (e.key === 'Enter' && activeIndex >= 0) {
			e.preventDefault();
			chooseSuggestion(suggestions[activeIndex]);
		} else if (e.key === 'Escape') {
			showDropdown = false;
		}
	}

	// Perhitungan reaktif
	$: qty = +jumlah || 0;
	$: unitTyped = +harga_satuan_input || 0;
	$: totalTyped = +harga_total_input || 0;
	$: ship = +biaya_pengiriman || 0;

	// harga dasar per unit (belum termasuk ongkir)
	$: baseUnit = calcMode === 'total' ? (qty > 0 ? totalTyped / qty : 0) : unitTyped;

	// ongkir per unit
	$: shipPerUnit = qty > 0 ? ship / qty : 0;

	// harga satuan final (termasuk alokasi ongkir)
	$: harga_satuan_final = baseUnit + shipPerUnit;

	// total akhir
	$: total_final = calcMode === 'total' ? totalTyped + ship : unitTyped * qty + ship;

	// Submit
	async function submit() {
		errorMsg = '';
		if (!tanggal || !kode_barang || !nama_barang) {
			errorMsg = 'Tanggal, Kode barang, dan Nama barang wajib diisi.';
			return;
		}
		if (qty <= 0) {
			errorMsg = 'Jumlah harus lebih besar dari 0.';
			return;
		}
		if (harga_satuan_final <= 0) {
			errorMsg = 'Harga belum valid. Isi Harga Satuan atau Harga Total.';
			return;
		}

		isSubmitting = true;

		const body = {
			tanggal,
			kode_barang,
			nama_barang,
			jumlah: qty,
			// kirim nilai final agar backend konsisten
			harga_satuan: Math.round(harga_satuan_final),
			total: Math.round(total_final),
			// metadata opsional (boleh diabaikan backend)
			biaya_pengiriman: Math.round(ship),
			input_mode: calcMode,
			harga_satuan_input: Math.round(unitTyped),
			harga_total_input: Math.round(totalTyped)
		};

		try {
			const res = await fetch('http://localhost:8080/api/pembelian/manual', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			if (res.ok) {
				alert('Pembelian berhasil disimpan');
				dispatch('success');
			} else {
				const t = await res.text().catch(() => '');
				errorMsg = t || 'Gagal menyimpan pembelian.';
			}
		} finally {
			isSubmitting = false;
		}
	}
</script>

<!-- CARD -->
<div class="mx-auto w-full max-w-2xl rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-lg font-semibold text-gray-800">Input Pembelian Manual</h2>

		<label class="inline-flex cursor-pointer items-center gap-2 text-sm">
			<input type="checkbox" bind:checked={useFIFO} class="h-4 w-4 rounded border-gray-300" />
			<span class="text-gray-700">Gunakan harga FIFO</span>
		</label>
	</div>

	{#if errorMsg}
		<div class="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
			{errorMsg}
		</div>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2">
		<!-- Tanggal -->
		<div>
			<label class="mb-1 block text-sm font-medium text-gray-700">Tanggal</label>
			<input
				type="date"
				bind:value={tanggal}
				class="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
			/>
		</div>

		<!-- Kode -->
		<div>
			<label class="mb-1 block text-sm font-medium text-gray-700">Kode Barang</label>
			<div class="flex items-stretch gap-2">
				<input
					id="kode_barang"
					type="text"
					placeholder="Contoh: ABC-001"
					bind:value={kode_barang}
					class="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
					on:blur={prefillByKode}
				/>
				<button
					type="button"
					class="rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm text-gray-700 hover:bg-gray-100"
					on:click={prefillByKode}
					disabled={isLoading}
					title="Ambil data dari kode"
				>
					{isLoading ? 'Memuat…' : 'Cari'}
				</button>
			</div>
			<p class="mt-1 text-xs text-gray-500">
				Ketik kode lalu klik <b>Cari</b> untuk mengisi Nama dan Harga otomatis.
			</p>
		</div>

		<!-- Nama + autocomplete -->
		<div class="relative sm:col-span-2">
			<label class="mb-1 block text-sm font-medium text-gray-700">Nama Barang</label>
			<input
				id="nama_barang"
				type="text"
				placeholder="Ketik nama barang untuk mencari…"
				class="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
				value={nama_barang}
				on:input={onNamaInput}
				on:keydown={onNamaKeyDown}
				on:focus={() => (showDropdown = suggestions.length > 0)}
				on:blur={() => setTimeout(() => (showDropdown = false), 150)}
				autocomplete="off"
			/>
			{#if showDropdown}
				<ul
					class="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg"
				>
					{#each suggestions as s, i}
						<li
							class={`flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 ${i === activeIndex ? 'bg-gray-50' : ''} cursor-pointer`}
							on:mousedown={() => chooseSuggestion(s)}
						>
							<span class="truncate"
								><span class="font-medium text-gray-800">{s.kode_barang}</span><span
									class="text-gray-400"
								>
									—
								</span><span class="text-gray-700">{s.nama_barang}</span></span
							>
							{#if s.is_active === 0}
								<span
									class="ml-3 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
									>arsip</span
								>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<!-- Jumlah -->
		<div>
			<label class="mb-1 block text-sm font-medium text-gray-700">Jumlah</label>
			<input
				id="jumlah"
				type="number"
				min="0"
				step="1"
				placeholder="0"
				bind:value={jumlah}
				class="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
			/>
		</div>

		<!-- Mode Input -->
		<div>
			<label class="mb-1 block text-sm font-medium text-gray-700">Mode Input Harga</label>
			<div class="flex gap-4 text-sm">
				<label class="inline-flex items-center gap-2">
					<input type="radio" name="mode" value="unit" bind:group={calcMode} />
					<span>Harga Satuan</span>
				</label>
				<label class="inline-flex items-center gap-2">
					<input type="radio" name="mode" value="total" bind:group={calcMode} />
					<span>Harga Total</span>
				</label>
			</div>
		</div>

		<!-- Harga Satuan (input) -->
		{#if calcMode === 'unit'}
			<div class="sm:col-span-1">
				<label class="mb-1 block text-sm font-medium text-gray-700">Harga Satuan</label>
				<div class="relative">
					<input
						id="harga_satuan"
						type="number"
						min="0"
						step="1"
						placeholder="0"
						bind:value={harga_satuan_input}
						class="w-full rounded-lg border border-gray-300 px-3 py-2 pr-20 shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
						on:input={() => (calcMode = 'unit')}
					/>
					<div
						class="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-gray-500"
					>
						{formatIDR(harga_satuan_input)}
					</div>
				</div>
				<p class="mt-1 text-xs text-gray-500">
					Terisi otomatis dari {useFIFO ? 'harga FIFO' : 'harga beli terakhir'} (bisa diedit).
				</p>
			</div>
		{/if}

		<!-- Harga Total (input) -->
		{#if calcMode === 'total'}
			<div class="sm:col-span-1">
				<label class="mb-1 block text-sm font-medium text-gray-700">Harga Total</label>
				<div class="relative">
					<input
						id="harga_total"
						type="number"
						min="0"
						step="1"
						placeholder="0"
						bind:value={harga_total_input}
						class="w-full rounded-lg border border-gray-300 px-3 py-2 pr-20 shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
						on:input={() => (calcMode = 'total')}
					/>
					<div
						class="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-gray-500"
					>
						{formatIDR(harga_total_input)}
					</div>
				</div>
				<p class="mt-1 text-xs text-gray-500">Jika diisi, harga satuan = (harga total ÷ jumlah).</p>
			</div>
		{/if}

		<!-- Biaya Pengiriman (opsional) -->
		<div class="sm:col-span-1">
			<label class="mb-1 block text-sm font-medium text-gray-700">Biaya Pengiriman (opsional)</label
			>
			<div class="relative">
				<input
					id="biaya_pengiriman"
					type="number"
					min="0"
					step="1"
					placeholder="0"
					bind:value={biaya_pengiriman}
					class="w-full rounded-lg border border-gray-300 px-3 py-2 pr-20 shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
				/>
				<div
					class="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-gray-500"
				>
					{formatIDR(biaya_pengiriman)}
				</div>
			</div>
			<p class="mt-1 text-xs text-gray-500">
				Dibagi rata ke tiap unit ({qty > 0 ? formatIDR(shipPerUnit) + '/unit' : 'isi jumlah dulu'}).
			</p>
		</div>

		<!-- Ringkasan perhitungan -->
		<div
			class="grid gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm sm:col-span-2"
		>
			<div class="flex justify-between">
				<span class="font-medium text-blue-800">Harga satuan akhir (incl. ongkir)</span><span
					class="text-blue-700">{formatIDR(harga_satuan_final)}</span
				>
			</div>
			<div class="flex justify-between">
				<span class="text-blue-800">Total (incl. ongkir)</span><span class="text-blue-700"
					>{formatIDR(total_final)}</span
				>
			</div>
		</div>
	</div>

	<!-- Actions -->
	<div class="mt-5 flex items-center justify-end gap-3">
		<button
			type="button"
			class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
			on:click={() => {
				tanggal = new Date().toISOString().split('T')[0];
				kode_barang = '';
				nama_barang = '';
				jumlah = 0;
				harga_satuan_input = 0;
				harga_total_input = 0;
				biaya_pengiriman = 0;
				calcMode = 'unit';
				suggestions = [];
				showDropdown = false;
				activeIndex = -1;
				errorMsg = '';
			}}
		>
			Reset
		</button>
		<button
			class="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
			on:click={submit}
			disabled={isSubmitting ||
				!tanggal ||
				!kode_barang ||
				!nama_barang ||
				qty <= 0 ||
				(calcMode === 'unit' ? unitTyped <= 0 : totalTyped <= 0)}
		>
			{isSubmitting ? 'Menyimpan…' : 'Simpan'}
		</button>
	</div>
</div>
