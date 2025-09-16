<script>
	import { onMount } from 'svelte';
	import QuickAddModal from './QuickAddModal.svelte';
	import PembelianForm from './PembelianForm.svelte';
	import ExpenseForm from './ExpenseForm.svelte';
	import { API_BASE_URL } from '../api/apiconfigs';

	let activeTab = 'Journal Entries';
	let fileInput;
	let csvInput;
	let showForm = false;
	let isProcessing = false;
	let showQuickAdd = false;

	const tabs = [
		'Journal Entries',
		// 'Journal Adjustments',
		'Trial Balance',
		'Income Statement',
		'Balance Sheet',
		'Cost of Goods Sold',
		'Inventory Calculation'
	];

	let journalEntries = [];
	let journalAdjustments = [];
	let trialBalance = [];
	let incomeStatement = [];
	let balanceSheet = [];
	let cogs = {};
	let inventoryCalc = [];

	let totalRevenue = 0;
	let totalExpense = 0;
	let totalAsset = 0;
	let totalLiabEquity = 0;
	let totalDebit = 0;
	let totalCredit = 0;

	let selectedYear = new Date().getFullYear();
	let selectedMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');

	let showExpenseForm = false;

	let years = [];
	let months = [];

	$: {
		totalRevenue = incomeStatement
			.filter((row) => row.type === 'Revenue')
			.reduce((sum, row) => sum + row.amount, 0);
		totalExpense = incomeStatement
			.filter((row) => row.type === 'Expense')
			.reduce((sum, row) => sum + row.amount, 0);
		totalAsset = balanceSheet
			.filter((row) => row.type === 'Assets')
			.reduce((sum, row) => sum + row.amount, 0);
		totalLiabEquity = balanceSheet
			.filter((row) => row.type === 'Liabilities & Equity')
			.reduce((sum, row) => sum + row.amount, 0);
		totalDebit = trialBalance.reduce((sum, row) => sum + row.debit, 0);
		totalCredit = trialBalance.reduce((sum, row) => sum + row.credit, 0);
	}

	let result = null;

	function monthLabel(y, m) {
		// ubah dari hasil angka menjadi string bulan
		return new Date(y, m - 1, 1).toLocaleString('id-ID', { month: 'long' });
	}

	async function loadYearOptions() {
		const res = await fetch(`${API_BASE_URL}/api/akuntansi/years`);
		const arr = await res.json();
		years = arr;

		// set default jika selectedYear belum ada di list
		if (!years.includes(+selectedYear)) {
			selectedYear = years[0];
		}
	}

	async function loadMonthOptions() {
		const res = await fetch(`${API_BASE_URL}/api/akuntansi/months?year=${selectedYear}`);
		const nums = await res.json();
		months = nums.map((m) => ({
			value: String(m).padStart(2, '0'),
			label: monthLabel(selectedYear, m)
		}));

		// jaga-jaga: kalau selectedMonth tidak ada di list, pilih yang pertama
		if (!months.find((x) => x.value === selectedMonth)) {
			selectedMonth = months[0]?.value ?? '01';
		}
	}

	// agar saat user ganti tahun, bulan ikut refresh & data reload
	async function onYearChange(reloadFn) {
		await loadMonthOptions();
		await reloadFn();
	}

	function formatTanggal(iso) {
		if (!iso) return '';
		const d = new Date(iso);
		if (isNaN(d.getTime())) return 'Tanggal tidak valid';

		return new Intl.DateTimeFormat('id-ID', {
			day: '2-digit',
			month: 'long',
			year: 'numeric',
			timeZone: 'Asia/Jakarta'
		}).format(d);
	}

	async function refreshAfterExpense() {
		await Promise.all([
			loadJurnal(),
			loadTrialBalance(),
			loadIncomeStatement(),
			loadBalanceSheet()
		]);
		showExpenseForm = false;
	}

	//process xjd file to jurnal entries
	async function uploadXJDFile(event) {
		const file = event.target.files[0];
		const formData = new FormData();
		formData.append('file', file);

		const res = await fetch (`${API_BASE_URL}/api/xjd/upload`, {
			method: 'POST',
			body: formData
		});

		const text = await res.text();

		try {
			const json = JSON.parse(text);
			console.log('Berhasil:', json);
		} catch {
			console.error('Respon bukan JSON:', text);
		}

		if (res.ok) {
			alert('Upload dan proses sukses');
		} else {
			alert('Gagal upload');
		}
	}

	//convert to csv
	async function converttoCSV(event) {
		const file = event.target.files[0];
		const formData = new FormData();
		formData.append('file', file);

		try {
			const res = await fetch(`${API_BASE_URL}/api/transactions`, {
				method: 'POST',
				body: formData
			});

			if (!res.ok) {
				throw new Error('Failed to process file');
			}

			const transactions = await res.json();
			console.log('Transactions data:', transactions);

			alert('File processed successfully!');

			// untuk download CSV
			const csvRes = await fetch(`${API_BASE_URL}/api/convert`, {
				method: 'POST',
				body: formData
			});

			if (csvRes.ok) {
				const blob = await csvRes.blob();
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = 'transactions.csv';
				document.body.appendChild(a);
				a.click();
				a.remove();
				window.URL.revokeObjectURL(url);
			}
		} catch (error) {
			console.error('Error:', error);
			alert('Failed to process file: ' + error.message);
		}
	}

	async function processTxtAll(event) {
		const file = event.target.files?.[0];
		if (!file) return;

		isProcessing = true;

		// helper bikin FormData baru tiap panggilan
		const buildFD = () => {
			const fd = new FormData();
			fd.append('file', file);
			return fd;
		};

		try {
			// 1) Proses ke JSON transaksi
			const trxRes = await fetch(`${API_BASE_URL}/api/transactions`, {
				method: 'POST',
				body: buildFD()
			});
			if (!trxRes.ok) throw new Error('Gagal memproses /api/transactions');
			const transactions = await trxRes.json();
			console.log('Transactions:', transactions);

			// 2) download CSV
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
			} else {
				console.warn('Lewati unduh CSV: respon tidak OK');
			}

			// 3) Upload & proses jadi Journal Entries
			const xjdRes = await fetch(`${API_BASE_URL}/api/xjd/upload`, {
				method: 'POST',
				body: buildFD()
			});

			const raw = await xjdRes.text(); // bisa JSON atau text
			try {
				const parsed = JSON.parse(raw);
				console.log('XJD upload (JSON):', parsed);
			} catch {
				console.log('XJD upload (text):', raw);
			}

			if (!xjdRes.ok) throw new Error('Gagal upload /api/xjd/upload');

			// 4) Refresh data jurnal
			await loadJurnal();

			alert('Berhasil: transaksi diproses, CSV diunduh, dan jurnal diperbarui.');
		} catch (err) {
			console.error(err);
			alert(err.message || 'Terjadi kesalahan saat memproses file.');
		} finally {
			// reset input agar bisa pilih file yang sama lagi
			event.target.value = '';
			isProcessing = false;
		}
	}

	async function loadAllData() {
		await Promise.all([
			loadJurnal(),
			loadAdjustments(),
			loadTrialBalance(),
			loadIncomeStatement(),
			loadBalanceSheet(),
			loadCOGS(),
			loadInventoryCalc()
		]);
	}

	async function refreshAfterAnySubmit() {
		await loadAllData();
	}

	async function loadJurnal() {
		const res = await fetch(
			`${API_BASE_URL}/api/akuntansi/journal-entries?year=${selectedYear}&month=${parseInt(selectedMonth)}`
		);
		journalEntries = await res.json();
	}

	async function loadAdjustments() {
		const res = await fetch(`${API_BASE_URL}/api/akuntansi/journal-adjustments`);
		journalAdjustments = await res.json();
	}

	async function loadTrialBalance() {
		const res = await fetch(
			`${API_BASE_URL}/api/akuntansi/trial-balance?year=${selectedYear}&month=${parseInt(selectedMonth)}`
		);
		trialBalance = await res.json();
	}

	async function loadIncomeStatement() {
		const res = await fetch(
			`${API_BASE_URL}/api/akuntansi/income-statement?year=${selectedYear}&month=${parseInt(selectedMonth)}`
		);
		incomeStatement = await res.json();
	}

	async function loadBalanceSheet() {
		const res = await fetch(
			`${API_BASE_URL}/api/akuntansi/balance-sheet?year=${selectedYear}&month=${parseInt(selectedMonth)}`
		);
		balanceSheet = await res.json();
	}

	async function loadCOGS() {
		const res = await fetch(
			`${API_BASE_URL}/api/akuntansi/cogs?year=${selectedYear}&month=${parseInt(selectedMonth)}`
		);
		cogs = await res.json();
	}

	async function loadInventoryCalc() {
		const res = await fetch(`${API_BASE_URL}/api/akuntansi/inventory-calculation`);
		inventoryCalc = await res.json();
	}

	onMount(async () => {
		await loadYearOptions();
		await loadMonthOptions();
		await loadAllData();
	});
