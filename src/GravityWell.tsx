import React, { useMemo } from 'react';
import * as THREE from 'three';
import { getPotential } from './data';

export const GravityWell = () => {
  const geometry = useMemo(() => {
    const size = 60;
    const segments = 200;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i); // This is Z in 3D space since plane is rotated
      
      const z = getPotential(x, y);
      pos.setZ(i, z);
    }
    
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial 
        color="#3366ff" 
        wireframe={true} 
        transparent={true}
        opacity={0.5}
        side={THREE.DoubleSide}
        emissive="#002266"
        emissiveIntensity={0.8}
      />
    </mesh>
  );
};
