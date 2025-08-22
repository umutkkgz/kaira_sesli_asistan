// kaira-avatar.js
// Bu dosya, KAIRA'nın 3D avatarının tüm mantığını içerir.

// Three.js'i modül olarak import et
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

// Modül içinde kullanılacak değişkenler
let scene, camera, renderer, character, head, eyeL, eyeR, pupilL, pupilR, mouth;
let coreState = 'idle';
let targetPosition = new THREE.Vector3();
const moveSpeed = 0.02;
let frame = 0;
let blinkTimeout = 0;
let currentAudioLevel = 0;

// Dışarıdan avatarın durumunu değiştirmek için fonksiyon
export function setCoreState(newState) {
    coreState = newState;
}

// Dışarıdan ses seviyesini almak için fonksiyon
export function updateAudioLevel(level) {
    currentAudioLevel = level;
}

// Dışarıdan çağrılacak ana başlatma fonksiyonu
export function initAvatar(canvas) {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });

    // Materyaller
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x00BFFF, 
        metalness: 0.8, 
        roughness: 0.2,
        emissive: 0x003366, // Hafif bir iç parlama
    });
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x99ffff }); // Neon göz rengi
    const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const mouthMaterial = new THREE.MeshBasicMaterial({ color: 0x99ffff });

    // Işıklandırma
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1.5);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);
    const hemisphereLight = new THREE.HemisphereLight(0x00BFFF, 0x000000, 0.5);
    scene.add(hemisphereLight);

    // Karakteri oluştur
    character = new THREE.Group();
    
    head = new THREE.Group();
    const headGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8, 4, 4, 4);
    const headMesh = new THREE.Mesh(headGeo, bodyMaterial);
    head.add(headMesh);
    head.position.y = 0.6;

    // Gözler (Neon efektli)
    const eyeGeo = new THREE.CircleGeometry(0.1, 16);
    eyeL = new THREE.Mesh(eyeGeo, eyeMaterial);
    eyeR = new THREE.Mesh(eyeGeo, eyeMaterial);
    // DÜZELTME: Gözler artık kafanın +Z eksenine (ön yüzüne) yerleştiriliyor.
    eyeL.position.set(-0.2, 0.1, 0.41);
    eyeR.position.set(0.2, 0.1, 0.41);
    head.add(eyeL, eyeR);

    // Göz Bebekleri
    const pupilGeo = new THREE.CircleGeometry(0.05, 16);
    pupilL = new THREE.Mesh(pupilGeo, pupilMaterial);
    pupilR = new THREE.Mesh(pupilGeo, pupilMaterial);
    pupilL.position.z = 0.01;
    pupilR.position.z = 0.01;
    eyeL.add(pupilL);
    eyeR.add(pupilR);

    // Ağız
    const mouthShape = new THREE.Shape();
    mouthShape.moveTo(-0.15, 0);
    mouthShape.quadraticCurveTo(0, 0, 0.15, 0);
    const mouthGeo = new THREE.ShapeGeometry(mouthShape);
    mouth = new THREE.Mesh(mouthGeo, mouthMaterial);
    // DÜZELTME: Ağız da +Z eksenine yerleştiriliyor.
    mouth.position.set(0, -0.15, 0.41);
    head.add(mouth);

    character.add(head);

    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.5, 1.2, 16);
    const body = new THREE.Mesh(bodyGeo, bodyMaterial);
    body.position.y = -0.3;
    character.add(body);
    
    scene.add(character);
    camera.position.z = 5;
    setNewTarget();

    animateThreeJS();
}

// GÜNCELLEME: Avatar için yeni hedef belirleme mantığı
function setNewTarget() {
    // Ekranın görünür alanını hesapla
    const vFOV = THREE.MathUtils.degToRad(camera.fov); // vertical fov in radians
    const height = 2 * Math.tan(vFOV / 2) * camera.position.z;
    const width = height * camera.aspect;

    // Hedefi ekranın kenarlarına daha yakın olacak şekilde ayarla
    targetPosition.x = (Math.random() - 0.5) * width * 0.8; 
    targetPosition.y = (Math.random() - 0.5) * height * 0.8;
    targetPosition.z = (Math.random() - 0.5) * 2;
}

// Ana animasyon döngüsü
function animateThreeJS() {
    requestAnimationFrame(animateThreeJS);
    const time = Date.now() * 0.001;
    frame++;

    // Her döngüde mimikleri sıfırla
    eyeL.scale.y = 1;
    eyeR.scale.y = 1;
    pupilL.position.set(0, 0, 0.01);
    pupilR.position.set(0, 0, 0.01);
    head.rotation.x *= 0.95;
    head.rotation.y *= 0.95;

    // Avatarın o anki durumuna göre animasyonları yönet
    if (coreState === 'idle') {
        character.position.lerp(targetPosition, moveSpeed);
        if (character.position.distanceTo(targetPosition) < 0.2) {
            setNewTarget();
        }
        
        // Rastgele Göz Kırpma
        if (frame > blinkTimeout) {
            eyeL.scale.y = 0.05;
            eyeR.scale.y = 0.05;
            if (frame > blinkTimeout + 5) {
                blinkTimeout = frame + Math.random() * 200 + 100;
            }
        }
    } else if (coreState === 'listening') {
        character.position.lerp(new THREE.Vector3(0, 0, 0), moveSpeed * 2);
        pupilL.position.x += (0 - pupilL.position.x) * 0.1;
        pupilR.position.x += (0 - pupilR.position.x) * 0.1;
    } else if (coreState === 'thinking') {
        head.rotation.y = Math.sin(time * 2) * 0.2;
        head.rotation.x = Math.sin(time * 1.5) * 0.1;
        eyeL.scale.y = 0.5;
        eyeR.scale.y = 0.5;
    } else if (coreState === 'speaking') {
        const mouthHeight = currentAudioLevel * 0.15;
        const newShape = new THREE.Shape();
        newShape.moveTo(-0.15, 0);
        newShape.quadraticCurveTo(0, -mouthHeight, 0.15, 0);
        newShape.quadraticCurveTo(0, mouthHeight * 0.2, -0.15, 0);
        mouth.geometry.dispose();
        mouth.geometry = new THREE.ShapeGeometry(newShape);
    }

    // DÜZELTME: Karakterin her zaman kameraya bakmasını sağlayan yönelim mantığı
    // Geçici bir obje kullanarak hedef yönelimi hesapla
    const tempObject = new THREE.Object3D();
    tempObject.position.copy(character.position);
    tempObject.lookAt(camera.position);
    // Yumuşak bir geçişle (slerp) karakterin yönelimini güncelle
    character.quaternion.slerp(tempObject.quaternion, 0.05);
    
    renderer.render(scene, camera);
}

// Bekleme balonu pozisyonunu güncellemek için
export function updateAvatarBubblePosition(bubbleElement) {
    if (!character || !camera) return;
    
    const vector = character.position.clone().project(camera);
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (vector.y * -0.5 + 0.5) * window.innerHeight;
    
    bubbleElement.style.left = `${x}px`;
    bubbleElement.style.top = `${y - 60}px`; // Avatarın biraz üstüne
}
