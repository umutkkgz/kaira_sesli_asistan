<div align="center">
<h1 style="font-size: 3em; font-weight: bold;">
K<span style="color: #22d3ee;">Δ</span>IRA | Birleşik Yapay Zeka Platformu
</h1>
<p>
Sadece bir sesli asistan değil; yapay zeka destekli, çok modüllü, interaktif bir deneyim platformu.
</p>
</div>

🚀 Proje Hakkında
KΔIRA, başlangıçta bir sesli asistan olarak hayata geçmiş olsa da, zamanla yapay zekanın farklı alanlardaki yeteneklerini sergileyen kapsamlı bir birleşik platforma dönüştü. Bu proje, modern web teknolojilerini kullanarak, kullanıcıya tek bir arayüz üzerinden sohbet, görsel düzenleme, veri görselleştirme ve hatta kodlama gibi çeşitli AI destekli deneyimler sunar.

Her bir modül, yapay zekanın pratik ve yaratıcı kullanım alanlarını keşfetmek için özenle tasarlanmıştır.

✨ Öne Çıkan Modüller
Platform, ana karşılama ekranından erişilebilen birkaç ana modülden oluşur:

🎙️ KΔIRA Sesli Asistan: Platformun kalbi. Gerçek zamanlı konuşma tanıma ve ses sentezleme teknolojisiyle akıcı bir diyalog deneyimi sunar.

🎨 Yapay Zeka Editör: Metin komutları (prompt) kullanarak fotoğrafları düzenlemenizi sağlayan gelişmiş bir görsel düzenleme aracı. React ile geliştirilmiştir ve Google Gemini API'nin görsel yeteneklerini kullanır.

💬 Evrensel Sohbet Arayüzü: Google (Gemini) ve Groq (Llama, Mixtral) gibi farklı, son teknoloji yapay zeka modelleriyle tek bir yerden sohbet etme ve yeteneklerini karşılaştırma imkanı sunar.

🔭 Gözlem Platformu: NASA'nın halka açık API'lerini kullanarak günün astronomi fotoğrafını (APOD), Mars gezgini fotoğraflarını ve Aladin Lite ile interaktif bir gökyüzü haritasını keşfedin.

💻 Code Lab: Tarayıcı içinde çalışan, çok dosyalı (JS, CSS, HTML), canlı önizlemeli ve yapay zeka destekli bir kodlama ortamı. AI'dan kod yamaları alıp projenize akıllıca uygulayabilirsiniz.

🌌 Digital Afterlife: Zihnin ve bilincin dijital ölümsüzlüğü üzerine felsefi bir konsept sunan, etkileyici görsellere sahip bir deneyim sayfası.

🛠️ Teknoloji Yığını
Bu platform, aşağıdaki modern teknolojiler kullanılarak geliştirilmiştir:

Frontend: HTML5, CSS3, JavaScript (ES6+ Modules)

Styling: Tailwind CSS

UI Kütüphanesi: React (Fotoğraf Editörü modülü için)

3D Grafik: Three.js (Giriş animasyonu ve arka plan efektleri için)

Yapay Zeka & API'ler:

Google Gemini API (Görsel ve metin üretimi)

Groq API (Yüksek hızlı metin üretimi)

NASA APIs (APOD, Mars Rover Photos)

Web Speech API (Konuşma tanıma)

Haritalama: Aladin Lite (Gözlem Platformu için)

Backend: API anahtar yönetimi ve metin-ses (TTS) işlemleri için ngrok üzerinden sunulan özel bir Node.js sunucusu.

⚙️ Kurulum ve Çalıştırma
Projeyi yerel makinenizde çalıştırmak için aşağıdaki adımları izleyebilirsiniz:

Repoyu Klonlayın:

git clone [https://github.com/umutkkgz/kaira_sesli_asistan.git](https://github.com/umutkkgz/kaira_sesli_asistan.git)

Klasöre Gidin:

cd kaira_sesli_asistan

Backend Sunucusunu Çalıştırın:
Bu projenin tam fonksiyonel çalışması için API anahtarlarını ve TTS hizmetini sunan bir backend gereklidir. Kendi backend sunucunuzu çalıştırıp bir ngrok tüneli ile dışarıya açmanız gerekmektedir.

API Adresini Güncelleyin (Gerekirse):
Proje içerisindeki JavaScript dosyalarında https://....ngrok-free.app şeklinde tanımlanmış olan API adresini, kendi ngrok adresinizle güncelleyin.

Tarayıcıda Açın:
index.html dosyasını doğrudan tarayıcınızda açın. En iyi deneyim için VS Code'daki "Live Server" gibi bir eklenti kullanmanız tavsiye edilir.

<p align="center">
<strong>Ana Seçim Ekranı</strong><br>
<em>[Ana Seçim Ekranının Görüntüsü]</em>
</p>
<p align="center">
<strong>KΔIRA Sesli Asistan</strong><br>
<em>[Sesli Asistan Arayüzünün Görüntüsü]</em>
</p>
<p align="center">
<strong>Yapay Zeka Fotoğraf Editörü</strong><br>
<em>[Fotoğraf Editörünün Görüntüsü]</em>
</p>
<p align="center">
<strong>KΔIRA Code Lab</strong><br>
<em>[Code Lab Arayüzünün Görüntüsü]</em>
</p>

Geliştirici
Umut Kökgöz - GitHub Profili


---

Kurulum (Vite) ve Komutlar

- Gereksinimler: Node.js 18+, npm 9+
- Kurulum: `npm install`
- Geliştirme: `npm run dev` (http://localhost:5173)
- Prod derleme: `npm run build`
- Prod önizleme: `npm run preview`
- Lint: `npm run lint` • Düzelt: `npm run lint:fix`
- Format: `npm run format`

PWA / Çevrimdışı Desteği

- Basit bir Service Worker (`sw.js`) eklendi. İlk ziyaretten sonra temel sayfalar ve önemli modüller önbelleğe alınır.
- Geliştirme sırasında SW etkisini görmek için `npm run preview` kullanın (file:// üzerinde çalışmaz).

Code Lab İyileştirmeleri

- Dosya yeniden adlandırma butonu eklendi (Yeniden Adlandır).
- Kısayollar:
  - Ctrl/Cmd+S: Kaydet
  - Ctrl/Cmd+Enter: Çalıştır
  - Ctrl/Cmd+B: Kodu Uygula

Önerilen İleri Adımlar

- CodeMirror/Monaco ile syntax highlighting ve gelişmiş editör deneyimi.
- Projeyi ZIP olarak dışa aktarma ve içe aktarma.
- Vitest + Playwright ile temel test altyapısı.
- Workbox ile gelişmiş önbellekleme stratejileri.
