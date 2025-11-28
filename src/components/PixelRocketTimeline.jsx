/**
 * PixelRocketTimeline - Scroll-driven rocket animation for the landing page
 * 
 * Adapts the Three.js pixel rocket from PixelRocketHero to respond to scroll progress
 * instead of mouse position. Uses a ref to ensure the animation loop reads the latest
 * scroll progress value.
 */
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// Eqho brand colors
const EQHO_TEAL = 0x0EB9BC;
const EQHO_CYAN = 0x09A3D5;
const EQHO_PURPLE = 0x8866F4;

/**
 * Determines rocket state based on scroll progress
 */
const getRocketState = (progress) => {
  if (progress < 0.15) return 'grounded';
  if (progress < 0.35) return 'warming';
  if (progress < 0.6) return 'launching';
  if (progress < 0.85) return 'liftoff';
  return 'flying';
};

/**
 * Three.js Canvas Component with scroll-driven animation
 * Uses a ref to track scroll progress so the animation loop always has the latest value
 */
const PixelRocketCanvas = ({ scrollProgress = 0 }) => {
  const mountRef = useRef(null);
  const progressRef = useRef(scrollProgress);
  
  // Keep the ref updated with the latest scroll progress
  useEffect(() => {
    progressRef.current = scrollProgress;
  }, [scrollProgress]);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    camera.position.z = 25;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    
    const isMobile = window.innerWidth < 768;
    renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    const clock = new THREE.Clock();

    // Post-processing for bloom effect
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(mountRef.current.clientWidth, mountRef.current.clientHeight),
      isMobile ? 1.0 : 1.5,
      isMobile ? 0.3 : 0.4,
      0.85
    );
    bloomPass.threshold = 0;
    bloomPass.strength = isMobile ? 0.8 : 1.2;
    bloomPass.radius = 0;
    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // --- Starfield ---
    const starCount = isMobile ? 300 : 800;
    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    for (let i = 0; i < starCount; i++) {
      const x = (Math.random() - 0.5) * 100;
      const y = (Math.random() - 0.5) * 100;
      const z = (Math.random() - 0.5) * 100;
      starVertices.push(x, y, z);
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // --- Ground/Launch Pad ---
    const groundGeometry = new THREE.BoxGeometry(8, 0.5, 4);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333344, 
      flatShading: true,
      metalness: 0.3,
      roughness: 0.7,
      transparent: true,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.set(0, -10, 0);
    scene.add(ground);

    // Launch pad details
    const padGeometry = new THREE.BoxGeometry(3, 0.3, 2);
    const padMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x555566, 
      flatShading: true,
      transparent: true,
    });
    const pad = new THREE.Mesh(padGeometry, padMaterial);
    pad.position.set(0, -9.6, 0);
    scene.add(pad);

    // --- Pixel Rocket ---
    const rocket = new THREE.Group();
    const pixelSize = 0.2;
    const pixelGeo = new THREE.BoxGeometry(pixelSize, pixelSize, pixelSize);
    
    // Use Eqho brand colors
    const bodyMat = new THREE.MeshStandardMaterial({ color: EQHO_TEAL, flatShading: true });
    const wingMat = new THREE.MeshStandardMaterial({ color: EQHO_CYAN, flatShading: true });
    const cockpitMat = new THREE.MeshStandardMaterial({ 
      color: EQHO_PURPLE, 
      emissive: EQHO_PURPLE, 
      emissiveIntensity: 0.5 
    });

    // Rocket body
    for (let y = -4; y < 5; y++) {
      for (let x = -2; x < 3; x++) {
        if (Math.abs(x) === 2 && y > 1) continue;
        const pixel = new THREE.Mesh(pixelGeo, bodyMat);
        pixel.position.set(x * pixelSize, y * pixelSize, 0);
        rocket.add(pixel);
      }
    }

    // Wings
    for (let y = -3; y < -1; y++) {
      for (let x = -4; x < -2; x++) {
        const pixelL = new THREE.Mesh(pixelGeo, wingMat);
        pixelL.position.set(x * pixelSize, y * pixelSize, 0);
        rocket.add(pixelL);
        const pixelR = new THREE.Mesh(pixelGeo, wingMat);
        pixelR.position.set(-x * pixelSize, y * pixelSize, 0);
        rocket.add(pixelR);
      }
    }

    // Cockpit
    const cockpit = new THREE.Mesh(pixelGeo, cockpitMat);
    cockpit.position.set(0, 3 * pixelSize, pixelSize);
    rocket.add(cockpit);

    // Start position: on the launch pad
    rocket.position.set(0, -8, 0);
    scene.add(rocket);

    // --- Rocket Flame (Object Pooling) ---
    const trailPool = [];
    const trailSize = isMobile ? 80 : 150;
    const trailGeo = new THREE.BoxGeometry(pixelSize * 1.5, pixelSize * 1.5, pixelSize * 1.5);

    // Fire colors with Eqho brand accent
    const fireColors = [0xff6600, 0xff3300, 0xff9900, EQHO_TEAL, 0xff0000];

    for (let i = 0; i < trailSize; i++) {
      const flameColor = fireColors[Math.floor(Math.random() * fireColors.length)];
      const trailMat = new THREE.MeshBasicMaterial({
        color: flameColor,
        transparent: true,
        opacity: 0.9
      });
      const particle = new THREE.Mesh(trailGeo, trailMat);
      particle.visible = false;
      particle.velocity = new THREE.Vector3();
      particle.life = 0;
      scene.add(particle);
      trailPool.push(particle);
    }

    // --- Smoke particles for warming phase ---
    const smokePool = [];
    const smokeSize = 50;
    const smokeGeo = new THREE.SphereGeometry(0.15, 4, 4);
    for (let i = 0; i < smokeSize; i++) {
      const smokeMat = new THREE.MeshBasicMaterial({
        color: 0x888899,
        transparent: true,
        opacity: 0.4
      });
      const smoke = new THREE.Mesh(smokeGeo, smokeMat);
      smoke.visible = false;
      smoke.velocity = new THREE.Vector3();
      smoke.life = 0;
      scene.add(smoke);
      smokePool.push(smoke);
    }

    // Lighting
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    // Engine glow light
    const engineLight = new THREE.PointLight(EQHO_TEAL, 0, 10);
    engineLight.position.set(0, -9, 0);
    scene.add(engineLight);

    let trailIndex = 0;
    let smokeIndex = 0;
    let animationId;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Read from ref to get the latest scroll progress
      const progress = progressRef.current;
      const state = getRocketState(progress);

      // State machine for rocket behavior
      switch (state) {
        case 'grounded':
          // Rocket sits on pad, subtle idle animation
          rocket.position.y = -8 + Math.sin(elapsedTime * 2) * 0.02;
          rocket.rotation.z = 0;
          engineLight.intensity = 0.5 + Math.sin(elapsedTime * 4) * 0.2;
          break;

        case 'warming': {
          // Engine warming up, smoke particles
          rocket.position.y = -8 + Math.sin(elapsedTime * 3) * 0.05;
          rocket.rotation.z = Math.sin(elapsedTime * 8) * 0.01;
          engineLight.intensity = 1 + Math.sin(elapsedTime * 6) * 0.5;
          
          // Emit smoke
          if (Math.random() > 0.6) {
            const smoke = smokePool[smokeIndex];
            smoke.position.set(
              rocket.position.x + (Math.random() - 0.5) * 1,
              rocket.position.y - 1,
              (Math.random() - 0.5) * 0.5
            );
            smoke.scale.setScalar(1);
            smoke.visible = true;
            smoke.life = 1;
            smoke.velocity.set((Math.random() - 0.5) * 0.5, -0.5, 0);
            smokeIndex = (smokeIndex + 1) % smokeSize;
          }
          break;
        }

        case 'launching': {
          // Flames intensifying, vibration
          const launchProgress = (progress - 0.35) / 0.25;
          rocket.position.y = -8 + Math.sin(elapsedTime * 10) * 0.1 * launchProgress;
          rocket.rotation.z = Math.sin(elapsedTime * 15) * 0.02 * launchProgress;
          engineLight.intensity = 2 + launchProgress * 2;
          
          // Emit flames
          if (Math.random() > 0.3) {
            const particle = trailPool[trailIndex];
            particle.position.copy(rocket.position);
            particle.position.y -= 0.9;
            particle.position.x += (Math.random() - 0.5) * 0.4;
            particle.scale.setScalar(0.8 + launchProgress * 0.5);
            particle.visible = true;
            particle.life = 1;
            particle.velocity.set(
              (Math.random() - 0.5) * 0.8,
              -1 - launchProgress * 2,
              0
            );
            trailIndex = (trailIndex + 1) % trailPool.length;
          }
          break;
        }

        case 'liftoff': {
          // Rocket ascending
          const liftProgress = (progress - 0.6) / 0.25;
          const targetY = -8 + liftProgress * 20;
          rocket.position.y += (targetY - rocket.position.y) * 0.08;
          rocket.rotation.z = Math.sin(elapsedTime * 12) * 0.015;
          engineLight.intensity = 4;
          
          // Fade out ground
          ground.material.opacity = Math.max(0, 1 - liftProgress);
          pad.material.opacity = Math.max(0, 1 - liftProgress);
          
          // Full thrust flames
          if (Math.random() > 0.15) {
            const particle = trailPool[trailIndex];
            particle.position.copy(rocket.position);
            particle.position.y -= 0.9;
            particle.position.x += (Math.random() - 0.5) * 0.3;
            particle.scale.setScalar(1.2);
            particle.visible = true;
            particle.life = 1;
            particle.velocity.set(
              (Math.random() - 0.5) * 0.5,
              -3,
              0
            );
            trailIndex = (trailIndex + 1) % trailPool.length;
          }
          break;
        }

        case 'flying':
          // Free flight - gentle floating motion at top
          rocket.position.y = 8 + Math.sin(elapsedTime * 1.5) * 1;
          rocket.position.x = Math.sin(elapsedTime * 0.8) * 2;
          rocket.rotation.z = Math.sin(elapsedTime * 2) * 0.1;
          engineLight.intensity = 2;
          ground.material.opacity = 0;
          pad.material.opacity = 0;
          
          // Cruise flames
          if (Math.random() > 0.4) {
            const particle = trailPool[trailIndex];
            particle.position.copy(rocket.position);
            particle.position.y -= 0.9;
            particle.position.x += (Math.random() - 0.5) * 0.2;
            particle.scale.setScalar(0.8);
            particle.visible = true;
            particle.life = 1;
            particle.velocity.set(
              (Math.random() - 0.5) * 0.3,
              -1.5,
              0
            );
            trailIndex = (trailIndex + 1) % trailPool.length;
          }
          break;
      }

      // Animate flame particles with gravity
      const gravity = -2.5;
      trailPool.forEach(p => {
        if (p.visible) {
          p.velocity.y += gravity * delta;
          p.position.add(p.velocity.clone().multiplyScalar(delta * 3));
          p.life -= delta * 2;
          p.scale.setScalar(Math.max(0.1, p.life * 0.8));
          p.material.opacity = p.life * 0.9;
          if (p.life <= 0) p.visible = false;
        }
      });

      // Animate smoke particles
      smokePool.forEach(s => {
        if (s.visible) {
          s.position.add(s.velocity.clone().multiplyScalar(delta * 2));
          s.velocity.x += (Math.random() - 0.5) * 0.1;
          s.life -= delta * 0.8;
          s.scale.setScalar(1 + (1 - s.life) * 2);
          s.material.opacity = s.life * 0.3;
          if (s.life <= 0) s.visible = false;
        }
      });

      composer.render();
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      composer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full" />;
};

