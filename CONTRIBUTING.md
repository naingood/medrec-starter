# Panduan Kontribusi

Terima kasih sudah mampir. Proyek ini hidup dari orang-orang yang pernah kesulitan
membangun aplikasi rekam medis dari nol — dan tidak ingin orang berikutnya mengalami hal
yang sama sendirian.

**Kamu tidak harus bisa coding untuk ikut.**

---

## Tiga cara berkontribusi

### 1. Tanpa coding — ceritakan alur kerjamu

Ini kontribusi yang paling kami butuhkan, dan paling langka.

Kalau kamu tenaga rekam medis, mahasiswa RMIK, atau pernah praktik di fasilitas layanan
kesehatan, buka **issue** dan ceritakan:

- Formulir apa yang seharusnya ada, tapi belum ada di aplikasi ini?
- Laporan apa yang rutin diminta (dinas kesehatan, akreditasi, internal) dan bagaimana
  formatnya?
- Di bagian mana alur aplikasi ini terasa menyusahkan dibanding cara kerja yang biasa
  kamu pakai?

Tidak perlu istilah teknis. Tidak perlu solusi. Deskripsi masalahnya saja sudah sangat
berharga — kami yang menerjemahkannya.

### 2. Setengah teknis — uji dan laporkan

Jalankan aplikasinya, pakai akun demo, dan coba rusak dengan sengaja. Laporkan apa yang
tidak masuk akal. Mahasiswa RMIK biasanya jauh lebih cepat menemukan kesalahan istilah,
urutan alur, dan format tanggal daripada developer.

### 3. Teknis — kode, test, dokumentasi

Ambil satu modul, satu test, atau satu halaman dokumentasi. Tidak perlu mengambil yang
besar. Satu perbaikan kecil yang benar-benar selesai lebih berguna daripada rencana besar
yang tidak pernah dikirim.

---

## Sebelum mulai

```bash
git clone https://github.com/naingood/medrec-starter.git
cd medrec-starter
npm install
npm start      # http://localhost:3000
npm test       # pastikan semuanya lulus sebelum mengubah apa pun
```

Butuh **Node.js 18+**. Database SQLite dibuat otomatis saat pertama kali dijalankan.
Jangan commit `database/database.sqlite` atau `.env`.

## Melaporkan bug

Buka issue dengan judul yang jelas, lalu isi:

1. **Yang kamu harapkan terjadi**
2. **Yang sebenarnya terjadi**
3. **Langkah mereproduksi** — dari login sampai bug muncul
4. **Lingkungan** — versi Node, sistem operasi, browser
5. **Tangkapan layar** kalau ada

Satu bug satu issue. Jangan gabungkan lima masalah dalam satu laporan — lebih sulit
ditindaklanjuti dan lebih mudah terlupakan.

## Mengusulkan fitur atau modul

Sebelum menulis kode, tulis dulu **alasan domainnya**, bukan solusi teknisnya:

- Siapa yang memakai fitur ini? (peran apa)
- Kapan dan seberapa sering dipakai?
- Data apa yang masuk, dan data apa yang keluar?
- Kalau fitur ini tidak ada, apa yang dilakukan orang tersebut sekarang?

Usulan yang menjelaskan masalah nyata hampir selalu diterima. Usulan yang menjelaskan
teknologi tanpa masalah yang jelas biasanya mengendap.

## Kontribusi kode

### Alur kerja

```bash
git checkout -b fitur/laporan-bulanan     # atau fix/, docs/
# ... kerjakan ...
npm test                                  # wajib lulus
git commit -m "feat(laporan): rekap kunjungan per bulan"
git push origin fitur/laporan-bulanan
```

Lalu buka pull request ke `main`.

### Checklist pull request

- [ ] `npm test` lulus.
- [ ] Perubahan dibatasi pada satu hal. PR besar yang mencampur refactor, fitur, dan
      perbaikan format sulit ditinjau.
- [ ] Tidak ada data pasien nyata, NIK asli, token, password, atau kunci API di kode,
      commit, maupun screenshot.
- [ ] Teks antarmuka memakai bahasa Indonesia yang wajar (istilah rekam medis yang baku).
- [ ] Kalau menambah modul: ada `module.json` dan modul bisa diaktifkan tanpa error.
- [ ] Kalau mengubah perilaku: dokumentasi terkait ikut diperbarui.

### Gaya kode

Tidak ada linter yang memaksa. Cukup ikuti yang sudah ada:

