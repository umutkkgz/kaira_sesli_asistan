// kaira-avatar.js
// Bu dosya, KAIRA'nın 3D avatarının tüm mantığını içerir.

// Three.js'i modül olarak import et
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

// Modül içinde kullanılacak değişkenler
let scene, camera, renderer, character, head, eyeL, eyeR, mouth, thinkingCube;
let coreState = 'idle';
let targetPosition = new THREE.Vector3();
const moveSpeed = 0.02;
let frame = 0; // Animasyon zamanlayıcısı
let blinkTimeout = 0; // Göz kırpma zamanlayıcısı
let currentAudioLevel = 0; // Anlık ses seviyesi

// Dışarıdan avatarın durumunu değiştirmek için fonksiyon
export function setCoreState(newState) {
    coreState = newState;
}

// Dışarıdan ses seviyesini almak için fonksiyon (konuşma animasyonu için)
export function updateAudioLevel(level) {
    currentAudioLevel = level;
}

// Dışarıdan çağrılacak ana başlatma fonksiyonu
export function initAvatar(canvas) {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Pencere yeniden boyutlandırıldığında canvas ve kamerayı ayarla
    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });

    // Gerçekçi materyaller ve ışıklandırma
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x00BFFF, 
        metalness: 0.7, 
        roughness: 0.3 
    });
    // Göz ve ağız için basit siyah materyal
    const faceMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // Karakteri oluştur
    character = new THREE.Group();
    
    // Kafa Grubu (tüm yüz elemanlarını içerecek)
    head = new THREE.Group();
    const headGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8, 2, 2, 2); // Daha pürüzsüz kutu
    const headMesh = new THREE.Mesh(headGeo, bodyMaterial);
    head.add(headMesh);
    head.position.y = 0.6;

    // Gözler
    const eyeGeo = new THREE.PlaneGeometry(0.15, 0.15);
    eyeL = new THREE.Mesh(eyeGeo, faceMaterial);
    eyeR = new THREE.Mesh(eyeGeo, faceMaterial);
    // Gözleri kafanın önüne yerleştir (z ekseninde)
    eyeL.position.set(-0.2, 0.1, 0.41);
    eyeR.position.set(0.2, 0.1, 0.41);
    head.add(eyeL);
    head.add(eyeR);

    // Ağız
    const mouthGeo = new THREE.PlaneGeometry(0.3, 0.05);
    mouth = new THREE.Mesh(mouthGeo, faceMaterial);
    mouth.position.set(0, -0.15, 0.41);
    head.add(mouth);

    character.add(head);

    // Gövde
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.5, 1.2, 16);
    const body = new THREE.Mesh(bodyGeo, bodyMaterial);
    body.position.y = -0.3;
    character.add(body);
    
    // Düşünme küpü
    const cubeGeo = new THREE.IcosahedronGeometry(0.3, 0);
    thinkingCube = new THREE.Mesh(cubeGeo, bodyMaterial);
    thinkingCube.position.set(0, 0.6, 1);
    thinkingCube.visible = false;
    character.add(thinkingCube);

    scene.add(character);
    camera.position.z = 5;
    setNewTarget();

    // Animasyon döngüsünü başlat
    animateThreeJS();
}

// Avatar için rastgele yeni bir hedef belirle
function setNewTarget() {
    targetPosition.x = (Math.random() - 0.5) * 8;
    targetPosition.y = (Math.random() - 0.5) * 4;
    targetPosition.z = (Math.random() - 0.5) * 2;
}

// Ana animasyon döngüsü
function animateThreeJS() {
    requestAnimationFrame(animateThreeJS);
    const time = Date.now() * 0.001;
    frame++;

    // Her döngüde göz ve ağız animasyonlarını sıfırla
    eyeL.scale.y = 1;
    eyeR.scale.y = 1;
    mouth.scale.y = 1;
    eyeL.position.x = -0.2;
    eyeR.position.x = 0.2;
    character.rotation.x *= 0.95; // Düşünme sonrası normale dön

    // Avatarın o anki durumuna göre animasyonları yönet
    if (coreState === 'idle') {
        character.position.lerp(targetPosition, moveSpeed);
        if (character.position.distanceTo(targetPosition) < 0.1) {
            setNewTarget();
        }
        character.rotation.y += 0.005;
        thinkingCube.visible = false;
        character.scale.set(1, 1, 1);

        // Rastgele Göz Kırpma
        if (frame > blinkTimeout) {
            eyeL.scale.y = 0.1;
            eyeR.scale.y = 0.1;
            // Göz kırpma bittikten sonra yeni bir zaman belirle
            if (frame > blinkTimeout + 5) {
                blinkTimeout = frame + Math.random() * 200 + 100; // 100-300 frame arası bekle
            }
        }

    } else if (coreState === 'listening') {
        character.rotation.y *= 0.95; // Yavaşça dur
        // Hafifçe öne eğilerek dinleme hissi
        character.rotation.x += (0.1 - character.rotation.x) * 0.1;
    } else if (coreState === 'thinking') {
        thinkingCube.visible = true;
        thinkingCube.rotation.x += 0.02;
        thinkingCube.rotation.y += 0.02;
        character.rotation.x = Math.sin(time * 2) * 0.05;

        // Düşünürken gözleri sağa sola hareket ettir
        eyeL.position.x = -0.2 + Math.sin(time * 3) * 0.05;
        eyeR.position.x = 0.2 + Math.sin(time * 3) * 0.05;
        // Gözleri kıs
        eyeL.scale.y = 0.5;
        eyeR.scale.y = 0.5;

    } else if (coreState === 'speaking') {
        const scale = 1 + currentAudioLevel * 0.05; // Sese göre hafifçe büyü
        character.scale.set(scale, scale, scale);
        thinkingCube.visible = false;

        // Konuşurken ağzı sesin şiddetine göre hareket ettir
        mouth.scale.y = 1 + currentAudioLevel * 15;
    }
    
    renderer.render(scene, camera);
}

// Bekleme balonu pozisyonunu güncellemek için dışarıya açık fonksiyon
export function updateAvatarBubblePosition(bubbleElement) {
    if (!character || !camera) return;
    
    const vector = character.position.clone().project(camera);
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (vector.y * -0.5 + 0.5) * window.innerHeight;
    
    bubbleElement.style.left = `${x}px`;
    bubbleElement.style.top = `${y + 60}px`; // Avatarın biraz altına
}
