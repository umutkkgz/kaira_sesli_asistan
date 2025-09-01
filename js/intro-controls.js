// --- Three.js Sahne Kurulumu ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('bg-canvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.z = 250; // Başlangıçta kamera daha uzakta

// --- Parçacık Sistemi ---
const particleCount = 15000; // Daha fazla parçacıkla daha yoğun bir etki
const positions = new Float32Array(particleCount * 3);
const colors = new Float32Array(particleCount * 3);
const sizes = new Float32Array(particleCount);
const color = new THREE.Color();

for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() * 2 - 1) * 300;
    positions[i * 3 + 1] = (Math.random() * 2 - 1) * 300;
    positions[i * 3 + 2] = (Math.random() * 2 - 1) * 300;
    color.set(Math.random() > 0.3 ? 0x22d3ee : 0xffffff); // Daha fazla cyan rengi
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    sizes[i] = Math.random() * 2.0 + 0.5;
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

const material = new THREE.ShaderMaterial({
    uniforms: {
        pointTexture: { value: new THREE.TextureLoader().load(`data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==`) },
        // YENİ: Çıkış animasyonu için genel opaklık
        globalOpacity: { value: 1.0 }
    },
    vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
            gl_PointSize = size * ( 300.0 / -mvPosition.z );
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        uniform sampler2D pointTexture;
        uniform float globalOpacity; // Yeni uniform
        varying vec3 vColor;
        void main() {
            gl_FragColor = vec4( vColor, 1.0 );
            gl_FragColor = gl_FragColor * texture2D( pointTexture, gl_PointCoord );
            gl_FragColor.a *= globalOpacity; // Genel opaklığı uygula
        }
    `,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    transparent: true,
});

const particles = new THREE.Points(geometry, material);
scene.add(particles);

// --- YENİ: Fare Etkileşimi ---
const mouse = new THREE.Vector2(10000, 10000);
window.addEventListener('mousemove', (event) => {
    // Fare pozisyonunu -1 ile 1 arasında normalize et
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// --- Animasyon Döngüsü ---
const clock = new THREE.Clock();
function animate() {
    const elapsedTime = clock.getElapsedTime();
    requestAnimationFrame(animate);

    // YENİ: Fare pozisyonuna göre sahneyi yavaşça döndür
    // Bu, parçacıkların fareyi takip ettiği hissini verir
    scene.rotation.y = THREE.MathUtils.lerp(scene.rotation.y, mouse.x * 0.2, 0.05);
    scene.rotation.x = THREE.MathUtils.lerp(scene.rotation.x, -mouse.y * 0.2, 0.05);

    renderer.render(scene, camera);
}
animate();

// --- Pencere Boyutlandırma ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- YENİ: Geliştirilmiş GSAP Giriş Animasyonu ---
const tl = gsap.timeline();

// 1. Adım: Kamera parçacıkların içine doğru yaklaşır
tl.to(camera.position, {
    duration: 4,
    z: 70,
    ease: "power3.inOut"
}, 0);

// 2. Adım: Parçacıklar yavaşça dönerken toplanır
tl.to(particles.rotation, {
    duration: 4,
    y: Math.PI * 0.5,
    ease: "power2.inOut"
}, 0);

// 3. Adım: UI konteynerini göster
tl.to("#ui-container", {
    duration: 2,
    opacity: 1,
    ease: "power2.out"
}, 2);

// 4. Adım: Alt başlığı göster
tl.to("#subtitle", {
    duration: 2,
    opacity: 1,
    ease: "power2.out"
}, 2.2);

// 5. Adım: Giriş butonunu göster
tl.to("#enter-button", {
    duration: 1.5,
    opacity: 1,
    scale: 1,
    ease: "elastic.out(1, 0.5)"
}, 2.5);

// --- YENİ: Geliştirilmiş Buton Tıklama Olayı ---
const enterButton = document.getElementById('enter-button');
const introContainer = document.getElementById('intro-container');

enterButton.addEventListener('click', () => {
    const tlExit = gsap.timeline({
        onComplete: () => {
            // Animasyon bitince konteyneri DOM'dan kaldır
            introContainer.style.display = 'none';
        }
    });

    // UI elemanlarını ve parçacıkları aynı anda kaybet
    tlExit.to("#ui-container", {
        duration: 0.5,
        opacity: 0,
        ease: "power2.in"
    }, 0);

    // Parçacıkları "hiperuzay sıçraması" efektiyle ileri fırlat
    tlExit.to(particles.position, {
        duration: 1.2,
        z: 400,
        ease: "power3.in"
    }, 0);

    // Parçacıkların opaklığını azaltarak kaybolmalarını sağla
    tlExit.to(particles.material.uniforms.globalOpacity, {
        duration: 1.2,
        value: 0,
        ease: "power3.in"
    }, 0);
});
