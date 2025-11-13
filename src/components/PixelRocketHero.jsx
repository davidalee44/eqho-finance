import { motion, useAnimation } from 'framer-motion';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// --- Three.js Canvas Component ---
const PixelVoyagerCanvas = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 25;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Reduce pixel ratio on mobile for better performance
    const isMobile = window.innerWidth < 768;
    renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    const mouse = new THREE.Vector2(0, 0);
    const clock = new THREE.Clock();
    
    const isDarkMode = true; // Force dark mode for consistency

    // Post-processing for bloom effect (reduced on mobile for performance)
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight), 
        isMobile ? 1.0 : 1.5,  // Reduce intensity on mobile
        isMobile ? 0.3 : 0.4,  // Reduce radius on mobile
        0.85
    );
    bloomPass.threshold = 0;
    bloomPass.strength = isMobile ? 0.8 : (isDarkMode ? 1.2 : 0.6);
    bloomPass.radius = 0;
    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // --- Starfield ---
    // Reduce star count on mobile for better performance
    const starCount = isMobile ? 500 : 1500;
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

    // --- Pixel Rocket ---
    const rocket = new THREE.Group();
    const pixelSize = 0.2;
    const pixelGeo = new THREE.BoxGeometry(pixelSize, pixelSize, pixelSize);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, flatShading: true });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x0055ff, flatShading: true });
    const cockpitMat = new THREE.MeshStandardMaterial({ color: 0x87ceeb, emissive: 0x87ceeb, emissiveIntensity: 0.5 });
    
    // Rocket body
    for(let y=-4; y<5; y++) for(let x=-2; x<3; x++) {
        if(Math.abs(x) === 2 && y > 1) continue;
        const pixel = new THREE.Mesh(pixelGeo, bodyMat);
        pixel.position.set(x * pixelSize, y * pixelSize, 0);
        rocket.add(pixel);
    }
    
    // Wings
    for(let y=-3; y<-1; y++) for(let x=-4; x<-2; x++) {
        const pixelL = new THREE.Mesh(pixelGeo, wingMat);
        pixelL.position.set(x*pixelSize, y*pixelSize, 0);
        rocket.add(pixelL);
        const pixelR = new THREE.Mesh(pixelGeo, wingMat);
        pixelR.position.set(-x*pixelSize, y*pixelSize, 0);
        rocket.add(pixelR);
    }
    
    // Cockpit
    const cockpit = new THREE.Mesh(pixelGeo, cockpitMat);
    cockpit.position.set(0, 3 * pixelSize, pixelSize);
    rocket.add(cockpit);
    scene.add(rocket);

    // --- Rocket Flame (Object Pooling with Gravity) - Reduced on mobile for performance ---
    const trailPool = [];
    let trailIndex = 0;
    const trailSize = isMobile ? 100 : 200; // Half the particles on mobile
    const trailGeo = new THREE.BoxGeometry(pixelSize * 1.5, pixelSize * 1.5, pixelSize * 1.5);
    
    // Fire colors: orange, red, yellow for realistic rocket flame
    const fireColors = [0xff6600, 0xff3300, 0xff9900, 0xffaa00, 0xff0000];
    
    for(let i=0; i<trailSize; i++) {
        const flameColor = fireColors[Math.floor(Math.random() * fireColors.length)];
        const trailMat = new THREE.MeshBasicMaterial({ 
            color: flameColor,
            transparent: true,
            opacity: 0.9
        });
        const particle = new THREE.Mesh(trailGeo, trailMat);
        particle.visible = false;
        particle.velocity = new THREE.Vector3(); // For gravity
        scene.add(particle);
        trailPool.push(particle);
    }
    
    // Coins removed for cleaner aesthetic

    // Light
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    // Mouse and touch event handlers for rocket tracking
    const updatePointerPosition = (clientX, clientY) => {
        mouse.x = (clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    };

    const handleMouseMove = (event) => {
        updatePointerPosition(event.clientX, event.clientY);
    };
    
    const handleTouchMove = (event) => {
        if (event.touches.length > 0) {
            event.preventDefault(); // Prevent scrolling while touching
            updatePointerPosition(event.touches[0].clientX, event.touches[0].clientY);
        }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    const animate = () => {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        const elapsedTime = clock.getElapsedTime();

        // Increased multipliers and lerp factor for closer mouse following
        const targetPosition = new THREE.Vector3(mouse.x * 18, mouse.y * 12, 0);
        rocket.position.lerp(targetPosition, 0.12); // Increased from 0.05 to 0.12 for faster response
        rocket.rotation.y = (targetPosition.x - rocket.position.x) * 0.15; // Increased rotation speed
        rocket.rotation.x = -(targetPosition.y - rocket.position.y) * 0.15;

        // Emit flame particles with gravity effect (reduced rate on mobile)
        const emissionThreshold = isMobile ? 0.5 : 0.2; // More frequent for better flame effect
        if(Math.random() > emissionThreshold) {
            const particle = trailPool[trailIndex];
            particle.position.copy(rocket.position);
            particle.position.y -= 0.9; // Start below rocket
            particle.position.x += (Math.random() - 0.5) * 0.3; // Slight horizontal spread
            particle.scale.setScalar(1);
            particle.visible = true;
            particle.life = 1;
            // Initial velocity: slight upward thrust then gravity pulls down
            particle.velocity.set(
                (Math.random() - 0.5) * 0.5, // Random horizontal
                Math.random() * 0.3, // Slight upward
                0
            );
            trailIndex = (trailIndex + 1) % trailSize;
        }
        
        // Animate flame with gravity and fade
        const gravity = -2.5; // Gravity pulls flame down
        trailPool.forEach(p => {
            if(p.visible) {
                // Apply physics
                p.velocity.y += gravity * delta; // Gravity acceleration
                p.position.add(p.velocity.clone().multiplyScalar(delta * 3));
                
                // Fade and shrink over time
                p.life -= delta * 2; // Faster fade for flame effect
                p.scale.setScalar(p.life * 0.8); // Shrink as it fades
                
                // Update opacity for fade effect
                p.material.opacity = p.life * 0.9;
                
                if(p.life <= 0) p.visible = false;
            }
        });

        // Coin animation removed
        
        composer.render();
    };
    animate();

    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('touchmove', handleTouchMove);
        if (mountRef.current) {
          mountRef.current.removeChild(renderer.domElement);
        }
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 z-0" />;
};

// --- Navigation Component ---
const HeroNav = () => {
    return (
        <motion.nav 
            initial={{ 
                opacity: 0, 
                top: "50%",
                transform: "translateY(-50%)"
            }}
            animate={{ 
                opacity: 1,
                top: "0%",
                transform: "translateY(0%)",
                transition: { 
                    delay: 1, 
                    duration: 1.5,
                    ease: [0.22, 1, 0.36, 1] // Custom easing for smooth movement
                } 
            }}
            className="absolute left-0 right-0 z-20 p-4 sm:p-6 md:p-8"
        >
            <div className="flex items-center gap-2 sm:gap-4 justify-center sm:justify-start">
                <span className="text-2xl sm:text-3xl md:text-4xl">🚀</span>
                <a 
                  href="https://eqho.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm sm:text-xl md:text-2xl font-bold text-white hover:text-cyan-300 transition-colors" 
                  style={{ 
                    fontFamily: "'Press Start 2P', system-ui",
                    letterSpacing: '0.1em'
                  }}
                >
                  eqho.ai
                </a>
            </div>
        </motion.nav>
    );
};

// --- Main Hero Component ---
export const PixelRocketHero = ({ children }) => {
  const textControls = useAnimation();
  const buttonControls = useAnimation();

  useEffect(() => {
    // Add pixel font to the document head
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    textControls.start(i => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05 + 1.5,
        duration: 1.2,
        ease: [0.2, 0.65, 0.3, 0.9]
      }
    }));
    
    buttonControls.start({
        opacity: 1,
        transition: { delay: 2.5, duration: 1 }
    });

    return () => {
        const linkEl = document.head.querySelector('link[href*="Press+Start+2P"]');
        if (linkEl) document.head.removeChild(linkEl);
    }
  }, [textControls, buttonControls]);

  const headline = "TotheMoon!";
  
  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-indigo-900 via-purple-900 to-black">
      <PixelVoyagerCanvas />
      <HeroNav />
      
      {/* Main content */}
      <div className="relative z-10 text-center px-4 sm:px-6 max-w-6xl mx-auto mt-24 sm:mt-28 md:mt-32">
        <h1 
          className="text-2xl font-bold tracking-tighter text-white sm:text-4xl md:text-5xl lg:text-6xl mb-4 sm:mb-6" 
          style={{ fontFamily: "'Press Start 2P', system-ui", textShadow: '2px 2px 0px #ff00ff, -1px -1px 0px #00ffff' }}
        >
            {headline.split("").map((char, i) => (
                <motion.span 
                  key={i} 
                  custom={i} 
                  initial={{ opacity: 0, y: 50 }} 
                  animate={textControls} 
                  style={{ 
                    display: 'inline-block',
                    paddingLeft: i === 5 ? '0.3em' : '0' // Add space before "M" in "Moon"
                  }}
                >
                    {char}
                </motion.span>
            ))}
        </h1>
        
        <motion.p
          custom={headline.length}
          initial={{ opacity: 0, y: 30 }}
          animate={textControls}
          className="mx-auto max-w-xl text-xs sm:text-sm leading-relaxed text-cyan-300 mb-8 sm:mb-12"
          style={{ fontFamily: "'Press Start 2P', system-ui" }}
        >
          Eqho Investor Portal
        </motion.p>

        {/* Auth form will be passed as children */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={buttonControls}
        >
          {children}
        </motion.div>
      </div>

    </div>
  );
};

export default PixelRocketHero;