/**
 * Main export: Pixel Rocket Timeline Component
 * Receives scroll progress from parent and renders the animated rocket
 */
export const PixelRocketTimeline = ({ scrollProgress = 0 }) => {
  const [smoothProgress, setSmoothProgress] = useState(0);
  const targetRef = useRef(scrollProgress);

  // Update target when prop changes
  useEffect(() => {
    targetRef.current = scrollProgress;
  }, [scrollProgress]);

  // Smooth animation towards target
  useEffect(() => {
    let animationId;
    const smoothing = () => {
      setSmoothProgress(prev => {
        const diff = targetRef.current - prev;
        if (Math.abs(diff) < 0.001) return targetRef.current;
        return prev + diff * 0.12;
      });
      animationId = requestAnimationFrame(smoothing);
    };
    animationId = requestAnimationFrame(smoothing);
    return () => cancelAnimationFrame(animationId);
  }, []);

  const state = getRocketState(smoothProgress);

  return (
    <div className="relative w-full h-full">
      <PixelRocketCanvas scrollProgress={smoothProgress} />
      
      {/* Status indicator */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="bg-black/40 backdrop-blur-sm rounded-lg p-3 text-center">
          <div className="text-xs text-cyan-400 uppercase tracking-wider mb-1">
            Launch Status
          </div>
          <div className="text-white font-bold capitalize">
            {state === 'grounded' && '🔧 Pre-flight Check'}
            {state === 'warming' && '🔥 Engine Warming'}
            {state === 'launching' && '⚡ Ignition Sequence'}
            {state === 'liftoff' && '🚀 LIFTOFF!'}
            {state === 'flying' && '✨ To The Moon!'}
          </div>
          <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 transition-all duration-100"
              style={{ width: `${smoothProgress * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PixelRocketTimeline;
