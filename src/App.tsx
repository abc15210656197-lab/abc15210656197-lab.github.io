import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { X, Play, Pause, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { lagrangeData, points, R_bary, R_moon, R, getPotential } from './data';
import { GravityWell } from './GravityWell';

import { EducationalFunnel } from './EducationalFunnel';

const Sun = () => {
  return (
    <group position={[-150, 0, 0]}>
      <mesh>
        <sphereGeometry args={[10, 32, 32]} />
        <meshBasicMaterial color="#ffffee" />
      </mesh>
      <mesh>
        <sphereGeometry args={[15, 32, 32]} />
        <meshBasicMaterial color="#ffaa00" transparent opacity={0.15} />
      </mesh>
      <pointLight intensity={8} distance={800} color="#ffffee" decay={1.5} />
    </group>
  );
};

const MilkyWay = () => {
  const particles = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.BufferGeometry();
    
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, 2048, 512);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 110px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('吴老师，我还是喜欢您桀骜不驯的样子', 1024, 256);
    
    const imgData = ctx.getImageData(0, 0, 2048, 512).data;
    const textPoints = [];
    for (let y = 0; y < 512; y += 2) {
      for (let x = 0; x < 2048; x += 2) {
        const i = (y * 2048 + x) * 4;
        if (imgData[i] > 128) {
          if (Math.random() > 0.2) { // Increased probability for denser text
            textPoints.push({ x: x - 1024, y: -(y - 256) });
          }
        }
      }
    }
    
    const totalCount = 150000; // Even more stars
    const textCount = textPoints.length;
    const randomCount = totalCount - textCount;
    
    const positions = new Float32Array(totalCount * 3);
    const colors = new Float32Array(totalCount * 3);
    const color = new THREE.Color();
    
    // Camera setup for projection
    const C = new THREE.Vector3(0, 120, 160);
    const T = new THREE.Vector3(0, 0, 0);
    const Up = new THREE.Vector3(0, 1, 0);
    // lookAt creates a rotation matrix where local -Z points towards T
    const camRot = new THREE.Matrix4().lookAt(C, T, Up);
    
    let idx = 0;
    const tilt = Math.PI / 8; // Diagonal tilt
    
    // 1. Generate text stars
    for(let i = 0; i < textCount; i++) {
      const p = textPoints[i];
      const nx = p.x + (Math.random() - 0.5) * 1.0; // Less scatter for clearer text
      const ny = p.y + (Math.random() - 0.5) * 1.0;
      
      // Map to spherical angles (wide angle for surrounding effect)
      const theta = (nx / 1024) * (Math.PI / 2.2); 
      // Increased phi multiplier from 0.15 to 0.35 to fix squashed font (aspect ratio correction)
      const phi = (ny / 256) * 0.35;
      
      // Random depth along line of sight
      const radius = 10000 + (Math.random() - 0.5) * 8000;
      
      const x_local = radius * Math.cos(phi) * Math.sin(theta);
      const y_local = radius * Math.sin(phi);
      const z_local = -radius * Math.cos(phi) * Math.cos(theta);
      
      // Apply tilt
      const x_tilted = x_local * Math.cos(tilt) - y_local * Math.sin(tilt);
      const y_tilted = x_local * Math.sin(tilt) + y_local * Math.cos(tilt);
      
      const p_local = new THREE.Vector3(x_tilted, y_tilted, z_local);
      // Rotate to match camera view, then translate to camera position
      const p_world = p_local.applyMatrix4(camRot).add(C);
      
      positions[idx*3] = p_world.x;
      positions[idx*3+1] = p_world.y;
      positions[idx*3+2] = p_world.z;
      
      const mix = Math.random();
      if (mix > 0.3) color.setHex(0xffffff); // More pure white stars for text
      else if (mix > 0.1) color.setHex(0xffeedd);
      else color.setHex(0xaaccff);
      
      color.multiplyScalar(1.5 + Math.random() * 0.5); // Significantly brighter text stars
      
      colors[idx*3] = color.r;
      colors[idx*3+1] = color.g;
      colors[idx*3+2] = color.b;
      idx++;
    }
    
    // 2. Generate Milky Way ring
    for(let i = 0; i < randomCount; i++) {
      const theta = (Math.random() - 0.5) * Math.PI * 2; // Full ring
      
      const u1 = Math.random();
      const u2 = Math.random();
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      
      // --- Shape Modulation: Wide in the middle, narrow at the ends ---
      // Galactic bulge at the center (theta ≈ 0, where the text is)
      const bulge = Math.exp(-Math.abs(theta) * 2.5) * 2.2; 
      // Galactic disk tapering towards the back (theta ≈ ±PI)
      const disk = 0.25 + 0.75 * Math.cos(theta / 2); 
      const thicknessMod = disk + bulge;
      
      let phi = z0 * 0.06 * thicknessMod;
      
      // Add some random scatter that also scales with the thickness
      if (Math.random() > 0.7) {
        phi += (Math.random() - 0.5) * 0.25 * thicknessMod;
      }
      
      const radius = 10000 + (Math.random() - 0.5) * 8000;
      
      const x_local = radius * Math.cos(phi) * Math.sin(theta);
      const y_local = radius * Math.sin(phi);
      const z_local = -radius * Math.cos(phi) * Math.cos(theta);
      
      const x_tilted = x_local * Math.cos(tilt) - y_local * Math.sin(tilt);
      const y_tilted = x_local * Math.sin(tilt) + y_local * Math.cos(tilt);
      
      const p_local = new THREE.Vector3(x_tilted, y_tilted, z_local);
      // Rotate to match camera view, then translate to camera position
      const p_world = p_local.applyMatrix4(camRot).add(C);
      
      positions[idx*3] = p_world.x;
      positions[idx*3+1] = p_world.y;
      positions[idx*3+2] = p_world.z;
      
      const distFromCenter = Math.abs(z0);
      const mix = Math.random();
      
      // --- Color Modulation: Warmer/brighter in the core ---
      const centerProximity = Math.max(0, 1.0 - Math.abs(theta) / 1.2);
      
      if (distFromCenter < 0.8 && mix < 0.2 + centerProximity * 0.6) {
        color.setHex(0xffeedd); // Warm core (highly concentrated in the center)
      } else if (mix > 0.8) {
        color.setHex(0x4466ff); // Deep blue
      } else if (mix > 0.5) {
        color.setHex(0x88aaff); // Light blue
      } else if (mix > 0.3) {
        color.setHex(0xffccaa); // Warm edge
      } else {
        color.setHex(0xffffff); // White
      }
      
      // Brighter in the center bulge, dimmer at the edges and back
      const brightness = Math.max(0.15, 1.0 - distFromCenter * 0.3) * (0.5 + centerProximity * 0.8);
      color.multiplyScalar(brightness); 
      
      colors[idx*3] = color.r;
      colors[idx*3+1] = color.g;
      colors[idx*3+2] = color.b;
      idx++;
    }
    
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, []);

  return (
    <points>
      <primitive object={particles} attach="geometry" />
      <pointsMaterial size={25.0} vertexColors transparent opacity={0.8} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
};

