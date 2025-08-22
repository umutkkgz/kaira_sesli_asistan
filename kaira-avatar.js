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
    eyeL.position.set(-0.2, 0.1, 0.41);
    eyeR.position.set(0.2, 0.1, 0.41);
    head.add(eyeL, eyeR);

    // Göz Bebekleri
    const pupilGeo = new THREE.CircleGeometry(0.05, 16);
    pupilL = new THREE.Mesh(pupilGeo, pupilMaterial);
    pupilR = new THREE.Mesh(pupilGeo, pupilMaterial);
    pupilL.position.z = 0.01; // Gözün hafifçe önünde
    pupilR.position.z = 0.01;
    eyeL.add(pupilL);
    eyeR.add(pupilR);

    // Ağız (Daha dinamik bir şekil için)
    const mouthShape = new THREE.Shape();
    mouthShape.moveTo(-0.15, 0);
    mouthShape.quadraticCurveTo(0, 0, 0.15, 0);
    const mouthGeo = new THREE.ShapeGeometry(mouthShape);
    mouth = new THREE.Mesh(mouthGeo, mouthMaterial);
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

// Avatar için yeni hedef belirle (Ekranın sağı ve solu ağırlıklı)
function setNewTarget() {
    const side = Math.random() < 0.5 ? -1 : 1; // %50 ihtimalle sol veya sağ
    targetPosition.x = (Math.random() * 0.5 + 0.3) * 4 * side; // Ekranın %30-%80'i arası
    targetPosition.y = (Math.random() - 0.5) * 4;
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
        // Dinlerken hedefe daha hızlı git
        character.position.lerp(new THREE.Vector3(0, 0, 0), moveSpeed * 2);
        // Göz bebeklerini merkeze odakla
        pupilL.position.x += (0 - pupilL.position.x) * 0.1;
        pupilR.position.x += (0 - pupilR.position.x) * 0.1;
    } else if (coreState === 'thinking') {
        // Düşünürken kafayı salla
        head.rotation.y = Math.sin(time * 2) * 0.2;
        head.rotation.x = Math.sin(time * 1.5) * 0.1;
        // Gözleri kıs
        eyeL.scale.y = 0.5;
        eyeR.scale.y = 0.5;
    } else if (coreState === 'speaking') {
        // Konuşurken ağzı sesin şiddetine göre hareket ettir
        const mouthHeight = currentAudioLevel * 0.15;
        const newShape = new THREE.Shape();
        newShape.moveTo(-0.15, 0);
        newShape.quadraticCurveTo(0, -mouthHeight, 0.15, 0); // Alt dudağı hareket ettir
        newShape.quadraticCurveTo(0, mouthHeight * 0.2, -0.15, 0); // Üst dudağı hafifçe
        mouth.geometry.dispose();
        mouth.geometry = new THREE.ShapeGeometry(newShape);
    }

    // Her zaman kameraya doğru yumuşakça dön
    const targetQuaternion = new THREE.Quaternion();
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.lookAt(character.position, camera.position, character.up);
    targetQuaternion.setFromRotationMatrix(tempMatrix);
    character.quaternion.slerp(targetQuaternion, 0.05);
    
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
