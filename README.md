# KAIRA-de-tr

Bu proje, Türkçe konuşma ve metin tabanlı etkileşimlere odaklı web tabanlı bir asistanın ön yüzünü içerir. Birden fazla modül barındırır: sesli asistan, evrensel sohbet, fotoğraf editörü ve çeşitli yardımcı araçlar.

## Klasör Yapısı

- `index.html` – Uygulamanın giriş noktası ve farklı görünümleri barındıran HTML dosyası.
- `css/` – Stil dosyaları.
- `js/` – Asistan, sohbet, fotoğraf editörü ve diğer özellikler için JavaScript ve React bileşenleri.
- `package.json` – Projenin bağımlılık ve komut tanımları.

## Geliştirme

Geliştirmeye başlamadan önce Node.js ortamında bağımlılıkları kurun:

```bash
npm install
```

Fotoğraf editörü gibi JSX içeren bileşenleri derlemek için Babel kullanılır. Geliştirme sırasında dosyayı izlemek için örnek komut:

```bash
npx babel js/photo-editor.jsx --watch --out-file js/photo-editor.js
```

## Derleme

Tek seferlik derleme için `npm run build` komutunu çalıştırın. Bu komut, `js/photo-editor.jsx` dosyasını Babel ile `js/photo-editor.js` dosyasına dönüştürür.

```bash
npm run build
```

## Çalıştırma

Derleme tamamlandıktan sonra `index.html` dosyasını bir tarayıcıda açarak uygulamayı görüntüleyebilirsiniz.

