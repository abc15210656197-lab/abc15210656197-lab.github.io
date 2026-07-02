import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';

const smoothstep = (min: number, max: number, value: number) => {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
};

const FunnelMesh = ({ onStepChange }: { onStepChange: (step: number) => void }) => {
  const groupRef = useRef<THREE.Group>(null);
  const markersRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);
  const rotationRef = useRef(0);
  const currentStepRef = useRef(-1);

  const size = 32;
  const segments = 100;
  
  const geometry = useMemo(() => {
    return new THREE.PlaneGeometry(size, size, segments, segments);
  }, []);

  useFrame((state, delta) => {
    timeRef.current = (timeRef.current + delta) % 16; // 16 second loop
    const t = timeRef.current;

    let step = 0;
    if (t < 2) step = 0;
    else if (t < 6) step = 1;
    else if (t < 10) step = 2;
    else if (t < 14) step = 3;
    else step = 4;

    if (step !== currentStepRef.current) {
      currentStepRef.current = step;
      onStepChange(step);
    }

    // Easing functions for smooth transitions
    const gravityLerp = smoothstep(2, 4, t) * (1 - smoothstep(14, 15, t));
    const centrifugalLerp = smoothstep(6, 8, t) * (1 - smoothstep(14, 15, t));
    const rotationSpeed = smoothstep(6, 8, t) * (1 - smoothstep(14, 15, t)) * 1.5;

    rotationRef.current += rotationSpeed * delta;

    if (groupRef.current) {
      groupRef.current.rotation.z = rotationRef.current;
    }

    // Update vertices dynamically
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      
      const x1 = -2.42;
      const x2 = 7.58;
      const d1 = Math.sqrt(Math.pow(x - x1, 2) + Math.pow(y, 2));
      const d2 = Math.sqrt(Math.pow(x - x2, 2) + Math.pow(y, 2));
      const r2 = x * x + y * y;

      const pot1 = -25 / Math.max(d1, 0.8);
      const pot2 = -8 / Math.max(d2, 0.6);
      const centrifugal = -0.0165 * r2;

      let finalZ = (pot1 + pot2) * 4 * gravityLerp + centrifugal * 4 * centrifugalLerp + 4.647 * 4 * Math.max(gravityLerp, centrifugalLerp);
      finalZ = Math.max(finalZ, -35); // clamp depth

      pos.setZ(i, finalZ);
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
    
    // Update markers positions
    if (markersRef.current) {
      markersRef.current.children.forEach((child: any) => {
        if (child.userData && child.userData.isMarker) {
          const { x, y, isEarth, isMoon } = child.userData;
          const d1 = Math.sqrt(Math.pow(x - (-2.42), 2) + Math.pow(y, 2));
          const d2 = Math.sqrt(Math.pow(x - 7.58, 2) + Math.pow(y, 2));
          const r2 = x * x + y * y;
          const pot1 = -25 / Math.max(d1, 0.8);
          const pot2 = -8 / Math.max(d2, 0.6);
          const centrifugal = -0.0165 * r2;
          
          let z = (pot1 + pot2) * 4 * gravityLerp + centrifugal * 4 * centrifugalLerp + 4.647 * 4 * Math.max(gravityLerp, centrifugalLerp);
          z = Math.max(z, -35);
          
          if (isEarth) child.position.z = z + 2;
          else if (isMoon) child.position.z = z + 1;
          else child.position.z = z + 0.8;
          
          // Fade in Lagrange markers only when centrifugal force is active
          if (!isEarth && !isMoon) {
             child.scale.setScalar(Math.max(0.001, centrifugalLerp));
             child.visible = centrifugalLerp > 0.01;
          }
        }
      });
    }
  });

  return (
    <group rotation={[-Math.PI / 2.5, 0, 0]} position={[0, -2, 0]}>
      <group ref={groupRef}>
        <mesh>
          <primitive object={geometry} attach="geometry" />
          <meshStandardMaterial
            color="#1e40af"
            wireframe={false}
            side={THREE.DoubleSide}
            metalness={0.3}
            roughness={0.4}
            emissive="#1e3a8a"
            emissiveIntensity={0.5}
          />
        </mesh>
        {/* Wireframe overlay for better 3D perception */}
        <mesh>
          <primitive object={geometry} attach="geometry" />
          <meshBasicMaterial color="#60a5fa" wireframe={true} transparent opacity={0.3} />
        </mesh>

        <group ref={markersRef}>
          {/* Lagrange Points */}
          <group userData={{ isMarker: true, x: 4.5, y: 0 }} position={[4.5, 0, 0]}>
            <mesh><sphereGeometry args={[0.8, 32, 32]} /><meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1} /></mesh>
            <Html distanceFactor={30} center position={[0, 0, 1.5]}><div className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/60 text-yellow-400 border border-yellow-500/50 backdrop-blur-sm">L1</div></Html>
          </group>
          <group userData={{ isMarker: true, x: 12.5, y: 0 }} position={[12.5, 0, 0]}>
            <mesh><sphereGeometry args={[0.8, 32, 32]} /><meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1} /></mesh>
            <Html distanceFactor={30} center position={[0, 0, 1.5]}><div className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/60 text-yellow-400 border border-yellow-500/50 backdrop-blur-sm">L2</div></Html>
          </group>
          <group userData={{ isMarker: true, x: -11.5, y: 0 }} position={[-11.5, 0, 0]}>
            <mesh><sphereGeometry args={[0.8, 32, 32]} /><meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1} /></mesh>
            <Html distanceFactor={30} center position={[0, 0, 1.5]}><div className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/60 text-yellow-400 border border-yellow-500/50 backdrop-blur-sm">L3</div></Html>
          </group>
          <group userData={{ isMarker: true, x: 2.58, y: 8.66 }} position={[2.58, 8.66, 0]}>
            <mesh><sphereGeometry args={[0.8, 32, 32]} /><meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1} /></mesh>
            <Html distanceFactor={30} center position={[0, 0, 1.5]}><div className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/60 text-yellow-400 border border-yellow-500/50 backdrop-blur-sm">L4</div></Html>
          </group>
          <group userData={{ isMarker: true, x: 2.58, y: -8.66 }} position={[2.58, -8.66, 0]}>
            <mesh><sphereGeometry args={[0.8, 32, 32]} /><meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1} /></mesh>
            <Html distanceFactor={30} center position={[0, 0, 1.5]}><div className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/60 text-yellow-400 border border-yellow-500/50 backdrop-blur-sm">L5</div></Html>
          </group>

          {/* Earth and Moon markers */}
          <group userData={{ isMarker: true, isEarth: true, x: -2.42, y: 0 }} position={[-2.42, 0, 0]}>
             <mesh><sphereGeometry args={[2, 16, 16]} /><meshStandardMaterial color="#3b82f6" emissive="#1d4ed8" emissiveIntensity={0.5} /></mesh>
             <Html distanceFactor={30} center position={[0, 0, 3]}><div className="text-[10px] font-bold text-blue-300 drop-shadow-md">EARTH</div></Html>
          </group>
          <group userData={{ isMarker: true, isMoon: true, x: 7.58, y: 0 }} position={[7.58, 0, 0]}>
             <mesh><sphereGeometry args={[1.2, 16, 16]} /><meshStandardMaterial color="#9ca3af" emissive="#4b5563" emissiveIntensity={0.5} /></mesh>
             <Html distanceFactor={30} center position={[0, 0, 2]}><div className="text-[10px] font-bold text-gray-300 drop-shadow-md">MOON</div></Html>
          </group>
        </group>
      </group>
    </group>
  );
};

const stepTexts = [
  "1. 初始状态：平坦的参考系",
  "2. 质量产生引力：地球和月球使空间凹陷",
  "3. 坐标系旋转：引入离心力（四周逐渐凹陷）",
  "4. 引力与离心力平衡：形成拉格朗日点",
  "重置中..."
];

export const EducationalFunnel = () => {
  const [step, setStep] = useState(0);

  return (
    <div className="w-full h-96 bg-black/40 rounded-xl overflow-hidden border border-blue-500/30 relative mt-4 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
      <div className="absolute top-3 left-3 z-10 bg-blue-900/80 px-3 py-1.5 rounded-md text-xs font-bold text-blue-100 backdrop-blur-md border border-blue-400/30 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
        概念演示：{stepTexts[step]}
      </div>
      <div className="absolute bottom-3 right-3 z-10 text-[10px] text-white/30">
        * 夸张比例，仅供概念演示
      </div>
      <Canvas camera={{ position: [0, -25, 20], fov: 45 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 20, 30]} intensity={2} />
        <FunnelMesh onStepChange={setStep} />
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </div>
  );
};
