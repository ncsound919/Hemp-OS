
import * as THREE from 'three';

export function setupScene(canvas: HTMLCanvasElement, width: number, height: number) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0b);

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.z = 18;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xfffaed, 1.2);
  keyLight.position.set(5, 5, 5);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x8bc34a, 0.6);
  fillLight.position.set(-5, 3, -5);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x3f51b5, 0.8);
  rimLight.position.set(0, -5, 2);
  scene.add(rimLight);

  return { scene, camera, renderer };
}