const ProjectedPoint = ({ id, position, color }: any) => {
  const z = getPotential(position[0], position[2]);
  const projectedPos = new THREE.Vector3(position[0], z, position[2]);
  
  return (
    <group>
      <Line 
        points={[position, projectedPos]} 
        color={color} 
        opacity={0.6} 
        transparent 
        dashed 
        dashSize={0.3} 
        gapSize={0.2} 
        lineWidth={1}
      />
      <mesh position={projectedPos}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={projectedPos} rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.4, 0.5, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

const LagrangePoint = ({ id, position, color, selected, onClick }: any) => {
  const ref = useRef<THREE.Mesh>(null);
  const isBarycenter = id === 'Barycenter';
  
  useFrame((state) => {
    if (ref.current && !isBarycenter) {
      ref.current.rotation.y += 0.02;
      ref.current.rotation.x += 0.01;
      const scale = selected ? 1.5 + Math.sin(state.clock.elapsedTime * 5) * 0.2 : 1;
      ref.current.scale.set(scale, scale, scale);
    }
  });

  if (isBarycenter) {
    return (
      <group position={position} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
        <mesh>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <Line points={[[-0.8, 0, 0], [0.8, 0, 0]]} color="#ffffff" opacity={selected ? 1 : 0.5} transparent />
        <Line points={[[0, -0.8, 0], [0, 0.8, 0]]} color="#ffffff" opacity={selected ? 1 : 0.5} transparent />
        <Line points={[[0, 0, -0.8], [0, 0, 0.8]]} color="#ffffff" opacity={selected ? 1 : 0.5} transparent />
        <Html distanceFactor={15} center position={[0, -1, 0]}>
          <div className={`px-2 py-1 rounded text-xs font-bold cursor-pointer transition-all duration-300 ${selected ? 'bg-white text-black scale-110' : 'bg-black/80 text-white border border-white/30 hover:bg-white/20'}`}
               onClick={() => onClick(id)}>
            质心
          </div>
        </Html>
      </group>
    );
  }

  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
      <mesh ref={ref}>
        <octahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={selected ? 2 : 0.8} wireframe={!selected} />
      </mesh>
      <Html distanceFactor={15} center>
        <div className={`px-2 py-1 rounded text-xs font-bold cursor-pointer transition-all duration-300 ${selected ? 'bg-white text-black scale-125' : 'bg-black/50 text-white border border-white/20 hover:bg-white/20'}`}
             onClick={() => onClick(id)}>
          {id}
        </div>
      </Html>
      {selected && (
        <pointLight color={color} intensity={2} distance={5} />
      )}
    </group>
  );
};

const OrbitPath = ({ radius, color = "#ffffff", opacity = 0.1, dashed = false }: any) => {
  const pts = useMemo(() => {
    const p = [];
    for (let i = 0; i <= 128; i++) {
      const angle = (i / 128) * Math.PI * 2;
      p.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }
    return p;
  }, [radius]);

  return (
    <Line 
      points={pts} 
      color={color} 
      opacity={opacity} 
      transparent 
      lineWidth={1} 
      dashed={dashed} 
      dashSize={0.5} 
      gapSize={0.2} 
    />
  );
};

const EquilateralTriangle = () => {
  const pts = [
    new THREE.Vector3(-R_bary, 0, 0),
    new THREE.Vector3(points.L4[0], points.L4[1], points.L4[2]),
    new THREE.Vector3(R_moon, 0, 0),
    new THREE.Vector3(-R_bary, 0, 0),
    new THREE.Vector3(points.L5[0], points.L5[1], points.L5[2]),
    new THREE.Vector3(R_moon, 0, 0),
  ];

  return <Line points={pts} color="#ffffff" opacity={0.15} transparent lineWidth={1} dashed dashSize={0.5} gapSize={0.2} />;
};

const Scene = ({ selectedPoint, onSelectPoint, isAnimating, showGravityWell, secretView, viewTrigger }: any) => {
  const groupRef = useRef<THREE.Group>(null);
  const earthRef = useRef<THREE.Mesh>(null);
  const moonRef = useRef<THREE.Mesh>(null);
  const controlsRef = useRef<any>(null);
  const userInteracted = useRef(false);

  useEffect(() => {
    userInteracted.current = false;
  }, [selectedPoint, viewTrigger]);

  useFrame((state, delta) => {
    if (isAnimating && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5;
    }
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 2;
    }

    if (selectedPoint && controlsRef.current && groupRef.current && !userInteracted.current) {
      const targetWorldPos = new THREE.Vector3(...points[selectedPoint as keyof typeof points]);
      targetWorldPos.applyMatrix4(groupRef.current.matrixWorld);
      
      controlsRef.current.target.lerp(targetWorldPos, 0.05);
      
      const currentCamPos = state.camera.position;
      const desiredDistance = selectedPoint === 'Barycenter' ? 25 : 12;
      
      const direction = currentCamPos.clone().sub(targetWorldPos).normalize();
      direction.y = Math.max(direction.y, 0.2);
      direction.normalize();
      
      const desiredCamPos = targetWorldPos.clone().add(direction.multiplyScalar(desiredDistance));
      state.camera.position.lerp(desiredCamPos, 0.05);
    } else if (secretView && controlsRef.current && !userInteracted.current) {
      controlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), 0.05);
      state.camera.position.lerp(new THREE.Vector3(0, 120, 160), 0.05);
    }
  });

  const r_L45 = Math.sqrt(Math.pow(points.L4[0], 2) + Math.pow(points.L4[2], 2));

  return (
    <>
      <ambientLight intensity={0.6} />
      <hemisphereLight intensity={0.5} color="#ffffff" groundColor="#222222" />
      <Sun />
      <MilkyWay />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />

      <group ref={groupRef}>
        <LagrangePoint
          id="Barycenter"
          position={points.Barycenter}
          color={lagrangeData.Barycenter.color}
          selected={selectedPoint === 'Barycenter'}
          onClick={onSelectPoint}
        />

        {showGravityWell && (
          <>
            <GravityWell />
            {(Object.keys(points) as Array<keyof typeof points>).map((key) => (
              <ProjectedPoint
                key={`proj-${key}`}
                id={key}
                position={points[key]}
                color={key === 'Barycenter' ? lagrangeData.Barycenter.color : (lagrangeData as any)[key].color}
              />
            ))}
          </>
        )}

        <mesh ref={earthRef} position={[-R_bary, 0, 0]} onClick={() => onSelectPoint(null)}>
          <sphereGeometry args={[1.5, 64, 64]} />
          <meshLambertMaterial 
            color="#2b7fff" 
            emissive="#0a2a5c"
            emissiveIntensity={0.5}
          />
          <Html distanceFactor={15} center position={[0, -2.2, 0]}>
            <div className="text-blue-300 text-xs font-bold tracking-widest opacity-80 drop-shadow-md">EARTH</div>
          </Html>
        </mesh>

        <mesh ref={moonRef} position={[R_moon, 0, 0]} onClick={() => onSelectPoint(null)}>
          <sphereGeometry args={[0.4, 64, 64]} />
          <meshLambertMaterial 
            color="#cccccc" 
            emissive="#333333"
            emissiveIntensity={0.5}
          />
          <Html distanceFactor={15} center position={[0, -1, 0]}>
            <div className="text-gray-300 text-xs font-bold tracking-widest opacity-80 drop-shadow-md">MOON</div>
          </Html>
        </mesh>

        <OrbitPath radius={R_bary} color="#3388ff" opacity={0.3} />
        <OrbitPath radius={R_moon} color="#aaaaaa" opacity={0.2} />
        
        <OrbitPath radius={Math.abs(points.L1[0])} color={lagrangeData.L1.color} opacity={0.1} dashed />
        <OrbitPath radius={Math.abs(points.L2[0])} color={lagrangeData.L2.color} opacity={0.1} dashed />
        <OrbitPath radius={Math.abs(points.L3[0])} color={lagrangeData.L3.color} opacity={0.1} dashed />
        <OrbitPath radius={r_L45} color={lagrangeData.L4.color} opacity={0.1} dashed />
        
        <EquilateralTriangle />

        {(Object.keys(points) as Array<keyof typeof points>).filter(k => k !== 'Barycenter').map((key) => (
          <LagrangePoint
            key={key}
            id={key}
            position={points[key]}
            color={(lagrangeData as any)[key].color}
            selected={selectedPoint === key}
            onClick={onSelectPoint}
          />
        ))}
      </group>

      <OrbitControls 
        ref={controlsRef}
        enablePan={true} 
        minDistance={2} 
        maxDistance={300}
        autoRotate={!isAnimating && !selectedPoint}
        autoRotateSpeed={0.3}
        onStart={() => { userInteracted.current = true; }}
        makeDefault
      />
    </>
  );
};

