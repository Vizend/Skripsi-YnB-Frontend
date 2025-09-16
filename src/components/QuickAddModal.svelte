<script>
	import PembelianForm from './PembelianForm.svelte';
	import ExpenseForm from './ExpenseForm.svelte';
	import EquityForm from './EquityForm.svelte';
	import { API_BASE_URL } from '../api/apiconfigs';

	export let open = false;
	export let onClose = () => {};
	export let onAfterAnySubmit = async () => {};

	// state tampilan isi modal
	let mode = 'menu'; // "menu" | "pembelian" | "beban" | "equity" | "txt"
	let isProcessing = false;

	//reset ke menu ketika setiap kali modal ditutup
	$: if (!open && mode !== 'menu') {
		mode = 'menu';
		isProcessing = false;
	}

	function closeAndReset() {
		mode = 'menu';
		isProcessing = false;
		onClose();
	}

	async function handleDone() {
		await onAfterAnySubmit();
		closeAndReset();
	}

	async function handleTxt(e) {
		const file = e.target.files?.[0];
		if (!file) return;
		isProcessing = true;

		const buildFD = () => {
			const fd = new FormData();
			fd.append('file', file);
			return fd;
		};

		try {
			// 1) JSON transaksi
			await fetch(`${API_BASE_URL}/api/transactions`, { method: 'POST', body: buildFD() });

			// 2) Download CSV
			const csvRes = await fetch(`${API_BASE_URL}/api/convert`, {
				method: 'POST',
				body: buildFD()
			});
			if (csvRes.ok) {
				const blob = await csvRes.blob();
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = 'transactions.csv';
				document.body.appendChild(a);
				a.click();
				a.remove();
				URL.revokeObjectURL(url);
			}

			// 3) Upload XJD => Jurnal
			const xjdRes = await fetch(`${API_BASE_URL}/api/xjd/upload`, {
				method: 'POST',
				body: buildFD()
			});
			if (!xjdRes.ok) throw new Error('Gagal upload jurnal dari TXT');

			alert('Penjualan dari TXT berhasil diproses.');
			await handleDone();
		} catch (err) {
			alert(err.message || 'Gagal memproses TXT');
		} finally {
			isProcessing = false;
			e.target.value = '';
		}
	}
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
		<div class="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl">
			<div class="mb-3 flex items-center justify-between">
				<div class="flex items-center gap-2">
					{#if mode !== 'menu'}
						<button
							type="button"
							class="rounded-lg border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
							on:click={() => (mode = 'menu')}
							aria-label="Kembali ke menu"
						>
							⬅ Menu
						</button>
					{/if}
					<h3 class="text-lg font-semibold">
						{mode === 'menu'
							? 'Tambah Transaksi'
							: mode === 'pembelian'
								? 'Form Pembelian'
								: mode === 'beban'
									? 'Form Beban'
									: mode === 'equity'
										? 'Form Modal / Prive'
										: 'Upload Penjualan dari TXT'}
					</h3>
				</div>

				<button
					class="text-xl text-gray-500 hover:text-red-500"
					on:click={closeAndReset}
					aria-label="Tutup">&times;</button
				>
			</div>

			{#if mode === 'menu'}
				<!-- 🎨 Card-style -->
				<div class="grid grid-cols-2 gap-3">
					<button
						type="button"
						class="group rounded-xl border border-gray-200 p-4 text-left transition hover:border-indigo-300 hover:shadow-sm"
						on:click={() => (mode = 'pembelian')}
					>
						<div class="flex items-start gap-3">
							<div class="rounded-lg bg-indigo-100 p-2 text-xl">🛒</div>
							<div>
								<div class="font-semibold text-gray-800 group-hover:text-indigo-700">Pembelian</div>
								<div class="text-xs text-gray-500">Input stok masuk + jurnal</div>
							</div>
						</div>
					</button>

					<button
						type="button"
						class="group rounded-xl border border-gray-200 p-4 text-left transition hover:border-rose-300 hover:shadow-sm"
						on:click={() => (mode = 'beban')}
					>
						<div class="flex items-start gap-3">
							<div class="rounded-lg bg-rose-100 p-2 text-xl">💸</div>
							<div>
								<div class="font-semibold text-gray-800 group-hover:text-rose-700">Beban</div>
								<div class="text-xs text-gray-500">Gaji, Listrik/Air, Transport</div>
							</div>
						</div>
					</button>

					<button
						type="button"
						class="group rounded-xl border border-gray-200 p-4 text-left transition hover:border-emerald-300 hover:shadow-sm"
						on:click={() => (mode = 'equity')}
					>
						<div class="flex items-start gap-3">
							<div class="rounded-lg bg-emerald-100 p-2 text-xl">💰</div>
							<div>
								<div class="font-semibold text-gray-800 group-hover:text-emerald-700">
									Modal / Prive
								</div>
								<div class="text-xs text-gray-500">Setoran modal & pengambilan</div>
							</div>
						</div>
					</button>

					<button
						type="button"
						class="group rounded-xl border border-dashed border-gray-300 p-4 text-left transition hover:border-sky-300 hover:shadow-sm"
						on:click={() => (mode = 'txt')}
					>
						<div class="flex items-start gap-3">
							<div class="rounded-lg bg-sky-100 p-2 text-xl">📄</div>
							<div>
								<div class="font-semibold text-gray-800 group-hover:text-sky-700">
									Penjualan dari TXT
								</div>
								<div class="text-xs text-gray-500">Proses TXT → CSV + jurnal</div>
							</div>
						</div>
					</button>
				</div>
			{:else if mode === 'pembelian'}
				<PembelianForm on:success={handleDone} />
			{:else if mode === 'beban'}
				<ExpenseForm on:success={handleDone} />
			{:else if mode === 'equity'}
				<EquityForm on:success={handleDone} />
			{:else if mode === 'txt'}
				<div class="space-y-3 text-sm">
					<p>
						Pilih file TXT penjualan Anda. Sistem akan: (1) ekstrak transaksi, (2) unduh CSV, (3)
						buat jurnal otomatis.
					</p>
					<input
						type="file"
						accept=".txt"
						on:change={handleTxt}
						class="w-full rounded border px-3 py-2"
					/>
					<button
						class="rounded bg-gray-200 px-3 py-1.5"
						on:click={() => (mode = 'menu')}
						disabled={isProcessing}
					>
						{isProcessing ? 'Memproses...' : 'Kembali'}
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