- JavaScript biasa (CommonJS di server, vanilla di browser). Tanpa framework baru tanpa
  diskusi dulu di issue.
- Indentasi 2 spasi, titik koma di akhir statement.
- Nama variabel dan fungsi dalam bahasa Inggris; teks yang dilihat pengguna dalam bahasa
  Indonesia.
- Error ke pengguna harus bisa dimengerti manusia, bukan tumpukan stack trace.

## Membuat modul baru

Ini cara paling aman untuk berkontribusi besar tanpa menyentuh kode inti.

1. Buat folder `modules/<slug>/` — slug huruf kecil, tanpa spasi (contoh:
   `laporan-bulanan`).
2. Tambahkan `module.json`:

   ```json
   {
     "name": "Laporan Bulanan",
     "slug": "laporan-bulanan",
     "version": "1.0.0",
     "description": "Rekap kunjungan per bulan",
     "author": "Nama Kamu",
     "main": "server.js",
     "menu": { "label": "Laporan", "icon": "📄", "order": 30 }
   }
   ```

3. Tambahkan `server.js` yang mengekspor satu fungsi:

   ```js
   module.exports = function register(ctx) {
     const { db, registerRoute } = ctx;

     registerRoute('GET', '/ringkasan', (req, res) => {
       const rows = db.prepare(
         'SELECT status, COUNT(*) AS jumlah FROM encounters GROUP BY status'
       ).all();
       res.json({ data: rows });
     });
   };
   ```

4. Aktifkan modul dari halaman **Modular** di aplikasi.
5. Tulis test kalau memungkinkan, lalu kirim pull request.

Referensi lengkap: [`docs/sdk.md`](docs/sdk.md).

## Aturan data pasien — tidak bisa dinegosiasikan

- **Jangan pernah** memakai data pasien nyata di issue, PR, screenshot, atau test.
- Gunakan data sintetis. Nama palsu, NIK palsu 16 digit, diagnosis contoh.
- Jangan menambahkan dependency yang mengirim data ke layanan pihak ketiga tanpa
  persetujuan di issue.
- Kalau menemukan celah keamanan, **jangan buka issue publik**. Hubungi maintainer secara
  langsung lebih dulu.

Proyek ini belum siap untuk data nyata. Jangan membuatnya terlihat siap dengan mengorbankan
privasi orang lain.

## Meninjau dan menunggu

Maintainer proyek ini manusia yang juga punya pekerjaan lain. Kami akan berusaha merespons
secepatnya, tapi jangan menunggu diam untuk melanjutkan: kalau ada masukan, jawab; kalau
ada yang perlu diperbaiki, perbaiki di branch yang sama.

Kami lebih memilih PR kecil yang selesai daripada PR besar yang menggantung. Kalau sebuah
PR tidak bisa dilanjutkan, bilang saja — tidak ada yang akan tersinggung, dan pekerjaanmu
bisa diambil alih.

## Ide kontribusi pertama

Belum tahu harus mulai dari mana? Ini beberapa yang nyata dan belum dikerjakan:

- **Tanpa coding:** tulis ulang istilah di antarmuka agar sesuai baku RMIK; uji alur
  pendaftaran lalu catat bagian yang membingungkan.
- **Dokumentasi:** selaraskan `docs/sdk.md` dengan kode — dokumen menyebut `plugins/` dan
  `plugin.json`, sedangkan kode memakai `modules/` dan `module.json`.
- **Modul baru:** rekap kunjungan bulanan, ekspor daftar pasien ke CSV, pencarian pasien
  berdasarkan nomor rekam medis.
- **Test:** tambah kasus untuk validasi NIK, masking, dan pembatasan akses per peran.
- **Aksesibilitas:** periksa kontras warna dan navigasi keyboard di tampilan mobile.
- **Contoh modul:** buat satu modul contoh yang sangat sederhana, lengkap dengan komentar,
  supaya mahasiswa bisa meniru.

Kalau kamu mengerjakan salah satunya, tulis di issue supaya tidak ada yang mengerjakan hal
yang sama.

## Pengakuan

Setiap kontributor dicatat di riwayat commit dan, kalau kamu mau, di bagian kontributor
README. Kontribusi berupa pengetahuan domain — alur kerja, format laporan, koreksi istilah —
akan dicatat dengan nama kamu juga. Itu bukan kode, tapi itu yang membuat proyek ini berguna.

Terima kasih sudah ikut.