export default function App() {
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showGravityWell, setShowGravityWell] = useState(true);
  const [activeTab, setActiveTab] = useState<'desc' | 'calc'>('desc');
  const [secretView, setSecretView] = useState(false);
  const [viewTrigger, setViewTrigger] = useState(0);

  const activeData = selectedPoint ? (lagrangeData as any)[selectedPoint] : lagrangeData.intro;

  return (
    <div className="w-full h-screen bg-[#020205] text-white overflow-hidden font-sans selection:bg-white/30 flex flex-col md:flex-row">
      <div className="relative flex-1 h-1/2 md:h-full">
        <Canvas camera={{ position: [10, 15, 25], fov: 45, far: 200000 }}>
          <Scene 
            selectedPoint={selectedPoint} 
            onSelectPoint={(p: string | null) => {
              setSelectedPoint(p);
              setSecretView(false);
            }} 
            isAnimating={isAnimating}
            showGravityWell={showGravityWell}
            secretView={secretView}
            viewTrigger={viewTrigger}
          />
        </Canvas>

        <div className="absolute top-6 left-6 flex flex-col gap-4 pointer-events-none">
          <div className="pointer-events-auto">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              地月拉格朗日点
            </h1>
            <p className="text-sm text-white/50 tracking-widest uppercase mt-1">Earth-Moon System</p>
          </div>
          
          <div className="flex gap-2 pointer-events-auto">
            <button 
              onClick={() => setIsAnimating(!isAnimating)}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              title={isAnimating ? "暂停公转" : "播放公转"}
            >
              {isAnimating ? <Pause size={18} /> : <Play size={18} className="ml-1" />}
            </button>
            <button 
              onClick={() => setShowGravityWell(!showGravityWell)}
              className={`w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center transition-colors ${showGravityWell ? 'bg-blue-500/30 border-blue-500/50 text-blue-200 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-white/10 border-white/10 hover:bg-white/20'}`}
              title="引力沙漏/漏斗模式"
            >
              <Layers size={18} />
            </button>
            <button 
              onClick={() => {
                if (secretView) {
                  setSecretView(false);
                } else {
                  setSelectedPoint(null);
                  setSecretView(true);
                  setShowGravityWell(false);
                  setViewTrigger(v => v + 1);
                }
              }}
              className={`px-4 h-10 rounded-full backdrop-blur-md border flex items-center justify-center transition-colors text-sm font-bold ${secretView ? 'bg-purple-500/30 border-purple-500/50 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'bg-white/10 border-white/10 hover:bg-white/20 text-white/80'}`}
              title="吴老师专属视角"
            >
              ✨ 吴老师专属视角
            </button>
          </div>
        </div>

        <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-auto">
          <div className="flex gap-2 p-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 overflow-x-auto max-w-full">
            {['Barycenter', 'L1', 'L2', 'L3', 'L4', 'L5'].map(pt => (
              <button
                key={pt}
                onClick={() => setSelectedPoint(pt)}
                className={`px-4 h-10 rounded-full flex items-center justify-center text-sm font-mono transition-all duration-300 whitespace-nowrap ${
                  selectedPoint === pt 
                    ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)] font-bold' 
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {pt === 'Barycenter' ? '质心' : pt}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full md:w-96 h-1/2 md:h-full bg-[#0a0a0a]/90 backdrop-blur-xl border-t md:border-t-0 md:border-l border-white/10 flex flex-col relative z-10">
        <AnimatePresence mode="wait">
          <motion.div 
            key={selectedPoint || 'intro'}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar"
          >
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                {selectedPoint && selectedPoint !== 'Barycenter' && (
                  <span className="w-3 h-3 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ backgroundColor: activeData.color || '#fff' }} />
                )}
                {selectedPoint === 'Barycenter' && (
                  <span className="w-3 h-3 rounded-full border-2 border-white" />
                )}
                {activeData.title}
              </h2>
              {selectedPoint && (
                <button onClick={() => setSelectedPoint(null)} className="text-white/50 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              )}
            </div>

            <div className="flex gap-4 border-b border-white/10 mb-6">
              <button 
                className={`pb-2 text-sm font-medium transition-colors relative ${activeTab === 'desc' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
                onClick={() => setActiveTab('desc')}
              >
                描述
                {activeTab === 'desc' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
              </button>
              <button 
                className={`pb-2 text-sm font-medium transition-colors relative ${activeTab === 'calc' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
                onClick={() => setActiveTab('calc')}
              >
                计算方法
                {activeTab === 'calc' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
              </button>
            </div>
            
            <div className="space-y-6 text-sm leading-relaxed text-white/80">
              {activeTab === 'desc' ? (
                <>
                  <p className="text-base">{activeData.description}</p>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-white/70">{activeData.details}</p>
                  </div>
                  {!selectedPoint && <EducationalFunnel />}
                </>
              ) : (
                <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-500/30">
                  <h3 className="text-blue-300 font-bold mb-2">计算公式与原理</h3>
                  <pre className="whitespace-pre-wrap font-mono text-xs text-blue-100/80 leading-relaxed">
                    {activeData.formula}
                  </pre>
                </div>
              )}
            </div>

            {!selectedPoint && (
              <div className="mt-8 pt-6 border-t border-white/10">
                <p className="text-xs text-white/40 mb-4 uppercase tracking-wider">探索各个点</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {['L1', 'L2', 'L3', 'L4', 'L5'].map(pt => (
                    <button
                      key={pt}
                      onClick={() => setSelectedPoint(pt)}
                      className="py-3 rounded-lg bg-white/5 hover:bg-white/15 border border-white/5 transition-colors text-sm font-mono"
                    >
                      {pt}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setSelectedPoint('Barycenter')}
                  className="w-full py-3 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 transition-colors text-sm font-bold text-blue-200"
                >
                  查看系统质心 (Barycenter)
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