</script>

<div class="p-6">
	<h2 class="mb-4 text-xl font-bold text-gray-800">Accounting</h2>
	<div class="mb-4 flex flex-wrap gap-4 border-b pb-2 text-sm font-medium">
		{#each tabs as tab}
			<button
				class={`rounded px-3 py-1.5 ${activeTab === tab ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-200'}`}
				on:click={() => (activeTab = tab)}
			>
				{tab}
			</button>
		{/each}
	</div>

	<!-- Journal Entries -->
	{#if activeTab === 'Journal Entries'}
		<div>
			<div class="mb-3 flex items-center justify-between">
				<h3 class="text-lg font-semibold">Journal Entries</h3>
				<!-- <input
					type="file"
					accept=".txt"
					class="hidden"
					bind:this={fileInput}
					on:change={processTxtAll}
				/>

				<button
					class="rounded bg-green-600 px-4 py-1.5 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
					on:click={() => fileInput.click()}
					disabled={isProcessing}
					title="Proses TXT → Transactions, CSV, & Journal Entries"
				>
					{isProcessing ? 'Memproses…' : 'Proses TXT → Journal + CSV'}
				</button>

				<button
					class="rounded bg-indigo-500 px-4 py-1.5 text-white hover:bg-indigo-600"
					on:click={() => (showExpenseForm = true)}>Form Beban</button
				>

				<button
					class="rounded bg-blue-500 px-4 py-1.5 text-white hover:bg-blue-600"
					on:click={() => (showForm = true)}
					>Form Pembelian
				</button> -->
				<button
					class="rounded bg-indigo-600 px-4 py-1.5 text-white hover:bg-indigo-700"
					on:click={() => (showQuickAdd = true)}
				>
					Tambah Transaksi
				</button>

				{#if showForm}
					<div
						class="bg-opacity-40 fixed inset-0 z-50 flex items-center justify-center bg-black/20"
					>
						<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
							<div class="mb-4 flex items-center justify-between">
								<h2 class="text-lg font-semibold text-gray-800">Form Pembelian</h2>
								<button
									on:click={() => (showForm = false)}
									class="text-xl text-gray-500 hover:text-red-500">&times;</button
								>
							</div>
							<PembelianForm on:success={() => (showForm = false)} />
						</div>
					</div>
				{/if}

				{#if showExpenseForm}
					<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
						<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
							<div class="mb-4 flex items-center justify-between">
								<h2 class="text-lg font-semibold text-gray-800">Input Beban</h2>
								<button
									on:click={() => (showExpenseForm = false)}
									class="text-xl text-gray-500 hover:text-red-500">&times;</button
								>
							</div>
							<ExpenseForm on:success={refreshAfterExpense} />
						</div>
					</div>
				{/if}
			</div>

			<div class="mb-4 flex flex-wrap items-center gap-4 text-sm">
				<div class="flex flex-col">
					<label for="year" class="mb-1 font-medium text-gray-700">Tahun</label>
					<select
						id="year"
						bind:value={selectedYear}
						on:change={() => onYearChange(loadJurnal)}
						class="appearance-none rounded-lg border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
					>
						{#each years as y}
							<option value={y}>{y}</option>
						{/each}
					</select>
				</div>

				<div class="flex flex-col">
					<label for="month" class="mb-1 font-medium text-gray-700">Bulan</label>
					<select
						id="month"
						bind:value={selectedMonth}
						on:change={loadJurnal}
						class="rounded-lg border border-gray-300 px-3 py-2 pr-8 shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
					>
						{#each months as m}
							<option value={m.value}>{m.label}</option>
						{/each}
					</select>
				</div>
			</div>

			<table class="w-full border text-sm">
				<thead class="bg-gray-200 text-left">
					<tr>
						<th class="p-2">Date</th>
						<th class="p-2">Reference</th>
						<th class="p-2">Debit</th>
						<th class="p-2">Credit</th>
						<th class="p-2">Description</th>
					</tr>
				</thead>
				<tbody>
					{#each journalEntries as entry}
						<tr class="border-t bg-gray-100">
							<td class="p-2 font-semibold">{formatTanggal(entry.tanggal)}</td>
							<td class="p-2">{entry.referensi}</td>
							<td class="p-2" colspan="3">{entry.tipe_jurnal}</td>
						</tr>
						{#each entry.details as d}
							<tr class="border-t">
								<td class="p-2"></td>
								<td class="p-2">{d.nama_akun}</td>
								<td class="p-2">{d.debit.toLocaleString()}</td>
								<td class="p-2">{d.kredit.toLocaleString()}</td>
								<td class="p-2">{d.keterangan}</td>
							</tr>
						{/each}
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Journal Adjustments -->
	<!-- {:else if activeTab === 'Journal Adjustments'}
		<div>
			<h3 class="mb-2 text-lg font-semibold">Journal Adjustments</h3>
			<ul class="list-disc pl-6 text-sm text-gray-700">
				{#each journalAdjustments as adj}
					<li>{adj.date} - {adj.account}: {adj.adjustment} ({adj.description})</li>
				{/each}
			</ul>
		</div> -->

		<!-- Trial Balance -->
	{:else if activeTab === 'Trial Balance'}
		<div>
			<h3 class="mb-4 text-lg font-semibold text-gray-800">Trial Balance</h3>
			<div class="mb-4 flex flex-wrap items-center gap-4 text-sm">
				<div class="flex flex-col">
					<label for="year" class="mb-1 font-medium text-gray-700">Tahun</label>
					<select
						id="year"
						bind:value={selectedYear}
						on:change={() => onYearChange(loadTrialBalance)}
						class="appearance-none rounded-lg border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
					>
						{#each years as y}
							<option value={y}>{y}</option>
						{/each}
					</select>
				</div>

				<div class="flex flex-col">
					<label for="month" class="mb-1 font-medium text-gray-700">Bulan</label>
					<select
						id="month"
						bind:value={selectedMonth}
						on:change={loadTrialBalance}
						class="rounded-lg border border-gray-300 px-3 py-2 pr-8 shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
					>
						{#each months as m}
							<option value={m.value}>{m.label}</option>
						{/each}
					</select>
				</div>
			</div>

			<div class="overflow-auto rounded-lg border border-gray-300 shadow-sm">
				<table class="min-w-full text-sm">
					<thead class="bg-gray-100 text-left font-medium text-gray-700">
						<tr>
							<th class="p-3">Account</th>
							<th class="p-3">Debit</th>
							<th class="p-3">Credit</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#each trialBalance as row}
							<tr>
								<td class="p-3">{row.account}</td>
								<td class="p-3">Rp {row.debit.toLocaleString()}</td>
								<td class="p-3">Rp {row.credit.toLocaleString()}</td>
							</tr>
						{/each}
						<tr class="bg-gray-50 font-semibold text-blue-800">
							<td class="p-3 text-right">Total</td>
							<td class="p-3">Rp {totalDebit.toLocaleString()}</td>
							<td class="p-3">Rp {totalCredit.toLocaleString()}</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>

		<!-- Income Statement -->
	{:else if activeTab === 'Income Statement'}
		<div>
			<h3 class="mb-4 text-lg font-semibold text-gray-800">Income Statement</h3>
			<div class="mb-4 flex flex-wrap items-center gap-4 text-sm">
				<div class="flex flex-col">
					<label for="year" class="mb-1 font-medium text-gray-700">Tahun</label>
					<select
						id="year"
						bind:value={selectedYear}
						on:change={() => onYearChange(loadIncomeStatement)}
						class="appearance-none rounded-lg border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
					>
						{#each years as y}
							<option value={y}>{y}</option>
						{/each}
					</select>
				</div>

				<div class="flex flex-col">
					<label for="month" class="mb-1 font-medium text-gray-700">Bulan</label>
					<select
						id="month"
						bind:value={selectedMonth}
						on:change={loadIncomeStatement}
						class="rounded-lg border border-gray-300 px-3 py-2 pr-8 shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
					>
						{#each months as m}
							<option value={m.value}>{m.label}</option>
						{/each}
					</select>
				</div>
			</div>

			<div class="overflow-auto rounded-lg border border-gray-300 shadow-sm">
				<table class="min-w-full text-sm">
					<thead class="bg-gray-100 text-left font-medium text-gray-700">
						<tr>
							<th class="p-3">Type</th>
							<th class="p-3">Account</th>
							<th class="p-3">Amount</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#each incomeStatement as row}
							<tr>
								<td class="p-3">{row.type}</td>
								<td class="p-3">{row.name}</td>
								<td class="p-3">Rp {row.amount.toLocaleString()}</td>
							</tr>
						{/each}
						<tr class="bg-gray-50 font-semibold text-blue-700">
							<td colspan="2" class="p-3 text-right">Total Revenue</td>
							<td class="p-3">Rp {totalRevenue.toLocaleString()}</td>
						</tr>
						<tr class="bg-gray-50 font-semibold text-red-600">
							<td colspan="2" class="p-3 text-right">Total Expense</td>
							<td class="p-3">Rp {totalExpense.toLocaleString()}</td>
						</tr>
						<tr class="bg-gray-100 font-bold text-green-700">
							<td colspan="2" class="p-3 text-right">Net Income</td>
							<td class="p-3">Rp {(totalRevenue - totalExpense).toLocaleString()}</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>

		<!-- Balance Sheet -->
	{:else if activeTab === 'Balance Sheet'}
		<div>
			<h3 class="mb-4 text-lg font-semibold text-gray-800">Balance Sheet</h3>
			<div class="mb-4 flex flex-wrap items-center gap-4 text-sm">
				<div class="flex flex-col">
					<label for="year" class="mb-1 font-medium text-gray-700">Tahun</label>
					<select
						id="year"
						bind:value={selectedYear}
						on:change={() => onYearChange(loadBalanceSheet)}
						class="appearance-none rounded-lg border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
					>
						{#each years as y}
							<option value={y}>{y}</option>
						{/each}
					</select>
				</div>

				<div class="flex flex-col">
					<label for="month" class="mb-1 font-medium text-gray-700">Bulan</label>
					<select
						id="month"
						bind:value={selectedMonth}
						on:change={loadBalanceSheet}
						class="rounded-lg border border-gray-300 px-3 py-2 pr-8 shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
					>
						{#each months as m}
							<option value={m.value}>{m.label}</option>
						{/each}
					</select>
				</div>
			</div>

			<div class="overflow-auto rounded-lg border border-gray-300 shadow-sm">
				<table class="min-w-full text-sm">
					<thead class="bg-gray-100 text-left font-medium text-gray-700">
						<tr>
							<th class="p-3">Category</th>
							<th class="p-3">Account</th>
							<th class="p-3">Amount</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#each balanceSheet as row}
							<tr>
								<td class="p-3">{row.type}</td>
								<td class="p-3">{row.name}</td>
								<td class="p-3">Rp {row.amount.toLocaleString()}</td>
							</tr>
						{/each}
						<tr class="bg-gray-50 font-semibold text-blue-800">
							<td colspan="2" class="p-3 text-right">Total Assets</td>
							<td class="p-3">Rp {totalAsset.toLocaleString()}</td>
						</tr>
						<tr class="bg-gray-50 font-semibold text-purple-800">
							<td colspan="2" class="p-3 text-right">Total Liabilities & Equity</td>
							<td class="p-3">Rp {totalLiabEquity.toLocaleString()}</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>

		<!-- Cost of Goods Sold -->
	{:else if activeTab === 'Cost of Goods Sold'}
		<div>
			<h3 class="mb-4 text-lg font-semibold text-gray-800">Cost of Goods Sold (COGS)</h3>

			<div class="mb-4 flex flex-wrap items-center gap-4 text-sm">
				<div class="flex flex-col">
					<label for="year" class="mb-1 font-medium text-gray-700">Tahun</label>
					<select
						id="year"
						bind:value={selectedYear}
						on:change={() => onYearChange(loadCOGS)}
						class="appearance-none rounded-lg border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
					>
						{#each years as y}
							<option value={y}>{y}</option>
						{/each}
					</select>
				</div>

				<div class="flex flex-col">
					<label for="month" class="mb-1 font-medium text-gray-700">Bulan</label>
					<select
						id="month"
						bind:value={selectedMonth}
						on:change={loadCOGS}
						class="appearance-none rounded-lg border border-gray-300 px-3 py-2 pr-8 shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
					>
						{#each months as m}
							<option value={m.value}>{m.label}</option>
						{/each}
					</select>
				</div>
			</div>

			<div
				class="w-full max-w-md rounded-lg border border-gray-300 bg-white p-4 text-sm text-gray-700 shadow-sm"
			>
				<div class="mb-2 flex justify-between">
					<span class="font-medium">Beginning Inventory:</span>
					<span>Rp {(cogs.beginningInventory ?? 0).toLocaleString()}</span>
				</div>
				<div class="mb-2 flex justify-between">
					<span class="font-medium">Purchases:</span>
					<span>Rp {(cogs.purchases ?? 0).toLocaleString()}</span>
				</div>
				<div class="mb-2 flex justify-between">
					<span class="font-medium">Ending Inventory:</span>
					<span>Rp {(cogs.endingInventory ?? 0).toLocaleString()}</span>
				</div>
				<hr class="my-2" />
				<div class="flex justify-between font-bold text-blue-600">
					<span>COGS:</span>
					<span>
						Rp {(
							(cogs.beginningInventory ?? 0) +
							(cogs.purchases ?? 0) -
							(cogs.endingInventory ?? 0)
						).toLocaleString()}
					</span>
				</div>
			</div>
		</div>
	{:else if activeTab === 'Inventory Calculation'}
		<div>
			<h3 class="mb-4 text-lg font-semibold text-gray-800">Inventory Calculation</h3>
			<div class="overflow-auto rounded-lg border border-gray-300 shadow-sm">
				<table class="min-w-full text-sm">
					<thead class="bg-gray-100 text-left font-medium text-gray-700">
						<tr>
							<th class="p-3">Item</th>
							<th class="p-3">Beginning</th>
							<th class="p-3">Purchased</th>
							<th class="p-3">Sold</th>
							<th class="p-3">Ending</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#each inventoryCalc as item}
							<tr>
								<td class="p-3">{item.item}</td>
								<td class="p-3">{item.beginning}</td>
								<td class="p-3">{item.purchased}</td>
								<td class="p-3">{item.sold}</td>
								<td class="p-3">{item.ending}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<QuickAddModal
		open={showQuickAdd}
		onClose={() => (showQuickAdd = false)}
		onAfterAnySubmit={refreshAfterAnySubmit}
	/>
</div>
